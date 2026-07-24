# ⚡ Executor – The Function Bender

> "If you wield this, you are a Function Bender — you bend functions at will. 😎"

A tiny, powerful utility for wrapping **any function** with:

- ✨ Immediate execution
- 🧠 Stateful memory
- ⏪ Undo/redo
- ⏸ Pause/resume
- 🧩 Reactivity & history tracking
- 💾 Persistence (IndexedDB by default) + cross-tab sync
- 🛡️ Crash-proof by design — a bad subscriber, callback, or storage failure never takes down your app

Think of it as:
🪄 **"Redux, Zustand, and DevTools — in one function."**

---

## 🚀 Installation

```bash
npm install executor-fn
```

Zero required dependencies. React is fully optional — the core package
never imports it, so `executor-fn` works the same in a Node backend, a
vanilla-JS frontend, or a React app.

> **Note on `peerDependencies`:** `package.json` lists `react` as an
> *optional* peer dependency. That requirement only applies if you import
> from `executor-fn/react` (i.e. you use `useExecutor`). If you only import
> from `executor-fn` itself, react doesn't need to be installed at all —
> `npm`/`yarn`/`pnpm` may still print an "optional peer dependency not
> installed" notice in that case, which is expected and safe to ignore.

---

## ⚠️ Migrating from 1.x

Version 2.0.0 has a few breaking changes:

- **`useExecutor` moved to a subpath.** It used to be exported from the
  main package, which meant `react` was resolved even if you never touched
  the hook. Now the core package (`executor-fn`) has zero react dependency,
  and the hook lives at `executor-fn/react`:

  ```js
  // before (1.x)
  import { Executor, useExecutor } from "executor-fn";

  // after (2.x)
  import { Executor } from "executor-fn";
  import { useExecutor } from "executor-fn/react";
  ```

- **`jumpTo`/`replaceAt` no longer throw** when called with `storeHistory:
  false`. They now report through `onError` (or `console.error` as a
  fallback) and return the current value, matching how `undo`/`redo`/
  `removeAt`/`insertAt` already behaved. If you had a `try/catch` around
  either of these specifically, switch to an `onError` handler instead.

- **The default `persistStorage` is now IndexedDB-backed**, not
  `localStorage`. If you were relying on the old implicit `localStorage`
  default, pass `persistStorage: localStorage` explicitly.

- **`split()` sub-executors now use your real callback**, not a
  placeholder. Calling a split executor directly (e.g. `ex1(99)`) now
  actually runs your logic on `99`, instead of silently re-committing the
  parent's initial value.

---

## 💡 Quick Start

```js
import { Executor } from "executor-fn";

// Create a reactive function
const counter = Executor((n, delta) => n + delta, {
  initialArgs: [0, 0], // both args — a single-element initialArgs here
  // leaves `delta` undefined, so callNow computes 0 + undefined = NaN
  callNow: true,
  storeHistory: true,
});

counter(counter.value, 1); // 1
counter(counter.value, 5); // 6
counter.undo(); // back to 1
counter.redo(); // forward to 6

console.log(counter.value); // 6
console.log(counter.history.map((entry) => entry.value)); // [0, 1, 6]
```

`counter.history` is an array of entries — `{ value, meta, group, _index,
_time }` — not raw values, since each entry can carry metadata, a group
label, and a timestamp alongside the value itself.

---

## ⚛️ React Integration (with useExecutor)

Bind Executor directly to your UI — no setState needed.

```jsx
import React from "react";
import { Executor } from "executor-fn";
import { useExecutor } from "executor-fn/react";

const store = Executor((n, d) => n + d, {
  callNow: true,
  storeHistory: true,
  initialArgs: [0, 0], // both args — see the Quick Start note above
});

export default function Counter() {
  const count = useExecutor(store); // Auto-reactive

  return (
    <div>
      <h2>Count: {count}</h2>
      <button onClick={() => store(store.value, 1)}>➕</button>
      <button onClick={() => store(store.value, -1)}>➖</button>
      <button onClick={() => store.undo()}>⏪ Undo</button>
      <button onClick={() => store.redo()}>⏩ Redo</button>
    </div>
  );
}
```

🧠 No Redux. No Zustand. No boilerplate.
Just one function with memory, history, and hooks.

---

## 🎯 Selective Subscriptions

For deeply nested state, `useExecutor` can subscribe to just a slice of
the value — so unrelated changes elsewhere in the store don't trigger a
re-render:

```jsx
import { useExecutor, shallowEqual } from "executor-fn/react";

// re-renders ONLY when user.name changes — not on any other field
const name = useExecutor(userStore, (s) => s.user.name);

// selecting an existing reference (like indexing into an array/object
// already in the store) works with no extra setup — Object.is is enough,
// since your state-update code naturally preserves references for
// anything that didn't change:
const firstTodo = useExecutor(todosStore, (s) => s.todos[0]);

// but a selector that CONSTRUCTS a new object/array each call needs a
// custom equality check, or it re-renders on every store change even
// when the selected content is identical:
const userInfo = useExecutor(userStore, (s) => ({ name: s.user.name, age: s.user.age }), shallowEqual);
```

`useExecutor` also still works exactly as before with no selector
(`useExecutor(store)` for the full value, `useExecutor(store, true)` for
the full executor instance).

More examples: `examples/selective-subscriptions.jsx`

---

## 🧮 Computed / Derived Values

`Executor.computed` creates a value that stays automatically in sync with
its dependencies — the reactive equivalent of Redux selectors or MobX
`computed`:

```js
import { Executor } from "executor-fn";

const posts = Executor((p) => p, { callNow: true, initialArgs: [[]] });

const postCount = Executor.computed((postsVal) => postsVal.length, [posts]);

postCount.value; // always current — recomputes whenever `posts` changes
```

The result is a real Executor instance, so it composes (a computed value
can depend on another computed value) and works with `useExecutor` like
any other store:

```jsx
const count = useExecutor(postCount);
```

For a parametrized lookup (e.g. "find the post with this specific id")
rather than a single always-current value, use `useExecutor`'s selector
instead — see Selective Subscriptions above:

```jsx
const post = useExecutor(posts, (p) => p.find((post) => post.id === id));
```

More examples: `examples/computed-values.js`

---

## 🧱 Advanced Example – Mini Text Editor

Use Executor to power an editor with live undo/redo:

```jsx
import React, { useState } from "react";
import { Executor } from "executor-fn";

const editor = Executor((_, newVal) => newVal, {
  storeHistory: true,
  callNow: true,
  initialArgs: [undefined, ""], // both args — a single-element initialArgs
  // here leaves newVal undefined, so editor.value starts as undefined
  // instead of "" (and React would warn about an input switching from
  // uncontrolled to controlled the first time you type).
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

**📄 More examples: examples/ folder**

---

## 💾 Persistence & Cross-Tab Sync

Auto-save to IndexedDB (the default) and mirror state across open tabs:

```js
const counter = Executor((n) => n + 1, {
  storeHistory: true,
  callNow: true,
  initialArgs: [0],
  persistKey: "counter",   // auto-saves and auto-restores under this key
  syncTabs: true,          // mirror changes across open tabs/windows
});
```

Open that in two tabs — clicking to update one updates the other
automatically. `persistStorage` accepts any `{ getItem, setItem }` adapter
(sync or async), so you can swap in `localStorage` or your own backend:

```js
Executor(fn, { persistKey: "x", persistStorage: localStorage });
```

Call `counter.stopSync()` to stop listening for cross-tab updates (e.g. on
unmount).

---

## 🛡️ Error Handling

Executor is built so that nothing auxiliary can crash your app:

- A throwing subscriber, `onChange` handler, or storage failure gets
  reported (via `onError`, or `console.error` as a fallback) — it never
  stops other subscribers from running or crashes the method that
  triggered it.
- `metadataFn`, `groupBy`, and `equalityFn` are safe to call anywhere in
  the API, not just inside the main callback.
- Genuine bugs in *your* callback still throw when no `onError` is
  configured — Executor won't silently swallow your own logic errors.

```js
const ex = Executor(myFn, {
  storeHistory: true,
  onError: (err) => console.error("Executor error:", err),
});
```

---

## 🧩 Key Features

- ⚡ Immediate Execution — runs instantly with `callNow` (sync or async —
  `await executor.ready` if you need to wait on an async initial value)
- 🧠 Persistent Value — latest result always at `.value`
- ⏪ Undo / Redo — auto-tracked history, with jump/replace/insert/remove
- 🧩 Works Anywhere — Node, React, Vanilla JS, with zero required dependencies
- 🎯 Composable — build stores, editors, or workflows; `split()`, `merge()`,
  `copy()` slice and recombine history

> **Note on `merge()`/`copy()` and `equalityFn`:** both accept an
> `equalityFn` directly to control what counts as a "match" for
> `merge({ overwrite: true })` and `copy()`'s `noDuplicate` dedup — e.g.
> `merge([other.history], { overwrite: true, equalityFn: (a, b) => a.id === b.id })`
> to replace entries by id regardless of what else differs. Without an
> `equalityFn` (here or set on the executor itself), both fall back to
> comparing entire serialized entries, which two entries sharing an id
> but differing elsewhere will never satisfy — so `overwrite: true` alone
> usually isn't what you want.

- 💾 Serializable & Persistent — export/import history, auto-persist to
  IndexedDB (or any adapter), sync across tabs
- 🔍 Queryable — `filterHistory`, `mapHistory`, `transformHistory`
- 📸 Multi-executor snapshots — `Executor.combine()`, `Executor.snapshot()`
- 🛡️ Crash-resistant — see Error Handling above

---

## 🌟 Summary

| Feature          | Description |
|------------------|-------------|
| 🪶 Lightweight    | Zero required dependencies |
| 🧭 Universal      | Works with Node, React, or Vanilla — react is fully optional |
| 🧠 Smart          | Remembers value, tracks history, metadata, and groups |
| 🔄 Reversible     | Built-in undo/redo/reset/jumpTo |
| 💾 Persistent     | IndexedDB by default, any adapter you like, cross-tab sync |
| 🛡️ Resilient      | A bad subscriber or callback never crashes your app |
| ⚛️ Reactive       | Direct React integration via `executor-fn/react` |

_💬 "Once you master Executor, any JS framework becomes your playground."_

---

## 💡 The Story Behind Executor

I didn't build Executor by reading tons of docs or following a course.
I was just a curious developer who wanted to understand JavaScript callbacks — so curious that I literally prayed to God to help me understand programming better.

Then something clicked.
I wrote a small class that called a function immediately when created.
It was simple, but I shared it with ChatGPT — and together, we refined it step by step.

ChatGPT suggested improvements, helped me add state tracking, history, reset, undo, redo, and even showed me how to make it work in React.
Suddenly I realized:

This is basically Redux + Zustand + DevTools — but in one function.

What started as a moment of curiosity became a polished, production-ready tool that:

- Calls functions immediately if you want
- Remembers state and history automatically
- Can undo/redo without extra libraries
- Persists and syncs across tabs without extra libraries
- Works anywhere: plain JS, React, Vue, Node, you name it

Executor is my way of saying:

"State management doesn't have to be complicated — and sometimes the best tools are born from curiosity, prayer, and collaboration."

Also by me: [**biscuit-cache-js**](https://www.npmjs.com/package/biscuit-cache-js) — a persistent, reactive browser cache with background refresh and cross-tab sync.

---

## 📜 License

MIT © Martins Kelvin
