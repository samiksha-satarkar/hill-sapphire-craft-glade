import { forwardRef, type InputHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => (
    <input
      ref={ref}
      className={cn(
        "h-11 w-full rounded-md border border-border bg-surface px-3 text-sm text-fg placeholder:text-subtle",
        "transition-colors duration-150 ease-[var(--ease-out-soft)]",
        "hover:border-accent/30 focus:border-accent/50 focus:outline-none",
        className,
      )}
      {...props}
    />
  ),
);
Input.displayName = "Input";
