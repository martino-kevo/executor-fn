import { Executor } from "../../executor.js";

// Examples
// 1. Range notation
const ex = Executor((x) => x, { storeHistory: true });
["A", "B", "C", "D", "E"].forEach(v => ex(v));

const { ex1, ex2 } = ex.split([0, 2], [3, 4]);

console.log(ex1.history.map(h => h.value)); // [ "A", "B", "C" ]
console.log(ex2.history.map(h => h.value)); // [ "D", "E" ]

// 2. Explicit indices
const { ex3, ex4 } = ex.split([0, 2, 4], [1, 3]);

console.log(ex3.history.map(h => h.value)); // [ "A", "C", "E" ]
console.log(ex4.history.map(h => h.value)); // [ "B", "D" ]

// 3. Backwards range
const { ex5 } = ex.split([4, 2]); // reverse order

console.log(ex5.history.map(h => h.value)); // [ "E", "D", "C" ]


// ⚡ This makes split() flexible:

// [start, end] → continuous range

// [i, j, k] → specific indices