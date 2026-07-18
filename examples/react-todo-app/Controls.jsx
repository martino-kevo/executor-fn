import React from "react";
import { useExecutor } from "executor-fn/react";
import { todosStore } from "./store";

export default function Controls() {
    // Subscribing here (even though this component doesn't render the
    // todos themselves) ensures the Undo/Redo disabled states are
    // recalculated on every store change, without depending on a parent
    // remembering to force a re-render.
    useExecutor(todosStore);

    return (
        <div style={{ marginTop: "1rem" }}>
            <button disabled={todosStore.history.length <= 1}
                onClick={() => todosStore.undo()}>
                ⏪ Undo
            </button>
            <button disabled={!todosStore.redoStack?.length}
                onClick={() => todosStore.redo()}>
                ⏩ Redo
            </button>
            <button onClick={() => todosStore.reset()}>
                🗑 Clear All
            </button>
        </div>
    );
}
