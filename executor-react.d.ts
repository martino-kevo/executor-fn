// Type definitions for executor-fn/react
import type { ExecutorInstance } from "./executor";

/**
 * Convenience equality function for selector results shaped as plain
 * objects/arrays — compares own enumerable properties one level deep
 * with Object.is. Pass this as useExecutor's third argument when a
 * selector constructs a NEW object/array each call (e.g.
 * `s => ({ name: s.user.name })`) rather than returning an existing
 * reference straight out of the store (e.g. `s => s.user`). It's a
 * performance aid — useExecutor caches on the store's underlying value,
 * so a constructed-object selector without shallowEqual is still safe
 * (no infinite loop), it just re-renders on every store change rather
 * than only when the selected content actually differs.
 */
export function shallowEqual<T>(a: T, b: T): boolean;

/**
 * React hook to use an Executor instance and auto re-render on value
 * changes — with an optional selector to subscribe to just a slice of
 * the value, so unrelated changes elsewhere in the store don't trigger
 * a re-render here.
 * @param executor An Executor instance created by the Executor function
 * @returns The current value managed by the executor
 */
export function useExecutor<T>(executor: ExecutorInstance<T>): T;
/**
 * @param executor An Executor instance created by the Executor function
 * @param fullPower Pass true to get back the full Executor instance (value + methods) instead of just the value
 * @returns The full Executor instance
 */
export function useExecutor<T>(executor: ExecutorInstance<T>, fullPower: true): ExecutorInstance<T>;
/**
 * @param executor An Executor instance created by the Executor function
 * @param selector Selects a slice of the value; the component only re-renders when the selected slice changes
 * @param isEqual Custom equality check for the selected slice. Defaults to Object.is — pass shallowEqual (or your own) for selectors that construct a new object/array each call
 * @returns The selected slice
 */
export function useExecutor<T, S>(
    executor: ExecutorInstance<T>,
    selector: (value: T) => S,
    isEqual?: (a: S, b: S) => boolean
): S;

export default useExecutor;
