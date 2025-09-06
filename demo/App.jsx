import React, { useState } from "react";
import CounterApp from "../examples/react-counter.jsx";
import TextEditorApp from "../examples/text-editor.jsx";

export default function App() {
    const [view, setView] = useState("counter");

    return (
        <div style={{ fontFamily: "sans-serif", padding: "1rem" }}>
            <h1>🚀 Executor-fn Playground</h1>

            <div style={{ marginBottom: "1rem" }}>
                <button onClick={() => setView("counter")}>Counter</button>
                <button onClick={() => setView("editor")}>Text Editor</button>
            </div>

            {view === "counter" && <CounterApp />}
            {view === "editor" && <TextEditorApp />}
        </div>
    );
}
