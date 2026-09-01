import assert from "node:assert/strict";
import { test } from "node:test";
import { encodeSse, publish, subscribe } from "./hub.ts";

test("encodeSse writes named event + JSON data", () => {
  const raw = encodeSse({
    type: "pull.completed",
    payload: { jobId: "abc123", recordsFetched: 3500 },
  });
  assert.equal(raw, 'event: pull.completed\ndata: {"jobId":"abc123","recordsFetched":3500}\n\n');
});

test("publish fans out to every subscriber and unsubscribe works", () => {
  const seen: string[] = [];
  const stopA = subscribe((e) => seen.push(`a:${e.type}`));
  const stopB = subscribe((e) => seen.push(`b:${e.type}`));
  publish({ type: "pull.started", payload: { jobId: "1" } });
  stopA();
  publish({ type: "pull.failed", payload: { jobId: "1" } });
  stopB();
  assert.deepEqual(seen, ["a:pull.started", "b:pull.started", "b:pull.failed"]);
});
