import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "../lib/utils";

export interface WorkspaceHeaderProps extends Omit<HTMLAttributes<HTMLElement>, "title"> {
    icon?: ReactNode;
    title: ReactNode;
    description?: ReactNode;
    metadata?: ReactNode;
    actions?: ReactNode;
}

/** Shared title/action hierarchy for every workspace surface. */
export function WorkspaceHeader({
    icon,
    title,
    description,
    metadata,
    actions,
    className,
    ...props
}: WorkspaceHeaderProps) {
    return (
        <header
            className={cn(
                "flex min-h-12 shrink-0 items-center gap-3 bg-background px-4 shadow-[inset_0_-1px_rgb(var(--c-border-subtle))]",
                className,
            )}
            {...props}
        >
            {icon && <span className="shrink-0 text-text-muted">{icon}</span>}
            <div className="min-w-0">
                <div className="flex min-w-0 items-center gap-2">
                    <h1 className="truncate text-[14px] font-semibold tracking-[-0.01em] text-text-primary">
                        {title}
                    </h1>
                    {metadata}
                </div>
                {description && (
                    <p className="mt-0.5 hidden truncate text-[11px] text-text-muted sm:block">
                        {description}
                    </p>
                )}
            </div>
            {actions && (
                <div className="ml-auto flex shrink-0 items-center gap-1 text-text-muted">
                    {actions}
                </div>
            )}
        </header>
    );
}
