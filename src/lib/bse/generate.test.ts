import assert from "node:assert/strict";
import { test } from "node:test";
import { BSE_SYMBOLS, generateTrade, generateTrades } from "./generate.ts";

test("generateTrade is deterministic for a given index", () => {
  const a = generateTrade(42);
  const b = generateTrade(42);
  assert.deepEqual(a, b);
  assert.equal(a.tradeId, "TRD000042");
});

test("generateTrades returns unique sequential ids", () => {
  const trades = generateTrades(50, 1);
  const ids = new Set(trades.map((t) => t.tradeId));
  assert.equal(ids.size, 50);
  assert.equal(trades[0]?.tradeId, "TRD000001");
  assert.equal(trades[49]?.tradeId, "TRD000050");
});

test("overlapping windows share the same records", () => {
  const seed = generateTrades(10, 1);
  const pull = generateTrades(15, 1);
  for (let i = 0; i < 10; i += 1) {
    assert.deepEqual(seed[i], pull[i]);
  }
  assert.equal(pull[14]?.tradeId, "TRD000015");
});

test("generated trades use realistic Indian symbols and positive size", () => {
  const symbols = new Set(BSE_SYMBOLS.map((s) => s.symbol));
  const trades = generateTrades(200, 1);
  for (const t of trades) {
    assert.ok(symbols.has(t.symbol));
    assert.match(t.client, /^CLIENT\d{3}$/);
    assert.ok(t.quantity > 0);
    assert.ok(t.price > 0);
    assert.ok(!Number.isNaN(Date.parse(t.timestamp)));
  }
});
