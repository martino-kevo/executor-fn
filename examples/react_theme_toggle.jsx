import React from "react";
import { Executor } from "executor-fn";
import { useExecutor } from "executor-fn/react";

// --- themeStore.js ---
export const themeStore = Executor((theme) => theme, {
    callNow: true,        // start immediately
    storeHistory: true,   // enable undo/redo
    initialArgs: ["light"] // set initial theme
});

// --- ThemeSwitcher.jsx ---
function ThemeSwitcher() {
    const theme = useExecutor(themeStore); // auto re-render on theme change

    // Simple styles for light and dark themes
    const styles = {
        light: {
            background: "#ffffff",
            color: "#333",
            padding: "2rem",
            textAlign: "center",
            borderRadius: "12px",
        },
        dark: {
            background: "#222",
            color: "#f8f8f8",
            padding: "2rem",
            textAlign: "center",
            borderRadius: "12px",
        },
    };

    return (
        <div style={styles[theme]}>
            <h2>{theme === "light" ? "🌞 Light Mode" : "🌙 Dark Mode"}</h2>
            <p>Switch themes with undo / redo</p>

            <div style={{ marginTop: "1rem", display: "flex", gap: "0.5rem", justifyContent: "center" }}>
                <button onClick={() => themeStore("light")}>Light</button>
                <button onClick={() => themeStore("dark")}>Dark</button>
                {/* undo/redo take an optional `steps` argument — passing them
                    directly as onClick would hand React's SyntheticEvent to
                    `steps`, silently breaking the internal loop so the
                    button would do nothing. */}
                <button onClick={() => themeStore.undo()}>⏪ Undo</button>
                <button onClick={() => themeStore.redo()}>⏩ Redo</button>
            </div>
        </div>
    );
}

export default ThemeSwitcher;
