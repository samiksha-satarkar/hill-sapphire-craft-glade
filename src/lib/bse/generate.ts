/**
 * Deterministic mock BSE tape. The same trade index always produces the same
 * record so overlapping pulls are true duplicates, not lookalikes.
 */

export type GeneratedTrade = {
  tradeId: string;
  client: string;
  symbol: string;
  quantity: number;
  price: number;
  timestamp: string;
};

export const BSE_SYMBOLS: ReadonlyArray<{
  symbol: string;
  base: number;
  vol: number;
}> = [
  { symbol: "RELIANCE", base: 1450.5, vol: 28 },
  { symbol: "TCS", base: 3984.0, vol: 45 },
  { symbol: "INFY", base: 1512.25, vol: 22 },
  { symbol: "HDFCBANK", base: 1648.7, vol: 24 },
  { symbol: "ICICIBANK", base: 1142.3, vol: 18 },
  { symbol: "SBIN", base: 812.45, vol: 14 },
  { symbol: "ITC", base: 428.6, vol: 8 },
  { symbol: "LT", base: 3568.9, vol: 40 },
  { symbol: "BHARTIARTL", base: 1544.1, vol: 20 },
  { symbol: "AXISBANK", base: 1186.75, vol: 16 },
  { symbol: "KOTAKBANK", base: 1762.4, vol: 22 },
  { symbol: "HINDUNILVR", base: 2488.0, vol: 30 },
  { symbol: "BAJFINANCE", base: 7124.5, vol: 80 },
  { symbol: "ASIANPAINT", base: 2896.3, vol: 35 },
  { symbol: "MARUTI", base: 12480.0, vol: 140 },
  { symbol: "TITAN", base: 3422.8, vol: 38 },
  { symbol: "WIPRO", base: 498.15, vol: 10 },
  { symbol: "HCLTECH", base: 1644.9, vol: 22 },
];

export const BSE_CLIENTS: readonly string[] = Array.from(
  { length: 48 },
  (_, i) => `CLIENT${String(i + 1).padStart(3, "0")}`,
);

const LOT_SIZES = [10, 25, 50, 75, 100, 150, 200, 250, 500, 1000] as const;

/** Market open 09:15 IST = 03:45 UTC on 2026-08-03, then spread across sessions. */
const SESSION_ORIGIN_MS = Date.UTC(2026, 7, 3, 3, 45, 0);

function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function generateTrade(index: number): GeneratedTrade {
  if (!Number.isInteger(index) || index < 1) {
    throw new RangeError("trade index must be a positive integer");
  }
  const rng = mulberry32(index * 2654435761);
  const spec = BSE_SYMBOLS[Math.floor(rng() * BSE_SYMBOLS.length)]!;
  const client = BSE_CLIENTS[Math.floor(rng() * BSE_CLIENTS.length)]!;
  const quantity = LOT_SIZES[Math.floor(rng() * LOT_SIZES.length)]!;
  const rawPrice = spec.base + (rng() * 2 - 1) * spec.vol;
  const price = Math.round(Math.max(1, rawPrice) * 100) / 100;

  const session = Math.floor(rng() * 22); // ~22 trading days
  const minuteOfSession = Math.floor(rng() * 375); // 09:15–15:30
  const second = Math.floor(rng() * 60);
  const tradedAt = new Date(
    SESSION_ORIGIN_MS + session * 86_400_000 + minuteOfSession * 60_000 + second * 1000,
  );

  return {
    tradeId: `TRD${String(index).padStart(6, "0")}`,
    client,
    symbol: spec.symbol,
    quantity,
    price,
    timestamp: tradedAt.toISOString(),
  };
}

export function generateTrades(count: number, startIndex = 1): GeneratedTrade[] {
  const trades: GeneratedTrade[] = [];
  for (let i = 0; i < count; i += 1) {
    trades.push(generateTrade(startIndex + i));
  }
  return trades;
}
