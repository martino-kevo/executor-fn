export default function Executor(callback, options = {}) {
    if (typeof callback !== "function") {
        throw new Error("Executor: callback must be a function")
    }

    const {
        storeHistory = false,
        initialArgs = [],
        callNow = false
    } = options

    if (callNow && typeof callback !== "function") {
        console.warn("Executor: callNow was set to true, but no valid callback was provided. Nothing was executed.")
    }

    const history = storeHistory ? [] : null
    const redoStack = storeHistory ? [] : null

    let initialValue
    if (callNow) {
        initialValue = callback(...initialArgs)
        if (storeHistory) history.push(initialValue)
    }

    const fn = (...args) => {
        const result = callback(...args)
        fn.value = result
        if (storeHistory) {
            history.push(result)
            redoStack.length = 0
        }
        return result
    }

    fn.value = initialValue
    fn.initialValue = initialValue
    fn.history = history

    fn.log = () => console.log(fn.value)

    fn.reset = () => {
        fn.value = fn.initialValue
        if (storeHistory) {
            history.length = 0
            history.push(fn.initialValue)
            redoStack.length = 0
        }
        return fn.value
    }

    fn.undo = () => {
        if (storeHistory && history.length > 1) {
            const last = history.pop()
            redoStack.push(last)
            fn.value = history[history.length - 1]
        }
        return fn.value
    }

    fn.redo = () => {
        if (storeHistory && redoStack.length > 0) {
            const next = redoStack.pop()
            history.push(next)
            fn.value = next
        }
        return fn.value
    }

    return fn
}
