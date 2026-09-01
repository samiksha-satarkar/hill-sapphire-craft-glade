import { cn } from "@/lib/utils";
import type { HTMLAttributes } from "react";

type Tone = "neutral" | "success" | "warn" | "danger" | "info";

const tones: Record<Tone, string> = {
  neutral: "bg-surface-2 text-muted border-border",
  success: "bg-success/12 text-success border-success/25",
  warn: "bg-warn/12 text-warn border-warn/25",
  danger: "bg-danger/12 text-danger border-danger/25",
  info: "bg-info/12 text-info border-info/25",
};

export function Badge({
  className,
  tone = "neutral",
  ...props
}: HTMLAttributes<HTMLSpanElement> & { tone?: Tone }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium tracking-wide",
        tones[tone],
        className,
      )}
      {...props}
    />
  );
}
