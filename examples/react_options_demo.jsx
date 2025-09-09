import React from "react";
import Executor, { useExecutor } from "./executor";

export default function App() {
  // ✅ Example: Counter with all options enabled
  const counter = React.useMemo(
    () =>
      Executor(
        (step = 1) => {
          if (step === "error") throw new Error("Manual error triggered!");
          return (counter.value ?? 0) + step;
        },
        {
        // Most options enabled for demonstration but are fully optional
          storeHistory: true,
          initialArgs: [0],
          callNow: true,
          maxHistory: 5,
          equalityFn: (a, b) => a === b, // don't store duplicate values
          onError: (err) => alert(`Executor caught an error: ${err.message}`)
        }
      ),
    []
  );

  const count = useExecutor(counter);

  return (
    <div style={styles.container}>
      <h1>⚡ Executor Demo</h1>

      <p>
        Current Value: <strong>{count.value}</strong>
      </p>

      <div style={styles.buttonRow}>
        <button onClick={() => counter(1)}>+1</button>
        <button onClick={() => counter(-1)}>-1</button>
        <button onClick={() => counter.reset()}>Reset</button>
      </div>

      <div style={styles.buttonRow}>
        <button onClick={() => counter.undo()}>Undo</button>
        <button onClick={() => counter.redo()}>Redo</button>
      </div>

      <div style={styles.buttonRow}>
        <button onClick={() => counter("error")}>Trigger Error</button>
        <button
          onClick={() => {
            console.log("Serialized History:", counter.serializeHistory());
            alert("History serialized to console!");
          }}
        >
          Serialize History
        </button>
        <button
          onClick={() => {
            counter.clearHistory();
            alert("History cleared!");
          }}
        >
          Clear History
        </button>
      </div>

      <p style={styles.note}>
        📝 <b>Features in action:</b> History capped at 5 entries, duplicate
        values skipped, errors caught via <code>onError</code>.
      </p>
    </div>
  );
}

const styles = {
  container: {
    fontFamily: "sans-serif",
    padding: "2rem",
    maxWidth: "400px",
    margin: "auto",
    textAlign: "center",
    background: "#f8f8f8",
    borderRadius: "12px",
    boxShadow: "0 2px 6px rgba(0,0,0,0.1)"
  },
  buttonRow: {
    display: "flex",
    justifyContent: "center",
    gap: "10px",
    marginTop: "1rem"
  },
  note: {
    fontSize: "0.9rem",
    marginTop: "1rem",
    color: "#555"
  }
};
