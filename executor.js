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
        noDuplicate = false, // 🆕 prevent duplicates in history
        equalityFn,           // skip adding follow-up duplicates
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

    let entryCounter = 0; // monotonic index

    const pushToHistory = (result) => {
        if (!storeHistory || historyPaused) return;

        // 🔍 noDuplicate checks
        if (noDuplicate && equalityFn) {
            if (history.some(h => equalityFn(h.value, result))) return;
        } else if (noDuplicate) {
            if (history.some(h => JSON.stringify(h.value) === JSON.stringify(result))) return;
        }

        // 🔍 throttle
        stepCounter++;
        if (stepCounter % historyStep !== 0) return;

        // 🔍 skip consecutive duplicates
        if (equalityFn && history.length > 0) {
            const last = history[history.length - 1].value;
            if (equalityFn(result, last)) return;
        }

        // ✅ push with metadata + timestamp
        history.push({
            value: deepClone(result),
            meta: metadataFn?.(result),
            group: groupBy?.(result),
            _index: entryCounter++,    // new insertion index
            _time: Date.now()          // new timestamp
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

    // Copy one or more history entries and replace current history
    fn.copy = (histories) => {
        if (!storeHistory) return fn.value;

        // Normalize to array of histories
        const allHistories = Array.isArray(histories[0]) ? histories : [histories];

        // Flatten + deep clone with duplicate checks
        const copied = [];
        allHistories.forEach(h => {
            if (Array.isArray(h)) {
                h.forEach(entry => {
                    const val = entry.value;

                    // noDuplicate + equalityFn
                    if (noDuplicate && equalityFn) {
                        if (copied.some(e => equalityFn(e.value, val))) return;
                    } else if (noDuplicate) {
                        if (copied.some(e => JSON.stringify(e.value) === JSON.stringify(val))) return;
                    }

                    copied.push({
                        value: deepClone(val),
                        meta: entry.meta,
                        group: entry.group
                    });
                });
            }
        });

        // Full replace
        history.length = 0;
        history.push(...copied);

        // Trim to maxHistory
        if (history.length > maxHistory) {
            history.splice(0, history.length - maxHistory);
        }

        // Reset redoStack
        redoStack.length = 0;

        // Update fn.value
        fn.value = history[history.length - 1]?.value ?? fn.initialValue;

        notifySubscribers();
        return fn.value;
    };


    // Merge one or more history entries into current history
    fn.merge = (histories, { position = "end" } = {}) => {
        if (!storeHistory) return fn.value;

        // Normalize to array of histories
        const allHistories = Array.isArray(histories[0]) ? histories : [histories];

        // Flatten and deep clone with duplicate checks
        const merged = [];
        allHistories.forEach(h => {
            if (Array.isArray(h)) {
                h.forEach(entry => {
                    const val = entry.value;

                    // noDuplicate + equalityFn
                    if (noDuplicate && equalityFn) {
                        if (history.some(e => equalityFn(e.value, val))) return;
                        if (merged.some(e => equalityFn(e.value, val))) return;
                    } else if (noDuplicate) {
                        if (history.some(e => JSON.stringify(e.value) === JSON.stringify(val))) return;
                        if (merged.some(e => JSON.stringify(e.value) === JSON.stringify(val))) return;
                    }

                    merged.push({
                        value: deepClone(val),
                        meta: entry.meta,
                        group: entry.group
                    });
                });
            }
        });

        // Insert by position
        if (position === "start") {
            history.unshift(...merged);
        } else if (position === "end") {
            history.push(...merged);
        } else if (typeof position === "number") {
            history.splice(position, 0, ...merged);
        }

        // Trim to maxHistory
        if (history.length > maxHistory) {
            history.splice(0, history.length - maxHistory);
        }

        // Reset redoStack
        redoStack.length = 0;

        // Update fn.value
        fn.value = history[history.length - 1]?.value ?? fn.initialValue;

        notifySubscribers();
        return fn.value;
    };


    // Sort history entries accending, descending, or reset to default
    fn.sort = (orderOrFn = "default") => {
        if (!storeHistory) return fn.value;

        let sorted = [...history];

        if (orderOrFn === "default") {
            // restore insertion order
            sorted.sort((a, b) => (a._index ?? 0) - (b._index ?? 0));
        }
        else if (orderOrFn === "asc") {
            sorted.sort((a, b) => {
                if (typeof a.value === "number" && typeof b.value === "number") {
                    return a.value - b.value;
                }
                return String(a.value).localeCompare(String(b.value));
            });
        }
        else if (orderOrFn === "desc") {
            sorted.sort((a, b) => {
                if (typeof a.value === "number" && typeof b.value === "number") {
                    return b.value - a.value;
                }
                return String(b.value).localeCompare(String(a.value));
            });
        }
        else if (typeof orderOrFn === "function") {
            // 🆕 full entry comparator (not just value)
            sorted.sort((a, b) => orderOrFn(a, b));
        }

        // 🔒 Deduplicate after sort
        const deduped = [];
        sorted.forEach(entry => {
            const val = entry.value;
            if (noDuplicate && equalityFn) {
                if (deduped.some(e => equalityFn(e.value, val))) return;
            } else if (noDuplicate) {
                if (deduped.some(e => JSON.stringify(e.value) === JSON.stringify(val))) return;
            }
            deduped.push(entry);
        });

        // overwrite history with deduped
        history.length = 0;
        history.push(...deduped);

        fn.value = history[history.length - 1]?.value ?? fn.initialValue;
        notifySubscribers();
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
                group: entry.group,
                _index: entry._index,
                _time: entry._time
            })));
            fn.value = history[history.length - 1].value;
            redoStack.length = 0;
            notifySubscribers();
        }
    };

    // ✅ Export full state safely
    fn.exportHistory = () => {
        try {
            return JSON.stringify({
                value: fn.value,
                initialValue: fn.initialValue,
                history: history.map(entry => ({
                    value: deepClone(entry.value),
                    meta: entry.meta,
                    group: entry.group,
                    _index: entry._index,
                    _time: entry._time
                })),
                redoStack: redoStack.map(entry => ({
                    value: deepClone(entry.value),
                    meta: entry.meta,
                    group: entry.group,
                    _index: entry._index,
                    _time: entry._time
                }))
            });
        } catch (e) {
            if (onError) onError(e);
            else throw e;
        }
    };

    // ✅ Import full state safely
    fn.importHistory = (json) => {
        try {
            const data = JSON.parse(json);

            if (Array.isArray(data.history)) {
                history.length = 0;
                history.push(...data.history.map(entry => ({
                    value: deepClone(entry.value),
                    meta: entry.meta,
                    group: entry.group,
                    _index: entry._index,
                    _time: entry._time
                })));
            }

            redoStack.length = 0;
            if (Array.isArray(data.redoStack)) {
                redoStack.push(...data.redoStack.map(entry => ({
                    value: deepClone(entry.value),
                    meta: entry.meta,
                    group: entry.group,
                    _index: entry._index,
                    _time: entry._time
                })));
            }

            fn.value = deepClone(data.value ?? fn.initialValue);
            notifySubscribers();
        } catch (e) {
            if (onError) onError(e);
            else throw e;
        }
    };

    // 🆕 Export history to a downloadable JSON file
    fn.exportHistoryToFile = (filename = "executor-history.json") => {
        const json = fn.exportHistory(); // uses the safe version we wrote
        const blob = new Blob([json], { type: "application/json" });
        const url = URL.createObjectURL(blob);

        const a = document.createElement("a");
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);

        URL.revokeObjectURL(url);
    };

    // 🆕 Import history from a user-selected JSON file
    fn.importHistoryFromFile = () => {
        return new Promise((resolve, reject) => {
            const input = document.createElement("input");
            input.type = "file";
            input.accept = "application/json";

            input.onchange = async (event) => {
                const file = event.target.files[0];
                if (!file) return reject("No file selected");

                try {
                    const text = await file.text();
                    fn.importHistory(text); // reuse safe import
                    resolve(fn.value);
                } catch (e) {
                    if (onError) onError(e);
                    reject(e);
                }
            };

            input.click();
        });
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


    // Extend filterHistory with common query helpers
    fn.filterHistory = (predicateOrOptions) => {
        if (!storeHistory) return [];

        // Case 1: user passes a function → behave like before
        if (typeof predicateOrOptions === "function") {
            return history.filter(entry => predicateOrOptions(entry));
        }

        // Case 2: user passes an options object
        const {
            group,
            meta,
            after,   // timestamp (ms) or Date
            before,  // timestamp (ms) or Date
            range,   // [start, end] timestamps
        } = predicateOrOptions || {};

        return history.filter(entry => {
            // group check
            if (group && entry.group !== group) return false;

            // meta check (shallow compare)
            if (meta && JSON.stringify(entry.meta) !== JSON.stringify(meta)) return false;

            // timestamp checks
            if (after && entry._time <= (after instanceof Date ? after.getTime() : after)) return false;
            if (before && entry._time >= (before instanceof Date ? before.getTime() : before)) return false;

            if (range && (
                entry._time < (range[0] instanceof Date ? range[0].getTime() : range[0]) ||
                entry._time > (range[1] instanceof Date ? range[1].getTime() : range[1])
            )) return false;

            return true;
        });
    };


    return fn;
}

// 🆕 Combine multiple executors into one group
Executor.combine = (...executors) => {
    const group = {};

    group.undo = () => executors.map(fn => fn.undo());
    group.redo = () => executors.map(fn => fn.redo());
    group.reset = () => executors.map(fn => fn.reset());

    group.export = () => executors.map(fn => fn.exportHistory());

    group.importAll = (dataArr) => {
        if (!Array.isArray(dataArr)) {
            throw new Error("ExecutorGroup.importAll expects an array of JSON strings");
        }
        executors.forEach((fn, i) => {
            if (dataArr[i]) fn.importHistory(dataArr[i]);
        });
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
// Later we can add a way to split a history entry into multiple entries
// Later we can add a way to customize the initial state and behavior of the executor

