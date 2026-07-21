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
import { useRef, useSyncExternalStore } from "react";

// 🆕 Convenience equality function for selecting object/array slices —
// compares own enumerable properties one level deep with Object.is. Pass
// this as the third argument to useExecutor when your selector constructs
// a NEW object/array each call (e.g. `s => ({ name: s.user.name, id: s.user.id })`)
// rather than returning an existing reference straight out of the store
// (e.g. `s => s.user`). It's a performance aid, not a correctness
// requirement — see the getSnapshot comment below for why.
export function shallowEqual(a, b) {
  if (Object.is(a, b)) return true;
  if (typeof a !== "object" || a === null || typeof b !== "object" || b === null) {
    return false;
  }
  const keysA = Object.keys(a);
  const keysB = Object.keys(b);
  if (keysA.length !== keysB.length) return false;
  for (const key of keysA) {
    if (!Object.prototype.hasOwnProperty.call(b, key) || !Object.is(a[key], b[key])) {
      return false;
    }
  }
  return true;
}

// React Hook for auto re-rendering. Works with any Executor instance —
// doesn't need to import Executor itself, since it only relies on the
// _subscribe/_unsubscribe/value contract every Executor instance exposes.
//
//   useExecutor(store)                              // full value (unchanged)
//   useExecutor(store, true)                         // full executor instance ("fullPower", unchanged)
//   useExecutor(store, s => s.user.name)             // selected slice — re-renders ONLY when it changes
//   useExecutor(store, s => s.user, shallowEqual)     // selector + custom equality (default is Object.is)
//
// For deeply nested state, selecting just the slice a component actually
// uses means unrelated changes elsewhere in the store don't trigger a
// re-render here — the same problem Zustand's selector API and Redux's
// useSelector solve.
function useExecutor(executor, selectorOrFullPower = false, isEqual = Object.is) {
  if (!executor || typeof executor !== "function") {
    throw new Error("useExecutor: must receive a valid Executor instance");
  }

  const hasSelector = typeof selectorOrFullPower === "function";
  const fullPower = selectorOrFullPower === true;

  // 🆕 The cache key is the SOURCE value (executor.value), not the
  // selector's output. This is the important fix: useSyncExternalStore
  // requires getSnapshot to return a referentially stable result across
  // the several calls React makes within a single render pass — but a
  // selector that constructs a new object every call (e.g.
  // `s => ({ name: s.user.name })`) can never satisfy that on its own,
  // since two calls to the SAME selector on the SAME input still produce
  // two different objects.
  //
  // By caching on "have we already computed a selection for this exact
  // executor.value reference," repeated calls within one render pass
  // always hit the cache and return the identical prior result — the
  // selector only runs again once the underlying store value has
  // actually changed. That makes getSnapshot provably stable regardless
  // of whether the selector itself is "pure" in the reference sense, so
  // the infinite-loop risk is eliminated structurally rather than merely
  // detected and warned about.
  //
  // isEqual still matters on top of this — it controls whether a
  // genuinely NEW store value that happens to select out to equivalent
  // content triggers a re-render or not. shallowEqual is what you want
  // for a selector that constructs a new object/array; Object.is (the
  // default) is enough — and cheaper — for a selector that just indexes
  // into existing structure, since the store's own update code preserving
  // references for unchanged parts already gives you Object.is-friendly
  // stability for free.
  const lastSourceRef = useRef();
  const lastSelectedRef = useRef();
  const hasLastRef = useRef(false);

  const getSnapshot = () => {
    if (!hasSelector) return executor.value;

    const currentSource = executor.value;

    if (hasLastRef.current && Object.is(currentSource, lastSourceRef.current)) {
      // Nothing has changed upstream since we last computed a selection
      // — hand back the exact same cached reference without touching the
      // selector at all.
      return lastSelectedRef.current;
    }

    const nextSelected = selectorOrFullPower(currentSource);
    lastSourceRef.current = currentSource;

    if (hasLastRef.current && isEqual(lastSelectedRef.current, nextSelected)) {
      // The store changed, but this selection is equivalent by isEqual —
      // keep the old reference so components relying on Object.is
      // downstream (memo, dependency arrays, etc.) still see "no change."
      return lastSelectedRef.current;
    }

    lastSelectedRef.current = nextSelected;
    hasLastRef.current = true;
    return nextSelected;
  };

  const selected = useSyncExternalStore(
    (subscribe) => {
      executor._subscribe(subscribe);
      return () => executor._unsubscribe(subscribe);
    },
    getSnapshot
  );

  if (hasSelector) return selected;
  return !fullPower ? executor.value : executor; // return full executor (value + methods) if requested
}

export { useExecutor };
export default useExecutor;
