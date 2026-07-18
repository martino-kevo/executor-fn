import { Executor } from "../executor.js";

// ----------------------
// Create an executor
// ----------------------
// Using the standard (curr, delta) accumulator pattern rather than having
// the callback read `counter.value` on itself — that self-referential form
// only works because of exactly when the closure happens to read it, which
// is fragile. This version is the same idea, more robust.
const counter = Executor(
  async (curr, increment) => {
    // simulate async API or computation
    await new Promise((r) => setTimeout(r, 100));
    return curr + increment;
  },
  {
    storeHistory: true,
    callNow: true,
    initialArgs: [0, 1], // curr = 0, increment = 1
    metadataFn: (value) => ({ timestamp: new Date().toISOString() }),
    onError: (err) => console.error("counter error:", err.message),
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
  // callNow's callback is async here, so counter.value is undefined until
  // it resolves — await counter.ready if you need the initial value before
  // continuing (this resolves immediately for a sync callback/no callNow,
  // so it's always safe to await regardless).
  await counter.ready;
  console.log("Initial value:", counter.value); // 1

  await counter(counter.value, 5); // async increment
  await counter(counter.value, 10);

  console.log(
    "History with metadata:",
    counter.history.map((entry) => ({ value: entry.value, meta: entry.meta }))
  );

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
  // Batch multiple ASYNC updates as one snapshot
  // ----------------------
  // batch()'s own callback isn't awaited internally (it's designed for
  // synchronous state transitions), so `counter.batch(() => { counter(1);
  // counter(2); counter(3); })` does NOT correctly combine async updates —
  // historyPaused gets reset before any of those async calls actually
  // resolve. To batch genuinely async operations into one entry, pause
  // history, await each step yourself, resume, then call batch() with an
  // empty callback to trigger the single consolidated push:
  counter.pauseHistory();
  await counter(counter.value, 1);
  await counter(counter.value, 2);
  await counter(counter.value, 3);
  counter.resumeHistory();
  counter.batch(() => {}); // commits exactly one entry for the final value
  console.log("After batch:", counter.value);
  console.log("History length (batch counted as 1 extra entry):", counter.history.length);

  // ----------------------
  // Pause / resume history
  // ----------------------
  counter.pauseHistory();
  await counter(counter.value, 100); // awaited BEFORE resuming — correctly won't create a new snapshot
  counter.resumeHistory();
  await counter(counter.value, 1); // new snapshot
  console.log(
    "Final history:",
    counter.history.map((entry) => entry.value)
  );

  // ----------------------
  // Serialize / Deserialize
  // ----------------------
  const exported = counter.serializeHistory();
  console.log("Serialized history:", exported);

  counter.clearHistory();
  console.log(
    "History after clear:",
    counter.history.map((entry) => entry.value)
  );

  counter.deserializeHistory(JSON.parse(exported));
  console.log(
    "Restored history:",
    counter.history.map((entry) => entry.value)
  );
}

demoAsync().catch((err) => console.error("demoAsync failed:", err));
