import React from "react";
import { todosStore } from "./store";

export default function Controls({ onUpdate }) {
    return (
        <div style={{ marginTop: "1rem" }}>
            <button disabled={todosStore.history.length <= 1}
                onClick={() => { todosStore.undo(); onUpdate(); }}>
                ⏪ Undo
            </button>
            <button disabled={todosStore.redoStack?.length === 0}
                onClick={() => { todosStore.redo(); onUpdate(); }}>
                ⏩ Redo
            </button>
            <button onClick={() => { todosStore.reset(); onUpdate(); }}>
                🗑 Clear All
            </button>
        </div>
    );
}
