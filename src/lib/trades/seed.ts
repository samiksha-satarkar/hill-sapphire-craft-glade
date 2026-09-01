import { SEED_TRADE_COUNT } from "@/lib/config";
import { generateTrades } from "@/lib/bse/generate";
import { log } from "@/lib/logger";
import { countTrades, upsertTrades } from "./repo";

const g = globalThis as typeof globalThis & {
  __tradeDeskSeed__?: Promise<void>;
};

async function seedIfEmpty(): Promise<void> {
  const existing = await countTrades();
  if (existing > 0) {
    log.info("seed skipped; trades already present", { existing });
    return;
  }
  log.info("seeding blotter", { count: SEED_TRADE_COUNT });
  const trades = generateTrades(SEED_TRADE_COUNT, 1);
  const result = await upsertTrades(trades);
  log.info("seed complete", { inserted: result.inserted });
}

export function ensureSeeded(): Promise<void> {
  g.__tradeDeskSeed__ ??= seedIfEmpty().catch((err) => {
    g.__tradeDeskSeed__ = undefined;
    throw err;
  });
  return g.__tradeDeskSeed__;
}
