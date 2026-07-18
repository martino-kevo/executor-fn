import React, { useState } from "react";
import CounterApp from "../examples/react-counter.jsx";
import TextEditorApp from "../examples/text-editor.jsx";

export default function App() {
    const [view, setView] = useState("counter");

    const tabStyle = (name) => ({
        fontWeight: view === name ? "bold" : "normal",
        textDecoration: view === name ? "underline" : "none",
    });

    return (
        <div style={{ fontFamily: "sans-serif", padding: "1rem" }}>
            <h1>🚀 Executor-fn Playground</h1>

            <div style={{ marginBottom: "1rem" }}>
                <button style={tabStyle("counter")} onClick={() => setView("counter")}>
                    Counter
                </button>
                <button style={tabStyle("editor")} onClick={() => setView("editor")}>
                    Text Editor
                </button>
            </div>

            {/* CounterApp/TextEditorApp each hold their own module-scoped
                executor (defined in their own files), so switching views
                unmounts/remounts the component but NOT the underlying
                executor state — flipping back to a tab picks up right
                where you left it. */}
            {view === "counter" && <CounterApp />}
            {view === "editor" && <TextEditorApp />}
        </div>
    );
}
