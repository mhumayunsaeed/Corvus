import { forwardRef, type InputHTMLAttributes } from "react";
import { cn } from "../lib/utils";

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  error?: boolean;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, error, ...props }, ref) => {
    return (
      <input
        className={cn(
          "h-10 w-full rounded bg-surface-raised px-[14px] py-3 text-body text-text-primary",
          "border border-border placeholder:text-text-muted",
          "transition-all duration-150",
          "focus:outline-none focus:ring-2 focus:ring-accent-violet focus:border-transparent",
          error && "border-danger focus:ring-danger",
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);
Input.displayName = "Input";
