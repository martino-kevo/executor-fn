import React from "react";
import Executor, { useExecutor } from "executor-fn";

// --- appStore.js ---
// Executor stores { ui, data } together as one snapshot
export const appStore = Executor((state) => state, {
    callNow: true,
    storeHistory: true,
    initialArgs: [
        {
            ui: "home",
            data: { score: 0, user: "Player One" },
        },
    ],
});

// --- App.jsx ---
function App() {
    const state = useExecutor(appStore); // auto re-render on state change

    // Update score in data
    const updateScore = (points) =>
        appStore({
            ...state,
            data: { ...state.data, score: state.data.score + points },
        });

    // Navigate to different UI
    const navigate = (ui) =>
        appStore({
            ...state,
            ui,
        });

    return (
        <div style={{ fontFamily: "sans-serif", padding: "2rem" }}>
            {/* Render UI based on state.ui */}
            {state.ui === "home" && (
                <div>
                    <h1>🏠 Home</h1>
                    <p>Welcome {state.data.user}!</p>
                    <p>Score: {state.data.score}</p>
                    <button onClick={() => updateScore(5)}>+5 Points</button>
                    <button onClick={() => navigate("profile")}>Go to Profile</button>
                </div>
            )}

            {state.ui === "profile" && (
                <div>
                    <h1>👤 Profile</h1>
                    <p>Name: {state.data.user}</p>
                    <p>Score: {state.data.score}</p>
                    <button onClick={() => updateScore(10)}>+10 Points</button>
                    <button onClick={() => navigate("home")}>Back to Home</button>
                </div>
            )}

            {/* Undo/Redo Controls */}
            <div style={{ marginTop: "1rem", display: "flex", gap: "0.5rem" }}>
                <button onClick={appStore.undo}>⏪ Undo</button>
                <button onClick={appStore.redo}>⏩ Redo</button>
            </div>
        </div>
    );
}

export default App;
