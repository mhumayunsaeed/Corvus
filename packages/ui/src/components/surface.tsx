import { forwardRef, type HTMLAttributes } from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "../lib/utils";

const surfaceVariants = cva("rounded-xl border", {
  variants: {
    elevation: {
      flat: "border-border-subtle bg-surface",
      e1: "border-border-subtle bg-surface shadow-e1",
      e2: "border-border-highlight bg-surface-overlay shadow-e2",
      e3: "border-border-highlight bg-surface-overlay shadow-e3",
    },
    padding: {
      none: "",
      sm: "p-3",
      md: "p-4",
      lg: "p-6",
    },
  },
  defaultVariants: {
    elevation: "e1",
    padding: "md",
  },
});

export interface SurfaceProps
  extends HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof surfaceVariants> {}

/** Elevation-aware card surface — the building block for the new design. */
export const Surface = forwardRef<HTMLDivElement, SurfaceProps>(
  ({ className, elevation, padding, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(surfaceVariants({ elevation, padding }), className)}
        {...props}
      />
    );
  }
);
Surface.displayName = "Surface";

export { surfaceVariants };
