// ExecutorFullDemo.jsx
import React, { useState } from "react";
import Executor, { useExecutor } from "./executor";

// ----------------------
// Executor setup
// ----------------------
const counter = Executor(
    async (increment = 1) => {
        await new Promise((r) => setTimeout(r, 200)); // simulate async
        return (counter.value || 0) + increment;
    },
    {
        storeHistory: true,
        callNow: true,
        initialArgs: [0],
        metadataFn: (value) => ({ timestamp: new Date().toLocaleTimeString() }),
    }
);

export default function ExecutorFullDemo() {
    const current = useExecutor(counter);
    const [loading, setLoading] = useState(false);

    const handleIncrement = async (val) => {
        setLoading(true);
        await counter(val);
        setLoading(false);
    };

    const handleBatch = async () => {
        setLoading(true);
        await counter.batch(() => {
            counter(1);
            counter(2);
            counter(3);
        });
        setLoading(false);
    };

    const handleDownloadHistory = () => {
        const data = JSON.stringify(counter.history, null, 2);
        const blob = new Blob([data], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "counter-history.json";
        a.click();
        URL.revokeObjectURL(url);
    };

    const handleUploadHistory = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = () => {
            try {
                const data = JSON.parse(reader.result);
                counter.deserializeHistory(data);
            } catch (err) {
                alert("Invalid history file");
            }
        };
        reader.readAsText(file);
    };

    return (
        <div style={{ padding: "2rem", fontFamily: "sans-serif" }}>
            <h1>Executor Full Demo</h1>
            <h2>
                Current Value: {current.value} {loading && "⏳"}
            </h2>

            <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1rem" }}>
                <button onClick={() => handleIncrement(1)}>+1</button>
                <button onClick={() => handleIncrement(5)}>+5</button>
                <button onClick={counter.undo}>⏪ Undo</button>
                <button onClick={counter.redo}>⏩ Redo</button>
                <button onClick={handleBatch}>Batch +1+2+3</button>
                <button onClick={counter.pauseHistory}>⏸ Pause History</button>
                <button onClick={counter.resumeHistory}>▶ Resume History</button>
                <button onClick={counter.clearHistory}>Clear History</button>
            </div>

            <div style={{ marginBottom: "1rem" }}>
                <button onClick={handleDownloadHistory}>💾 Download History</button>
                <input
                    type="file"
                    accept=".json"
                    onChange={handleUploadHistory}
                    style={{ marginLeft: "0.5rem" }}
                />
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
