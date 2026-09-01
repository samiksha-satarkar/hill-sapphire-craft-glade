import assert from "node:assert/strict";
import { test } from "node:test";
import { assertTransition, canTransition } from "./transitions.ts";

test("allows the happy path PENDING → RUNNING → COMPLETED", () => {
  assert.equal(canTransition("PENDING", "RUNNING"), true);
  assert.equal(canTransition("RUNNING", "COMPLETED"), true);
});

test("allows RUNNING → FAILED", () => {
  assert.equal(canTransition("RUNNING", "FAILED"), true);
});

test("rejects illegal transitions", () => {
  assert.equal(canTransition("PENDING", "COMPLETED"), false);
  assert.equal(canTransition("COMPLETED", "RUNNING"), false);
  assert.equal(canTransition("FAILED", "PENDING"), false);
  assert.throws(() => assertTransition("COMPLETED", "FAILED"));
});
