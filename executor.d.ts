export type ExecutorOptions<T> = {
    storeHistory?: boolean;
    initialArgs?: any[];
    callNow?: boolean;
    metadataFn?: (value: T) => any; // attach metadata to history entries
    maxHistory?: number; // limit history size
    equalityFn?: (a: T, b: T) => boolean; // skip duplicate entries
    onError?: (error: unknown) => void; // gracefully handle errors
};

export type HistoryEntry<T> = {
    value: T;
    meta?: any;
};

// The full return type of Executor
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
    clearHistory(): T;
    batch(callback: () => void): void;
    pauseHistory(): void;
    resumeHistory(): void;
    _subscribe(cb: () => void): void;
    _unsubscribe(cb: () => void): void;
};

export default function Executor<T>(
    callback: (...args: any[]) => T | Promise<T>,
    options?: ExecutorOptions<T>
): ExecutorInstance<T>;

// React hook integration for subscriptions
export function useExecutor<T>(executor: ExecutorInstance<T>): T;

// Note: This is a simplified type definition. The actual implementation may have more details.
