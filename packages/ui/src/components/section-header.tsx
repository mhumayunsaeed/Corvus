import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "../lib/utils";
export function SectionHeader({
    title,
    description,
    action,
    className,
    ...props
}: HTMLAttributes<HTMLDivElement> & {
    title: ReactNode;
    description?: ReactNode;
    action?: ReactNode;
}) {
    return (
        <div className={cn("flex items-end justify-between gap-4", className)} {...props}>
            <div>
                <h2 className="text-heading font-semibold text-text-primary">{title}</h2>
                {description && (
                    <p className="mt-1 max-w-[68ch] text-body-sm text-text-secondary">
                        {description}
                    </p>
                )}
            </div>
            {action}
        </div>
    );
}
