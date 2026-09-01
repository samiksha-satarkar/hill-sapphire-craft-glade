import assert from "node:assert/strict";
import { test } from "node:test";
import { generateTrade } from "./generate.ts";
import { validateBseResponse } from "./schema.ts";

test("accepts a well-formed BSE payload", () => {
  const result = validateBseResponse({ trades: [generateTrade(1), generateTrade(2)] });
  assert.equal(result.ok, true);
  if (result.ok) assert.equal(result.trades.length, 2);
});

test("rejects an empty tape", () => {
  const result = validateBseResponse({ trades: [] });
  assert.equal(result.ok, false);
});

test("rejects missing fields and non-positive size", () => {
  const base = generateTrade(1);
  assert.equal(validateBseResponse({ trades: [{ ...base, quantity: 0 }] }).ok, false);
  assert.equal(validateBseResponse({ trades: [{ ...base, price: -1 }] }).ok, false);
  assert.equal(validateBseResponse({ trades: [{ ...base, tradeId: "" }] }).ok, false);
  assert.equal(validateBseResponse({ notTrades: [] }).ok, false);
  assert.equal(validateBseResponse(null).ok, false);
});
