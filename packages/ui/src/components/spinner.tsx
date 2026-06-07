import { cn } from "../lib/utils";

export interface SpinnerProps {
  className?: string;
  /** Diameter in px. */
  size?: number;
}

/** Minimal accessible loading spinner using the accent token. */
export function Spinner({ className, size = 18 }: SpinnerProps) {
  return (
    <span
      role="status"
      aria-label="Loading"
      className={cn("inline-block animate-spin", className)}
      style={{ width: size, height: size }}
    >
      <svg viewBox="0 0 24 24" fill="none" width={size} height={size}>
        <circle
          cx="12"
          cy="12"
          r="9"
          stroke="rgb(var(--c-border-highlight))"
          strokeWidth="2.5"
        />
        <path
          d="M21 12a9 9 0 0 0-9-9"
          stroke="rgb(var(--c-accent-violet))"
          strokeWidth="2.5"
          strokeLinecap="round"
        />
      </svg>
    </span>
  );
}
