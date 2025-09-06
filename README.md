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

📄 **Full example: examples/text-editor.jsx**

## React Todo App Example

Here’s a full-featured React app using `Executor` as a global store
(with undo/redo support out-of-the-box):

- Multiple components share the same `todosStore`.
- Undo/Redo history is automatic — no boilerplate!
- No Redux, no Zustand — just one function.

📂 **See full code in [`examples/react-todo-app`](./examples/react-todo-app)**

---

[![Open in CodeSandbox](https://codesandbox.io/static/img/play-codesandbox.svg)](https://codesandbox.io/s/github/martino-kevo/executor-fn/tree/main/demo)

> 🎮 **Try executor-fn live in your browser!**

## 🔥 React Hook Support (`useExecutor`)

You can now bind an `Executor` instance directly to your React components without manually forcing re-renders.

```jsx
import React from "react";
import Executor, { useExecutor } from "executor-fn";

const counterStore = Executor((count, delta) => count + delta, {
  storeHistory: true,
  callNow: true,
  initialArgs: [0],
});

export default function CounterApp() {
  const count = useExecutor(counterStore); // Auto-updates on state change

  return (
    <div>
      <h2>Count: {count}</h2>
      <button onClick={() => counterStore(counterStore.value, 1)}>➕</button>
      <button onClick={() => counterStore(counterStore.value, -1)}>➖</button>
      <button onClick={counterStore.undo}>⏪ Undo</button>
      <button onClick={counterStore.redo}>⏩ Redo</button>
    </div>
  );
}

**💡 The Story Behind Executor**

I didn’t build Executor by reading tons of docs or following a course.
I was just a curious developer who wanted to understand JavaScript callbacks — so curious that I literally prayed to God to help me understand programming better.

Then something clicked.
I wrote a small class that called a function immediately when created.
It was simple, but I shared it with ChatGPT — and together, we refined it step by step.

ChatGPT suggested improvements, helped me add state tracking, history, reset, undo, redo, and even showed me how to make it work in React.
Suddenly I realized:

This is basically Redux + Zustand + DevTools — but in one function.

What started as a moment of curiosity became a polished, production-ready tool that:

Calls functions immediately if you want

Remembers state and history automatically

Can undo/redo without extra libraries

Works anywhere: plain JS, React, Vue, Node, you name it

Executor is my way of saying:

"State management doesn’t have to be complicated — and sometimes the best tools are born from curiosity, prayer, and collaboration."


>>>>>>> c428633 (Initial commit: executor-fn)
