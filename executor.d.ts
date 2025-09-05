declare type ExecutorOptions = {
    storeHistory?: boolean
    initialArgs?: any[]
    callNow?: boolean
}

declare type ExecutorFunction<T extends (...args: any[]) => any> = {
    (...args: Parameters<T>): ReturnType<T>
    value: ReturnType<T> | undefined
    initialValue: ReturnType<T> | undefined
    history?: ReturnType<T>[]
    log: () => void
    reset: () => ReturnType<T> | undefined
    undo: () => ReturnType<T> | undefined
    redo: () => ReturnType<T> | undefined
}

export default function Executor<T extends (...args: any[]) => any>(
    callback: T,
    options?: ExecutorOptions
): ExecutorFunction<T>
