import { type HTMLAttributes } from "react";
import { cn } from "../lib/utils";

export type KbdProps = HTMLAttributes<HTMLElement>;

/** Keyboard-key chip — for shortcuts and the command palette. */
export function Kbd({ className, children, ...props }: KbdProps) {
  return (
    <kbd
      className={cn(
        "inline-flex h-5 min-w-5 items-center justify-center rounded-md border border-border-highlight bg-surface px-1.5 text-[10px] font-medium text-text-muted",
        className
      )}
      {...props}
    >
      {children}
    </kbd>
  );
}
