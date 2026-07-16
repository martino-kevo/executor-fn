// Type definitions for executor-fn/react
import type { ExecutorInstance } from "./executor";

/**
 * React hook to use an Executor instance and auto re-render on value changes.
 * @param executor An Executor instance created by the Executor function
 * @param fullPower Optionally return the full Executor instance with methods instead of just the value
 * @returns The current value managed by the executor or the full Executor instance if fullPower is true
 */
export function useExecutor<T>(executor: ExecutorInstance<T>, fullPower?: boolean): T | ExecutorInstance<T>;

export default useExecutor;
