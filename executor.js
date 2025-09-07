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

