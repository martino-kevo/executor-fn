export default function Executor<T>(
    callback: (...args: any[]) => T,
    options?: {
        storeHistory?: boolean;
        initialArgs?: any[];
        callNow?: boolean;
    }
): ((...args: any[]) => T) & {
    value: T;
    initialValue: T;
    history?: T[];
    redoStack?: T[];
    log(): void;
    reset(): T;
    undo(): T;
    redo(): T;
    _subscribe(cb: () => void): void;
    _unsubscribe(cb: () => void): void;
};

export function useExecutor<T>(executor: any): T;

