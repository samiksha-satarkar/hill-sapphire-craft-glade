import { z } from "zod";
import type { GeneratedTrade } from "./generate";

export const bseTradeSchema = z.object({
  tradeId: z.string().min(1).max(64),
  client: z.string().min(1).max(64),
  symbol: z.string().min(1).max(32),
  quantity: z.number().int().positive(),
  price: z.number().positive().finite(),
  timestamp: z.iso.datetime(),
});

export const bseResponseSchema = z.object({
  trades: z.array(bseTradeSchema).min(1).max(20_000),
});

export type BseTrade = z.infer<typeof bseTradeSchema>;
export type BseResponse = z.infer<typeof bseResponseSchema>;

export type ValidationResult =
  | { ok: true; trades: BseTrade[] }
  | { ok: false; error: string };

export function validateBseResponse(payload: unknown): ValidationResult {
  const parsed = bseResponseSchema.safeParse(payload);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    const path = issue?.path?.length ? issue.path.join(".") : "response";
    return {
      ok: false,
      error: `Invalid BSE response at ${path}: ${issue?.message ?? "failed validation"}`,
    };
  }
  return { ok: true, trades: parsed.data.trades };
}

export function toGenerated(trade: BseTrade): GeneratedTrade {
  return trade;
}
