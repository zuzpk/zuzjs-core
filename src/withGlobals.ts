import ipRegex from 'ip-regex';

class withGlobals {
    
    _: any;

    constructor(value: any){
        this._ = value
    }

    isIP(){
        return this.isIPv4() || this.isIPv6()
    }

    isIPv4(){
        return ipRegex.v4({exact: true}).test(this._)
    }
    
    isIPv6(){
        return ipRegex.v6({exact: true}).test(this._)
    }

    isTypeof(v: any){
        return typeof this._ === typeof v
    }

    isFunction(){
        return typeof this._ === "function"
    }

    isArray(){
        return Array.isArray(this._)
    }

    isNull(){ 
        return this._ === null
    }

    isString(){
        return typeof this._ === "string"
    }

    isNumber(){
        return /^[+-]?\d+(\.\d+)?$/.test(this._ as any)
    }

    isObject(){
        return typeof this._ === "object" && !Array.isArray(this._) && this._ !== null
    }

    isEmpty(){
        if (Array.isArray(this._)) return this._.length === 0
        if (typeof this._ === "object" && this._ !== null) return Object.keys(this._).length === 0
        return this._ === "" || String(this._).length === 0
    }

    isEmail(){ 
        return typeof this._ === "string" && /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/.test(this._)
    }

    isUrl(){
        return typeof this._ === "string" && /^(https?:\/\/)?(www\.)?([a-zA-Z0-9-]+\.)+[a-zA-Z]{2,}(\/[^\s]*)?$/.test(this._)
    }

    toLowerCase(){
        this._ = typeof this._ === "string" ? this._.toLowerCase() : String(this._).toLowerCase()
        return this
    }

    /**
     * Performs a deep equality check for arrays and objects, otherwise a strict equality check.
     * @param v The value to compare against.
     * @returns {boolean} True if the values are equal, false otherwise.
     */
    equals(v : any){

        const a = this._;
        const b = v;

        // Helper function for deep equality
        const deepEqual = (val1: any, val2: any): boolean => {
            // If both are strictly equal, they are equal (handles primitives, null, undefined)
            if (val1 === val2) {
                return true;
            }

            // If one is null or not an object, and they are not strictly equal, they are not equal
            if (val1 === null || typeof val1 !== 'object' ||
                val2 === null || typeof val2 !== 'object') {
                return false;
            }

            // Check if both are arrays
            if (Array.isArray(val1) && Array.isArray(val2)) {
                if (val1.length !== val2.length) {
                    return false;
                }
                for (let i = 0; i < val1.length; i++) {
                    if (!deepEqual(val1[i], val2[i])) {
                        return false;
                    }
                }
                return true;
            }

            // Check if both are objects (and not arrays, handled above)
            if (this.isObjectValue(val1) && this.isObjectValue(val2)) {
                const keys1 = Object.keys(val1);
                const keys2 = Object.keys(val2);

                if (keys1.length !== keys2.length) {
                    return false;
                }

                for (const key of keys1) {
                    if (!keys2.includes(key) || !deepEqual(val1[key], val2[key])) {
                        return false;
                    }
                }
                return true;
            }

            // If types don't match (e.g., one is array, one is object) or other complex types not handled
            return false;
        };

        // Helper to check if a value is a plain object (not null and not an array)
        const isObjectValue = (val: any) => typeof val === 'object' && val !== null && !Array.isArray(val);
        this.isObjectValue = isObjectValue; // Temporarily add to context for deepEqual to access

        // Main logic for the equals method
        if (Array.isArray(a) && Array.isArray(b)) {
            return deepEqual(a, b);
        }

        if (isObjectValue(a) && isObjectValue(b)) {
            return deepEqual(a, b);
        }

        // For all other types, use strict equality
        return a === b;
    }

    // Helper method to determine if a value is a plain object (not null and not an array)
    // This is added as a class method for better encapsulation and reusability if needed elsewhere.
    private isObjectValue(val: any): boolean {
        return typeof val === 'object' && val !== null && !Array.isArray(val);
    }

    ucfirst(){
        this._ = typeof this._ === "string" ? this._.charAt(0).toUpperCase() + this._.slice(1) : this._
        return this
    }

    formatString(v: string | number, ...vv: (string | number)[]){
        if (typeof this._ !== "string") this._ = "";
        const values = [v, ...vv];
        this._ = this._.replace(/%(\d+)/g, (inp: any, index: any) => values[Number(index)]?.toString() || `%${index}`)
        return this
    }

    camelCase(){
        this._ = typeof this._ === "string"
            ?   this._
                  .split(/[^a-zA-Z0-9]+/)
                  .map((word, index) =>
                      index === 0 ? word : word.charAt(0).toUpperCase() + word.slice(1)
                  )
                  .join("")
            : this._
        return this
    }

    /**
     * Sorts the keys of the internal object in ascending or descending order.
     * If the internal value is not an object, it remains unchanged.
     * @param order The sort order: 'asc' for ascending (default), 'desc' for descending.
     * @returns {this} The current instance for chaining.
     */
    sort(order: 'asc' | 'desc' = 'asc'): this {
        if (!this.isObject()) {
            console.warn("sortKeys can only be applied to objects. Current value is not an object.");
            return this;
        }

        const obj = this._;
        const sortedKeys = Object.keys(obj).sort((a, b) => {
            if (order === 'desc') {
                return b.localeCompare(a);
            }
            return a.localeCompare(b);
        });

        const sortedObject: { [key: string]: any } = {};
        for (const key of sortedKeys) {
            sortedObject[key] = obj[key];
        }

        this._ = sortedObject;
        return this;
    }

    value(){ return this._ }

    valueOf(){ return this._ }

    toString(){ return String(this._) }

    [Symbol.toPrimitive](hint: string){
        if (hint === "number") return Number(this._);
        if (hint === "boolean") return Boolean(this._);
        return String(this._);
    }

}

const _ = <T>(value: T) => new withGlobals(value);

export default _