import React, { useEffect } from "react";
import Executor, { useExecutor } from "executor-fn";

// --- store.js ---
export const userStore = Executor((data) => data, {
    callNow: false,      // don't run until we set data
    storeHistory: true,  // enables time-travel/undo
});

// --- DebugPanel.jsx ---
function DebugPanel({ store }) {
    return (
        <div style={{
            marginTop: "1rem",
            padding: "1rem",
            border: "1px solid #ccc",
            borderRadius: "8px",
            background: "#f8f8f8",
            fontFamily: "monospace"
        }}>
            <h4>🕒 Time Travel Debug</h4>
            <p><strong>Current Value:</strong> {JSON.stringify(store.value)}</p>
            <p><strong>History:</strong> {JSON.stringify(store.history)}</p>

            <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.5rem" }}>
                <button onClick={store.undo}>⏪ Undo</button>
                <button onClick={store.redo}>⏩ Redo</button>
                <button onClick={store.reset}>🔄 Reset</button>
            </div>
        </div>
    );
}

// --- UserComponent.jsx ---
export default function UserComponent() {
    const user = useExecutor(userStore);

    useEffect(() => {
        async function fetchUser() {
            const res = await fetch("/api/user");
            const data = await res.json();
            userStore(data); // update store, trigger re-render
        }

        fetchUser();
    }, []);

    if (!user) return <p>Loading user...</p>;

    return (
        <div style={{ fontFamily: "sans-serif", maxWidth: "500px", margin: "auto" }}>
            <h2>Welcome, {user.name} 👋</h2>
            <p>Email: {user.email}</p>

            {/* Debug Panel to visualize state + time travel */}
            <DebugPanel store={userStore} />
        </div>
    );
}
