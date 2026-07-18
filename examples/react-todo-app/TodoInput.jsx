import React, { useState } from "react";
import { todosStore } from "./store";

export default function TodoInput() {
    const [text, setText] = useState("");

    const handleAdd = () => {
        if (!text.trim()) return;
        todosStore(todosStore.value, { type: "add", text });
        setText("");
    };

    return (
        <div>
            <input
                type="text"
                placeholder="Add a todo..."
                value={text}
                onChange={(e) => setText(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleAdd()}
            />
            <button onClick={handleAdd}>➕ Add</button>
        </div>
    );
}
