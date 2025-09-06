import React, { useState } from "react";
import Executor from "../executor.js";

export default function TextEditorApp() {
    const editor = Executor((_, newValue) => newValue, {
        storeHistory: true,
        callNow: true,
        initialArgs: [""],
    });

    const [text, setText] = useState(editor.value);
    const updateUI = () => setText(editor.value);

    return (
        <div style={{ padding: "1rem", fontFamily: "sans-serif" }}>
            <h1>📝 Mini Text Editor</h1>

            <textarea
                rows="4"
                cols="40"
                value={text}
                onChange={(e) => {
                    editor(editor.value, e.target.value);
                    updateUI();
                }}
            />

            <div style={{ marginTop: "1rem" }}>
                <button
                    disabled={editor.history.length <= 1}
                    onClick={() => {
                        editor.undo();
                        updateUI();
                    }}
                >
                    ⏪ Undo
                </button>

                <button
                    disabled={!editor.redo || editor.history.length === 0}
                    onClick={() => {
                        editor.redo();
                        updateUI();
                    }}
                >
                    ⏩ Redo
                </button>

                <button
                    onClick={() => {
                        editor.reset();
                        updateUI();
                    }}
                >
                    🔄 Reset
                </button>
            </div>

            <div style={{ marginTop: "1rem" }}>
                <strong>History:</strong>
                <pre>{JSON.stringify(editor.history, null, 2)}</pre>
            </div>
        </div>
    );
}
