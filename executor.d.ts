// Options for configuring Executor
// =========================
// Options for configuring Executor
// =========================
export type ExecutorOptions<T> = {
    /**
     * Enable or disable history tracking
     */
    storeHistory?: boolean;

    /**
     * initial argument for the executor if callNow is true
     */
    initialArgs?: any[];

    /**
     * Immediately invoke the executor with or without 
     * initialArgs upon creation
     */
    callNow?: boolean;

    /**
     * Attach metadata to each history entry
     */
    metadataFn?: (value: T) => any;

    /**
     * Maximum number of history entries to keep
     */
    maxHistory?: number;

    /**
     * Prevent duplicates in history
     */
    noDuplicate?: boolean;

    /**
     * Skip adding to history if the new value is equal to the last one
     * based on a custom equality function
     * @param a Last value in history
     * @param b New value to compare
     * @returns Boolean indicating if values are equal
     */
    equalityFn?: (a: T, b: T) => boolean;

    /**
     * Gracefully handle errors during executor invocation
     * @param error The error object caught during execution
     * @returns Void
     */
    onError?: (error: unknown) => void;

    /**
     * Throttle history entries by only saving every Nth entry
     * @default 1 (save every entry)
     */
    historyStep?: number;

    /**
     * Group / categorize history entries by a custom function
     * @param value The value to categorize
     * @returns A string label for the group
     */
    groupBy?: (value: T) => string; // 🆕 categorize history entries
};

// =========================
// A single history record
// =========================
export type HistoryEntry<T> = {
    /**
     * The value stored in history
     */
    value: T;

    /**
     * Optional metadata associated with this history entry
     */
    meta?: any;

    /**
     * Optional grouping label for categorizing entries
     */
    group?: string;

    /**
     * Internal use: insertion index to restore original order when sorting
     */
    _index?: number;

    /**
     * Internal use: timestamp of when the entry was added
     */
    _time?: number; // 🆕 exact time of insertion
};

// =========================
// Executor instance type
// =========================
export type ExecutorInstance<T> = ((...args: any[]) => Promise<T>) & {
    /**
     * Property: current value managed by the executor
     */
    value: T;

    /**
     * Property: initial value provided at creation time from initialArgs
     */
    initialValue: T;

    /**
     * Property: the history if enabled
     */
    history?: HistoryEntry<T>[];

    /**
     * Property: redo stack for redo actions
     */
    redoStack?: HistoryEntry<T>[];

    // Core
    /**
     * Log the current value to console (for debugging)
     * @returns void
     */
    log(): void;
    /**
     * Reset to initial value and clear history if initialArgs was provided
     * @returns The initial value or undefined if no initialArgs
     */
    reset(): T | undefined;
    /**
     * Undo the last action(s) and revert to previous value
     * @param steps Number of steps to undo (default 1)
     * @returns The new current value after undo
     */
    undo(steps?: number): T;
    /**
     * Redo the last undone action(s)
     * @param steps Number of steps to redo (default 1)
     * @returns The new current value after redo
     */
    redo(steps?: number): T;
    /**
     * Jump to a specific history index value
     * @param index Index in history to jump to
     * @returns The value at that history index or current value 
     * if out of / below bounds
     */
    jumpTo(index: number): T | undefined;
    /**
     * Replace a specific history index value with a new one
     * @param index Index in history to replace
     * @param newValue The new value to set at that index
     * @returns The replaced value or current value 
     * if out of / below bounds
     */
    replaceAt(index: number, newValue: T): T | undefined;
    /**
     * Insert a new value at a specific history index
     * @param index Index in history to insert at
     * @param newValue New value to insert
     * @returns The inserted value or current value 
     * if index is out of / below bounds
     */
    insertAt(index: number, newValue: T): T | undefined;
    /**
     * Remove a history entry at a specific index
     * @param index Index in history to remove
     * @returns The last value or inititial value. 
     * if index is out of / below bounds, the current value is returned
     */
    removeAt(index: number): T | undefined;

    // Serialization
    /**
     * Serialize the history to a JSON string
     * @returns JSON string representing the history
     */
    serializeHistory(): string;
    /**
     * Restore / deserialize history from an array of history entries
     * @param data Array of history entries to restore
     * @returns void
     */
    deserializeHistory(data: HistoryEntry<T>[]): void;
    /**
     * Export the full history state as a JSON string
     * @returns JSON string of the full history state
     */
    exportHistory(): string;
    /**
     * Import the full history state from a JSON string
     * @param json JSON string representing the full history state to import
     * @returns void
     */
    importHistory(json: string): void;

    // File-based persistence 🆕
    /**
     * Download the current history on computer as a JSON file
     * @param filename Optional filename for the downloaded history file (default "executor-history.json")
     * @returns void
     */
    exportHistoryToFile(filename?: string): void;
    /**
     * Open a file dialog to select a JSON file and restore history from it
     * @returns Promise that resolves to the current value after import
     */
    importHistoryFromFile(): Promise<T>;

    // History management
    /**
     * Clear the entire history and redo stack and reset to current value
     * not initial value (reset() does that)
     * @returns The current value (unchanged)
     */
    clearHistory(): T;
    /**
     * Performs multiple executor calls
     * while batching history into a single entry
     * @param callback Function to invoke multiple calls eg., count() multiple times
     * one history entry will be created
     * @returns void
     */
    batch(callback: () => void): void;
    /**
     * Pause history tracking
     * @returns void
     */
    pauseHistory(): void;
    /**
     * Resume history tracking
     * @returns void
     */
    resumeHistory(): void;
    /**
     * Filter history entries based on a predicate function and 
     * predicate object
     * @param predicate Function / object to filter history entries
     * @returns Array of history entries that match the predicate
     */
    filterHistory(predicate: (entry: HistoryEntry<T>) => boolean): HistoryEntry<T>[]; // query history
    /**
     * Split history into multiple Executor instances based on index ranges or specific indices
     * @param ranges Array of index ranges or specific indices to split history
     * @returns Object mapping range labels to new Executor instances with that history
     */
    split(...ranges: Array<[number, number] | number[]>): Record<string, ExecutorInstance<T>>; // split into multiple executors

    // 🆕 Advanced history ops
    /**
     * Copy history entries from other Executor instances and overwrite current history
     * @param histories Other histories to copy from and overwrite current history
     * @returns The current value (unchanged)
     */
    copy(histories: HistoryEntry<T>[][]): T; // overwrite with other histories
    /**
     * Merge history entries from other Executor instances into current history
     * @param histories Other histories to merge into current history
     * @param opts Position to insert ("start", "end", or specific index) and whether to overwrite existing entries
     * @returns The current value (unchanged)
     */
    merge(
        histories: HistoryEntry<T>[][],
        opts?: { position?: "start" | "end" | number; overwrite?: boolean }
    ): T;
    /**
     * Sort history entries by various criteria
     * @param orderOrFn Sort history entries by "default" (insertion order), "asc", "desc", "groupAsc", 
     * "groupDesc", or a custom comparator function
     * @returns The current value (unchanged)
     */
    sort(
        orderOrFn?: "default" | "asc" | "desc" | "groupAsc" | "groupDesc" | ((a: T, b: T) => number)
    ): T;

    // Subscriptions
    /**
     * Subscribe to value changes
     * @param cb Callback function to invoke on value changes
     * @returns void
     */
    _subscribe(cb: () => void): void;
    /**
     * Unsubscribe from value changes
     * @param cb Callback function to remove from subscriptions
     * @returns void
     */
    _unsubscribe(cb: () => void): void;
};

// =========================
// Main Executor function
// =========================
/**
 * Executor function to create an instance that manages function execution,
 * value tracking, and history management
 * @param callback The main function to execute, can return a value or a Promise
 * @param options Options to configure history tracking and behavior
 * @returns An ExecutorInstance with callable function and history methods
 */
export function Executor<T>(
    callback: (...args: any[]) => T | Promise<T>,
    options?: ExecutorOptions<T>
): ExecutorInstance<T>;

// =========================
// React hook integration
// =========================
/**
 * React hook to use an Executor instance and auto re-render on value changes
 * @param executor An Executor instance created by the Executor function
 * @param fullPower Optionally return the full Executor instance with methods instead of just the value
 * @returns The current value managed by the executor or the full Executor instance if fullPower is true
 */
export function useExecutor<T>(executor: ExecutorInstance<T>, fullPower?: boolean): T | ExecutorInstance<T>;

// =========================
// Combine multiple executors into one group
// =========================
export type ExecutorGroup = {
    undo(): any[];         // returns array of results from each executor
    redo(): any[];         // same
    reset(): any[];        // same
    clearHistory(): any[];        // same
    export(): string[];    // JSON dumps from each executor
    importAll(dataArr: string[]): void; // safer than "import"
};

export namespace Executor {
    /**
     * Combine multiple Executor instances into a single group and 
     * use history methods across all of them
     * @param executors Multiple Executor instances to combine into a group
     * @returns An ExecutorGroup with combined history methods
     */
    export function combine(...executors: ExecutorInstance<any>[]): ExecutorGroup;
}


// Note: This is a simplified type definition. The actual implementation may have more details.
