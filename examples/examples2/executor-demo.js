import { Executor } from "../executor.js"; // your library

// Create main executor
const mainExec = Executor((x) => x, { storeHistory: true });

// Helpers
const exec1 = Executor((x) => x, { storeHistory: true });
const exec2 = Executor((x) => x, { storeHistory: true });

// preload — safe to leave un-awaited since these callbacks are sync
// identity functions; each call commits to history synchronously.
exec1(1);
exec1(2);
exec1(3);
exec2(50);
exec2(100);

function logHistory(label) {
  console.log(label, mainExec.history.map((h) => h.value));
}

// Copy from others
mainExec.copy([exec1.history, exec2.history]);
logHistory("After Copy:");

// Merge exec1 at start
mainExec.merge([exec1.history], { position: "start" });
logHistory("After Merge Start:");

// Merge exec2 at end
mainExec.merge([exec2.history], { position: "end" });
logHistory("After Merge End:");

// Note: merge() (like copy()) doesn't deduplicate by default — you'll see
// exec1's/exec2's values appear twice below, once from the copy() above
// and once from each merge(). Pass `noDuplicate: true` + an `equalityFn`
// in the executor's options if you want merges to skip values already
// present.

// Sort ascending
mainExec.sort("asc");
logHistory("After Sort Asc:");

// Sort descending
mainExec.sort("desc");
logHistory("After Sort Desc:");

// Filter history > 10
const filtered = mainExec.filterHistory((entry) => entry.value > 10);
console.log("Filter (> 10):", filtered.map((h) => h.value));
// Note: filterHistory does not modify the actual history, just returns filtered array
