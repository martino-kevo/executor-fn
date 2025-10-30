// <!DOCTYPE html>
// <html lang="en">
// <head>
// <meta charset="UTF-8">
// <title>ExecutorV2 Benchmark</title>
// </head>
// <body>
// <script type="module">
// import { ExecutorV2 } from '../ExecutorV2.js';

// (async () => {
//   console.log("Starting ExecutorV2 benchmark...");

//   // Executor that just returns the value passed
//   const executor = ExecutorV2((val) => val, {
//     storeHistory: true,
//     maxHistory: 1000,      // memory buffer
//     useIndexedDB: true,    // persistent storage
//     historyStep: 1,
//   });

//   const totalEntries = 1_000_000; // 1 million
//   const batchSize = 10_000;

//   console.time("Adding 1 million entries");

//   for (let i = 0; i < totalEntries; i++) {
//     await executor(i);

//     // Show progress every batch
//     if ((i + 1) % batchSize === 0) {
//       console.log(`Added ${i + 1} entries`);
//     }
//   }

//   console.timeEnd("Adding 1 million entries");

//   // Undo/redo test
//   console.time("Undo 100 steps");
//   await executor.undo(100);
//   console.timeEnd("Undo 100 steps");

//   console.time("Redo 100 steps");
//   await executor.redo(100);
//   console.timeEnd("Redo 100 steps");

//   // Jump to a specific index
//   console.time("Jump to index 999,999");
//   await executor.jumpTo(totalEntries - 1);
//   console.timeEnd("Jump to index 999,999");

//   console.log("ExecutorV2 benchmark complete!");
// })();
// </script>
// </body>
// </html>
