<<<<<<< HEAD

# executor-fn

=======

# ⚡ Executor – The Function Bender

> “If you wield this, you are a Function Bender — you bend functions at will. 😎”

A tiny, powerful utility for wrapping **any function** with:

- ✨ Immediate execution
- 🧠 Stateful memory
- ⏪ Undo/redo
- ⏸ Pause/resume
- 🧩 Reactivity & history tracking

Think of it as:  
🪄 **“Redux, Zustand, and DevTools — in one function.”**

---

## 🚀 Installation

```bash
npm install executor-fn

```

## 💡 Quick Start

```bash
import { Executor } from "executor-fn";

// Create a reactive function
const counter = Executor((n, delta) => n + delta, {
  initialArgs: [0],
  callNow: true,
  storeHistory: true,
});

counter(1); // 1
counter(5); // 6
counter.undo(); // back to 1
counter.redo(); // forward to 6

console.log(counter.value);   // 6
console.log(counter.history); // [0, 1, 6]

```

## ⚛️ React Integration (with useExecutor)

Bind Executor directly to your UI — no setState needed.

```bash
import React from "react";
import { Executor, useExecutor } from "executor-fn";

const store = Executor((n, d) => n + d, {
  callNow: true,
  storeHistory: true,
  initialArgs: [0],
});

export default function Counter() {
  const count = useExecutor(store); // Auto-reactive

  return (
    <div>
      <h2>Count: {count}</h2>
      <button onClick={() => store(store.value, 1)}>➕</button>
      <button onClick={() => store(store.value, -1)}>➖</button>
      <button onClick={store.undo}>⏪ Undo</button>
      <button onClick={store.redo}>⏩ Redo</button>
    </div>
  );
}

```

🧠 No Redux. No Zustand. No boilerplate.
Just one function with memory, history, and hooks.

## 🧱 Advanced Example – Mini Text Editor

Use Executor to power an editor with live undo/redo:

```bash
import React, { useState } from "react";
import { Executor } from "executor-fn";

const editor = Executor((_, newVal) => newVal, {
  storeHistory: true,
  callNow: true,
  initialArgs: [""],
});

export default function TextEditorApp() {
  const [text, setText] = useState(editor.value);
  const sync = () => setText(editor.value);

  return (
    <div>
      <textarea
        value={text}
        onChange={(e) => {
          editor(editor.value, e.target.value);
          sync();
        }}
      />
      <button onClick={() => { editor.undo(); sync(); }}>Undo</button>
      <button onClick={() => { editor.redo(); sync(); }}>Redo</button>
      <button onClick={() => { editor.reset(); sync(); }}>Reset</button>
    </div>
  );
}

```

**📄 More examples: examples/ - folder**


## 🧩 Key Features

- ⚡ Immediate Execution — runs instantly with callNow
- 🧠 Persistent Value — latest result always at .value
- ⏪ Undo / Redo — auto-tracked history
- 🧩 Works Anywhere — Node, React, Vanilla JS
- 🎯 Composable — build stores, editors, or workflows
- 💾 Serializable — export/import history



## 🌟 Summary

| Feature	       |     Description  |
|----------------|------------------|
| 🪶 Lightweight	 |   Zero dependencies                          |
| 🧭 Universal	   |   Works with Node, React, or Vanilla         |
| 🧠 Smart	       |    Remembers value, tracks history            |
| 🔄 Reversible	   |    Built-in undo/redo/reset                   |
| ⚛️ Reactive	     |    Direct React integration via useExecutor() |


_💬 “Once you master Executor, any JS framework becomes your playground.”_


## 💡 The Story Behind Executor

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
```
