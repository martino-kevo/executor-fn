import React, { useEffect } from "react";
import { Executor } from "executor-fn";
import { useExecutor } from "executor-fn/react";

// --- store.js ---
export const userStore = Executor((data) => data, {
    callNow: false,      // don't run until we set data
    storeHistory: true,  // enables time-travel/undo
});

// --- DebugPanel.jsx ---
function DebugPanel({ store }) {
    // .history is an array of entries ({ value, meta, group, _index, _time }),
    // not raw values — pull out just the values for a readable display.
    const values = store.history?.map((entry) => entry.value) ?? [];

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
            <p><strong>History:</strong> {JSON.stringify(values)}</p>

            <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.5rem" }}>
                {/* undo/redo take an optional `steps` argument — passing them
                    directly as onClick would hand React's SyntheticEvent to
                    `steps`, which silently breaks the internal loop and makes
                    the button do nothing. Always wrap in an arrow function. */}
                <button onClick={() => store.undo()}>⏪ Undo</button>
                <button onClick={() => store.redo()}>⏩ Redo</button>
                {/* reset() takes no arguments, so passing it directly is safe */}
                <button onClick={store.reset}>🔄 Reset</button>
            </div>
        </div>
    );
}

// --- UserComponent.jsx ---
export default function UserComponent() {
    // Hook will auto re-render when userStore updates
    const user = useExecutor(userStore);

    useEffect(() => {
        async function fetchUser() {
            const res = await fetch("/api/user");
            const data = await res.json();
            await userStore(data); // update store, trigger re-render
        }

        fetchUser();
    }, []);

    if (!user) return <p>Loading user...</p>;

    return (
        <div style={{ fontFamily: "sans-serif", maxWidth: "500px", margin: "auto" }}>
            {/* useExecutor(userStore) returns userStore.value directly (not
                the executor instance), so `user` IS the fetched data — use
                user.name / user.email, not user.value.name. */}
            <h2>Welcome, {user?.name} 👋</h2>
            <p>Email: {user?.email}</p>

            {/* Debug Panel to visualize state + time travel */}
            <DebugPanel store={userStore} />
        </div>
    );
}
