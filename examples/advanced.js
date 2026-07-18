import { Executor } from "../executor.js";

// ⚠️ Reminder: every executor call returns a Promise, even for a
// synchronous callback. Every example below awaits calls whose result or
// side effect it needs to observe.

async function main() {
  // 1️⃣ Reactive State Management

  // You've built a tiny store system (like a mini Redux or Zustand).
  // Example:

  const counter = Executor((x) => x + 1, {
    storeHistory: true,
    callNow: true,
    initialArgs: [0],
  });

  // Caution: calling counter() with no args would pass `undefined` as x,
  // giving NaN — always pass counter.value explicitly.
  await counter(counter.value); // 2
  await counter(counter.value); // 3

  console.log(
    "History:",
    counter.history.map((entry) => entry.value)
  ); // [1, 2, 3]
  counter.undo(); // back to 2
  console.log("After undo:", counter.value); // 2
  counter.redo(); // forward to 3
  console.log("After redo:", counter.value); // 3

  // This could be used to power a UI state machine, undo/redo in a
  // drawing app, etc.

  // 2️⃣ Logging & Debugging

  // You can wrap any function and get built-in history and debugging for
  // free. Since executor calls are always async, use await + try/catch
  // inside an async function — a bare synchronous try/catch around
  // un-awaited calls will never catch anything, since the rejection
  // happens on the returned Promise, not synchronously.

  const riskyOp = Executor(
    (x) => {
      if (x > 5) throw new Error("too big");
      return x * 2;
    },
    { storeHistory: true }
  );

  try {
    await riskyOp(2);
    await riskyOp(3);
    await riskyOp(6); // fails — rejects, caught below
  } catch (e) {
    console.log(
      "riskyOp history after the failure:",
      riskyOp.history.map((entry) => entry.value)
    ); // [4, 6] (easy to see what worked before the failure)
  }

  // 3️⃣ Controlled Execution Pipelines

  // Because fn always stores .value, you can chain things very easily —
  // just remember to await each step:

  const double = Executor((x) => x * 2, { callNow: true, initialArgs: [2] });
  const triple = Executor((x) => x * 3);

  const chained = await triple(double.value);
  console.log("Chained result:", chained); // 12 (4 * 3)

  // This makes data pipelines very readable.

  // 4️⃣ Game State / Undo-Redo Logic

  // Undo/redo is hard to implement from scratch — but you already have it
  // here. Imagine a game counter:

  const score = Executor((curr, points) => curr + points, {
    storeHistory: true,
    callNow: true,
    initialArgs: [0, 0], // curr AND points — the callback takes two args, so a single-element initialArgs leaves points as undefined and computes NaN
  });

  await score(score.value, 10);
  await score(score.value, 5);
  console.log(
    "Score history:",
    score.history.map((entry) => entry.value)
  ); // [0, 10, 15]

  score.undo();
  console.log(score.value); // 10 (last step undone)

  score.redo();
  console.log(score.value); // 15 (redo works)

  // This is exactly the pattern used in text editors, drawing apps, and
  // spreadsheets.

  // 5️⃣ Functional Time Travel

  // This is a cool idea: you could inspect history[n].value to see what
  // your function output was at any previous point in time — something
  // you cannot do with a plain function.

  // Always having the latest value in .value is handy.

  // This could be used in simulations, data analysis, or any scenario
  // where you want to track changes over time.

  // Also always add question marks for safe checks
  // eg: game.history?.forEach
  // user.history?.map
  // game.value?.score
  // game.value?.player?.name
}

main();
