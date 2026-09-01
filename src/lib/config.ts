/** Server-side runtime config. Never import from client components. */

const DEFAULT_DELAY_MS = 5_000;
const MAX_DELAY_MS = 20 * 60 * 1000;

export const SEED_TRADE_COUNT = 2_000;
export const BSE_TRADE_COUNT = 3_500;
export const PAGE_SIZE_DEFAULT = 25;
export const PAGE_SIZES = [10, 25, 50] as const;

export function getBseDelayMs(): number {
  const raw = typeof process !== "undefined" ? process.env.BSE_DELAY_MS : undefined;
  if (raw == null || raw.trim() === "") return DEFAULT_DELAY_MS;
  const n = Number(raw);
  if (!Number.isFinite(n) || n < 0) return DEFAULT_DELAY_MS;
  return Math.min(Math.floor(n), MAX_DELAY_MS);
}

export function getBseApiUrl(): string {
  const raw = typeof process !== "undefined" ? process.env.BSE_API_URL : undefined;
  if (raw && raw.trim()) return raw.trim();
  const port =
    typeof process !== "undefined" && process.env.PORT && process.env.PORT.trim()
      ? process.env.PORT.trim()
      : "8080";
  return `http://127.0.0.1:${port}/getTrades`;
}

export function getStaleJobMs(): number {
  return getBseDelayMs() + 60_000;
}
