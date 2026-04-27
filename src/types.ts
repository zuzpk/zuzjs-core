import { AxiosProgressEvent, AxiosRequestConfig } from "axios"

export type dynamic = { 
    [x: string] : any 
}

export interface FormatNumberParams {
    number: number | string
    locale?: string
    style?: `decimal` | `currency` | `percent`,
    decimal?: number,
    forceDecimal?: boolean,
    currency?: {
        code: string
        style: `symbol` | `code` | `name`
        symbol?: string
    }
}

export enum SORT {
    Asc = "ASC",
    Desc = "DESC"
}

export type sortOptions = {
    direction?: SORT,
    caseSensitive?: boolean,
}

export interface EventListener {
    fun: (...args: any[]) => void;
    context?: any;
    id: symbol; // Unique ID for each listener
}

export type WithHttpOptions = {
    timeout?: number;
    ignoreKind?: boolean;
    headers?: AxiosRequestConfig['headers'];
    onProgress?: (ev: AxiosProgressEvent) => void;
    withCredentials?: boolean;
    returnRawResponse?: boolean;
    appendCookiesToBody?: boolean;
    appendTimestamp?: boolean;
};

export interface ColorPalette {
    
    // Core Brand / Action
    primary: string,
    onPrimary: string,

    // Background & Surface
    background: string,
    surface: string,
    
    // Typography
    foreground: string,
    
    // Lower contrast for secondary info
    muted: string,

    // UI Elements
    border: string,
    
    // Interaction States
    hover: string,
    active: string,

    // Transparent variants for overlays/ghost buttons
    ghost: string,
    
}