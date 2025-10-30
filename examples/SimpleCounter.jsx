import React from "react";
import { Executor, useExecutor } from "executor-fn"; // adjust import path

// A simple counter executor
const counter = Executor(
    (count, delta) => count + delta,
    {
        storeHistory: true,
        callNow: true,
        initialArgs: [0],
    }
);

export default function CounterDemo() {
    const count = useExecutor(counter);

    return (
        <div style={{ padding: 20, fontFamily: "sans-serif" }}>
            <h1>Counter Demo ⚡</h1>
            <p>Count: {count}</p>

            <button onClick={() => counter(count, 1)}>+1</button>
            <button onClick={() => counter(count, -1)}>-1</button>

            <div style={{ marginTop: 10 }}>
                <button onClick={() => counter.undo()}>Undo</button>
                <button onClick={() => counter.redo()}>Redo</button>
                <button onClick={() => counter.reset()}>Reset</button>
            </div>

            <h2>Export / Import</h2>
            <textarea
                style={{ width: "100%", height: 80 }}
                value={counter.serializeHistory()}
                readOnly
            />
        </div>
    );
}
