<<<<<<< HEAD
# executor-fn
=======
# 🚀 executor-fn

A tiny, powerful utility for wrapping any function with **immediate execution**,  
**history tracking**, **undo/redo**, and **stateful function calls**.

---

## ✨ Features

- 🔥 **Immediate Execution** — call your function right away with `callNow`
- 🧠 **Stateful Functions** — access `.value` for the latest result
- ⏪ **Undo / Redo Support** — automatically stores history if enabled
- 🧩 **Lightweight** — zero dependencies, works in **Node**, **Vanilla JS**, and **React**
- 🎯 **Perfect for Tenary Expressions** — run multiple lines inside `?:` easily

---

## 📦 Installation

```bash
npm install executor-fn

---

## 🖊 Advanced Example: Mini Text Editor

You can even use `Executor` to power a text editor with full undo/redo:

```jsx
import React, { useState } from "react";
import Executor from "executor-fn";

export default function TextEditorApp() {
  const editor = Executor((_, newValue) => newValue, {
    storeHistory: true,
    callNow: true,
    initialArgs: [""],
  });

  const [text, setText] = useState(editor.value);
  const updateUI = () => setText(editor.value);

  return (
    <div>
      <textarea
        rows="4"
        cols="40"
        value={text}
        onChange={(e) => {
          editor(editor.value, e.target.value);
          updateUI();
        }}
      />
      <button onClick={() => { editor.undo(); updateUI(); }}>Undo</button>
      <button onClick={() => { editor.redo(); updateUI(); }}>Redo</button>
      <button onClick={() => { editor.reset(); updateUI(); }}>Reset</button>
      <pre>{JSON.stringify(editor.history, null, 2)}</pre>
    </div>
  );
}

📄 Full example: examples/text-editor.jsx

>>>>>>> c428633 (Initial commit: executor-fn)
