import React, { useState } from "react";
import { Executor, useExecutor } from "executor-fn"; // your library

const numberExec = Executor((x) => x, { storeHistory: true, callNow: false });

// Helper executors to merge/copy from
const otherExec1 = Executor((x) => x, { storeHistory: true });
const otherExec2 = Executor((x) => x, { storeHistory: true });

export default function ExecutorDemo() {
  // Create an executor with numbers
  const state = useExecutor(numberExec);
  
  const [filterResult, setFilterResult] = useState([]);

  // preload data into others
  otherExec1(10);
  otherExec1(20);
  otherExec1(30);

  otherExec2(100);
  otherExec2(200);


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
