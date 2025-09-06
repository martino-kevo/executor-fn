// store.js
import Executor from "executor-fn";

export const todosStore = Executor((prevTodos, action) => {
    switch (action.type) {
        case "add":
            return [...prevTodos, { id: Date.now(), text: action.text, done: false }];
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
}, {
    storeHistory: true,
    callNow: true,
    initialArgs: [[]], // start with empty array
});
