import { Executor } from "./executor.js"; // your library

// Create main executor
const mainExec = Executor((x) => x, { storeHistory: true });

// Helpers
const exec1 = Executor((x) => x, { storeHistory: true });
const exec2 = Executor((x) => x, { storeHistory: true });

// preload
exec1(1); exec1(2); exec1(3);
exec2(50); exec2(100);

function logHistory(label) {
    console.log(label, mainExec.history.map(h => h.value));
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

// Sort ascending
mainExec.sort("asc");
logHistory("After Sort Asc:");

// Sort descending
mainExec.sort("desc");
logHistory("After Sort Desc:");

// Filter history > 10
const filtered = mainExec.filterHistory((entry) => entry.value > 10);
console.log("Filter (> 10):", filtered.map(h => h.value));
// Note: filterHistory does not modify the actual history, just returns filtered array