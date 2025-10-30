import React, { useState } from "react";
import { Executor } from "executor-fn"; // your library

// Create a counter executor with history + initial value
const counter = Executor((count, delta) => count + delta, {
  storeHistory: true,
  callNow: true,
  initialArgs: [0],
});

export default function CounterApp() {
  // React local state to re-render when Executor value changes
  const [value, setValue] = useState(counter.value);

  const updateUI = () => setValue(counter.value);

  return (
    <div
      style={{
        fontFamily: "sans-serif",
        textAlign: "center",
        marginTop: "2rem",
      }}
    >
      <h1>🚀 Executor Counter</h1>
      <h2>Current Value: {value}</h2>

      <button
        onClick={() => {
          counter(counter.value, 1);
          updateUI();
        }}
      >
        ➕ Increment
      </button>
      <button
        onClick={() => {
          counter(counter.value, -1);
          updateUI();
        }}
      >
        ➖ Decrement
      </button>

      <div style={{ marginTop: "1rem" }}>
        <button
          disabled={counter.history.length <= 1}
          onClick={() => {
            counter.undo();
            updateUI();
          }}
        >
          ⏪ Undo
        </button>
        <button
          disabled={counter.history.length === 0 || !counter.redo}
          onClick={() => {
            counter.redo();
            updateUI();
          }}
        >
          ⏩ Redo
        </button>
        <button
          onClick={() => {
            counter.reset();
            updateUI();
          }}
        >
          🔄 Reset
        </button>
      </div>

      <div style={{ marginTop: "1rem" }}>
        <strong>History:</strong> {JSON.stringify(counter.history)}
      </div>
    </div>
  );
}
