import { forwardRef, type ButtonHTMLAttributes } from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "../lib/utils";

const iconButtonVariants = cva(
  "inline-flex items-center justify-center rounded-lg transition-colors duration-fast focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        ghost:
          "text-text-muted hover:bg-hover-row-strong hover:text-text-secondary",
        soft: "bg-surface-raised text-text-secondary hover:bg-hover-row-strong",
        accent: "bg-accent-soft text-accent hover:bg-accent/20",
        danger: "text-danger hover:bg-danger/10",
      },
      size: {
        sm: "h-7 w-7",
        md: "h-8 w-8",
        lg: "h-9 w-9",
      },
    },
    defaultVariants: {
      variant: "ghost",
      size: "md",
    },
  }
);

export interface IconButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof iconButtonVariants> {}

/** Square icon-only button with consistent sizing + focus ring. */
export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(
  ({ className, variant, size, type = "button", ...props }, ref) => {
    return (
      <button
        ref={ref}
        type={type}
        className={cn(iconButtonVariants({ variant, size }), className)}
        {...props}
      />
    );
  }
);
IconButton.displayName = "IconButton";

export { iconButtonVariants };
