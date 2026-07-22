import React from "react";
import { Executor } from "executor-fn";
import { useExecutor, shallowEqual } from "executor-fn/react";

// A deliberately "wide" store — several unrelated pieces of state living
// together, to demonstrate why selective subscriptions matter. Without a
// selector, ANY change here (even to `theme`) would re-render every
// component subscribed to the whole value.
const appStore = Executor((s) => s, {
    callNow: true,
    storeHistory: true,
    initialArgs: [
        {
            user: { name: "Kelvin", age: 30 },
            theme: "light",
            todos: [
                { id: 1, text: "Ship the release", done: false },
                { id: 2, text: "Write the changelog", done: false },
            ],
        },
    ],
});

// --- Selecting a primitive: cheapest, no equality function needed ---
function UserName() {
    const name = useExecutor(appStore, (s) => s.user.name);
    return <p>Name: {name}</p>;
}

// --- Selecting an existing reference (indexing into the store) ---
// Safe with the default equality check (Object.is), as long as state
// updates preserve references for parts that didn't change — which the
// updateTodo function below is careful to do.
function FirstTodo() {
    const todo = useExecutor(appStore, (s) => s.todos[0]);
    return <p>First todo: {todo.text} {todo.done ? "✅" : ""}</p>;
}

// --- Selecting a CONSTRUCTED object: needs shallowEqual ---
// Without shallowEqual, this would re-render on every store change (even
// unrelated ones like toggling the theme), since `{ name, age }` is a
// brand-new object every single call.
function UserSummary() {
    const summary = useExecutor(
        appStore,
        (s) => ({ name: s.user.name, age: s.user.age }),
        shallowEqual
    );
    return <p>Summary: {summary.name}, {summary.age} years old</p>;
}

// --- Full value, no selector: re-renders on ANY change (the baseline) ---
function DebugFullState() {
    const state = useExecutor(appStore);
    return <pre>{JSON.stringify(state, null, 2)}</pre>;
}

function toggleTodo(id) {
    const state = appStore.value;
    appStore({
        ...state,
        // .map() here returns the SAME object reference for todos that
        // didn't change — that's what keeps FirstTodo's selector from
        // re-rendering when a DIFFERENT todo is toggled.
        todos: state.todos.map((t) => (t.id === id ? { ...t, done: !t.done } : t)),
    });
}

function toggleTheme() {
    const state = appStore.value;
    appStore({ ...state, theme: state.theme === "light" ? "dark" : "light" });
}

export default function App() {
    return (
        <div style={{ padding: "1rem", fontFamily: "sans-serif" }}>
            <h1>🎯 Selective Subscriptions Demo</h1>

            <UserName />
            <FirstTodo />
            <UserSummary />

            <div style={{ marginTop: "1rem", display: "flex", gap: "0.5rem" }}>
                <button onClick={() => toggleTodo(1)}>Toggle todo #1</button>
                <button onClick={() => toggleTodo(2)}>Toggle todo #2</button>
                <button onClick={toggleTheme}>Toggle theme (unrelated to all the above)</button>
            </div>

            {/* Open React DevTools' profiler and click "Toggle theme" — only
                DebugFullState re-renders. UserName, FirstTodo, and
                UserSummary don't, since none of them selected `theme`. */}
            <h3 style={{ marginTop: "1rem" }}>Full state (always re-renders on any change)</h3>
            <DebugFullState />
        </div>
    );
}
