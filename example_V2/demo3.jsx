import React, { useState, useEffect } from "react";
import { ExecutorV2, useExecutor } from "executor-fn/v2";

const executor = ExecutorV2((val) => val, {
  storeHistory: true,
  maxHistory: 5000, // memory buffer
  useIndexedDB: true, // persistent storage
  historyStep: 1,
});

export default function ExecutorV2MegaDemo() {
  const currentValue = useExecutor(executor);
  const [progress, setProgress] = useState(0);
  const [undoIndex, setUndoIndex] = useState(0);
  const totalEntries = 1_000_000; // 1 million entries
  const batchSize = 10_000;

  // Add entries asynchronously in batches
  useEffect(() => {
    const addEntries = async () => {
      for (let i = 1; i <= totalEntries; i++) {
        await executor(i);

        if (i % batchSize === 0) {
          setProgress(i);
        }
      }
      setProgress(totalEntries);
    };
    addEntries();
  }, [currentValue]);

  // Undo/Redo via slider
  const handleUndoSlider = async (value) => {
    const history = await executor.getHistory();
    const targetIndex = Math.max(0, Math.min(history.length - 1, value));
    await executor.jumpTo(targetIndex);
    setUndoIndex(targetIndex);
  };

  // Jump to start/end
  const handleJumpToStart = async () => await executor.jumpTo(0);
  const handleJumpToEnd = async () => {
    const history = await executor.getHistory();
    await executor.jumpTo(history.length - 1);
  };

  // Merge/Split demo
  const handleSplit = async () => {
    const ranges = [
      [0, 9999], // first 10k
      [10000, 19999], // next 10k
    ];
    const splitExecutors = await executor.split(...ranges);
    console.log("Split Executors:", splitExecutors);
  };

  const handleMerge = async () => {
    const history = await executor.getHistory();
    const last20k = history.slice(-20000); // last 20k entries
    await executor.merge([last20k]);
  };

  return (
    <div style={{ padding: "2rem", fontFamily: "sans-serif" }}>
      <h1>ExecutorV2 Mega Demo (1 Million Entries)</h1>
      <p>
        Entries added: {progress.toLocaleString()} /{" "}
        {totalEntries.toLocaleString()}
      </p>
      <p>Current value: {currentValue}</p>

      <div style={{ margin: "1rem 0" }}>
        <label>
          Undo/Jump Slider: {undoIndex}
          <input
            type="range"
            min={0}
            max={progress > 0 ? progress - 1 : 0}
            value={undoIndex}
            onChange={async (e) => handleUndoSlider(parseInt(e.target.value))}
            style={{ width: "100%" }}
          />
        </label>
      </div>

      <div style={{ margin: "1rem 0" }}>
        <button onClick={handleJumpToStart} style={{ marginRight: "0.5rem" }}>
          Jump to Start
        </button>
        <button onClick={handleJumpToEnd} style={{ marginRight: "0.5rem" }}>
          Jump to End
        </button>
        <button onClick={handleSplit} style={{ marginRight: "0.5rem" }}>
          Split 2 Ranges
        </button>
        <button onClick={handleMerge}>Merge Last 20k</button>
      </div>

      <div style={{ marginTop: "1rem", fontSize: "0.9rem", color: "#666" }}>
        Memory buffer: last 5000 entries in RAM. IndexedDB persists full 1M
        history. Undo/Redo is near-instant for recent entries.
      </div>
    </div>
  );
}
