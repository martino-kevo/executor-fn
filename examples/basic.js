import { Executor } from "../executor.js";

// ⚠️ The single most important thing to know about Executor: calling an
// executor ALWAYS returns a Promise — even if your callback is perfectly
// synchronous. Executor wraps every callback in an async function
// internally (so it can support async callbacks uniformly), so
// `myExecutor(args)` is never the value itself. Read `.value` after
// awaiting, or await the call directly.

async function main() {
  // 🔹 Example 1: Basic usage
  const add = Executor((a, b) => a + b);
  const addResult = await add(10, 5); // must await — add(10, 5) alone is a Promise
  console.log("Add result:", addResult); // ➡ 15

  // 🔹 Example 2: Stateful usage with history
  const calc = Executor((a, b) => a + b, {
    storeHistory: true,
    callNow: true,
    initialArgs: [2, 3],
  });

  console.log("Initial value:", calc.value); // ➡ 5 (callNow with a sync callback commits immediately)

  await calc(10, 5); // ➡ calc.value becomes 15
  await calc(50, 1); // ➡ calc.value becomes 51

  // .history is an array of entries — { value, meta, group, _index, _time }
  // — not raw values, since each entry can carry metadata alongside the
  // value itself. Map over it to pull out just the values:
  console.log(
    "History:",
    calc.history.map((entry) => entry.value)
  ); // ➡ [5, 15, 51]

  calc.undo();
  console.log("After undo:", calc.value); // ➡ 15

  calc.redo();
  console.log("After redo:", calc.value); // ➡ 51

  calc.reset();
  console.log("After reset:", calc.value); // ➡ 5

  // 3️⃣ Default Arguments Support
  const greet = Executor((name = "Guest") => `Hello, ${name}!`, {
    callNow: true,
  });

  console.log(greet.value); // "Hello, Guest!"

  await greet("Ada"); // updates greet.value — this call's own return value is
  // also a Promise, so don't console.log(greet("Ada")) directly expecting a string

  // 4️⃣ Logging Current Value
  greet.log(); // Logs: "Hello, Ada!" — reflects the greet("Ada") call above,
  // since that call already updated greet.value by the time we get here

  // 5️⃣ Straight Calling
  Executor(() => console.log("Straight call executed!"), { callNow: true });
}

main();

/*
Take caution 😬 if you're doing:

const myGreet = greet("Ada");
myGreet.log() OR console.log(myGreet)

👉 myGreet is a Promise, not the executor and not the value.
myGreet.value OR myGreet.[anything] would be undefined (or throw, since
Promises don't have those properties).

The executor itself is still `greet` — myGreet is just the return value
of calling it. After `await greet("Ada")` resolves, `greet.value` is
updated; that's what you want to read.

See advanced.js and advanced2.js and other examples
and you will start bending functions to your will
in no time.

Also, Don't be scared. Executor, a function wrapper which does state management
and time manipulation / time travel is super easy to learn.
*/
