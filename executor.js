// executor.js
import { useSyncExternalStore } from "react";

// Deep clone utility to avoid reference issues in history.
// `seen` tracks objects already cloned in this call so circular references
// resolve to the already-created clone instead of recursing forever.
function deepClone(value, seen = new WeakMap()) {
  if (value === null || typeof value !== "object") return value;

  // Functions and DOM nodes can't be meaningfully deep-cloned (structured
  // cloning them throws). Keep a live reference instead of crashing —
  // history still works, it just won't be an isolated copy for these.
  if (typeof value === "function") return value;
  if (typeof Node !== "undefined" && value instanceof Node) return value;

  // 🆕 circular reference guard
  if (seen.has(value)) return seen.get(value);

  if (value instanceof Date) return new Date(value.getTime());
  if (value instanceof RegExp) return new RegExp(value.source, value.flags);

  if (Array.isArray(value)) {
    const clone = [];
    seen.set(value, clone);
    value.forEach((item, i) => (clone[i] = deepClone(item, seen)));
    return clone;
  }

  if (value instanceof Map) {
    const clone = new Map();
    seen.set(value, clone);
    value.forEach((v, k) => clone.set(deepClone(k, seen), deepClone(v, seen)));
    return clone;
  }

  if (value instanceof Set) {
    const clone = new Set();
    seen.set(value, clone);
    value.forEach((v) => clone.add(deepClone(v, seen)));
    return clone;
  }

  const clone = {};
  seen.set(value, clone);
  for (const [k, v] of Object.entries(value)) {
    clone[k] = deepClone(v, seen);
  }
  return clone;
}

// 🆕 Default persistStorage adapter, backed by IndexedDB instead of
// localStorage — handles larger payloads better and doesn't block the
// main thread. Lazily opens the DB (only on first getItem/setItem call),
// so constructing an Executor without persistKey never touches IndexedDB
// at all. Returns undefined in environments without IndexedDB (SSR, Node,
// older browsers) — same graceful fallback the old localStorage default had.
function createIndexedDBStorage(dbName = "executor-store", storeName = "kv") {
  if (typeof indexedDB === "undefined") return undefined;

  let dbPromise = null;
  const openDB = () => {
    if (!dbPromise) {
      dbPromise = new Promise((resolve, reject) => {
        const req = indexedDB.open(dbName, 1);
        let blockedTimer = null;

        req.onupgradeneeded = () => {
          if (!req.result.objectStoreNames.contains(storeName)) {
            req.result.createObjectStore(storeName);
          }
        };
        req.onsuccess = () => {
          if (blockedTimer) clearTimeout(blockedTimer);
          resolve(req.result);
        };
        req.onerror = () => {
          if (blockedTimer) clearTimeout(blockedTimer);
          reject(req.error);
        };
        // 🆕 Fires when another connection (e.g. another tab, with an
        // older schema version open) blocks this upgrade — exactly the
        // multi-tab situation syncTabs is built for. Without this handler
        // the request just hangs forever with no resolution at all. Give
        // it a window to clear on its own (the other tab finishes and
        // closes), then fail loudly instead of hanging silently.
        req.onblocked = () => {
          if (blockedTimer) return; // already waiting
          blockedTimer = setTimeout(() => {
            reject(
              new Error(
                "Executor: IndexedDB open() was blocked by another connection (likely another tab with an older version open) and didn't clear within 5s"
              )
            );
          }, 5000);
        };
      });

      // Don't cache a permanently-rejected promise — if opening the DB
      // failed, let the next getItem/setItem call try again rather than
      // being stuck forever on one failed attempt.
      dbPromise.catch(() => {
        dbPromise = null;
      });
    }
    return dbPromise;
  };

  return {
    async getItem(key) {
      const db = await openDB();
      return new Promise((resolve, reject) => {
        const tx = db.transaction(storeName, "readonly");
        const req = tx.objectStore(storeName).get(key);
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
        // 🆕 A transaction can abort (e.g. quota errors) without always
        // firing onerror in every browser — this is a safety net so the
        // promise doesn't hang if that happens. Safe to have both; a
        // settled promise ignores any later resolve/reject.
        tx.onabort = () => reject(tx.error || new Error("Executor: IndexedDB read transaction aborted"));
      });
    },
    async setItem(key, value) {
      const db = await openDB();
      return new Promise((resolve, reject) => {
        const tx = db.transaction(storeName, "readwrite");
        tx.objectStore(storeName).put(value, key);
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
        tx.onabort = () => reject(tx.error || new Error("Executor: IndexedDB write transaction aborted"));
      });
    },
  };
}

// Main Executor function
function Executor(callback, options = {}) {
  if (typeof callback !== "function") {
    throw new Error("Executor: callback must be a function");
  }

  // Default options
  const {
    storeHistory = false,
    initialArgs = [],
    callNow = false,
    metadataFn, // custom metadata for each history entry
    maxHistory = Infinity, // limit number of stored entries
    noDuplicate = false, // 🆕 prevent duplicates in history
    equalityFn, // skip adding follow-up duplicates
    onError, // handle errors gracefully
    historyStep = 1, // 🆕 only record every Nth snapshot
    groupBy, // 🆕 group history entries (e.g. "move", "attack")
    seedHistory, // 🆕 pre-populate history at construction time (used internally by split())
    seedValue, // 🆕 explicit initialValue to pair with seedHistory (defaults to its first entry)
    persistKey, // 🆕 if set, auto-save/restore history under this key
    persistStorage = createIndexedDBStorage(), // 🆕 sync or async {getItem, setItem} adapter; defaults to IndexedDB
    syncTabs = false, // 🆕 if true (with persistKey), mirror state changes across tabs/windows via BroadcastChannel
    onChange, // 🆕 called with the new value after every committed change
  } = options;

  const history = storeHistory ? [] : null;
  const redoStack = storeHistory ? [] : null;
  const subscribers = new Set();
  let historyPaused = false;
  let stepCounter = 0; // for historyStep

  // 🆕 Central "auxiliary" error dispatch — for things that must never
  // crash the caller (subscriber callbacks, metadataFn/groupBy/equalityFn,
  // persistence, cross-tab sync). Never throws, even if onError itself has
  // a bug — falls back to console.error so failures are never silently
  // invisible, whether or not onError is configured.
  const reportError = (err) => {
    if (onError) {
      try {
        onError(err);
        return;
      } catch (handlerErr) {
        console.error("Executor: onError handler threw", handlerErr);
      }
    }
    console.error("Executor:", err);
  };

  // For the executor's actual callback (the real computation) — an error
  // here is a bug in the caller's own logic, so with no onError configured
  // the default is still to throw, same as before. This just also guards
  // against onError itself throwing, degrading to the original error
  // instead of a confusing new one.
  const runOnErrorOrThrow = (err) => {
    if (onError) {
      try {
        onError(err);
        return;
      } catch (handlerErr) {
        console.error(
          "Executor: onError handler threw while handling an error",
          handlerErr
        );
        throw err; // onError failed to handle it — surface the original error
      }
    }
    throw err;
  };

  // 🆕 metadataFn/groupBy/equalityFn are user-supplied and get invoked from
  // many places (pushToHistory, reset, clearHistory, insertAt, copy, merge,
  // sort, replaceAt...) — previously only the copy invoked from inside
  // fn() was protected by a try/catch. A bug in any of these triggered via
  // .undo()/.reset()/etc used to crash uncaught. These wrappers make every
  // call site safe without changing behavior when the callbacks are fine.
  const safeMetadataFn = (value) => {
    if (!metadataFn) return undefined;
    try {
      return metadataFn(value);
    } catch (err) {
      reportError(err);
      return undefined;
    }
  };

  const safeGroupBy = (value) => {
    if (!groupBy) return undefined;
    try {
      return groupBy(value);
    } catch (err) {
      reportError(err);
      return undefined;
    }
  };

  const safeEqualityFn = (a, b) => {
    if (!equalityFn) return false;
    try {
      return equalityFn(a, b);
    } catch (err) {
      reportError(err);
      // A failed comparison is treated as "not equal" — safer default than
      // silently treating everything as a duplicate and losing entries.
      return false;
    }
  };

  let initialValue;
  let currentValue; // set when seeding — the "current" state differs from the reset target
  let isSeeded = false;
  let initPromise = null; // set when callNow's callback returns a Promise (fix #2)

  let entryCounter = 0; // monotonic index

  // Keep entryCounter ahead of the highest _index currently present in
  // history or redoStack. Without this, copy()/merge()/deserializeHistory()/
  // importHistory() can leave entryCounter behind the imported entries'
  // _index values, so the next normal push reuses or collides with an
  // existing _index — which breaks sort("default") ordering.
  const resyncEntryCounter = () => {
    let max = 0;
    for (const entry of history) max = Math.max(max, entry._index ?? 0);
    if (redoStack) {
      for (const entry of redoStack) max = Math.max(max, entry._index ?? 0);
    }
    entryCounter = max;
  };

  // 🆕 Fix #1: seed history straight into the real internal array at
  // construction time. split() used to build a fresh Executor and then do
  // `mini.history = subset` from the outside — but that only reassigns the
  // public property. Every method here (pushToHistory, undo, redo, jumpTo,
  // filterHistory, ...) reads the `history` closure variable directly, not
  // `fn.history`, so that outside reassignment never actually connected.
  // Seeding here means the closure variable itself contains the data from
  // the start, so every method works correctly on it.
  // 🆕 Restore persisted history, if any, before seedHistory/callNow run —
  // a saved session should win over re-running the initial call.
  let loadedFromPersist = false;
  let persistLoadPromise = null;

  // Shared parse/apply helpers — used both at construction (below) and by
  // cross-tab sync later on, so both paths interpret persisted data the
  // exact same way.
  const parsePersisted = (raw) => {
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch (err) {
      reportError(err);
      return null;
    }
  };

  const applyPersistedData = (data) => {
    history.length = 0;
    if (Array.isArray(data.history) && data.history.length) {
      history.push(
        ...data.history.map((entry) => ({
          value: deepClone(entry.value),
          meta: entry.meta,
          group: entry.group,
          _index: entry._index,
          _time: entry._time,
        }))
      );
    }
    redoStack.length = 0;
    if (Array.isArray(data.redoStack)) {
      redoStack.push(
        ...data.redoStack.map((entry) => ({
          value: deepClone(entry.value),
          meta: entry.meta,
          group: entry.group,
          _index: entry._index,
          _time: entry._time,
        }))
      );
    }
    resyncEntryCounter();
  };

  const hydrateFromPersisted = (raw) => {
    const data = parsePersisted(raw);
    if (!data) return false;
    applyPersistedData(data);
    initialValue = data.initialValue;
    currentValue = data.value;
    isSeeded = true;
    return true;
  };

  if (storeHistory && persistKey && persistStorage) {
    try {
      const maybeSaved = persistStorage.getItem(persistKey);
      if (maybeSaved instanceof Promise) {
        // Async adapter (e.g. IndexedDB) — don't block construction;
        // fn.ready resolves once this settles, same idea as async callNow
        // below.
        persistLoadPromise = maybeSaved.then((raw) => hydrateFromPersisted(raw));
      } else {
        loadedFromPersist = hydrateFromPersisted(maybeSaved);
      }
    } catch (err) {
      reportError(err);
    }
  }

  if (
    !loadedFromPersist &&
    !persistLoadPromise &&
    storeHistory &&
    Array.isArray(seedHistory) &&
    seedHistory.length
  ) {
    history.push(
      ...seedHistory.map((entry) => ({
        value: deepClone(entry.value),
        meta: entry.meta,
        group: entry.group,
        _index: entry._index,
        _time: entry._time,
      }))
    );
    resyncEntryCounter();
    // initialValue is the reset() target — first entry in the seeded slice.
    // currentValue is what fn.value should be right now — the last entry,
    // matching the same "current = most recent entry" convention used by
    // copy()/merge() elsewhere in this file.
    initialValue = seedValue !== undefined ? seedValue : history[0]?.value;
    currentValue = history[history.length - 1]?.value;
    isSeeded = true;
  }

  try {
    if (callNow && !loadedFromPersist && !persistLoadPromise) {
      const maybe = callback(...initialArgs);
      if (maybe instanceof Promise) {
        // 🆕 Fix #2: don't await here. Executor() must always return
        // synchronously — callers on hot paths (a render loop, a game's
        // per-frame update) can't tolerate a constructor that sometimes
        // blocks. We stash the promise and commit once it resolves; see
        // fn.ready below for how to wait on it when you do need to.
        initPromise = maybe;
      } else {
        initialValue = maybe;
        if (storeHistory) {
          history.push({
            value: deepClone(initialValue),
            meta: safeMetadataFn(initialValue),
            group: safeGroupBy(initialValue),
            _index: ++entryCounter, // new insertion index
            _time: Date.now(), // new timestamp
          });
        }
      }
    }
  } catch (err) {
    runOnErrorOrThrow(err);
  }

  // 🆕 Unique per-instance id so a tab doesn't re-hydrate from its own save
  // when it hears its own BroadcastChannel message echoed back.
  const instanceId =
    typeof crypto !== "undefined" && crypto.randomUUID
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2)}`;

  // Set up below, once fn exists — declared here so persist() can safely
  // reference it (only ever called after construction finishes).
  let syncChannel = null;

  // 🆕 Best-effort auto-save. Doesn't block or throw on the caller —
  // storage errors (quota, adapter failure) go to onError like everything
  // else, and never interrupt the actual state update.
  const persist = () => {
    if (!storeHistory || !persistKey || !persistStorage) return;
    try {
      const result = persistStorage.setItem(persistKey, fn.exportHistory());
      const announce = () => {
        if (syncChannel) {
          syncChannel.postMessage({ source: instanceId, at: Date.now() });
        }
      };
      if (result instanceof Promise) {
        result.then(announce).catch((err) => {
          reportError(err);
        });
      } else {
        announce();
      }
    } catch (err) {
      reportError(err);
    }
  };

  const notifySubscribers = () => {
    // 🆕 Fix: each subscriber is called independently. Previously one
    // throwing subscriber stopped the forEach dead — later subscribers
    // never got notified, and since most callers of notifySubscribers()
    // (undo, redo, reset, insertAt, sort, copy, merge, transformHistory...)
    // have no try/catch of their own, the throw propagated all the way up
    // and crashed whatever called them. In a big app with many components
    // subscribed via useExecutor, or a game with many systems listening to
    // shared state, one bad listener used to be able to take everything
    // downstream of it out.
    subscribers.forEach((cb) => {
      try {
        cb();
      } catch (err) {
        reportError(err);
      }
    });
    if (onChange) {
      try {
        onChange(fn.value, storeHistory ? history[history.length - 1] : undefined);
      } catch (err) {
        reportError(err);
      }
    }
    persist();
  };

  const pushToHistory = (result) => {
    if (!storeHistory || historyPaused) return;

    // 🔍 noDuplicate checks
    if (noDuplicate && equalityFn) {
      if (history.some((h) => safeEqualityFn(h.value, result))) return;
    } else if (noDuplicate) {
      if (
        history.some((h) => JSON.stringify(h.value) === JSON.stringify(result))
      )
        return;
    }

    // 🔍 skip consecutive duplicates (checked before the throttle counter
    // so a skipped duplicate doesn't consume a historyStep "slot")
    if (equalityFn && history.length > 0) {
      const last = history[history.length - 1].value;
      if (safeEqualityFn(result, last)) return;
    }

    // 🔍 throttle
    stepCounter++;
    if (stepCounter % historyStep !== 0) return;

    // ✅ push with metadata + timestamp
    history.push({
      value: deepClone(result),
      meta: safeMetadataFn(result),
      group: safeGroupBy(result),
      _index: ++entryCounter, // new insertion index
      _time: Date.now(), // new timestamp
    });

    if (history.length > maxHistory) history.shift();
    redoStack.length = 0;
  };

  // The main executor function
  const fn = async (...args) => {
    try {
      let result = callback(...args);
      if (result instanceof Promise) result = await result;
      fn.value = result;
      pushToHistory(result);
      notifySubscribers();
      return result;
    } catch (err) {
      runOnErrorOrThrow(err);
    }
  };

  fn.value = isSeeded ? currentValue : initialValue;
  fn.initialValue = initialValue;
  fn.history = history;
  fn.redoStack = redoStack;

  // 🆕 Fix #2: always present, always safe to `await`, regardless of
  // whether callNow's callback was sync or async — so call sites don't
  // need to know or care which case they're in. Sync (or no callNow at
  // all) resolves immediately with the current value. Async resolves once
  // the value/history/subscribers have actually been committed.
  fn.ready = persistLoadPromise
    ? persistLoadPromise.then(async (found) => {
        // No persisted data existed for this key — callNow was deferred
        // (we couldn't know that synchronously with an async adapter), so
        // run it now as a fallback.
        if (!found && callNow) {
          try {
            const maybe = callback(...initialArgs);
            const resolved = maybe instanceof Promise ? await maybe : maybe;
            initialValue = resolved;
            if (storeHistory) {
              history.push({
                value: deepClone(resolved),
                meta: safeMetadataFn(resolved),
                group: safeGroupBy(resolved),
                _index: ++entryCounter,
                _time: Date.now(),
              });
            }
          } catch (err) {
            runOnErrorOrThrow(err);
          }
        }
        fn.value = isSeeded ? currentValue : initialValue;
        fn.initialValue = initialValue;
        notifySubscribers();
        return fn.value;
      })
    : initPromise
    ? initPromise
        .then((resolved) => {
          fn.value = resolved;
          fn.initialValue = resolved;
          if (storeHistory) {
            history.push({
              value: deepClone(resolved),
              meta: safeMetadataFn(resolved),
              group: safeGroupBy(resolved),
              _index: ++entryCounter,
              _time: Date.now(),
            });
          }
          notifySubscribers();
          return resolved;
        })
        .catch((err) => {
          try {
            if (onError) onError(err);
          } catch (handlerErr) {
            console.error("Executor: onError handler threw", handlerErr);
          }
          throw err; // keep fn.ready rejected so an explicit awaiter can still catch it
        })
    : Promise.resolve(fn.value);

  // 🆕 Cross-tab sync: when another tab/window saves new state for this
  // persistKey, pull it in here too. Built on BroadcastChannel rather than
  // the old `storage` event — that only fires for localStorage, and the
  // default adapter is IndexedDB now, so it wouldn't fire at all.
  if (storeHistory && persistKey && persistStorage && syncTabs) {
    if (typeof BroadcastChannel === "undefined") {
      reportError(
        new Error(
          "Executor: syncTabs requires BroadcastChannel, which isn't available in this environment"
        )
      );
    } else {
      syncChannel = new BroadcastChannel(`executor:${persistKey}`);
      syncChannel.onmessage = (event) => {
        if (!event.data || event.data.source === instanceId) return; // ignore our own writes
        Promise.resolve(persistStorage.getItem(persistKey))
          .then((raw) => {
            const data = parsePersisted(raw);
            if (!data) return;
            applyPersistedData(data);
            fn.value = data.value;
            fn.initialValue = data.initialValue;
            notifySubscribers();
          })
          .catch((err) => {
            // 🆕 Without this, a failure here (e.g. persistStorage.getItem
            // rejecting) was a silent unhandled promise rejection with no
            // route to onError at all.
            reportError(err);
          });
      };
    }
  }

  // 🆕 Stop listening for cross-tab updates (e.g. on component unmount).
  // Safe to call even if syncTabs was never enabled.
  fn.stopSync = () => {
    if (syncChannel) {
      syncChannel.close();
      syncChannel = null;
    }
  };

  fn.log = () => console.log(fn.value);

  // Reset to initial value
  fn.reset = () => {
    fn.value = fn.initialValue;
    if (storeHistory) {
      entryCounter = 0;
      history.length = 0;
      history.push({
        value: deepClone(fn.initialValue),
        meta: safeMetadataFn(fn.initialValue),
        group: safeGroupBy(fn.initialValue),
        _index: ++entryCounter,
        _time: Date.now(),
      });
      redoStack.length = 0;
    }
    notifySubscribers();
    return fn.value;
  };

  // Undo last change
  fn.undo = (steps = 1) => {
    if (storeHistory && history.length > 1) {
      for (let i = 0; i < steps && history.length > 1; i++)
        redoStack.push(history.pop());
      fn.value = history[history.length - 1].value;
      notifySubscribers();
    }
    return fn.value;
  };

  // Redo last undone change
  fn.redo = (steps = 1) => {
    if (storeHistory && redoStack.length > 0) {
      for (let i = 0; i < steps && redoStack.length > 0; i++) {
        const next = redoStack.pop();
        history.push(next);
        fn.value = next.value;
      }
      notifySubscribers();
    }
    return fn.value;
  };

  // Remove specific history entry
  fn.removeAt = (index) => {
    if (storeHistory && index >= 0 && index < history.length) {
      history.splice(index, 1);
      fn.value = history[history.length - 1]?.value ?? fn.initialValue;
      notifySubscribers();
    }
    return fn.value;
  };

  // Jump to specific history entry
  fn.jumpTo = (index) => {
    if (!storeHistory) {
      // 🆕 Previously threw a plain Error here — inconsistent with
      // undo/redo/removeAt/insertAt, which already silently no-op in the
      // equivalent situation. In a hot path (a game's per-frame update) an
      // uncaught throw here could crash the frame; now it's reported
      // (onError, or console.error as a fallback) instead.
      reportError(new Error("Executor: jumpTo requires storeHistory = true"));
      return fn.value;
    }
    if (index < 0 || index >= history.length) return fn.value;
    fn.value = history[index].value;
    notifySubscribers();
    return fn.value;
  };

  // Replace specific history entry
  fn.replaceAt = (index, newValue) => {
    if (!storeHistory) {
      // 🆕 Same consistency fix as jumpTo above.
      reportError(new Error("Executor: replaceAt requires storeHistory = true"));
      return fn.value;
    }
    if (index < 0 || index >= history.length) return fn.value;
    const old = history[index];
    history[index] = {
      value: deepClone(newValue),
      meta: safeMetadataFn(newValue),
      group: safeGroupBy(newValue),
      _index: old._index, // keep original position so default-order sort is unaffected
      _time: Date.now(), // this entry was just edited, so update its timestamp
    };
    if (index === history.length - 1) fn.value = newValue;
    notifySubscribers();
    return fn.value;
  };

  // Insert new history entry at specific position
  fn.insertAt = (index, newValue) => {
    if (storeHistory && index >= 0 && index <= history.length) {
      history.splice(index, 0, {
        value: deepClone(newValue),
        meta: safeMetadataFn(newValue),
        group: safeGroupBy(newValue),
        _index: ++entryCounter,
        _time: Date.now(),
      });
      fn.value = newValue;
      notifySubscribers();
    }
    return fn.value;
  };

  // Clear entire history and reset to current value
  fn.clearHistory = () => {
    if (storeHistory) {
      history.length = 0;
      history.push({
        value: deepClone(fn.value),
        meta: safeMetadataFn(fn.value),
        group: safeGroupBy(fn.value),
        _index: entryCounter,
        _time: Date.now(),
      });
      redoStack.length = 0;
      notifySubscribers();
    }
    return fn.value;
  };

  // Copy one or more history entries and replace current history
  fn.copy = (histories) => {
    if (!storeHistory) return fn.value;

    // Normalize to array of histories
    const allHistories = Array.isArray(histories[0]) ? histories : [histories];

    // Flatten + deep clone with duplicate checks
    const copied = [];
    allHistories.forEach((h) => {
      if (Array.isArray(h)) {
        h.forEach((entry) => {
          const val = entry.value;

          // noDuplicate + equalityFn
          if (noDuplicate && equalityFn) {
            if (copied.some((e) => safeEqualityFn(e.value, val))) return;
          } else if (noDuplicate) {
            if (
              copied.some(
                (e) => JSON.stringify(e.value) === JSON.stringify(val)
              )
            )
              return;
          }

          copied.push({
            value: deepClone(val),
            meta: entry.meta,
            group: entry.group,
            _index: entry._index,
            _time: entry._time,
          });
        });
      }
    });

    // Full replace
    history.length = 0;
    history.push(...copied);

    // Trim to maxHistory
    if (history.length > maxHistory) {
      history.splice(0, history.length - maxHistory);
    }

    // Reset redoStack
    redoStack.length = 0;

    // Keep entryCounter ahead of the copied entries' _index values
    resyncEntryCounter();

    // Update fn.value
    fn.value = history[history.length - 1]?.value ?? fn.initialValue;

    notifySubscribers();
    return fn.value;
  };

  // Merge one or more history entries into current history
  fn.merge = (histories, { position = "end" } = {}) => {
    if (!storeHistory) return fn.value;

    // Normalize to array of histories
    const allHistories = Array.isArray(histories[0]) ? histories : [histories];

    // Flatten and deep clone with duplicate checks
    const merged = [];
    allHistories.forEach((h) => {
      if (Array.isArray(h)) {
        h.forEach((entry) => {
          const val = entry.value;

          // noDuplicate + equalityFn
          if (noDuplicate && equalityFn) {
            if (history.some((e) => safeEqualityFn(e.value, val))) return;
            if (merged.some((e) => safeEqualityFn(e.value, val))) return;
          } else if (noDuplicate) {
            if (
              history.some(
                (e) => JSON.stringify(e.value) === JSON.stringify(val)
              )
            )
              return;
            if (
              merged.some(
                (e) => JSON.stringify(e.value) === JSON.stringify(val)
              )
            )
              return;
          }

          merged.push({
            value: deepClone(val),
            meta: entry.meta,
            group: entry.group,
            _index: entry._index,
            _time: entry._time,
          });
        });
      }
    });

    // Insert by position
    if (position === "start") {
      history.unshift(...merged);
    } else if (position === "end") {
      history.push(...merged);
    } else if (typeof position === "number") {
      history.splice(position, 0, ...merged);
    }

    // Trim to maxHistory
    if (history.length > maxHistory) {
      history.splice(0, history.length - maxHistory);
    }

    // Reset redoStack
    redoStack.length = 0;

    // Keep entryCounter ahead of the merged entries' _index values
    resyncEntryCounter();

    // Update fn.value
    fn.value = history[history.length - 1]?.value ?? fn.initialValue;

    notifySubscribers();
    return fn.value;
  };

  // Sort history entries accending, descending, or reset to default
  fn.sort = (orderOrFn = "default") => {
    if (!storeHistory) return fn.value;

    let sorted = [...history];

    if (orderOrFn === "default") {
      // restore insertion order
      sorted.sort((a, b) => (a._index ?? 0) - (b._index ?? 0));
    } else if (orderOrFn === "asc") {
      sorted.sort((a, b) => {
        if (typeof a.value === "number" && typeof b.value === "number") {
          return a.value - b.value;
        }
        return String(a.value).localeCompare(String(b.value));
      });
    } else if (orderOrFn === "desc") {
      sorted.sort((a, b) => {
        if (typeof a.value === "number" && typeof b.value === "number") {
          return b.value - a.value;
        }
        return String(b.value).localeCompare(String(a.value));
      });
    } else if (orderOrFn === "groupAsc") {
      // 🔥 sort by group label (alphabetical ascending)
      sorted.sort((a, b) =>
        String(a.group ?? "").localeCompare(String(b.group ?? ""))
      );
    } else if (orderOrFn === "groupDesc") {
      // 🔥 sort by group label (alphabetical descending)
      sorted.sort((a, b) =>
        String(b.group ?? "").localeCompare(String(a.group ?? ""))
      );
    } else if (typeof orderOrFn === "function") {
      // 🆕 full entry comparator (not just value)
      sorted.sort((a, b) => orderOrFn(a, b));
    }

    // 🔒 Deduplicate after sort
    const deduped = [];
    sorted.forEach((entry) => {
      const val = entry.value;
      if (noDuplicate && equalityFn) {
        if (deduped.some((e) => safeEqualityFn(e.value, val))) return;
      } else if (noDuplicate) {
        if (
          deduped.some((e) => JSON.stringify(e.value) === JSON.stringify(val))
        )
          return;
      }
      deduped.push(entry);
    });

    // overwrite history with deduped
    history.length = 0;
    history.push(...deduped);

    fn.value = history[history.length - 1]?.value ?? fn.initialValue;
    notifySubscribers();
    return fn.value;
  };

  // Split history into multiple Executors by index ranges
  fn.split = (...ranges) => {
    const result = {};

    ranges.forEach((range, i) => {
      if (!Array.isArray(range) || range.length === 0) return;

      let indices = [];

      if (
        range.length === 2 &&
        typeof range[0] === "number" &&
        typeof range[1] === "number"
      ) {
        // Treat [start, end] as a range
        const [start, end] = range;
        const step = start <= end ? 1 : -1;
        for (let idx = start; step > 0 ? idx <= end : idx >= end; idx += step) {
          indices.push(idx);
        }
      } else {
        // Treat as explicit indices [0, 2, 5]
        indices = range;
      }

      // Collect history entries by indices
      const subset = indices
        .map((idx) => history[idx])
        .filter(Boolean)
        .map((entry) => ({
          value: deepClone(entry.value),
          meta: entry.meta,
          group: entry.group,
          _index: entry._index,
          _time: entry._time,
        }));

      // Create a new Executor seeded with this subset, using the SAME
      // callback as the parent — so a split executor is a genuinely live,
      // independent executor (calling ex1(99) actually runs your logic on
      // 99), not just a read-only viewer onto a slice of history. Seeding
      // happens inside the constructor (see seedHistory above), so undo,
      // redo, jumpTo, filterHistory, etc. all work correctly on `mini` too.
      const mini = Executor(callback, {
        storeHistory: true,
        callNow: false,
        seedHistory: subset,
      });

      result[`ex${i + 1}`] = mini;
    });

    return result; // { ex1, ex2, ... }
  };

  // Serialize/Deserialize history for persistence
  fn.serializeHistory = () => JSON.stringify(history);
  fn.deserializeHistory = (data) => {
    if (storeHistory && Array.isArray(data)) {
      history.length = 0;
      history.push(
        ...data.map((entry) => ({
          value: deepClone(entry.value),
          meta: entry.meta,
          group: entry.group,
          _index: entry._index,
          _time: entry._time,
        }))
      );
      fn.value = history[history.length - 1].value;
      redoStack.length = 0;
      resyncEntryCounter();
      notifySubscribers();
    }
  };

  // ✅ Export full state safely
  fn.exportHistory = () => {
    try {
      return JSON.stringify({
        value: fn.value,
        initialValue: fn.initialValue,
        history: history.map((entry) => ({
          value: deepClone(entry.value),
          meta: entry.meta,
          group: entry.group,
          _index: entry._index,
          _time: entry._time,
        })),
        redoStack: redoStack.map((entry) => ({
          value: deepClone(entry.value),
          meta: entry.meta,
          group: entry.group,
          _index: entry._index,
          _time: entry._time,
        })),
      });
    } catch (e) {
      runOnErrorOrThrow(e);
    }
  };

  // ✅ Import full state safely
  fn.importHistory = (json) => {
    try {
      const data = JSON.parse(json);

      if (Array.isArray(data.history)) {
        history.length = 0;
        history.push(
          ...data.history.map((entry) => ({
            value: deepClone(entry.value),
            meta: entry.meta,
            group: entry.group,
            _index: entry._index,
            _time: entry._time,
          }))
        );
      }

      redoStack.length = 0;
      if (Array.isArray(data.redoStack)) {
        redoStack.push(
          ...data.redoStack.map((entry) => ({
            value: deepClone(entry.value),
            meta: entry.meta,
            group: entry.group,
            _index: entry._index,
            _time: entry._time,
          }))
        );
      }

      fn.value = deepClone(data.value ?? fn.initialValue);
      resyncEntryCounter();
      notifySubscribers();
    } catch (e) {
      runOnErrorOrThrow(e);
    }
  };

  // 🆕 Export history to a downloadable JSON file
  fn.exportHistoryToFile = (filename = "executor-history.json") => {
    if (
      typeof document === "undefined" ||
      typeof Blob === "undefined" ||
      typeof URL === "undefined"
    ) {
      // 🆕 Previously this would fail with a cryptic "document is not
      // defined" ReferenceError in non-browser environments (a Node game
      // server, React Native, a restricted engine WebView). Fail with a
      // clear, actionable message instead.
      runOnErrorOrThrow(
        new Error(
          "Executor: exportHistoryToFile requires a browser environment (document/Blob/URL) and isn't available here"
        )
      );
      return;
    }

    const json = fn.exportHistory(); // uses the safe version we wrote
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    URL.revokeObjectURL(url);
  };

  // 🆕 Import history from a user-selected JSON file
  fn.importHistoryFromFile = () => {
    if (typeof document === "undefined") {
      // Keep the same "always returns a Promise" contract even in this
      // early-exit case, so callers can always .catch() it uniformly.
      const err = new Error(
        "Executor: importHistoryFromFile requires a browser environment (document) and isn't available here"
      );
      try {
        if (onError) onError(err);
      } catch (handlerErr) {
        console.error("Executor: onError handler threw", handlerErr);
      }
      return Promise.reject(err);
    }

    return new Promise((resolve, reject) => {
      const input = document.createElement("input");
      input.type = "file";
      input.accept = "application/json";

      input.onchange = async (event) => {
        const file = event.target.files[0];
        if (!file) return reject("No file selected");

        try {
          const text = await file.text();
          fn.importHistory(text); // reuse safe import
          resolve(fn.value);
        } catch (e) {
          try {
            if (onError) onError(e);
          } catch (handlerErr) {
            console.error("Executor: onError handler threw", handlerErr);
          }
          reject(e);
        }
      };


      input.click();
    });
  };

  // Batch multiple calls into one history entry
  fn.batch = (callback) => {
    if (!storeHistory) return callback();
    historyPaused = true;
    let result;
    let succeeded = false;
    try {
      // 🆕 Error-handling fix: previously, if `callback` threw partway through,
      // historyPaused = false below never ran — history tracking silently
      // and permanently disabled itself for the rest of this executor's
      // life, with no crash and no error to notice. The try/finally here
      // guarantees historyPaused always gets reset, success or failure.
      result = callback();
      succeeded = true;
    } catch (err) {
      runOnErrorOrThrow(err);
    } finally {
      historyPaused = false;
    }
    // Only commit a combined history entry if the batch actually completed
    // — a partial/interrupted batch shouldn't leave a checkpoint behind.
    if (succeeded) {
      pushToHistory(fn.value);
      notifySubscribers();
    }
    return result;
  };

  // Pause/Resume history tracking
  fn.pauseHistory = () => {
    historyPaused = true;
  };
  fn.resumeHistory = () => {
    historyPaused = false;
  };

  // Subscription management
  fn._subscribe = (cb) => subscribers.add(cb);
  fn._unsubscribe = (cb) => subscribers.delete(cb);

  // 🆕 Debug helpers — how many things are currently subscribed, and (for
  // deeper inspection) the actual callback list. Useful once you're
  // juggling many executors in a larger app and something isn't
  // re-rendering the way you expect.
  fn._subscriberCount = () => subscribers.size;
  fn._debugSubscribers = () => Array.from(subscribers);

  // Extend filterHistory with common query helpers
  fn.filterHistory = (predicateOrOptions) => {
    if (!storeHistory) return [];

    // Case 1: user passes a function → behave like before
    if (typeof predicateOrOptions === "function") {
      return history.filter((entry) => predicateOrOptions(entry));
    }

    // Case 2: user passes an options object
    const {
      group,
      meta,
      after, // timestamp (ms) or Date
      before, // timestamp (ms) or Date
      range, // [start, end] timestamps
    } = predicateOrOptions || {};

    return history.filter((entry) => {
      // group check
      if (group && entry.group !== group) return false;

      // meta check (shallow compare)
      if (meta && JSON.stringify(entry.meta) !== JSON.stringify(meta))
        return false;

      // timestamp checks
      if (
        after &&
        entry._time <= (after instanceof Date ? after.getTime() : after)
      )
        return false;
      if (
        before &&
        entry._time >= (before instanceof Date ? before.getTime() : before)
      )
        return false;

      if (
        range &&
        (entry._time <
          (range[0] instanceof Date ? range[0].getTime() : range[0]) ||
          entry._time >
            (range[1] instanceof Date ? range[1].getTime() : range[1]))
      )
        return false;

      return true;
    });
  };

  // 🆕 Read-only transform over history entries — doesn't mutate.
  // e.g. ex.mapHistory((entry) => entry.value) to pull out just the values.
  fn.mapHistory = (mapFn) => {
    if (!storeHistory) return [];
    return history.map((entry, i) => mapFn(entry, i));
  };

  // 🆕 In-place transform: mapFn receives (value, entry, index) and
  // returns either a plain new value, or a { value, meta, group } shape to
  // also update metadata/grouping. _index/_time are preserved either way,
  // so sort("default") and time-based filterHistory queries stay correct.
  fn.transformHistory = (mapFn) => {
    if (!storeHistory) return fn.value;
    for (let i = 0; i < history.length; i++) {
      const entry = history[i];
      const result = mapFn(entry.value, entry, i);
      const isEntryShape =
        result && typeof result === "object" && "value" in result;
      history[i] = isEntryShape
        ? {
            value: deepClone(result.value),
            meta: result.meta ?? entry.meta,
            group: result.group ?? entry.group,
            _index: entry._index,
            _time: entry._time,
          }
        : {
            ...entry,
            value: deepClone(result),
          };
    }
    fn.value = history[history.length - 1]?.value ?? fn.initialValue;
    notifySubscribers();
    return fn.value;
  };

  // 🆕 If we just established a fresh initial state (not loaded from a
  // previous session, and not waiting on an async callNow) and persistence
  // is configured, save that baseline immediately. Without this, the very
  // first value set via a *synchronous* callNow was never persisted at
  // all — persist() only ever ran off notifySubscribers, which the
  // initial sync commit intentionally bypasses (same as it always has).
  // This has to run down here, after every fn.* method — including
  // fn.exportHistory, which persist() calls — actually exists.
  if (storeHistory && persistKey && persistStorage && !loadedFromPersist && !persistLoadPromise && !initPromise) {
    persist();
  }

  return fn;
}

// 🆕 Combine multiple executors into one group
Executor.combine = (...executors) => {
  const group = {};

  group.undo = () => executors.map((fn) => fn.undo());
  group.redo = () => executors.map((fn) => fn.redo());
  group.reset = () => executors.map((fn) => fn.reset());
  group.clearHistory = () => executors.map((fn) => fn.clearHistory());

  group.export = () => executors.map((fn) => fn.exportHistory());

  group.importAll = (dataArr) => {
    if (!Array.isArray(dataArr)) {
      throw new Error(
        "ExecutorGroup.importAll expects an array of JSON strings"
      );
    }
    const failures = [];
    executors.forEach((fn, i) => {
      if (!dataArr[i]) return;
      try {
        fn.importHistory(dataArr[i]);
      } catch (err) {
        // fn.importHistory only throws here if that executor has no
        // onError configured (or its own onError itself failed). Collect
        // it and keep going, so one bad entry can't prevent the rest of
        // the group from being restored.
        failures.push({ index: i, error: err });
      }
    });
    if (failures.length) {
      const summary = new Error(
        `ExecutorGroup.importAll: ${failures.length} of ${executors.length} executor(s) failed to import (indices: ${failures
          .map((f) => f.index)
          .join(", ")})`
      );
      summary.failures = failures;
      throw summary;
    }
  };

  return group;
};

// 🆕 Snapshot the full state of any set of executors — independent of
// combine(), and returns parsed objects (not JSON strings) so the result
// is directly inspectable/diffable/sendable-over-the-wire as-is.
Executor.snapshot = (...executors) => {
  const list = Array.isArray(executors[0]) ? executors[0] : executors;
  return list.map((ex) => JSON.parse(ex.exportHistory()));
};

Executor.restoreSnapshot = (executors, snapshot) => {
  const list = Array.isArray(executors[0]) ? executors[0] : executors;
  list.forEach((ex, i) => {
    if (snapshot[i]) ex.importHistory(JSON.stringify(snapshot[i]));
  });
};

// React Hook for auto re-rendering
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

// ✅ Export both default and named
export { Executor, useExecutor };
export default Executor;

// ✅ Done: performance is left alone until a real workload needs it (historyStep/maxHistory exist for now)
// ✅ Done: inspect current subscribers for debugging (_subscriberCount, _debugSubscribers)
// ✅ Done: filter or transform history entries on the fly (filterHistory, mapHistory, transformHistory)
// Later we can add a way to visualize history for better UX (build on filterHistory/serializeHistory, not in this lib)
// ✅ Done: log history changes for auditing (onChange option)
// ✅ Done: snapshot the entire state of multiple executors (Executor.snapshot / restoreSnapshot)
// ✅ Done: persist history in localStorage or IndexedDB (persistKey / persistStorage options)
// Later we can add a way to sync history across multiple tabs or windows (build on persistKey)
// ✅ Done: handle circular references in history entries (deepClone uses a seen-set)
// Later: profiling belongs in devtools, not baked into the library
// Later we can add a way to handle large data structures efficiently (revisit alongside deepClone if it becomes a real bottleneck)
// Later: call-stack visualization is an app built on top of this data, not this library's job
// ✅ Done: customize the initial state and behavior of the executor (seedHistory / seedValue options)
