import React from "react";
import { todosStore } from "./store";

export default function TodoList({ onUpdate }) {
    return (
        <ul style={{ listStyle: "none", padding: 0 }}>
            {todosStore.value.map((todo) => (
                <li key={todo.id} style={{
                    textDecoration: todo.done ? "line-through" : "none",
                    marginBottom: "0.5rem"
                }}>
                    <span
                        style={{ cursor: "pointer", marginRight: "1rem" }}
                        onClick={() => {
                            todosStore(todosStore.value, { type: "toggle", id: todo.id });
                            onUpdate();
                        }}
                    >
                        ✅
                    </span>
                    {todo.text}
                    <button
                        style={{ marginLeft: "1rem" }}
                        onClick={() => {
                            todosStore(todosStore.value, { type: "remove", id: todo.id });
                            onUpdate();
                        }}
                    >
                        ❌
                    </button>
                </li>
            ))}
        </ul>
    );
}
