// 1️⃣ Reactive State Management

// You’ve built a tiny store system (like a mini Redux or Zustand).
// Example:

const counter = Executor(x => x + 1, {
    storeHistory: true,
    callNow: true,
    initialArgs: [0]
});

counter(); // 1
counter(); // 2
counter(); // 3

console.log(counter.history); // [0, 1, 2, 3]
counter.undo(); // back to 2
counter.redo(); // forward to 3


// This could be used to power a UI state machine, undo/redo in a drawing app, etc.


// 2️⃣ Logging & Debugging

// You can wrap any function and get built-in history and debugging for free:

const riskyOp = Executor((x) => {
  if (x > 5) throw new Error("too big")
  return x * 2
}, { storeHistory: true });

try {
  riskyOp(2); 
  riskyOp(3);
  riskyOp(6); // fails
} catch (e) {
  console.log(riskyOp.history); // [4, 6] (easy to see what worked)
}


// 3️⃣ Controlled Execution Pipelines

// Because fn always stores .value, you can chain things very easily:

const double = Executor(x => x * 2, { callNow: true, initialArgs: [2] });
const triple = Executor(x => x * 3);

console.log(triple(double.value)); // 12 (3 * 4)


// This makes data pipelines very readable.


// 4️⃣ Game State / Undo-Redo Logic

// Undo/redo is hard to implement from scratch — but you already have it here.
// Imagine a game counter:

const score = Executor((curr, points) => curr + points, {
  storeHistory: true,
  callNow: true,
  initialArgs: [0]
});

score(score.value, 10);
score(score.value, 5);
console.log(score.history); // [0, 10, 15]

score.undo();
console.log(score.value); // 10 (last step undone)

score.redo();
console.log(score.value); // 15 (redo works)


// This is exactly the pattern used in text editors, drawing apps, and spreadsheets.


// 5️⃣ Functional Time Travel

// This is a cool idea: you could inspect history[n] to see what your 
// function output was at any previous point in time — something you 
// cannot do with a plain function.