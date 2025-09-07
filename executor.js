// executor.js
import { useSyncExternalStore } from "react";

export default function Executor(callback, options = {}) {
    if (typeof callback !== "function") {
        throw new Error("Executor: callback must be a function");
    }

    const {
        storeHistory = false,
        initialArgs = [],
        callNow = false,
    } = options;

    if (callNow && typeof callback !== "function") {
        console.warn(
            "Executor: callNow was set to true, but no valid callback was provided."
        );
    }

    const history = storeHistory ? [] : null;
    const redoStack = storeHistory ? [] : null;

    let initialValue;
    if (callNow) {
        initialValue = callback(...initialArgs);
        if (storeHistory) history.push(initialValue);
    }

    // Subscribers list (for React re-render)
    const subscribers = new Set();

    const notifySubscribers = () => {
        subscribers.forEach((cb) => cb());
    };

    const fn = (...args) => {
        const result = callback(...args);
        fn.value = result;
        if (storeHistory) {
            history.push(result);
            redoStack.length = 0;
        }
        notifySubscribers();
        return result;
    };

    fn.value = initialValue;
    fn.initialValue = initialValue;
    fn.history = history;
    fn.redoStack = redoStack;

    fn.log = () => console.log(fn.value);

    fn.reset = () => {
        fn.value = fn.initialValue;
        if (storeHistory) {
            history.length = 0;
            history.push(fn.initialValue);
            redoStack.length = 0;
        }
        notifySubscribers();
        return fn.value;
    };

    fn.undo = () => {
        if (storeHistory && history.length > 1) {
            const last = history.pop();
            redoStack.push(last);
            fn.value = history[history.length - 1];
            notifySubscribers();
        }
        return fn.value;
    };

    fn.redo = () => {
        if (storeHistory && redoStack.length > 0) {
            const next = redoStack.pop();
            history.push(next);
            fn.value = next;
            notifySubscribers();
        }
        return fn.value;
    };

    // ✅ NEW: jump directly to a snapshot
    fn.jumpTo = (index) => {
        if (!storeHistory) {
            throw new Error("Executor: jumpTo requires storeHistory = true");
        }
        if (index < 0 || index >= history.length) {
            console.warn("Executor: jumpTo index out of range:", index);
            return fn.value;
        }
        fn.value = history[index];
        notifySubscribers();
        return fn.value;
    };

    // ✅ NEW: replace a history entry with a new value
    fn.replaceAt = (index, newValue) => {
        if (!storeHistory) {
            throw new Error("Executor: replaceAt requires storeHistory = true");
        }
        if (index < 0 || index >= history.length) {
            console.warn("Executor: replaceAt index out of range:", index);
            return fn.value;
        }
        history[index] = newValue;
        // If we're currently viewing that snapshot, update .value too
        if (fn.value === history[index] || index === history.length - 1) {
            fn.value = newValue;
            notifySubscribers();
        }
        return fn.value;
    };

    // ✅ Insert new snapshot at a given position
    fn.insertAt = (index, newValue) => {
        if (storeHistory && index >= 0 && index <= history.length) {
            history.splice(index, 0, newValue);
            fn.value = newValue;
            notifySubscribers();
        }
        return fn.value;
    };

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


// Later we can add undo(n) and redo(n) for multi-step changes
// Later we can add a way to clear history but keep current value
// Later we can add removeAt(index) to delete a specific history entry
// Later we can add a way to serialize/deserialize history for persistence
// Later we can add a way to batch multiple calls into one history entry
// Later we can add a way to pause/resume history tracking
// Later we can add a way to group multiple executors together for joint undo/redo
// Later we can add support for better async callbacks and promise results
// Later we can add performance optimizations for large histories
// Later we can add a way to inspect current subscribers for debugging
// Later we can add a way to deep clone history entries to avoid mutation issues
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
// Later we can add a way to annotate history entries with metadata (e.g. timestamps, user info)
// Later we can add a way to filter history entries based on criteria (e.g. date range, value type)
// Later we can add a way to merge multiple history entries into one
// Later we can add a way to split a history entry into multiple entries
// Later we can add a way to customize the initial state and behavior of the executor

