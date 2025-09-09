// Options for configuring Executor
export type ExecutorOptions<T> = {
    storeHistory?: boolean;
    initialArgs?: any[];
    callNow?: boolean;
    metadataFn?: (value: T) => any; // attach metadata to history entries
    maxHistory?: number;            // limit history size
    equalityFn?: (a: T, b: T) => boolean; // skip duplicate entries
    onError?: (error: unknown) => void;   // gracefully handle errors
    historyStep?: number;           // 🆕 throttle: only save every Nth entry
    groupBy?: (value: T) => string; // 🆕 categorize history entries
};

// A single history record
export type HistoryEntry<T> = {
    value: T;
    meta?: any;
    group?: string; // 🆕 optional grouping label
};

// Executor instance type
export type ExecutorInstance<T> = ((...args: any[]) => Promise<T>) & {
    value: T;
    initialValue: T;
    history?: HistoryEntry<T>[];
    redoStack?: HistoryEntry<T>[];
    log(): void;
    reset(): T;
    undo(steps?: number): T;
    redo(steps?: number): T;
    jumpTo(index: number): T | undefined;
    replaceAt(index: number, newValue: T): T | undefined;
    insertAt(index: number, newValue: T): T | undefined;
    removeAt(index: number): T | undefined;
    serializeHistory(): string;
    deserializeHistory(data: HistoryEntry<T>[]): void;
    exportHistory(): string;                 // 🆕 full state export
    importHistory(json: string): void;       // 🆕 full state import
    clearHistory(): T;
    batch(callback: () => void): void;
    pauseHistory(): void;
    resumeHistory(): void;
    filterHistory(predicate: (entry: HistoryEntry<T>) => boolean): HistoryEntry<T>[]; // 🆕 query history
    _subscribe(cb: () => void): void;
    _unsubscribe(cb: () => void): void;
};

// Main Executor function
export default function Executor<T>(
    callback: (...args: any[]) => T | Promise<T>,
    options?: ExecutorOptions<T>
): ExecutorInstance<T>;

// React hook integration for subscriptions
export function useExecutor<T>(executor: ExecutorInstance<T>): T;

// 🆕 Combine multiple executors into one group
export type ExecutorGroup = {
    undo(): void;
    redo(): void;
    reset(): void;
    export(): string[];
    import(dataArr: string[]): void;
};

export declare namespace Executor {
    function combine<T>(...executors: ExecutorInstance<T>[]): ExecutorGroup;
}


// Note: This is a simplified type definition. The actual implementation may have more details.
