import type { HTMLAttributes } from "react";
import { cn } from "../lib/utils";
const tones = {
    neutral: "bg-surface-raised text-text-secondary",
    accent: "bg-accent-soft text-accent",
    live: "bg-live-soft text-live",
    success: "bg-success/15 text-success",
    warning: "bg-warning/15 text-warning",
    danger: "bg-danger/15 text-danger",
};
export function StatusBadge({
    tone = "neutral",
    className,
    ...props
}: HTMLAttributes<HTMLSpanElement> & { tone?: keyof typeof tones }) {
    return (
        <span
            className={cn(
                "inline-flex min-h-5 items-center rounded px-2 text-[10px] font-semibold",
                tones[tone],
                className,
            )}
            {...props}
        />
    );
}
