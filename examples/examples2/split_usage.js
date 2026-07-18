import { Executor } from "../executor.js";

// ⚠️ split() always names its results ex1, ex2, ... by POSITION within
// that single call — not a running counter across multiple split() calls.
// So a second call to split() also starts back at ex1, ex2, even though
// you already have an ex1/ex2 from an earlier call. Destructuring as
// {ex3, ex4} from a second call (like the original version of this file
// did) grabs keys that were never returned, and you get `undefined`.
// Destructure each split() call's result under its own names instead.

// Examples
// 1. Range notation
const ex = Executor((x) => x, { storeHistory: true });
["A", "B", "C", "D", "E"].forEach((v) => ex(v));

const { ex1, ex2 } = ex.split([0, 2], [3, 4]);

console.log(ex1.history.map((h) => h.value)); // [ "A", "B", "C" ]
console.log(ex2.history.map((h) => h.value)); // [ "D", "E" ]

// 2. Explicit indices — destructured under fresh names, since this call
// ALSO returns { ex1, ex2 }, not { ex3, ex4 }. Note the second range here
// is [1, 3, 4] (3 elements), not [1, 3] — a 2-element array is always
// treated as a [start, end] RANGE (see the gotcha at the bottom), so
// [1, 3] would actually give indices 1 through 3 (B, C, D), not just
// indices 1 and 3.
const { ex1: explicit1, ex2: explicit2 } = ex.split([0, 2, 4], [1, 3, 4]);

console.log(explicit1.history.map((h) => h.value)); // [ "A", "C", "E" ]
console.log(explicit2.history.map((h) => h.value)); // [ "B", "D", "E" ]

// 3. Backwards range — again, the returned key is ex1, not ex5.
const { ex1: reversed } = ex.split([4, 2]); // reverse order

console.log(reversed.history.map((h) => h.value)); // [ "E", "D", "C" ]

// ⚡ This makes split() flexible:

// [start, end] → continuous range (start > end walks backwards)

// [i, j, k] → 3+ specific indices

// ⚠️ One more gotcha: split() only treats a 2-element array as a
// [start, end] RANGE. A 2-element array is never treated as "two specific
// indices" — so ex.split([0, 4]) means "everything from 0 to 4", not
// "just indices 0 and 4". If you want exactly two specific (non-adjacent)
// indices, list them inside a 3+-element array, or call split() twice
// with single-index ranges and merge the results yourself.
