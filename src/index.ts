import axios, { AxiosProgressEvent, AxiosRequestConfig, CancelTokenSource } from "axios";
import fs from "fs/promises";
import Hashids from "hashids";
import Cookies from "js-cookie";
import md5 from "md5";
import moment from "moment";
import { colorNames } from "./colors";
import { hexColorRegex, hslColorRegex, rgbaColorRegex } from "./regexps";
import { FormatNumberParams, SORT, sortOptions } from "./types";
import _ from "./withGlobals";

export { default as PubSub } from "./events";

export type {
    CancelTokenSource, AxiosProgressEvent as UploadProgressEvent
};

    export * from "./types";

export const __SALT : string = `zuzjs-core`

export { default as "_" } from "./withGlobals";

export const numberInRange = (min: number, max: number) => {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

export const toHash = (n: number, len = 6, SALT : string | null = null) : string => new Hashids(SALT || __SALT, len).encode(n)

export const fromHash = ( str : string, SALT : string | null = null ) : number => {
    try{
        const n = new Hashids(SALT || __SALT, +process.env.HASHIDS_LENGTH!).decode(str)
        return n.length >= 0 ? Number(n[0]) : 0
    }
    catch(e){
        return 0
    }
}

export const MD5 = (str: string) => md5(str)

export const uuid = (len: number) => toHash(numberInRange(11111111111, 999999999999))

export const ucfirst = (o: any) => `${o.charAt(0).toUpperCase()}${o.substring(1, o.length)}`

export const urldecode = (str: string) => decodeURIComponent(str.replace(/\+/g, '%20'))

export const urlencode = (str: string) => encodeURIComponent(str)

export const pluralize = (word: string, count : number) => `${word}${count !== 1 ? 's' : ''}`

export const isHexColor = (color : string) : boolean =>  hexColorRegex.test(color)

export const isRgbaColor = (color : string) : boolean => rgbaColorRegex.test(color)

export const isHslColor = (color : string) : boolean => hslColorRegex.test(color)

export const isColorName = (color : string) : boolean => colorNames.includes(color.toLowerCase())

// Function to validate a color string
export const isColor = (color: string) : boolean  => isHexColor(color) || isRgbaColor(color) || isHslColor(color)

export const hexToRgba = (hex: string, alpha: number = 1): string => {
    // Remove the hash symbol if present
    hex = hex.replace(/^#/, '');
  
    // If shorthand hex (#RGB), expand it to full form (#RRGGBB)
    if (hex.length === 3) {
      hex = hex.split('').map(char => char + char).join('');
    }
  
    // Convert to integer values for RGB
    const bigint = parseInt(hex, 16);
    const r = (bigint >> 16) & 255;
    const g = (bigint >> 8) & 255;
    const b = bigint & 255;
  
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export const removeDuplicates = <T>(array: T[]): T[] => {
    return array.reduce((accumulator: T[], currentValue: T) => {
        if (!accumulator.includes(currentValue)) {
            accumulator.push(currentValue);
        }
        return accumulator;
    }, []);
}

export const getCancelToken = () => axios.CancelToken.source();

export const withCredentials = (include: boolean) => axios.defaults.withCredentials = include;

export const withPost = async <T>(
    uri: string,
    data: any, // 'dynamic' usually maps to 'any' or 'Record<string, any>'
    timeout: number = 60,
    ignoreKind = false,
    headers: AxiosRequestConfig['headers'] = {},
    onProgress?: (ev: AxiosProgressEvent) => void
): Promise<T> => {
    
    const _cookies = Cookies.get();
    let finalData = data;
    let contentType = 'application/json';

    // 1. Data Preparation Logic
    if (data instanceof FormData) {
        contentType = 'multipart/form-data';
        for (const [key, value] of Object.entries(_cookies)) {
            data.append(key, value);
        }
    } else if (typeof data === "object" && !Array.isArray(data) && data !== null) {
        // Handle standard objects: inject cookies and timestamp
        finalData = {
            ...data,
            ..._cookies,
            __stmp: Date.now() / 1000
        };
    } else if ( !_(data).isString() ) {
        // If it's not FormData, an Object, or a String, reject immediately
        throw new Error("Unsupported data type for withPost");
    }

    // 2. Single Axios Execution
    try {
        const resp = await axios({
            method: 'post',
            url: uri,
            data: finalData,
            timeout: timeout * 1000,
            headers: {
                'Content-Type': contentType,
                ...headers
            },
            onUploadProgress: onProgress
        });

        // 3. Response Validation
        if (resp.data && (ignoreKind || "kind" in resp.data)) {
            return resp.data as T;
        } else {
            throw resp.data;
        }
    } catch (err: any) {
        // 4. Centralized Error Handling
        if (err?.response?.data) {
            throw err.response.data;
        }

        throw err.code === `ERR_NETWORK`
            ? {
                  error: err.code,
                  message: navigator.onLine
                      ? `Unable to connect to the server. It may be temporarily down.`
                      : `Network error: Unable to connect. Please check your internet connection and try again.`,
              }
            : err;
    }
};

export const withGet = async <T>(
    uri: string, 
    timeout: number = 60, 
    ignoreKind = false,
    headers: AxiosRequestConfig['headers'] = {},
): Promise<T> => {
    try {
        const resp = await axios.get(uri, { 
            timeout: timeout * 1000,
            headers: headers
        });

        if (resp.data && (ignoreKind || "kind" in resp.data)) {
            return resp.data as T;
        } else {
            throw resp.data;
        }
    } catch (err: any) {
        if (err?.response?.data) {
            throw err.response.data;
        }

        throw err.code === `ERR_NETWORK`
            ? {
                  error: err.code,
                  message: navigator.onLine
                      ? `Unable to connect to the server. It may be temporarily down.`
                      : `Network error: Unable to connect. Please check your internet connection and try again.`,
              }
            : err;
    }
}

export const withTime = ( fun : (...args: any[]) => any ) => {
    const start = new Date().getTime()
    const result = fun()
    const end = new Date().getTime()
    return {
        result,
        executionTime: end - start
    }
}

export const time = (stamp?: number, format?: string) => {
    return stamp ? 
        moment.unix(+stamp / 1000).format(format || `YYYY-MM-DD HH:mm:ss`)
        : moment().format(format || `YYYY-MM-DD HH:mm:ss`)
}

export const timeSince = (stamp: number) => moment(stamp).fromNow()

export const arrayRand = (arr: any[]) => arr[Math.floor(Math.random() * arr.length)]

export const formatNumber = ({
    number,
    locale = 'en-US',
    style = `decimal`,
    decimal = 2,
    forceDecimal = false,
    currency
} : FormatNumberParams) => {

    if (style === 'currency' && !currency) {
        throw new TypeError('Currency code is required with currency style.');
    }

    if (currency) {
        const { code, style: currencyStyle, symbol } = currency;
        const out = new Intl.NumberFormat(locale, {
            style: `currency`,
            currency: code,
            currencyDisplay: currencyStyle,
            minimumFractionDigits: forceDecimal ? decimal : +number % 1 > 0 ? decimal : 0,
            maximumFractionDigits: forceDecimal ? decimal : +number % 1 > 0 ? decimal : 0
        }).format(+number);
        return symbol ? out.replace(new RegExp(`\\${code}`, 'g'), symbol) : out;
    }

    return new Intl.NumberFormat(locale, {
        style,
        minimumFractionDigits: forceDecimal ? decimal : +number % 1 > 0 ? 2 : 0,
        maximumFractionDigits:forceDecimal ? decimal : +number % 1 > 0 ? 2 : 0
    }).format(+number);
}

export const formatSize = (bytes : number | string) => {
	const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const _bytes = `string` == typeof bytes ? parseFloat(bytes) : bytes
	if (_bytes == 0) return '0 Byte';
    const _i = Math.floor(Math.log(_bytes) / Math.log(1024))
	const i = `string` == typeof _i ? parseInt(_i) : _i
	const nx = _bytes / Math.pow(1024, i);
	return  nx.toFixed(2) + ' ' + sizes[i];
}

export const copyToClipboard = (text: string) => {
    if (navigator.clipboard && navigator.clipboard.writeText) {
        return navigator.clipboard.writeText(text);
    } else {
        return new Promise((resolve, reject) => {
            const textarea = document.createElement("textarea");
            textarea.value = text;
            textarea.style.position = "fixed";  // Prevent scrolling to bottom of page in MS Edge.
            document.body.appendChild(textarea);
            textarea.focus();
            textarea.select();
            try {
                document.execCommand("copy");
                resolve(`Copied to clipboard`);
            } catch (err) {
                // console.error("Fallback: Oops, unable to copy", err);
                reject(err);
            }
            document.body.removeChild(textarea);
        })
    }
}

export const natsort = (options: sortOptions = {
    direction: SORT.Asc,
    caseSensitive: false,
}) => {

    const ore = /^0/
    const sre = /\s+/g
    const tre = /^\s+|\s+$/g
    // unicode
    const ure = /[^\x00-\x80]/
    // hex
    const hre = /^0x[0-9a-f]+$/i
    // numeric
    const nre = /(0x[\da-fA-F]+|(^[\+\-]?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?(?=\D|\s|$))|\d+)/g
    // datetime
    const dre = /(^([\w ]+,?[\w ]+)?[\w ]+,?[\w ]+\d+:\d+(:\d+)?[\w ]?|^\d{1,4}[\/\-]\d{1,4}[\/\-]\d{1,4}|^\w+, \w+ \d+, \d{4})/ // tslint:disable-line
      
    const GREATER = options.direction == SORT.Desc ? -1 : 1
    const SMALLER = -GREATER
    
    const _normalize = !options.caseSensitive
        ? (s: string | number) => s.toString().toLowerCase().replace(tre, '')
        : (s: string | number) => (`${s}`).replace(tre, '')
      
    const _tokenize = (s: string): string[] => {
        return s.replace(nre, '\0$1\0')
        .replace(/\0$/, '')
        .replace(/^\0/, '')
        .split('\0')
    }
      
    const _parse = (s: string, l: number) => {
        return (!s.match(ore) || l === 1) && 
            parseFloat(s) 
            || s.replace(sre, ' ').replace(tre, '')
            || 0
    }
      
    return function (
        a: string | number,
        b: string | number,
    ): number {
      
        const aa = _normalize(a)
        const bb = _normalize(b)
      
        if (!aa && !bb) {
            return 0
        }
      
        if (!aa && bb) {
            return SMALLER
        }
      
        if (aa && !bb) {
            return GREATER
        }
      
        const aArr = _tokenize(aa)
        const bArr = _tokenize(bb)
      
        // hex or date detection
        const aHex = aa.match(hre)
        const bHex = bb.match(hre)
        const av = (aHex && bHex) ? parseInt(aHex[0], 16) : (aArr.length !== 1 && Date.parse(aa))
        const bv = (aHex && bHex)
            ? parseInt(bHex[0], 16)
            : av && bb.match(dre) && Date.parse(bb) || null
      
        // try and sort Hex codes or Dates
        if (bv) {

            if (av === bv) {
                return 0
            }
      
            if (typeof av === 'number' && typeof bv === 'number' && av < bv) {
              return SMALLER
            }
      
            if (typeof av === 'number' && av > bv) {
              return GREATER
            }

        }
      
        const al = aArr.length
        const bl = bArr.length
      
        // handle numeric strings and default strings
        for (let i = 0, l = Math.max(al, bl); i < l; i += 1) {
      
            const af = _parse(aArr[i] || '', al)
            const bf = _parse(bArr[i] || '', bl)
      
            if (isNaN(af as number) !== isNaN(bf as number)) {
              return isNaN(af as number) ? GREATER : SMALLER
            }
      
            if (ure.test((af as string) + (bf as string)) && (af as string).localeCompare) {
              const comp = (af as string).localeCompare(bf as string)
      
              if (comp > 0) {
                return GREATER
              }
      
              if (comp < 0) {
                return SMALLER
              }
      
              if (i === l - 1) {
                return 0
              }
            }
      
            if (af < bf) {
              return SMALLER
            }
      
            if (af > bf) {
              return GREATER
            }
      
            if (`${af}` < `${bf}`) {
              return SMALLER
            }
      
            if (`${af}` > `${bf}`) {
              return GREATER
            }
        }
      
        return 0
    }
}

export const camelCase = (str: string, ucf = false) => {
    return str
        .toLowerCase()
        .split(/[^a-zA-Z0-9]+/)    // Split by any non-alphanumeric character
        .map((word, index) =>
            index === 0
                ? ucf ? ucfirst(word) : word
                : ucfirst(word)
        )
        .join('');
}

export const camelCaseToDash = (str: string) => str.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase();

export const clamp = (value: number, min: number, max: number): number => {
    return Math.min(Math.max(value, min), max);
};

export const slugify = (text: string, separator: string = "-") => {
    if ( undefined == text ){
        console.log(text, `is undefined`)
        return ``
    }
    return text
      .normalize("NFKD") // Normalize accents (e.g., é → e)
      .replace(/[\u0300-\u036f]/g, "") // Remove diacritic marks
      .toLowerCase()
      .replace(/[^a-z0-9\p{L}\p{N}]+/gu, separator) // Keep letters/numbers from all languages
      .replace(new RegExp(`\\${separator}{2,}`, "g"), separator) // Remove duplicate separators
      .replace(new RegExp(`^\\${separator}|\\${separator}$`, "g"), ""); // Trim separators from ends
};

export const sleep = (ms: number) : Promise<any> => new Promise(resolve => setTimeout(resolve, ms));

export const enumToKeys = <T extends Record<string, any>>(obj: T): Array<keyof T> => Object.keys(obj)
    .filter( (key) => isNaN(Number(key)) ) as Array<keyof typeof obj>

export const exists = async (path: string) => {
    try {
        await fs.access(path);
        return true;
    } catch {
        return false;
    }
};

export const urlBase64ToUint8Array = (base64String: string): Uint8Array => {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}



export const checkPasswordStrength = (password: string): {
    score: number;
    result: string,
    suggestion: string[];
} => {
    const suggestions: string[] = [];
    let score = 0;
  
    if (password.length >= 8) {
      score++;
    } else {
      suggestions.push("Use at least 8 characters");
    }
  
    if (/[a-z]/.test(password)) {
      score++;
    } else {
      suggestions.push("Add lowercase letters");
    }
  
    if (/[A-Z]/.test(password)) {
      score++;
    } else {
      suggestions.push("Add uppercase letters");
    }
  
    if (/\d/.test(password)) {
      score++;
    } else {
      suggestions.push("Include numbers");
    }
  
    if (/[^A-Za-z0-9]/.test(password)) {
      score++;
    } else {
      suggestions.push("Add special characters (e.g. !, @, #)");
    }
  
    return { 
        score, 
        result: score <= 2 ? "Weak" : score == 3 ? "Moderate" : score == 4 ? "Strong" : "Excellent",
        suggestion: suggestions };
}