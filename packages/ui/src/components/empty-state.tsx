import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "../lib/utils";
export function EmptyState({
    icon,
    title,
    description,
    action,
    className,
    ...props
}: HTMLAttributes<HTMLDivElement> & {
    icon?: ReactNode;
    title: ReactNode;
    description?: ReactNode;
    action?: ReactNode;
}) {
    return (
        <div className={cn("flex flex-col items-start px-5 py-10", className)} {...props}>
            {icon && (
                <span className="grid h-12 w-12 place-items-center rounded-lg bg-surface-raised text-text-muted">
                    {icon}
                </span>
            )}
            <h2 className="mt-5 text-title font-semibold text-text-primary">{title}</h2>
            {description && (
                <p className="mt-2 max-w-[60ch] text-body-sm text-text-secondary">{description}</p>
            )}
            {action && <div className="mt-5">{action}</div>}
        </div>
    );
}
