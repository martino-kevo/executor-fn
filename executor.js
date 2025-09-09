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

    // Default options
    const {
        storeHistory = false,
        initialArgs = [],
        callNow = false,
        metadataFn,           // custom metadata for each history entry
        maxHistory = Infinity,// limit number of stored entries
        equalityFn,           // skip adding duplicates
        onError,              // handle errors gracefully
        historyStep = 1,      // 🆕 only record every Nth snapshot
        groupBy               // 🆕 group history entries (e.g. "move", "attack")
    } = options;

    const history = storeHistory ? [] : null;
    const redoStack = storeHistory ? [] : null;
    const subscribers = new Set();
    let historyPaused = false;
    let stepCounter = 0; // for historyStep

    let initialValue;
    try {
        if (callNow) {
            initialValue = callback(...initialArgs);
            if (storeHistory) {
                history.push({
                    value: deepClone(initialValue),
                    meta: metadataFn?.(initialValue),
                    group: groupBy?.(initialValue)
                });
            }
        }
    } catch (err) {
        if (onError) onError(err);
        else throw err;
    }

    const notifySubscribers = () => subscribers.forEach(cb => cb());

    // Push to history with checks
    const pushToHistory = (result) => {
        if (!storeHistory || historyPaused) return;

        // throttle with historyStep
        stepCounter++;
        if (stepCounter % historyStep !== 0) return;

        if (equalityFn && history.length > 0) {
            const last = history[history.length - 1].value;
            if (equalityFn(result, last)) return;
        }
        history.push({
            value: deepClone(result),
            meta: metadataFn?.(result),
            group: groupBy?.(result)
        });
        if (history.length > maxHistory) history.shift();
        redoStack.length = 0;
    };

    // The main executor function
    const fn = async (...args) => {
        try {
            let result = callback(...args);
            if (result instanceof Promise) result = await result;
            fn.value = result;
            pushToHistory(result);
            notifySubscribers();
            return result;
        } catch (err) {
            if (onError) onError(err);
            else throw err;
        }
    };

    fn.value = initialValue;
    fn.initialValue = initialValue;
    fn.history = history;
    fn.redoStack = redoStack;

    fn.log = () => console.log(fn.value);

    // Reset to initial value
    fn.reset = () => {
        fn.value = fn.initialValue;
        if (storeHistory) {
            history.length = 0;
            history.push({
                value: deepClone(fn.initialValue),
                meta: metadataFn?.(fn.initialValue),
                group: groupBy?.(fn.initialValue)
            });
            redoStack.length = 0;
        }
        notifySubscribers();
        return fn.value;
    };

    // Undo last change
    fn.undo = (steps = 1) => {
        if (storeHistory && history.length > 1) {
            for (let i = 0; i < steps && history.length > 1; i++) redoStack.push(history.pop());
            fn.value = history[history.length - 1].value;
            notifySubscribers();
        }
        return fn.value;
    };

    // Redo last undone change
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

    // Remove specific history entry
    fn.removeAt = (index) => {
        if (storeHistory && index >= 0 && index < history.length) {
            history.splice(index, 1);
            fn.value = history[history.length - 1]?.value ?? fn.initialValue;
            notifySubscribers();
        }
        return fn.value;
    };

    // Jump to specific history entry
    fn.jumpTo = (index) => {
        if (!storeHistory) throw new Error("Executor: jumpTo requires storeHistory = true");
        if (index < 0 || index >= history.length) return fn.value;
        fn.value = history[index].value;
        notifySubscribers();
        return fn.value;
    };

    // Replace specific history entry
    fn.replaceAt = (index, newValue) => {
        if (!storeHistory) throw new Error("Executor: replaceAt requires storeHistory = true");
        if (index < 0 || index >= history.length) return fn.value;
        history[index] = {
            value: deepClone(newValue),
            meta: metadataFn?.(newValue),
            group: groupBy?.(newValue)
        };
        if (index === history.length - 1) fn.value = newValue;
        notifySubscribers();
        return fn.value;
    };

    // Insert new history entry at specific position
    fn.insertAt = (index, newValue) => {
        if (storeHistory && index >= 0 && index <= history.length) {
            history.splice(index, 0, {
                value: deepClone(newValue),
                meta: metadataFn?.(newValue),
                group: groupBy?.(newValue)
            });
            fn.value = newValue;
            notifySubscribers();
        }
        return fn.value;
    };

    // Clear entire history and reset to current value
    fn.clearHistory = () => {
        if (storeHistory) {
            history.length = 0;
            history.push({
                value: deepClone(fn.value),
                meta: metadataFn?.(fn.value),
                group: groupBy?.(fn.value)
            });
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
            history.push(...data.map(entry => ({
                value: deepClone(entry.value),
                meta: entry.meta,
                group: entry.group
            })));
            fn.value = history[history.length - 1].value;
            redoStack.length = 0;
            notifySubscribers();
        }
    };

    // Export/Import full state
    fn.exportHistory = () => JSON.stringify({ value: fn.value, history, redoStack });
    fn.importHistory = (json) => {
        try {
            const data = JSON.parse(json);
            if (Array.isArray(data.history)) {
                history.length = 0;
                history.push(...data.history);
                redoStack.length = 0;
                if (Array.isArray(data.redoStack)) redoStack.push(...data.redoStack);
                fn.value = data.value;
                notifySubscribers();
            }
        } catch (e) {
            if (onError) onError(e);
            else throw e;
        }
    };

    // Batch multiple calls into one history entry
    fn.batch = (callback) => {
        if (!storeHistory) return callback();
        historyPaused = true;
        const result = callback();
        historyPaused = false;
        pushToHistory(fn.value);
        notifySubscribers();
        return result;
    };

    // Pause/Resume history tracking
    fn.pauseHistory = () => { historyPaused = true; };
    fn.resumeHistory = () => { historyPaused = false; };

    // Subscription management
    fn._subscribe = (cb) => subscribers.add(cb);
    fn._unsubscribe = (cb) => subscribers.delete(cb);

    // 🆕 Filter history
    fn.filterHistory = (predicate) => {
        if (!storeHistory) return [];
        return history.filter(entry => predicate(entry));
    };

    return fn;
}

// 🆕 Combine multiple executors into one group
Executor.combine = (...executors) => {
    const group = {};
    group.undo = () => executors.forEach(fn => fn.undo());
    group.redo = () => executors.forEach(fn => fn.redo());
    group.reset = () => executors.forEach(fn => fn.reset());
    group.export = () => executors.map(fn => fn.exportHistory());
    group.import = (dataArr) => {
        if (!Array.isArray(dataArr)) return;
        executors.forEach((fn, i) => fn.importHistory(dataArr[i]));
    };
    return group;
};


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




// Later we can add performance optimizations for large histories
// Later we can add a way to inspect current subscribers for debugging
// Later we can add a way to filter or transform history entries on the fly
// Later we can add a way to visualize history for better UX
// Later we can add a way to log history changes for auditing
// Later we can add a way to snapshot the entire state of multiple executors
// Later we can add a way to persist history in localStorage or IndexedDB
// Later we can add a way to sync history across multiple tabs or windows
// Later we can add a way to handle circular references in history entries
// Later we can add a way to profile performance of executor calls and history management
// Later we can add a way to handle large data structures efficiently
// Later we can add a way to visualize the call stack leading to each history entry
// Later we can add a way to merge multiple history entries into one
// Later we can add a way to split a history entry into multiple entries
// Later we can add a way to customize the initial state and behavior of the executor

