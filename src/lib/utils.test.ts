import assert from "node:assert/strict";
import { test } from "node:test";
import { cn, formatInr, formatQty } from "./utils.ts";

test("formatInr uses Indian grouping and two decimals", () => {
  assert.equal(formatInr(1450.5), "1,450.50");
});

test("formatQty has no fraction", () => {
  assert.equal(formatQty(3500), "3,500");
});

test("cn merges tailwind classes", () => {
  assert.equal(cn("px-2", "px-4"), "px-4");
});
