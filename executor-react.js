// executor-react.js
//
// React binding for Executor, split out from the core package (executor.js)
// so that `executor-fn` itself has zero dependency on react — a Node
// backend or vanilla-JS frontend can `import { Executor } from "executor-fn"`
// without react ever being resolved, installed, or bundled.
//
// If you're using Executor with React, import useExecutor from here:
//   import { Executor } from "executor-fn";
//   import { useExecutor } from "executor-fn/react";
import { useSyncExternalStore } from "react";

// React Hook for auto re-rendering. Works with any Executor instance —
// doesn't need to import Executor itself, since it only relies on the
// _subscribe/_unsubscribe/value contract every Executor instance exposes.
function useExecutor(executor, fullPower = false) {
  if (!executor || typeof executor !== "function") {
    throw new Error("useExecutor: must receive a valid Executor instance");
  }

  useSyncExternalStore(
    (subscribe) => {
      executor._subscribe(subscribe);
      return () => executor._unsubscribe(subscribe);
    },
    () => executor.value
  );

  return !fullPower ? executor.value : executor; // return full executor (value + methods) if requested
}

export { useExecutor };
export default useExecutor;
