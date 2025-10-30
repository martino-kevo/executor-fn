import React, { useState, useEffect } from "react";
import { ExecutorV2, useExecutor } from "executor-fn/v2";

// Create Executor with large history support
const executor = ExecutorV2((val) => val, {
  storeHistory: true,
  maxHistory: 5000, // in-memory circular buffer
  useIndexedDB: true, // persistent storage
  historyStep: 1,
});

export default function ExecutorV2Benchmark() {
  const currentValue = useExecutor(executor);
  const [progress, setProgress] = useState(0);
  const totalEntries = 100_000; // For demo, 100k is more practical in browser
  const batchSize = 1000;

  useEffect(() => {
    // Function to add entries in batches
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

  const handleUndo = async () => {
    await executor.undo(1);
  };

  const handleRedo = async () => {
    await executor.redo(1);
  };

  const handleJumpToStart = async () => {
    await executor.jumpTo(0);
  };

  const handleJumpToEnd = async () => {
    const history = await executor.getHistory();
    await executor.jumpTo(history.length - 1);
  };

  return (
    <div style={{ padding: "2rem", fontFamily: "sans-serif" }}>
      <h1>ExecutorV2 React Benchmark</h1>
      <p>
        Total entries added: {progress} / {totalEntries}
      </p>
      <p>Current value: {currentValue}</p>
      <div style={{ marginTop: "1rem" }}>
        <button onClick={handleUndo} style={{ marginRight: "0.5rem" }}>
          Undo
        </button>
        <button onClick={handleRedo} style={{ marginRight: "0.5rem" }}>
          Redo
        </button>
        <button onClick={handleJumpToStart} style={{ marginRight: "0.5rem" }}>
          Jump to Start
        </button>
        <button onClick={handleJumpToEnd}>Jump to End</button>
      </div>
      <p style={{ marginTop: "1rem", fontSize: "0.9rem", color: "#666" }}>
        Note: Memory buffer only keeps last 5000 entries in RAM. Older entries
        are persisted in IndexedDB.
      </p>
    </div>
  );
}
