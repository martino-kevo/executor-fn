import React, { useState } from "react";
import { todosStore } from "./store";

export default function TodoInput({ onUpdate }) {
    const [text, setText] = useState("");

    const handleAdd = () => {
        if (!text.trim()) return;
        todosStore(todosStore.value, { type: "add", text });
        setText("");
        onUpdate();
    };

    return (
        <div>
            <input
                type="text"
                placeholder="Add a todo..."
                value={text}
                onChange={(e) => setText(e.target.value)}
            />
            <button onClick={handleAdd}>➕ Add</button>
        </div>
    );
}
