import { Dispatch, SetStateAction } from "react";

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
    useIndexedDB?: boolean;
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
    value: () => T;
    initialValue: () => T;

    // Core
    log(): Promise<void>;
    reset(): Promise<T>;
    undo(steps?: number): Promise<T>;
    redo(steps?: number): Promise<T>;
    jumpTo(index: number): Promise<T | undefined>;
    replaceAt(index: number, newValue: T): Promise<T | undefined>;
    insertAt(index: number, newValue: T): Promise<T | undefined>;
    removeAt(index: number): Promise<T | undefined>;

    // Serialization
    serializeHistory(): Promise<string>;
    deserializeHistory(data: HistoryEntry<T>[]): Promise<void>;
    exportHistory(): Promise<string>;
    importHistory(json: string): Promise<void>;
    exportHistoryToFile(filename?: string): Promise<void>;
    importHistoryFromFile(): Promise<T>;

    // History management
    getHistory(): Promise<HistoryEntry<T>[]>;
    clearHistory(): Promise<T>;
    batch(callback: () => void): void;
    pauseHistory(): void;
    resumeHistory(): void;
    _subscribe(cb: () => void): void;
    _unsubscribe(cb: () => void): void;

    // Advanced history ops
    copy(histories: HistoryEntry<T>[][]): Promise<T>;
    merge(
        histories: HistoryEntry<T>[][],
        opts?: { position?: "start" | "end" | number; overwrite?: boolean }
    ): Promise<T>;
    sort(
        orderOrFn?: "default" | "asc" | "desc" | ((a: T, b: T) => number)
    ): Promise<T>;
    split(...ranges: Array<[number, number] | number[]>): Promise<Record<string, ExecutorInstance<T>>>;
};

// =========================
// Main Executor function
// =========================
export default function ExecutorV2<T>(
    callback: (...args: any[]) => T | Promise<T>,
    options?: ExecutorOptions<T>
): ExecutorInstance<T>;

// =========================
// React hook integration
// =========================
export function useExecutor<T>(executor: ExecutorInstance<T>): T;

// =========================
// ExecutorGroup
// =========================
export type ExecutorGroup = {
    undo(): Promise<any[]>;
    redo(): Promise<any[]>;
    reset(): Promise<any[]>;
    clearHistory(): Promise<any[]>;
    export(): Promise<string[]>;
    importAll(dataArr: string[]): Promise<void>;
};

export function combineExecutors(...executors: ExecutorInstance<any>[]): ExecutorGroup;
