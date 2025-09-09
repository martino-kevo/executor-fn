import React, { useState } from "react";
import Executor, { useExecutor } from "executor-fn"; // adjust import path

// Initial empty Tic-Tac-Toe board
const initialBoard = Array(9).fill("");

// Game executor with history & grouping
const game = Executor(
    (board, index, player) => {
        const newBoard = [...board];
        if (!newBoard[index]) newBoard[index] = player;
        return newBoard;
    },
    {
        storeHistory: true,
        callNow: true,
        initialArgs: [initialBoard],
        historyStep: 1, // record every move
        groupBy: (board) => `move-${board.filter(Boolean).length}`, // label by move number
    }
);

// Score executor
const score = Executor(
    (s, delta) => s + delta,
    {
        storeHistory: true,
        callNow: true,
        initialArgs: [0],
        groupBy: (s) => (s >= 0 ? "positive" : "negative"),
    }
);

// Combine both for joint undo/redo
const group = Executor.combine(game, score);

export default function App() {
    const board = useExecutor(game);
    const playerScore = useExecutor(score);
    const [player, setPlayer] = useState("X");
    const [importText, setImportText] = useState("");

    const handleMove = (index) => {
        game(board, index, player);
        score(playerScore, 1);
        setPlayer(player === "X" ? "O" : "X");
    };

    return (
        <div style={{ padding: 20, fontFamily: "sans-serif" }}>
            <h1>Executor Demo ⚡ (React + JS)</h1>

            <h2>Board</h2>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 60px)" }}>
                {board.map((cell, i) => (
                    <button
                        key={i}
                        onClick={() => handleMove(i)}
                        style={{
                            width: 60,
                            height: 60,
                            fontSize: "1.5rem",
                            margin: 2,
                            backgroundColor: cell ? "#ccc" : "#fff",
                        }}
                    >
                        {cell}
                    </button>
                ))}
            </div>

            <h2>Score</h2>
            <p>Player Score: {playerScore}</p>

            <div style={{ marginTop: 20 }}>
                <button onClick={() => group.undo()}>Undo (Both)</button>
                <button onClick={() => group.redo()}>Redo (Both)</button>
                <button onClick={() => group.reset()}>Reset (Both)</button>
            </div>

            <h2>History (Board)</h2>
            <pre style={{ background: "#eee", padding: 10 }}>
                {JSON.stringify(game.history, null, 2)}
            </pre>

            <h2>Filtered History (Even moves only)</h2>
            <pre style={{ background: "#f9f9f9", padding: 10 }}>
                {JSON.stringify(
                    game.filterHistory(
                        (entry) =>
                            entry.group?.startsWith("move-") &&
                            parseInt(entry.group.split("-")[1]) % 2 === 0
                    ),
                    null,
                    2
                )}
            </pre>

            <h2>Export / Import</h2>
            <textarea
                style={{ width: "100%", height: 100 }}
                value={importText}
                onChange={(e) => setImportText(e.target.value)}
            />
            <div>
                <button onClick={() => setImportText(game.exportHistory())}>
                    Export Board
                </button>
                <button onClick={() => game.importHistory(importText)}>
                    Import Board
                </button>
            </div>
        </div>
    );
}
