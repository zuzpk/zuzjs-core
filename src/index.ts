import axios, { AxiosProgressEvent, AxiosRequestConfig, AxiosResponse, CancelTokenSource } from "axios";
import fs from "fs/promises";
import Hashids from "hashids";
import Cookies from "js-cookie";
import md5 from "md5";
import moment from "moment";
import { nanoid } from "nanoid";
import { colorNames } from "./colors";
import { hexColorRegex, hslColorRegex, rgbaColorRegex } from "./regexps";
import { dynamic, FormatNumberParams, SORT, sortOptions, WithHttpOptions } from "./types";
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

export const uuid2 = (len: number) => nanoid(len)

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

export const removeDuplicateWords = (text: string): string => {
  if (!text.trim()) return '';

  // Split on any whitespace (handles multiple spaces, tabs, newlines)
  const words = text.split(/\s+/).filter(Boolean);

  // Use your existing function
  const uniqueWords = removeDuplicates(words);

  return uniqueWords.join(' ');
};

export const getCancelToken = () => axios.CancelToken.source();

export const withCredentials = (include: boolean) => axios.defaults.withCredentials = include;


const buildNetworkError = (err: any) => {
    const hasNavigator = typeof navigator !== 'undefined';
    const online = hasNavigator ? navigator.onLine : true;
    return {
        error: err?.code ?? 'ERR_NETWORK',
        message: online
            ? `Unable to connect to the server. It may be temporarily down.`
            : `Network error: Unable to connect. Please check your internet connection and try again.`,
    };
};

type WithRawResponseOptions = WithHttpOptions & {
    returnRawResponse: true;
};

type WithParsedResponseOptions = WithHttpOptions & {
    returnRawResponse?: false | undefined;
};

const normalizeHttpOptions = (
    timeoutOrOptions: number | WithHttpOptions = 60,
    ignoreKind = false,
    headers: AxiosRequestConfig['headers'] = {},
    onProgress?: (ev: AxiosProgressEvent) => void,
): Required<Pick<WithHttpOptions, 'timeout' | 'ignoreKind' | 'appendCookiesToBody' | 'appendTimestamp'>> & WithHttpOptions => {
    if (typeof timeoutOrOptions === 'object' && timeoutOrOptions !== null) {
        return {
            timeout: timeoutOrOptions.timeout ?? 60,
            ignoreKind: timeoutOrOptions.ignoreKind ?? false,
            headers: timeoutOrOptions.headers ?? {},
            onProgress: timeoutOrOptions.onProgress,
            withCredentials: timeoutOrOptions.withCredentials,
            returnRawResponse: timeoutOrOptions.returnRawResponse,
            appendCookiesToBody: timeoutOrOptions.appendCookiesToBody ?? true,
            appendTimestamp: timeoutOrOptions.appendTimestamp ?? true,
        };
    }

    return {
        timeout: timeoutOrOptions,
        ignoreKind,
        headers,
        onProgress,
        appendCookiesToBody: true,
        appendTimestamp: true,
    };
};

const normalizePostBody = (data: any, options: ReturnType<typeof normalizeHttpOptions>) => {
    const cookies = Cookies.get();
    let finalData = data;
    let contentType = 'application/json';

    if (data instanceof FormData) {
        contentType = 'multipart/form-data';
        if (options.appendCookiesToBody) {
            for (const [key, value] of Object.entries(cookies)) {
                data.append(key, value);
            }
        }
    } else if (typeof data === 'object' && !Array.isArray(data) && data !== null) {
        finalData = {
            ...data,
            ...(options.appendCookiesToBody ? cookies : {}),
            ...(options.appendTimestamp ? { __stmp: Date.now() / 1000 } : {}),
        };
    } else if (!_(data).isString()) {
        throw new Error('Unsupported data type for withPost/withPut/withPatch');
    }

    return {
        finalData,
        contentType,
    };
};

const finalizeHttpResponse = <T = dynamic>(
    resp: AxiosResponse,
    options: ReturnType<typeof normalizeHttpOptions>,
): T | AxiosResponse<T> => {
    if (options.returnRawResponse) {
        return resp as AxiosResponse<T>;
    }

    if (resp.data && (options.ignoreKind || 'kind' in resp.data)) {
        return resp.data as T;
    }

    throw resp.data;
};

const executeHttp = async <T = dynamic>(request: AxiosRequestConfig, options: ReturnType<typeof normalizeHttpOptions>): Promise<T | AxiosResponse<T>> => {
    try {
        const resp = await axios(request);
        return finalizeHttpResponse<T>(resp, options);
    } catch (err: any) {
        if (err?.response?.data) {
            throw err.response.data;
        }

        if (err?.code === 'ERR_NETWORK') {
            throw buildNetworkError(err);
        }

        throw err;
    }
};

export function withPost<T = dynamic>(
    uri: string,
    data: any,
    timeoutOrOptions: WithRawResponseOptions,
): Promise<AxiosResponse<T>>;
export function withPost<T = dynamic>(
    uri: string,
    data: any,
    timeoutOrOptions?: number | WithParsedResponseOptions,
    ignoreKind?: boolean,
    headers?: AxiosRequestConfig['headers'],
    onProgress?: (ev: AxiosProgressEvent) => void,
): Promise<T>;
export async function withPost<T = dynamic>(
    uri: string,
    data: any,
    timeoutOrOptions: number | WithHttpOptions = 60,
    ignoreKind = false,
    headers: AxiosRequestConfig['headers'] = {},
    onProgress?: (ev: AxiosProgressEvent) => void,
): Promise<T | AxiosResponse<T>> {
    const options = normalizeHttpOptions(timeoutOrOptions, ignoreKind, headers, onProgress);
    const { finalData, contentType } = normalizePostBody(data, options);

    return executeHttp<T>({
        method: 'post',
        url: uri,
        data: finalData,
        timeout: options.timeout * 1000,
        withCredentials: options.withCredentials,
        headers: {
            'Content-Type': contentType,
            ...(options.headers ?? {}),
        },
        onUploadProgress: options.onProgress,
    }, options);
}

export function withGet<T = dynamic>(
    uri: string,
    timeoutOrOptions: WithRawResponseOptions,
): Promise<AxiosResponse<T>>;
export function withGet<T = dynamic>(
    uri: string,
    timeoutOrOptions?: number | WithParsedResponseOptions,
    ignoreKind?: boolean,
    headers?: AxiosRequestConfig['headers'],
): Promise<T>;
export async function withGet<T = dynamic>(
    uri: string,
    timeoutOrOptions: number | WithHttpOptions = 60,
    ignoreKind = false,
    headers: AxiosRequestConfig['headers'] = {},
): Promise<T | AxiosResponse<T>> {
    const options = normalizeHttpOptions(timeoutOrOptions, ignoreKind, headers);
    return executeHttp<T>({
        method: 'get',
        url: uri,
        timeout: options.timeout * 1000,
        withCredentials: options.withCredentials,
        headers: options.headers,
    }, options);
}

export function withPut<T = dynamic>(
    uri: string,
    data: any,
    timeoutOrOptions: WithRawResponseOptions,
): Promise<AxiosResponse<T>>;
export function withPut<T = dynamic>(
    uri: string,
    data: any,
    timeoutOrOptions?: number | WithParsedResponseOptions,
    ignoreKind?: boolean,
    headers?: AxiosRequestConfig['headers'],
    onProgress?: (ev: AxiosProgressEvent) => void,
): Promise<T>;
export async function withPut<T = dynamic>(
    uri: string,
    data: any,
    timeoutOrOptions: number | WithHttpOptions = 60,
    ignoreKind = false,
    headers: AxiosRequestConfig['headers'] = {},
    onProgress?: (ev: AxiosProgressEvent) => void,
): Promise<T | AxiosResponse<T>> {
    const options = normalizeHttpOptions(timeoutOrOptions, ignoreKind, headers, onProgress);
    const { finalData, contentType } = normalizePostBody(data, options);

    return executeHttp<T>({
        method: 'put',
        url: uri,
        data: finalData,
        timeout: options.timeout * 1000,
        withCredentials: options.withCredentials,
        headers: {
            'Content-Type': contentType,
            ...(options.headers ?? {}),
        },
        onUploadProgress: options.onProgress,
    }, options);
}

export function withPatch<T = dynamic>(
    uri: string,
    data: any,
    timeoutOrOptions: WithRawResponseOptions,
): Promise<AxiosResponse<T>>;
export function withPatch<T = dynamic>(
    uri: string,
    data: any,
    timeoutOrOptions?: number | WithParsedResponseOptions,
    ignoreKind?: boolean,
    headers?: AxiosRequestConfig['headers'],
    onProgress?: (ev: AxiosProgressEvent) => void,
): Promise<T>;
export async function withPatch<T = dynamic>(
    uri: string,
    data: any,
    timeoutOrOptions: number | WithHttpOptions = 60,
    ignoreKind = false,
    headers: AxiosRequestConfig['headers'] = {},
    onProgress?: (ev: AxiosProgressEvent) => void,
): Promise<T | AxiosResponse<T>> {
    const options = normalizeHttpOptions(timeoutOrOptions, ignoreKind, headers, onProgress);
    const { finalData, contentType } = normalizePostBody(data, options);

    return executeHttp<T>({
        method: 'patch',
        url: uri,
        data: finalData,
        timeout: options.timeout * 1000,
        withCredentials: options.withCredentials,
        headers: {
            'Content-Type': contentType,
            ...(options.headers ?? {}),
        },
        onUploadProgress: options.onProgress,
    }, options);
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

export const time = (stamp?: number | Date | string, format?: string) => {

    const defaultFormat = format || `YYYY-MM-DD HH:mm:ss`;

    if (!stamp) {
        return moment().format(defaultFormat);
    }

    // 1. Handle Date objects
    if (stamp instanceof Date) {
        return moment(stamp).format(defaultFormat);
    }

    // 2. Handle ISO Strings (e.g., "2026-03-16T..." or "2026-03-16")
    if (typeof stamp === 'string' && isNaN(Number(stamp))) {
        return moment(stamp).format(defaultFormat);
    }

    // 3. Handle Numbers or Stringified Numbers (Timestamps)
    // We check if it's likely milliseconds (13 digits) or seconds (10 digits)
    const numericStamp = Number(stamp);
    const isMilliseconds = numericStamp > 9999999999; 
    
    return isMilliseconds 
        ? moment(numericStamp).format(defaultFormat) 
        : moment.unix(numericStamp).format(defaultFormat);
};

export const timeSince = (stamp: number | Date | string) => {
    
    // 1. Handle Date objects
    if (stamp instanceof Date) {
        return moment(stamp).fromNow();
    }

    // 2. Handle ISO Strings or non-numeric strings
    if (typeof stamp === 'string' && isNaN(Number(stamp))) {
        return moment(stamp).fromNow();
    }

    // 3. Handle Numbers (Timestamps)
    const numericStamp = Number(stamp);
    const isMilliseconds = numericStamp > 9999999999;

    return isMilliseconds 
        ? moment(numericStamp).fromNow() 
        : moment.unix(numericStamp).fromNow();
};

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

export const withDelay = (callback: (value: any) => void, delay?: number) => setTimeout(callback, delay || 1_000)

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

export const urlBase64ToUint8Array = (base64String: string | null | undefined): Uint8Array => {
    const normalizedBase64String = (base64String ?? '').trim();

    if (normalizedBase64String.length === 0) {
        return new Uint8Array(0);
    }

    const padding = '='.repeat((4 - normalizedBase64String.length % 4) % 4);
    const base64 = (normalizedBase64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export const checkPasswordStrength = (password: string | null | undefined): {
    score: number;
    result: string,
    suggestion: string[];
} => {
    
    const normalizedPassword = password ?? "";
    const suggestions: string[] = [];
    let score = 0;
  
    if (normalizedPassword.length >= 8) {
      score++;
    } else {
      suggestions.push("Use at least 8 characters");
    }
  
        if (/[a-z]/.test(normalizedPassword)) {
      score++;
    } else {
      suggestions.push("Add lowercase letters");
    }
  
        if (/[A-Z]/.test(normalizedPassword)) {
      score++;
    } else {
      suggestions.push("Add uppercase letters");
    }
  
        if (/\d/.test(normalizedPassword)) {
      score++;
    } else {
      suggestions.push("Include numbers");
    }
  
        if (/[^A-Za-z0-9]/.test(normalizedPassword)) {
      score++;
    } else {
      suggestions.push("Add special characters (e.g. !, @, #)");
    }
  
    return { 
        score, 
        result: score <= 2 ? "Weak" : score == 3 ? "Moderate" : score == 4 ? "Strong" : "Excellent",
        suggestion: suggestions };
}

export const escapeRegex = (str: string): string => {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export const removeWords = (text: string, wordsToRemove: string[]): string => {

  if (wordsToRemove.length === 0) return text.trim();

  const escaped = wordsToRemove
    .map(w => w.trim())
    .filter(Boolean)
    .map(escapeRegex);

  if (escaped.length === 0) return text.trim();

  const pattern = new RegExp(`\\b(${escaped.join('|')})\\b`, 'gi');

  return text
    .replace(pattern, '')
    .replace(/\s+/g, ' ')
    .trim();

}

export const getCookie = (key: string, json: boolean = false) => {
    const g = Cookies.get(key)
    if ( g ){
        return json ? JSON.parse(g) : g
    }
    return null
}

export const removeCookie = (key: string) => Cookies.remove(key)

export const setCookie = ({ 
    key, 
    value, 
    json = false,
    path = `/`,
    expires,
    domain,
    secure,
    sameSite
} : {
    key: string;
    value: string | object; 
    json: boolean;
    expires?: number | Date | undefined;
    path?: string | undefined;
    domain?: string | undefined;
    secure?: boolean | undefined;
    sameSite?: "strict" | "Strict" | "lax" | "Lax" | "none" | "None" | undefined;
}) => {
    try{
    Cookies.set(
        key, 
        json || typeof value === 'object' ? JSON.stringify(value) : value,
        {
            expires, path, domain, secure, sameSite
        }
    )
}    catch(e){
    console.log(`--- Error setting cookie`, e)
}
}