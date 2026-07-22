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

    /**
     * Pre-populate history at construction time instead of via calls.
     * Used internally by split(); also available directly if you want to
     * hydrate an executor from previously exported state without
     * replaying calls. fn.value is set to the last entry, fn.initialValue
     * (the reset() target) to the first entry unless seedValue overrides it.
     */
    seedHistory?: HistoryEntry<T>[];

    /**
     * Explicit initialValue / reset() target to pair with seedHistory.
     * Defaults to seedHistory's first entry's value if omitted.
     */
    seedValue?: T;

    /**
     * If set, history auto-saves under this key and auto-restores on
     * construction (taking priority over seedHistory/callNow when a saved
     * session exists).
     */
    persistKey?: string;

    /**
     * Storage adapter for persistKey. Needs getItem(key) and
     * setItem(key, value); either can return a value directly (localStorage)
     * or a Promise (e.g. an IndexedDB wrapper) — both are supported.
     * @default an IndexedDB-backed adapter, when IndexedDB is available
     */
    persistStorage?: {
        getItem: (key: string) => string | null | undefined | Promise<string | null | undefined>;
        setItem: (key: string, value: string) => void | Promise<void>;
    };

    /**
     * If true (with persistKey set), mirror state changes across
     * tabs/windows via BroadcastChannel — another tab's update is pulled
     * in and subscribers are notified. Requires BroadcastChannel support.
     * @default false
     */
    syncTabs?: boolean;

    /**
     * Called with the new value after every committed change (calls, undo,
     * redo, reset, transformHistory, imports, ...). Useful for auditing /
     * logging without needing to _subscribe manually.
     * @param value The new current value
     * @param entry The most recent history entry, if storeHistory is enabled
     */
    onChange?: (value: T, entry?: HistoryEntry<T>) => void;
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
     * Property: resolves once the initial value is actually settled.
     * Always present and always safe to await regardless of whether
     * callNow's callback was sync or async — resolves immediately for
     * sync (or no callNow), resolves once the commit completes for async.
     * Rejects if an async callNow callback throws (onError, if provided,
     * is also called).
     */
    ready: Promise<T>;

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
     * if out of / below bounds. If storeHistory is false, reports via
     * onError (or console.error as a fallback) and returns the current
     * value, rather than throwing — consistent with undo/redo/etc.
     */
    jumpTo(index: number): T | undefined;
    /**
     * Replace a specific history index value with a new one
     * @param index Index in history to replace
     * @param newValue The new value to set at that index
     * @returns The replaced value or current value 
     * if out of / below bounds. If storeHistory is false, reports via
     * onError (or console.error as a fallback) and returns the current
     * value, rather than throwing — consistent with undo/redo/etc.
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
     * @throws (or reports via onError) if called outside a browser environment (no document/Blob/URL)
     */
    exportHistoryToFile(filename?: string): void;
    /**
     * Open a file dialog to select a JSON file and restore history from it
     * Rejects (with a clear message, reported via onError too) if called
     * outside a browser environment (no document)
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
     * Copy history entries from other Executor instances and overwrite current history.
     * Duplicate detection (if noDuplicate is set) always uses the executor's
     * own construction-time equalityFn — copy() doesn't take a per-call
     * override the way merge() does (see merge() below).
     * @param histories Other histories to copy from and overwrite current history
     * @returns The current value (unchanged)
     */
    copy(histories: HistoryEntry<T>[][]): T; // overwrite with other histories
    /**
     * Merge history entries from other Executor instances into current history.
     * @param histories Other histories to merge into current history
     * @param opts Position to insert ("start", "end", or specific index);
     * whether to overwrite existing matching entries in place rather than
     * append/skip them; and the equality function used to decide what
     * counts as "matching" for both overwrite and noDuplicate. If opts.equalityFn
     * is omitted, falls back to the executor's own construction-time
     * equalityFn, then to a full JSON.stringify comparison if neither is
     * set. Passing opts.equalityFn directly is almost always what you want
     * for overwrite — e.g. `{ overwrite: true, equalityFn: (a, b) => a.id === b.id }`
     * to match entries by id regardless of what else differs between them.
     * @returns The current value (unchanged)
     */
    merge(
        histories: HistoryEntry<T>[][],
        opts?: {
            position?: "start" | "end" | number;
            overwrite?: boolean;
            equalityFn?: (a: T, b: T) => boolean;
        }
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
    /**
     * Debug helper: number of currently subscribed callbacks (e.g. mounted
     * useExecutor() consumers)
     * @returns Current subscriber count
     */
    _subscriberCount(): number;
    /**
     * Debug helper: the actual subscribed callback list
     * @returns Array of subscribed callbacks
     */
    _debugSubscribers(): Array<() => void>;

    /**
     * Stop listening for cross-tab updates (relevant only if syncTabs was
     * enabled). Safe to call even if it wasn't.
     * @returns void
     */
    stopSync(): void;

    /**
     * Read-only transform over history entries — does not mutate
     * @param mapFn Function receiving (entry, index)
     * @returns Array of mapFn's results
     */
    mapHistory<R>(mapFn: (entry: HistoryEntry<T>, index: number) => R): R[];
    /**
     * In-place transform: replaces each entry's value (and optionally its
     * meta/group) via mapFn. _index/_time are preserved.
     * @param mapFn Function receiving (value, entry, index); return either
     * a plain new value, or { value, meta?, group? } to also update metadata
     * @returns The current value after transforming
     */
    transformHistory(
        mapFn: (value: T, entry: HistoryEntry<T>, index: number) => T | { value: T; meta?: any; group?: string }
    ): T;
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
// Combine multiple executors into one group
// =========================
export type ExecutorGroup = {
    undo(): any[];         // returns array of results from each executor
    redo(): any[];         // same
    reset(): any[];        // same
    clearHistory(): any[];        // same
    export(): string[];    // JSON dumps from each executor
    // Attempts every executor even if one fails (best-effort, not
    // all-or-nothing). If any failed, throws one summary Error at the end
    // with a `.failures: { index: number, error: unknown }[]` property —
    // by which point every executor that *could* be restored already was.
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

    /**
     * Capture the full exported state of multiple executors as parsed
     * objects (not JSON strings) — directly inspectable/diffable/sendable
     * as-is.
     * @param executors Executors to snapshot (spread args, or a single array)
     * @returns One parsed export-state object per executor
     */
    export function snapshot(...executors: ExecutorInstance<any>[] | [ExecutorInstance<any>[]]): any[];

    /**
     * Restore a snapshot captured by Executor.snapshot back onto a matching
     * list of executors, by position.
     * @param executors Executors to restore into, in the same order as the snapshot
     * @param snapshot The snapshot array returned by Executor.snapshot
     * @returns void
     */
    export function restoreSnapshot(executors: ExecutorInstance<any>[], snapshot: any[]): void;

    /**
     * Options for Executor.computed
     */
    export type ComputedOptions<T> = {
        /** @default false */
        storeHistory?: boolean;
        onError?: (error: unknown) => void;
        equalityFn?: (a: T, b: T) => boolean;
        metadataFn?: (value: T) => any;
        maxHistory?: number;
    };

    /**
     * A computed executor instance — a regular ExecutorInstance plus a
     * stopComputing() method to detach it from its dependencies.
     */
    export type ComputedInstance<T> = ExecutorInstance<T> & {
        /**
         * Stop listening for dependency changes. Safe to call even if
         * never needed — most module-scoped computed values never call
         * this, since they're meant to live for the app's lifetime.
         * @returns void
         */
        stopComputing(): void;
    };

    /**
     * Create a computed/derived value that stays automatically in sync
     * with its dependencies — the reactive equivalent of Redux selectors
     * or MobX `computed`. The result is a real ExecutorInstance (with
     * history, subscriptions, and useExecutor compatibility for free),
     * so a computed value can itself be a dependency of another computed
     * value.
     *
     *   const postCount = Executor.computed((postsVal) => postsVal.length, [posts]);
     *
     * For a parametrized lookup (e.g. "find the post with this specific
     * id") rather than a single always-current value, use useExecutor's
     * selector argument instead — see executor-fn/react.
     *
     * @param computeFn Receives each dependency's current .value, in order, and returns the derived value
     * @param deps Non-empty array of dependency Executor instances
     * @param options Same shape as ExecutorOptions, minus initialArgs/callNow/initialArgs/seedHistory/seedValue/groupBy/historyStep/noDuplicate/persistKey/persistStorage/syncTabs/onChange (not meaningful for a derived value)
     * @returns A ComputedInstance<T> — call .stopComputing() to detach from its dependencies
     */
    export function computed<T>(
        computeFn: (...depValues: any[]) => T,
        deps: ExecutorInstance<any>[],
        options?: ComputedOptions<T>
    ): ComputedInstance<T>;
}


// Note: This is a simplified type definition. The actual implementation may have more details.
