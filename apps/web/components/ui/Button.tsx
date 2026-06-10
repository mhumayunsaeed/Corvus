import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from "react";
import { cn } from "@corvus/ui";

/**
 * App button system (brief §Login). Primary is amber with dark ink. Loading
 * swaps the label for three pulsing dots and keeps the width locked so layout
 * never shifts.
 */
type Variant = "primary" | "secondary" | "ghost" | "danger";

const BASE =
  "relative inline-flex h-10 items-center justify-center gap-2.5 rounded-md px-4 text-[14px] font-medium tracking-[0.01em] transition-[opacity,background-color,border-color,transform] duration-[120ms] outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:cursor-not-allowed disabled:opacity-50 active:translate-y-px";

const VARIANTS: Record<Variant, string> = {
  primary: "bg-accent text-on-accent hover:opacity-[0.88] active:opacity-[0.76]",
  secondary:
    "border border-border bg-surface-raised text-text-primary font-[450] hover:border-border-active hover:bg-hover-row",
  ghost: "text-text-secondary hover:bg-hover-row hover:text-text-primary",
  danger: "bg-danger text-white hover:opacity-[0.88] active:opacity-[0.76]",
};

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  full?: boolean;
  loading?: boolean;
  /** Leading element (e.g. an OAuth provider icon). */
  icon?: ReactNode;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", full, loading, icon, children, disabled, ...props }, ref) => {
    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={cn(BASE, VARIANTS[variant], full && "w-full", className)}
        {...props}
      >
        {loading ? (
          <span className="inline-flex items-center gap-1" aria-label="Loading">
            <span className="loading-dot h-1 w-1 rounded-full bg-current" />
            <span className="loading-dot h-1 w-1 rounded-full bg-current [animation-delay:160ms]" />
            <span className="loading-dot h-1 w-1 rounded-full bg-current [animation-delay:320ms]" />
          </span>
        ) : (
          <>
            {icon}
            {children}
          </>
        )}
      </button>
    );
  }
);
Button.displayName = "Button";
