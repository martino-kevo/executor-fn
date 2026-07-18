import React, { useState } from "react";
import { Executor } from "executor-fn";
import { useExecutor } from "executor-fn/react";

const numberExec = Executor((x) => x, { storeHistory: true, callNow: false });

// Helper executors to merge/copy from
const otherExec1 = Executor((x) => x, { storeHistory: true });
const otherExec2 = Executor((x) => x, { storeHistory: true });

// ⚠️ Preload at module scope, run once — the original version called
// otherExec1(10)/otherExec1(20)/etc. directly inside the component
// function body, which React re-runs on every render. Since ANY of the
// buttons below (sort, filter, merge) trigger a re-render, that meant
// otherExec1/otherExec2's history grew a little more every single time —
// unbounded growth from what looked like read-only UI actions.
[10, 20, 30].forEach((v) => otherExec1(v));
[100, 200].forEach((v) => otherExec2(v));

export default function ExecutorDemo() {
  // Create an executor with numbers
  const state = useExecutor(numberExec);

  const [filterResult, setFilterResult] = useState([]);

  const handleCopy = () => {
    numberExec.copy([otherExec1.history, otherExec2.history]);
  };

  const handleMergeStart = () => {
    numberExec.merge([otherExec1.history], { position: "start" });
  };

  const handleMergeEnd = () => {
    numberExec.merge([otherExec2.history], { position: "end" });
  };

  const handleSortAsc = () => {
    numberExec.sort("asc");
  };

  const handleSortDesc = () => {
    numberExec.sort("desc");
  };

  const handleFilter = () => {
    const res = numberExec.filterHistory((entry) => entry.value > 50);
    setFilterResult(res);
  };

  return (
    <div style={{ padding: 20 }}>
      <h2>Executor Demo (React)</h2>
      <p>Current value: {String(state)}</p>
      <p>History: {JSON.stringify(numberExec.history?.map((h) => h.value))}</p>

      <button onClick={handleCopy}>Copy from exec1 + exec2</button>
      <button onClick={handleMergeStart}>Merge exec1 at start</button>
      <button onClick={handleMergeEnd}>Merge exec2 at end</button>
      <button onClick={handleSortAsc}>Sort Asc</button>
      <button onClick={handleSortDesc}>Sort Desc</button>
      <button onClick={handleFilter}>Filter greater than 50</button>

      <div>
        <h4>Filter Result ( greater than 50 ):</h4>
        <pre>
          {JSON.stringify(
            filterResult.map((h) => h.value),
            null,
            2
          )}
        </pre>
      </div>
    </div>
  );
}
