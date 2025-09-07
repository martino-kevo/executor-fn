import Executor from "./executor";

// ----------------------
// Create an executor
// ----------------------
const counter = Executor(
    async (increment = 1) => {
        // simulate async API or computation
        await new Promise((r) => setTimeout(r, 100));
        return (counter.value || 0) + increment;
    },
    {
        storeHistory: true,
        callNow: true,
        initialArgs: [0],
        metadataFn: (value) => ({ timestamp: new Date().toISOString() })
    }
);

// ----------------------
// Subscribe to changes
// ----------------------
counter._subscribe(() => {
    console.log("Counter updated:", counter.value);
});

// ----------------------
// Async updates
// ----------------------
async function demoAsync() {
    console.log("Initial value:", counter.value);

    await counter(5); // async increment
    await counter(10);

    console.log("History with metadata:", counter.history);

    // ----------------------
    // Undo / Redo
    // ----------------------
    counter.undo();
    console.log("After undo:", counter.value);

    counter.redo();
    console.log("After redo:", counter.value);

    // ----------------------
    // Jump to a specific snapshot
    // ----------------------
    counter.jumpTo(0);
    console.log("Jump to initial:", counter.value);

    // ----------------------
    // Batch multiple updates as one snapshot
    // ----------------------
    counter.batch(() => {
        counter(1);
        counter(2);
        counter(3);
    });
    console.log("After batch:", counter.value);
    console.log("History length (batch counted as 1):", counter.history.length);

    // ----------------------
    // Pause / resume history
    // ----------------------
    counter.pauseHistory();
    counter(100); // won't create a new snapshot
    counter.resumeHistory();
    counter(1); // new snapshot
    console.log("Final history:", counter.history);

    // ----------------------
    // Serialize / Deserialize
    // ----------------------
    const exported = counter.serializeHistory();
    console.log("Serialized history:", exported);

    counter.clearHistory();
    console.log("History after clear:", counter.history);

    counter.deserializeHistory(JSON.parse(exported));
    console.log("Restored history:", counter.history);
}

demoAsync();