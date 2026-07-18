// store.js
import { Executor } from "executor-fn";

export const todosStore = Executor(
  (prevTodos, action) => {
    switch (action?.type) {
      case "add":
        return [
          ...prevTodos,
          { id: crypto.randomUUID(), text: action.text, done: false },
        ];
      case "toggle":
        return prevTodos.map((t) =>
          t.id === action.id ? { ...t, done: !t.done } : t
        );
      case "remove":
        return prevTodos.filter((t) => t.id !== action.id);
      case "clear":
        return [];
      default:
        return prevTodos;
    }
  },
  {
    storeHistory: true,
    callNow: true,
    // ⚠️ Both positional arguments matter here — the callback reads
    // `action?.type`, but with callNow: true, Executor invokes the
    // callback immediately using exactly what's in initialArgs. The
    // original version only supplied `[[]]` (just prevTodos), leaving
    // `action` as undefined. The original code also used `action.type`
    // without the `?.`, which threw synchronously at module load — before
    // the app could render anything at all. Supplying a real "init"
    // action here is defensive either way.
    initialArgs: [[], { type: "init" }],
    onError: (err) => console.error("todosStore error:", err.message),
  }
);
