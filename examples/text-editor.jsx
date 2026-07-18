import React, { useState } from "react";
import { Executor } from "executor-fn";

const editor = Executor((_, newValue) => newValue, {
  storeHistory: true,
  callNow: true,
  initialArgs: ["", ""], // both positions — a single-element initialArgs
  // left newValue as undefined, so editor.value started as undefined
  // instead of "" (React then warns about switching an input from
  // uncontrolled to controlled once a real string comes in).
});

export default function TextEditorApp() {
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
          // editor.redo is always a function reference (truthy), so
          // `!editor.redo` never actually reflects whether there's
          // anything TO redo — check the redoStack itself instead.
          disabled={!editor.redoStack?.length}
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
