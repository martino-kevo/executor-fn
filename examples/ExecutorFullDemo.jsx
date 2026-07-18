// ExecutorFullDemo.jsx
import React, { useState } from "react";
import { Executor } from "executor-fn";
import { useExecutor } from "executor-fn/react";

// ----------------------
// Executor setup
// ----------------------
const counter = Executor(
    async (curr, increment) => {
        await new Promise((r) => setTimeout(r, 200)); // simulate async
        return curr + increment;
    },
    {
        storeHistory: true,
        callNow: true,
        initialArgs: [0, 1], // curr = 0, increment = 1
        metadataFn: (value) => ({ timestamp: new Date().toLocaleTimeString() }),
        onError: (err) => console.error("counter error:", err.message),
    }
);

export default function ExecutorFullDemo() {
    const current = useExecutor(counter);
    const [loading, setLoading] = useState(false);

    const handleIncrement = async (val) => {
        setLoading(true);
        await counter(counter.value, val);
        setLoading(false);
    };

    const handleBatch = async () => {
        setLoading(true);
        // batch()'s own callback isn't awaited internally (it's designed
        // for synchronous state transitions), so calling counter() three
        // times un-awaited inside batch() wouldn't actually combine these
        // async increments into one entry — historyPaused would reset
        // before any of them resolve. Instead: pause, await each step
        // ourselves, resume, then call batch() with an empty callback to
        // commit exactly one consolidated entry for the final value.
        counter.pauseHistory();
        await counter(counter.value, 1);
        await counter(counter.value, 2);
        await counter(counter.value, 3);
        counter.resumeHistory();
        counter.batch(() => {});
        setLoading(false);
    };

    return (
        <div style={{ padding: "2rem", fontFamily: "sans-serif" }}>
            <h1>Executor Full Demo</h1>
            <h2>
                Current Value: {current ?? "…"} {loading && "⏳"}
            </h2>

            <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1rem", flexWrap: "wrap" }}>
                <button onClick={() => handleIncrement(1)}>+1</button>
                <button onClick={() => handleIncrement(5)}>+5</button>
                {/* undo/redo take an optional `steps` argument — passing them
                    directly as onClick would hand the SyntheticEvent to
                    `steps`, silently breaking the internal loop. Always wrap
                    in an arrow function. pauseHistory/resumeHistory/
                    clearHistory take no arguments, so those are safe as-is. */}
                <button onClick={() => counter.undo()}>⏪ Undo</button>
                <button onClick={() => counter.redo()}>⏩ Redo</button>
                <button onClick={handleBatch}>Batch +1+2+3</button>
                <button onClick={counter.pauseHistory}>⏸ Pause History</button>
                <button onClick={counter.resumeHistory}>▶ Resume History</button>
                <button onClick={counter.clearHistory}>Clear History</button>
            </div>

            <div style={{ marginBottom: "1rem" }}>
                {/* exportHistoryToFile/importHistoryFromFile already handle
                    the Blob/URL/FileReader plumbing (with proper environment
                    checks and error handling) — no need to reimplement it. */}
                <button onClick={() => counter.exportHistoryToFile("counter-history.json")}>
                    💾 Download History
                </button>
                <button
                    style={{ marginLeft: "0.5rem" }}
                    onClick={async () => {
                        try {
                            await counter.importHistoryFromFile();
                        } catch (err) {
                            alert("Invalid history file");
                        }
                    }}
                >
                    📂 Upload History
                </button>
            </div>

            <h3>History Snapshots</h3>
            <ul>
                {counter.history?.map((entry, i) => (
                    <li key={i} style={{ marginBottom: "0.25rem" }}>
                        <strong>Value:</strong> {entry.value} &nbsp; | &nbsp;
                        <strong>Time:</strong> {entry.meta?.timestamp} &nbsp; | &nbsp;
                        <button onClick={() => counter.jumpTo(i)}>Jump</button>
                        <button onClick={() => counter.removeAt(i)}>Remove</button>
                    </li>
                ))}
            </ul>
        </div>
    );
}
