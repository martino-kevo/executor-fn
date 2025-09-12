// executorV2.d.ts

// =========================
// Options for configuring Executor
// =========================
export type ExecutorOptions<T> = {
    storeHistory?: boolean;
    initialArgs?: any[];
    callNow?: boolean;
    metadataFn?: (value: T) => any;
    maxHistory?: number;
    noDuplicate?: boolean;
    equalityFn?: (a: T, b: T) => boolean;
    onError?: (error: unknown) => void;
    historyStep?: number;
    groupBy?: (value: T) => string;
};

// =========================
// A single history record
// =========================
export type HistoryEntry<T> = {
    value: T;
    meta?: any;
    group?: string;
    _index?: number;
    _time?: number;
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
    exportHistory(): string;
    importHistory(json: string): void;

    // File-based persistence
    exportHistoryToFile(filename?: string): void;
    importHistoryFromFile(): Promise<T>;

    // History management
    clearHistory(): T;
    batch(callback: () => void): void;
    pauseHistory(): void;
    resumeHistory(): void;
    filterHistory(predicate: (entry: HistoryEntry<T>) => boolean): HistoryEntry<T>[];
    split(...ranges: Array<[number, number] | number[]>): Record<string, ExecutorInstance<T>>;

    // Advanced history operations
    copy(histories: HistoryEntry<T>[][]): T;
    merge(
        histories: HistoryEntry<T>[][],
        opts?: { position?: "start" | "end" | number; overwrite?: boolean }
    ): T;
    sort(
        orderOrFn?: "default" | "asc" | "desc" | "groupAsc" | "groupDesc" | ((a: T, b: T) => number)
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
    undo(): any[];
    redo(): any[];
    reset(): any[];
    clearHistory(): any[];
    export(): string[];
    importAll(dataArr: string[]): void;
};

export namespace Executor {
    export function combine(...executors: ExecutorInstance<any>[]): ExecutorGroup;
}
