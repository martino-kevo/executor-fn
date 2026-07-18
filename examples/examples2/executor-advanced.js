import { Executor } from "../executor.js";

// Note: every executor call is technically async (it always returns a
// Promise), but since these callbacks are plain synchronous identity
// functions `(x) => x`, each call still completes — and commits to
// history — synchronously before returning. That's why un-awaited preload
// calls like the ones below are safe and deterministic here. If your
// callback were async, you'd need to await each call (or use
// Promise.all / a for..of loop with await) to guarantee ordering.

// Main executor: groups numbers as "low"/"high"
const mainExec = Executor((x) => x, {
  storeHistory: true,
  groupBy: (v) => (v < 50 ? "low" : "high"),
});

// preload
[10, 40, 80].forEach((v) => mainExec(v));

// Another executor: groups numbers as "even"/"odd"
const otherExec = Executor((x) => x, {
  storeHistory: true,
  groupBy: (v) => (v % 2 === 0 ? "even" : "odd"),
});
[15, 22, 75].forEach((v) => otherExec(v));

function log(label) {
  console.log(label, mainExec.history.map((h) => ({ v: h.value, g: h.group })));
}

// Dynamic sort
mainExec.sort("asc");
log("Sorted Asc:");

mainExec.sort("desc");
log("Sorted Desc:");

// Merge at index
mainExec.merge([otherExec.history], { position: 1 });
log("After Merge at Index 1:");

// Filter by group
const filteredLow = mainExec.filterHistory((e) => e.group === "low");
console.log("Filter group=low:", filteredLow.map((h) => h.value));

const filteredEven = mainExec.filterHistory((e) => e.group === "even");
console.log("Filter group=even:", filteredEven.map((h) => h.value));
