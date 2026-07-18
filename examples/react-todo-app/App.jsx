import React from "react";
import { useExecutor } from "executor-fn/react";
import TodoInput from "./TodoInput";
import TodoList from "./TodoList";
import Controls from "./Controls";
import { todosStore } from "./store";

// ⚠️ The original version threaded a manual `forceUpdate`/`onUpdate`
// callback through every component, requiring each place that called
// todosStore(...) to remember to invoke it afterward. That's fragile —
// forget one call site and that part of the UI silently goes stale.
// useExecutor subscribes automatically per-component and re-renders
// exactly when the store actually changes, so none of that wiring is
// needed anymore.
export default function App() {
    const todos = useExecutor(todosStore);

    return (
        <div style={{ padding: "1rem", fontFamily: "sans-serif" }}>
            <h1>📝 Executor Global Todo App</h1>
            <TodoInput />
            <TodoList />
            <Controls />

            <pre style={{ marginTop: "1rem", background: "#f5f5f5", padding: "0.5rem" }}>
                <strong>Current State:</strong> {JSON.stringify(todos, null, 2)}
            </pre>
        </div>
    );
}
