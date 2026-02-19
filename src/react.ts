import { Children, cloneElement, isValidElement, ReactElement, ReactNode, RefObject } from "react";

export const animateCSSVar = (
  ref: RefObject<HTMLElement>,
  variable: string,
  to: number,
  {
    lerpFactor = 0.1,
    threshold = 0.1,
    multiplier = 1,
  }: {
    lerpFactor?: number
    threshold?: number
    multiplier?: number
  } = {}
) => {
  if (!ref.current) return

  let current = parseFloat(getComputedStyle(ref.current).getPropertyValue(variable)) || 0
  let target = to * multiplier
  let rafId: number | null = null

  const tick = () => {
    current += (target - current) * lerpFactor
    if (ref.current) {
      ref.current.style.setProperty(variable, `${current}px`)
    }

    if (Math.abs(target - current) > threshold) {
      rafId = requestAnimationFrame(tick)
    }
  }

  // Cancel if a new target arrives
  if (rafId) cancelAnimationFrame(rafId)
  requestAnimationFrame(tick)
}

export const addPropsToChildren = (
    children: ReactNode, 
    conditions: (child: ReactElement<any>) => boolean, 
    getProps: (index: number, element: ReactElement<any>) => object
) : ReactNode => {

    let i = 0

    return Children.map(children, (child) => {
        if ( isValidElement(child) ){

            const element = child as ReactElement<any>
            const newChild = conditions(element) 
                ? cloneElement(element, getProps(i++, element))
                : element
            if ( element.props.children ){
                return cloneElement(newChild, {
                    children: addPropsToChildren(element.props.children, conditions, getProps)
                })
            }
            return newChild
        }
        return child
    })
}