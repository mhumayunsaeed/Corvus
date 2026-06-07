import { type HTMLAttributes } from "react";
import { cn } from "../lib/utils";

export type SkeletonProps = HTMLAttributes<HTMLDivElement>;

/** Token-styled loading placeholder. Pair with the global `.shimmer` keyframe. */
export function Skeleton({ className, ...props }: SkeletonProps) {
  return (
    <div
      className={cn(
        "animate-pulse rounded-md bg-surface-raised",
        className
      )}
      {...props}
    />
  );
}
