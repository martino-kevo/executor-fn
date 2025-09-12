import React, { useState } from "react";
import { Executor, useExecutor } from "./executor"; // your lib

export default function ExecutorAdvanced() {
    // Executor that groups numbers into "small" or "large"
    const numberExec = Executor(
        (x) => x,
        {
            storeHistory: true,
            groupBy: (val) => (val < 50 ? "small" : "large"),
        }
    );
    const state = useExecutor(numberExec);

    // preload some values
    [10, 25, 75, 100].forEach((v) => numberExec(v));

    // Another executor to merge in
    const otherExec = Executor(
        (x) => x,
        {
            storeHistory: true,
            groupBy: (val) => (val % 2 === 0 ? "even" : "odd"),
        }
    );
    [5, 20, 60].forEach((v) => otherExec(v));

    const [filterGroup, setFilterGroup] = useState("all");
    const [sortDir, setSortDir] = useState("asc");
    const [mergeIndex, setMergeIndex] = useState(1);
    const [filterResult, setFilterResult] = useState([]);

    const handleDynamicSort = () => {
        numberExec.sort(sortDir);
    };

    const handleMergeAtIndex = () => {
        numberExec.merge([otherExec.history], { position: mergeIndex });
    };

    const handleFilterGroup = () => {
        if (filterGroup === "all") {
            setFilterResult(numberExec.history);
        } else {
            const res = numberExec.filterHistory((entry) => entry.group === filterGroup);
            setFilterResult(res);
        }
    };

    return (
        <div style={{ padding: 20 }}>
            <h2>Executor Advanced Demo</h2>
            <p>Current value: {String(state)}</p>
            <p>History: {JSON.stringify(numberExec.history?.map(h => ({ v: h.value, g: h.group })))}</p>

            <h3>Dynamic Sort</h3>
            <select value={sortDir} onChange={(e) => setSortDir(e.target.value)}>
                <option value="asc">Ascending</option>
                <option value="desc">Descending</option>
                <option value="default">Default (insertion order)</option>
            </select>
            <button onClick={handleDynamicSort}>Apply Sort</button>

            <h3>Merge at Index</h3>
            <input
                type="number"
                value={mergeIndex}
                onChange={(e) => setMergeIndex(parseInt(e.target.value, 10))}
            />
            <button onClick={handleMergeAtIndex}>Merge otherExec at Index</button>

            <h3>Filter by Group</h3>
            <select value={filterGroup} onChange={(e) => setFilterGroup(e.target.value)}>
                <option value="all">All</option>
                <option value="small">Small</option>
                <option value="large">Large</option>
                <option value="even">Even</option>
                <option value="odd">Odd</option>
            </select>
            <button onClick={handleFilterGroup}>Apply Filter</button>

            <div>
                <h4>Filter Result:</h4>
                <pre>{JSON.stringify(filterResult.map(h => ({ v: h.value, g: h.group })), null, 2)}</pre>
            </div>
        </div>
    );
}
