// Options for configuring Executor
// =========================
// Options for configuring Executor
// =========================
export type ExecutorOptions<T> = {
    storeHistory?: boolean;
    initialArgs?: any[];
    callNow?: boolean;
    metadataFn?: (value: T) => any; // attach metadata to history entries
    maxHistory?: number;            // limit history size
    noDuplicate?: boolean;          // 🆕 prevent duplicates in history
    equalityFn?: (a: T, b: T) => boolean; // skip follow-up duplicate entries
    onError?: (error: unknown) => void;   // gracefully handle errors
    historyStep?: number;           // 🆕 throttle: only save every Nth entry
    groupBy?: (value: T) => string; // 🆕 categorize history entries
};

// =========================
// A single history record
// =========================
export type HistoryEntry<T> = {
    value: T;
    meta?: any;
    group?: string;    // 🆕 optional grouping label
    _index?: number;   // 🆕 insertion index (for restore ordering in sort)
    _time?: number; // 🆕 exact time of insertion
};

// =========================
// Executor instance type
// =========================
export type ExecutorInstance<T> = ((...args: any[]) => Promise<T>) & {
    value: T;
    initialValue: T;
    history?: HistoryEntry<T>[];
    redoStack?: HistoryEntry<T>[];

    // Core
    log(): void;
    reset(): T;
    undo(steps?: number): T;
    redo(steps?: number): T;
    jumpTo(index: number): T | undefined;
    replaceAt(index: number, newValue: T): T | undefined;
    insertAt(index: number, newValue: T): T | undefined;
    removeAt(index: number): T | undefined;

    // Serialization
    serializeHistory(): string;
    deserializeHistory(data: HistoryEntry<T>[]): void;
    exportHistory(): string;                      // full state export (JSON string)
    importHistory(json: string): void;            // full state import (JSON string)

    // File-based persistence 🆕
    exportHistoryToFile(filename?: string): void; // download history as JSON file
    importHistoryFromFile(): Promise<T>;          // restore history from chosen JSON file

    // History management
    clearHistory(): T;
    batch(callback: () => void): void;
    pauseHistory(): void;
    resumeHistory(): void;
    filterHistory(predicate: (entry: HistoryEntry<T>) => boolean): HistoryEntry<T>[]; // query history

    // 🆕 Advanced history ops
    copy(histories: HistoryEntry<T>[][]): T; // overwrite with other histories
    merge(
        histories: HistoryEntry<T>[][],
        opts?: { position?: "start" | "end" | number; overwrite?: boolean }
    ): T;
    sort(
        orderOrFn?: "default" | "asc" | "desc" | ((a: T, b: T) => number)
    ): T;

    // Subscriptions
    _subscribe(cb: () => void): void;
    _unsubscribe(cb: () => void): void;
};

// =========================
// Main Executor function
// =========================
export function Executor<T>(
    callback: (...args: any[]) => T | Promise<T>,
    options?: ExecutorOptions<T>
): ExecutorInstance<T>;

// =========================
// React hook integration
// =========================
export function useExecutor<T>(executor: ExecutorInstance<T>): T;

// =========================
// Combine multiple executors into one group
// =========================
export type ExecutorGroup = {
    undo(): any[];         // returns array of results from each executor
    redo(): any[];         // same
    reset(): any[];        // same
    export(): string[];    // JSON dumps from each executor
    importAll(dataArr: string[]): void; // safer than "import"
};

export namespace Executor {
    export function combine<T>(...executors: ExecutorInstance<T>[]): ExecutorGroup;
}


// Note: This is a simplified type definition. The actual implementation may have more details.
