import { forwardRef, useId, type InputHTMLAttributes, type ReactNode } from "react";
import { cn } from "@corvus/ui";

/**
 * The pattern-setting input for the whole app (brief §Login).
 * 40px · bg-raised · 1px border · amber focus ring · no floating labels.
 * Label is 11px uppercase 0.08em above the field.
 */
export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string | null;
  hint?: string;
  /** Element pinned to the right edge of the field (e.g. availability check). */
  adornment?: ReactNode;
  /** Right-aligned control rendered next to the label (e.g. "Forgot password?"). */
  labelAction?: ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, hint, adornment, labelAction, className, id, ...props }, ref) => {
    const generated = useId();
    const inputId = id ?? generated;
    const messageId = `${inputId}-message`;

    return (
      <div className="w-full">
        {(label || labelAction) && (
          <div className="mb-1.5 flex items-center justify-between">
            {label && (
              <label
                htmlFor={inputId}
                className="text-[11px] font-medium uppercase tracking-[0.08em] text-text-secondary"
              >
                {label}
              </label>
            )}
            {labelAction}
          </div>
        )}
        <div className="relative">
          <input
            {...props}
            id={inputId}
            ref={ref}
            aria-invalid={error ? true : undefined}
            aria-describedby={error || hint ? messageId : props["aria-describedby"]}
            className={cn(
              "h-10 w-full rounded-md border bg-surface-raised px-3 text-[14px] text-text-primary",
              "placeholder:text-text-muted",
              "transition-[border-color,box-shadow] duration-150 outline-none",
              "hover:border-border-active",
              "focus:border-accent focus:shadow-focus-accent",
              error
                ? "border-danger focus:border-danger focus:shadow-[0_0_0_3px_rgba(239,68,68,0.18)]"
                : "border-border",
              adornment && "pr-10",
              className
            )}
          />
          {adornment && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2">{adornment}</div>
          )}
        </div>
        {error ? (
          <p id={messageId} className="mt-1.5 text-[12px] text-danger">{error}</p>
        ) : hint ? (
          <p id={messageId} className="mt-1.5 text-[12px] text-text-muted">{hint}</p>
        ) : null}
      </div>
    );
  }
);
Input.displayName = "Input";
