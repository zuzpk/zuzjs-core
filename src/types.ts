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