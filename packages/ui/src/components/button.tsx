import { forwardRef, type ButtonHTMLAttributes } from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "../lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center font-medium transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-violet focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-50 active:scale-[0.97]",
  {
    variants: {
      variant: {
        primary:
          "bg-accent-violet text-white hover:bg-accent-violet/90 shadow-glow",
        secondary:
          "bg-surface-raised text-text-primary border border-border hover:bg-surface-raised/80",
        ghost: "text-text-muted hover:text-text-primary hover:bg-surface-raised",
        danger: "bg-danger text-white hover:bg-danger/90",
        outline:
          "border border-accent-violet text-accent-violet hover:bg-accent-violet/10",
      },
      size: {
        sm: "h-8 px-3 text-micro rounded-sm",
        md: "h-10 px-4 text-body rounded",
        lg: "h-12 px-6 text-emphasis rounded-md",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "md",
    },
  }
);

export interface ButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => {
    return (
      <button
        className={cn(buttonVariants({ variant, size }), className)}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

export { buttonVariants };
