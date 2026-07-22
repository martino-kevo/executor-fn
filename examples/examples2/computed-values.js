import { Executor } from "../executor.js";

async function main() {
  // --- Basic computed value ---
  const posts = Executor((p) => p, { callNow: true, initialArgs: [[]] });

  // postCount always reflects posts.length — no manual recomputation needed.
  const postCount = Executor.computed((postsVal) => postsVal.length, [posts]);

  console.log("postCount initial:", postCount.value); // 0

  await posts([...posts.value, { id: 1, title: "hello" }]);
  console.log("postCount after 1 post added:", postCount.value); // 1 — auto-updated

  await posts([...posts.value, { id: 2, title: "world" }]);
  console.log("postCount after 2nd post:", postCount.value); // 2

  // --- Multi-dependency computed ---
  const price = Executor((n) => n, { callNow: true, initialArgs: [100] });
  const taxRate = Executor((n) => n, { callNow: true, initialArgs: [0.08] });

  const totalPrice = Executor.computed(
    (priceVal, taxRateVal) => Math.round(priceVal * (1 + taxRateVal) * 100) / 100,
    [price, taxRate]
  );
  console.log("totalPrice initial:", totalPrice.value); // 108

  await price(200);
  console.log("totalPrice after price change:", totalPrice.value); // 216

  await taxRate(0.1);
  console.log("totalPrice after tax rate change:", totalPrice.value); // 220

  // --- Composability: a computed value can depend on another computed value ---
  // Since Executor.computed returns a real Executor instance, this just
  // works — no special API needed.
  const totalWithDiscount = Executor.computed(
    (total) => total * 0.9, // 10% off
    [totalPrice]
  );
  console.log("totalWithDiscount (cascades through totalPrice):", totalWithDiscount.value); // 198

  await price(100);
  console.log("After price drops back to 100 —");
  console.log("  totalPrice:", totalPrice.value); // 110
  console.log("  totalWithDiscount (cascaded automatically):", totalWithDiscount.value); // 99

  // --- Computed values are real executors: they have subscriptions, too ---
  postCount._subscribe(() => {
    console.log("postCount subscriber fired, new value:", postCount.value);
  });
  await posts([...posts.value, { id: 3, title: "third" }]);

  // --- Cleanup: stop a computed value from listening to its dependencies ---
  // Most module-scoped computed values never need this — it's here for
  // completeness (e.g. a computed value scoped to a component's lifetime).
  totalWithDiscount.stopComputing();
  await price(500); // totalWithDiscount no longer updates after this
  console.log(
    "totalWithDiscount after stopComputing + a price change (unchanged):",
    totalWithDiscount.value
  );
}

main();
