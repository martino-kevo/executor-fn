import React, { useState, useEffect } from "react";
import ExecutorV2, { useExecutor } from "./executorV2";

export default function ExecutorV2AdvancedDemo() {
    const executor = React.useMemo(
        () =>
            ExecutorV2((val) => val, {
                storeHistory: true,
                maxHistory: 5000,
                useIndexedDB: true,
                historyStep: 1,
            }),
        []
    );

    const currentValue = useExecutor(executor);
    const [progress, setProgress] = useState(0);
    const [batchSize, setBatchSize] = useState(1000);
    const [totalEntries, setTotalEntries] = useState(50_000); // Adjust for demo
    const [sortOrder, setSortOrder] = useState < "asc" | "desc" | "default" > ("default");

    // Add entries in batches
    useEffect(() => {
        const addEntries = async () => {
            for (let i = 1; i <= totalEntries; i++) {
                await executor(i);
                if (i % batchSize === 0) setProgress(i);
            }
            setProgress(totalEntries);
        };
        addEntries();
    }, [executor, batchSize, totalEntries]);

    // Undo / Redo / Jump
    const handleUndo = async () => await executor.undo(1);
    const handleRedo = async () => await executor.redo(1);
    const handleJumpToStart = async () => await executor.jumpTo(0);
    const handleJumpToEnd = async () => {
        const history = await executor.getHistory();
        await executor.jumpTo(history.length - 1);
    };

    // Sort history
    const handleSort = async (order) => {
        setSortOrder(order);
        await executor.sort(order);
    };

    // Split history into ranges
    const handleSplit = async () => {
        const ranges = [
            [0, 999],       // first 1000 entries
            [1000, 1999],   // next 1000
        ];
        const splitExecutors = await executor.split(...ranges);
        console.log("Split Executors:", splitExecutors);
    };

    // Merge example: merge last 2 ranges back
    const handleMerge = async () => {
        const history = await executor.getHistory();
        const lastHalf = history.slice(-2000); // last 2000 entries
        await executor.merge([lastHalf]);
    };

    return (
        <div style={{ padding: "2rem", fontFamily: "sans-serif" }}>
            <h1>ExecutorV2 Advanced Interactive Demo</h1>
            <p>Entries added: {progress} / {totalEntries}</p>
            <p>Current value: {currentValue}</p>
            <div style={{ margin: "1rem 0" }}>
                <button onClick={handleUndo}>Undo</button>
                <button onClick={handleRedo}>Redo</button>
                <button onClick={handleJumpToStart}>Jump to Start</button>
                <button onClick={handleJumpToEnd}>Jump to End</button>
            </div>

            <div style={{ margin: "1rem 0" }}>
                <span>Sort History: </span>
                <button onClick={() => handleSort("asc")}>Asc</button>
                <button onClick={() => handleSort("desc")}>Desc</button>
                <button onClick={() => handleSort("default")}>Default</button>
            </div>

            <div style={{ margin: "1rem 0" }}>
                <button onClick={handleSplit} style={{ marginRight: "0.5rem" }}>
                    Split first 2 ranges
                </button>
                <button onClick={handleMerge}>Merge last 2 ranges</button>
            </div>

            <div style={{ marginTop: "1rem", fontSize: "0.9rem", color: "#666" }}>
                Memory buffer: last 5000 entries in RAM. IndexedDB persists all history.
            </div>
        </div>
    );
}
