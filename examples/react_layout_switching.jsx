import React from "react";
import Executor, { useExecutor } from "executor-fn";

// --- uiStore.js ---
// This Executor stores whole JSX layouts as "state"
export const uiStore = Executor((ui) => ui, {
  callNow: true,
  storeHistory: true,
  initialArgs: [
    <div style={{ padding: "2rem", textAlign: "center" }}>
      <h1>🏠 Home Page</h1>
      <p>Welcome to the site!</p>
    </div>
  ],
});

// --- LayoutSwitcher.jsx ---
function LayoutSwitcher() {
  const ui = useExecutor(uiStore); // auto re-render when layout changes

  // Define different page layouts
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

  return (
    <div style={{ fontFamily: "sans-serif", maxWidth: "600px", margin: "auto" }}>
      <div
        style={{
          border: "1px solid #ccc",
          borderRadius: "12px",
          marginBottom: "1rem",
        }}
      >
        {ui}
      </div>

      <div style={{ display: "flex", gap: "0.5rem", justifyContent: "center" }}>
        <button onClick={() => uiStore(pages.home)}>Home</button>
        <button onClick={() => uiStore(pages.about)}>About</button>
        <button onClick={() => uiStore(pages.contact)}>Contact</button>
        <button onClick={uiStore.undo}>⏪ Undo</button>
        <button onClick={uiStore.redo}>⏩ Redo</button>
      </div>
    </div>
  );
}

export default LayoutSwitcher;
