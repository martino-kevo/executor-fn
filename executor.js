// executor.js
import { useSyncExternalStore } from "react";

// Deep clone utility to avoid reference issues in history
function deepClone(value) {
    if (value === null || typeof value !== "object") return value;
    return Array.isArray(value)
        ? value.map(deepClone)
        : Object.fromEntries(Object.entries(value).map(([k, v]) => [k, deepClone(v)]));
}

// Main Executor function
export default function Executor(callback, options = {}) {
    if (typeof callback !== "function") {
        throw new Error("Executor: callback must be a function");
    }

    const {
        storeHistory = false,
        initialArgs = [],
        callNow = false,
        metadataFn, // optional function to attach metadata to snapshots
    } = options;

    if (callNow && typeof callback !== "function") {
        console.warn(
            "Executor: callNow was set to true, but no valid callback was provided."
        );
    }

    const history = storeHistory ? [] : null;
    const redoStack = storeHistory ? [] : null;
    const subscribers = new Set();
    let historyPaused = false;

    // Initialize the initial value if callNow is true
    let initialValue;
    if (callNow) {
        initialValue = callback(...initialArgs);
        // Handle async initial value
        if (storeHistory) history.push({ value: deepClone(initialValue), meta: metadataFn?.(initialValue) });
    }

    const notifySubscribers = () => subscribers.forEach(cb => cb());

    // The main executor function
    const fn = async (...args) => {
        let result = callback(...args);
        if (result instanceof Promise) {
            result = await result;
        }
        fn.value = result;

        if (storeHistory && !historyPaused) {
            const entry = { value: deepClone(result), meta: metadataFn?.(result) };
            history.push(entry);
            redoStack.length = 0;
        }

        notifySubscribers();
        return result;
    };

    fn.value = initialValue;
    fn.initialValue = initialValue;
    fn.history = history;
    fn.redoStack = redoStack;

    // Simple logger for debugging
    fn.log = () => console.log(fn.value);

    // Reset to initial value and clear history
    fn.reset = () => {
        fn.value = fn.initialValue;
        if (storeHistory) {
            history.length = 0;
            history.push({ value: deepClone(fn.initialValue), meta: metadataFn?.(fn.initialValue) });
            redoStack.length = 0;
        }
        notifySubscribers();
        return fn.value;
    };

    // Undo presents the value before the last call
    fn.undo = (steps = 1) => {
        if (storeHistory && history.length > 1) {
            for (let i = 0; i < steps && history.length > 1; i++) {
                redoStack.push(history.pop());
            }
            fn.value = history[history.length - 1].value;
            notifySubscribers();
        }
        return fn.value;
    };

    // Redo re-applies the last undone value
    fn.redo = (steps = 1) => {
        if (storeHistory && redoStack.length > 0) {
            for (let i = 0; i < steps && redoStack.length > 0; i++) {
                const next = redoStack.pop();
                history.push(next);
                fn.value = next.value;
            }
            notifySubscribers();
        }
        return fn.value;
    };

    // Removes the history entry at the specified index
    fn.removeAt = (index) => {
        if (storeHistory && index >= 0 && index < history.length) {
            history.splice(index, 1);
            fn.value = history[history.length - 1].value;
            notifySubscribers();
        }
        return fn.value;
    };

    // Jumps to a specific history entry without altering history stacks
    fn.jumpTo = (index) => {
        if (!storeHistory) throw new Error("Executor: jumpTo requires storeHistory = true");
        if (index < 0 || index >= history.length) return fn.value;
        fn.value = history[index].value;
        notifySubscribers();
        return fn.value;
    };

    // Replaces the history entry at the specified index with a new value
    fn.replaceAt = (index, newValue) => {
        if (!storeHistory) throw new Error("Executor: replaceAt requires storeHistory = true");
        if (index < 0 || index >= history.length) return fn.value;
        history[index] = { value: deepClone(newValue), meta: metadataFn?.(newValue) };
        if (fn.value === history[index].value || index === history.length - 1) fn.value = newValue;
        notifySubscribers();
        return fn.value;
    };

    // Inserts a new history entry at the specified index
    fn.insertAt = (index, newValue) => {
        if (storeHistory && index >= 0 && index <= history.length) {
            history.splice(index, 0, { value: deepClone(newValue), meta: metadataFn?.(newValue) });
            fn.value = newValue;
            notifySubscribers();
        }
        return fn.value;
    };

    // Clears the entire history and resets to current value
    fn.clearHistory = () => {
        if (storeHistory) {
            history.length = 0;
            history.push({ value: deepClone(fn.value), meta: metadataFn?.(fn.value) });
            redoStack.length = 0;
            notifySubscribers();
        }
        return fn.value;
    };

    // Serialize/Deserialize history for persistence
    fn.serializeHistory = () => JSON.stringify(history);
    fn.deserializeHistory = (data) => {
        if (storeHistory && Array.isArray(data)) {
            history.length = 0;
            history.push(...data.map(entry => ({ value: deepClone(entry.value), meta: entry.meta })));
            fn.value = history[history.length - 1].value;
            redoStack.length = 0;
            notifySubscribers();
        }
    };

    // Batch multiple calls into a single history entry
    fn.batch = (callback) => {
        if (!storeHistory) return callback();
        historyPaused = true;
        const result = callback();
        historyPaused = false;
        history.push({ value: deepClone(fn.value), meta: metadataFn?.(fn.value) });
        redoStack.length = 0;
        notifySubscribers();
        return result;
    };

    // Pause/Resume history tracking
    fn.pauseHistory = () => { historyPaused = true; };
    fn.resumeHistory = () => { historyPaused = false; };

    // Subscription management for React integration
    fn._subscribe = (cb) => subscribers.add(cb);
    fn._unsubscribe = (cb) => subscribers.delete(cb);

    return fn;
}


// React Hook for auto re-rendering
export function useExecutor(executor) {
    if (!executor || typeof executor !== "function") {
        throw new Error("useExecutor: must receive a valid Executor instance");
    }

    useSyncExternalStore(
        (subscribe) => {
            executor._subscribe(subscribe);
            return () => executor._unsubscribe(subscribe);
        },
        () => executor.value
    );

    return executor; // 👈 full power (value + methods)
}



// Later we can add a way to group multiple executors together for joint undo/redo
// Later we can add performance optimizations for large histories
// Later we can add a way to inspect current subscribers for debugging
// Later we can add a way to filter or transform history entries on the fly
// Later we can add a way to visualize history for better UX
// Later we can add a way to export/import history for sharing or backup
// Later we can add a way to customize equality checks for history entries
// Later we can add a way to debounce or throttle executor calls
// Later we can add a way to log history changes for auditing
// Later we can add a way to handle errors in the callback gracefully
// Later we can add a way to extend Executor with custom methods or properties
// Later we can add a way to combine multiple executors into one
// Later we can add a way to snapshot the entire state of multiple executors
// Later we can add a way to persist history in localStorage or IndexedDB
// Later we can add a way to sync history across multiple tabs or windows
// Later we can add a way to handle circular references in history entries
// Later we can add a way to profile performance of executor calls and history management
// Later we can add a way to handle large data structures efficiently
// Later we can add a way to visualize the call stack leading to each history entry
// Later we can add a way to group history entries by type or category
// Later we can add a way to filter history entries based on criteria (e.g. date range, value type)
// Later we can add a way to merge multiple history entries into one
// Later we can add a way to split a history entry into multiple entries
// Later we can add a way to customize the initial state and behavior of the executor

