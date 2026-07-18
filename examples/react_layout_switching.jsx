import React from "react";
import { Executor } from "executor-fn";
import { useExecutor } from "executor-fn/react";

// --- uiStore.js ---
// Store just the page NAME as state, not the JSX itself. Storing raw JSX
// elements directly caused real problems: elements created during a
// component's render carry a reference to React's internal Fiber node
// (via `_owner`, attached automatically in dev mode) — and Fiber trees are
// circular by design. Executor's deepClone handles that safely (it won't
// crash or hang), but the resulting history entries stay just as circular
// as the source, so exportHistory()/serializeHistory() would throw
// "Converting circular structure to JSON" the moment you tried to use
// them. Storing a plain string and deriving the JSX from it keeps state
// serializable, matching what react_data_plus_ui.jsx already does.
export const uiStore = Executor((page) => page, {
  callNow: true,
  storeHistory: true,
  initialArgs: ["home"],
});

// --- LayoutSwitcher.jsx ---
// Defined outside the component so these elements aren't recreated (or
// tied to a render's Fiber) on every render.
const pages = {
  home: (
    <div style={{ padding: "2rem", textAlign: "center" }}>
      <h1>🏠 Home Page</h1>
      <p>Welcome to the site!</p>
    </div>
  ),
  about: (
    <div style={{ padding: "2rem", textAlign: "center" }}>
      <h1>ℹ️ About Page</h1>
      <p>We are powered by Executor ⚡</p>
    </div>
  ),
  contact: (
    <div style={{ padding: "2rem", textAlign: "center" }}>
      <h1>📞 Contact Page</h1>
      <p>Email us at hello@example.com</p>
    </div>
  ),
};

function LayoutSwitcher() {
  const page = useExecutor(uiStore); // auto re-render when the page name changes

  return (
    <div style={{ fontFamily: "sans-serif", maxWidth: "600px", margin: "auto" }}>
      <div
        style={{
          border: "1px solid #ccc",
          borderRadius: "12px",
          marginBottom: "1rem",
        }}
      >
        {pages[page] ?? pages.home}
      </div>

      <div style={{ display: "flex", gap: "0.5rem", justifyContent: "center" }}>
        <button onClick={() => uiStore("home")}>Home</button>
        <button onClick={() => uiStore("about")}>About</button>
        <button onClick={() => uiStore("contact")}>Contact</button>
        {/* undo/redo take an optional `steps` argument — passing them
            directly as onClick would hand React's SyntheticEvent to
            `steps`, silently breaking the internal loop. */}
        <button onClick={() => uiStore.undo()}>⏪ Undo</button>
        <button onClick={() => uiStore.redo()}>⏩ Redo</button>
      </div>
    </div>
  );
}

export default LayoutSwitcher;
