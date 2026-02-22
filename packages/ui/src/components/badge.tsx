import { type HTMLAttributes } from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "../lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full px-2 py-0.5 text-micro font-medium",
  {
    variants: {
      variant: {
        default: "bg-accent-violet/20 text-accent-violet",
        success: "bg-success/20 text-success",
        danger: "bg-danger/20 text-danger",
        muted: "bg-border text-text-muted",
        notification: "bg-danger text-white min-w-[18px] justify-center",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export interface BadgeProps
  extends HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <span className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}
