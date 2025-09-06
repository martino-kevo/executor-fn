import React, { useState } from "react";
import TodoInput from "./TodoInput";
import TodoList from "./TodoList";
import Controls from "./Controls";
import { todosStore } from "./store";

export default function App() {
    const [, setTick] = useState(0); // simple re-render trigger
    const forceUpdate = () => setTick((t) => t + 1);

    return (
        <div style={{ padding: "1rem", fontFamily: "sans-serif" }}>
            <h1>📝 Executor Global Todo App</h1>
            <TodoInput onUpdate={forceUpdate} />
            <TodoList onUpdate={forceUpdate} />
            <Controls onUpdate={forceUpdate} />

            <pre style={{ marginTop: "1rem", background: "#f5f5f5", padding: "0.5rem" }}>
                <strong>Current State:</strong> {JSON.stringify(todosStore.value, null, 2)}
            </pre>
        </div>
    );
}
