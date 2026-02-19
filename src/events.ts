import { EventListener } from "./types";

export interface Event {
    event: String | Symbol;
    listeners: Array<EventListener>;
}

class Events {
    _events: Event[];

    constructor() {
        this._events = [];
    }

    /**
     * Registers an event listener.
     * @param event The name of the event.
     * @param fun The callback function.
     * @param context Optional context (this) for the callback.
     * @returns A function to unsubscribe this specific listener.
     */
    on(event: String | Symbol, fun: (...args: any[]) => void, context?: any): () => void {
        const evt = this._events.find(x => x.event === event);
        const id = Symbol('listener_id'); // Give each listener a unique ID
        const listener: EventListener = {
            fun: fun, // Store original function
            context: context,
            id: id,
        };

        if (!evt) {
            this._events.push({ event: event, listeners: [listener] });
        } else {
            evt.listeners.push(listener);
        }

        // Return an unsubscribe function
        return () => {
            const currentEvt = this._events.find(x => x.event === event);
            if (currentEvt) {
                currentEvt.listeners = currentEvt.listeners.filter(l => l.id !== id);
                if (currentEvt.listeners.length === 0) {
                   this._events = this._events.filter(e => e.event !== event);
                }
            }
        };
    }

    /**
     * Removes event listeners matching a specific event and function.
     * Note: This removes *all* listeners for the event that use the exact same function reference.
     * It's often more reliable to use the unsubscribe function returned by 'on'.
     * @param event The name of the event.
     * @param fun The callback function to remove.
     */
    off(event: String | Symbol, fun: (...args: any[]) => void): void {
        const evt = this._events.find(x => x.event === event);

        if (evt) {
            // Filter out listeners where the 'fun' property matches the provided function.
            evt.listeners = evt.listeners.filter(listener => listener.fun !== fun);

            // Optional: If no listeners remain for this event, remove the event entry.
            if (evt.listeners.length === 0) {
                this._events = this._events.filter(e => e.event !== event);
            }
        }
    }

    /**
     * Emits an event, calling all registered listeners.
     * @param event The name of the event.
     * @param args Arguments to pass to the listeners.
     */
    emit(event: String | Symbol, ...args: any[]) {
        const evt = this._events.find(x => x.event === event);
        if (evt) {
            [...evt.listeners].forEach(({ fun, context }) => {
                try {
                    fun.apply(context, args);
                } catch (e) {
                    console.error(`Error during event '${String(event)}' emission:`, e);
                }
            });
        }
    }

    /**
     * Removes all listeners for a specific event.
     * @param event The name of the event.
     */
    removeAllListeners(event: String | Symbol) {
        this._events = this._events.filter(e => e.event !== event);
    }
}

export default Events;