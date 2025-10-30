import React, { useState, useEffect, useRef } from "react";
import { ExecutorV2, useExecutor } from "executor-fn/v2";

// Executor instance
const executor = ExecutorV2((state) => state, {
  storeHistory: true,
  maxHistory,
  historyStep,
  useIndexedDB: false,
});

export default function ExecutorV2GameDemo() {
  const [maxHistory, setMaxHistory] = useState(5000);
  const [historyStep, setHistoryStep] = useState(10);
  const totalUpdates = 100000;

  const currentState = useExecutor(executor);
  const [progress, setProgress] = useState(0);
  const [historyLength, setHistoryLength] = useState(0);
  const [redoLength, setRedoLength] = useState(0);
  const intervalRef = useRef(null);

  // Simulate game loop
  useEffect(() => {
    let frame = 0;

    intervalRef.current = setInterval(() => {
      if (frame >= totalUpdates) {
        clearInterval(intervalRef.current);
        return;
      }

      const newState = {
        x: Math.sin(frame / 50) * 200 + 200,
        y: Math.cos(frame / 50) * 200 + 200,
      };

      executor(newState);

      frame++;
      if (frame % 1000 === 0) setProgress(frame);

      // Update history/redo length in real-time
      setHistoryLength(executor.history?.length || 0);
      setRedoLength(executor.redoStack?.length || 0);
    }, 1);

    return () => clearInterval(intervalRef.current);
  }, [currentState]);

  // Undo/Redo handlers
  const handleUndo = () => {
    executor.undo(1);
    setHistoryLength(executor.history?.length || 0);
    setRedoLength(executor.redoStack?.length || 0);
  };
  const handleRedo = () => {
    executor.redo(1);
    setHistoryLength(executor.history?.length || 0);
    setRedoLength(executor.redoStack?.length || 0);
  };
  const handleJumpToStart = () => {
    executor.jumpTo(0);
    setHistoryLength(executor.history?.length || 0);
    setRedoLength(executor.redoStack?.length || 0);
  };
  const handleJumpToEnd = () => {
    const history = executor.history || [];
    executor.jumpTo(history.length - 1);
    setHistoryLength(executor.history?.length || 0);
    setRedoLength(executor.redoStack?.length || 0);
  };

  return (
    <div style={{ padding: "2rem", fontFamily: "sans-serif" }}>
      <h1>ExecutorV2 Game Demo with Live Stats</h1>
      <p>
        Updates processed: {progress.toLocaleString()} /{" "}
        {totalUpdates.toLocaleString()}
      </p>
      <p>
        Current position: x={currentState?.x?.toFixed(1)}, y=
        {currentState?.y?.toFixed(1)}
      </p>

      {/* Dynamic Controls */}
      <div style={{ margin: "1rem 0" }}>
        <label style={{ marginRight: "1rem" }}>
          maxHistory:
          <input
            type="number"
            value={maxHistory}
            min={100}
            max={50000}
            step={100}
            onChange={(e) => setMaxHistory(parseInt(e.target.value))}
            style={{ marginLeft: "0.5rem", width: "80px" }}
          />
        </label>
        <label>
          historyStep:
          <input
            type="number"
            value={historyStep}
            min={1}
            max={100}
            step={1}
            onChange={(e) => setHistoryStep(parseInt(e.target.value))}
            style={{ marginLeft: "0.5rem", width: "60px" }}
          />
        </label>
      </div>

      {/* Undo/Redo Buttons */}
      <div style={{ margin: "1rem 0" }}>
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

      {/* Live Stats */}
      <div style={{ margin: "1rem 0", fontSize: "0.9rem", color: "#333" }}>
        <p>History length: {historyLength}</p>
        <p>Redo stack length: {redoLength}</p>
      </div>

      {/* Game Canvas */}
      <div
        style={{
          marginTop: "2rem",
          width: "400px",
          height: "400px",
          position: "relative",
          border: "1px solid #ccc",
        }}
      >
        <div
          style={{
            width: "20px",
            height: "20px",
            background: "red",
            borderRadius: "50%",
            position: "absolute",
            left: `${currentState?.x || 0}px`,
            top: `${currentState?.y || 0}px`,
            transition: "left 0.1s linear, top 0.1s linear",
          }}
        />
      </div>

      <p style={{ marginTop: "1rem", fontSize: "0.9rem", color: "#666" }}>
        Adjust <b>maxHistory</b> and <b>historyStep</b> dynamically to see how
        memory usage and undo/redo speed react in real-time.
      </p>
    </div>
  );
}
