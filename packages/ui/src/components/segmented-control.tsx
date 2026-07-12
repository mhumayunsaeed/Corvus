import type { ButtonHTMLAttributes, HTMLAttributes } from "react";
import { cn } from "../lib/utils";
export function SegmentedControl({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
    return (
        <div
            role="group"
            {...props}
            className={cn("inline-flex rounded-lg bg-surface-raised p-1", className)}
        />
    );
}
export function SegmentedControlItem({
    active,
    className,
    ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { active?: boolean }) {
    return (
        <button
            type="button"
            aria-pressed={active}
            {...props}
            className={cn(
                "min-h-8 rounded-md px-3 text-[12px] font-medium text-text-muted transition-colors hover:text-text-primary",
                active && "bg-background text-text-primary shadow-e1",
                className,
            )}
        />
    );
}
