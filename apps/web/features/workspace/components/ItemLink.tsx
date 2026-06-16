"use client";

import Link from "next/link";
import type { MouseEvent, ReactNode } from "react";

/**
 * Button-or-anchor nav item. With an `href` it renders a real link — so
 * middle-click, ctrl+click, and copy-address work — while plain activation
 * still goes through `onPress` so the shell controls its own routing.
 */
export function ItemLink({
  href,
  onPress,
  className,
  label,
  current,
  active,
  title,
  children,
}: {
  href?: string;
  onPress?: () => void;
  className?: string;
  /** aria-label */
  label?: string;
  /** aria-current="true" */
  current?: boolean;
  /** data-active styling hook */
  active?: boolean;
  title?: string;
  children: ReactNode;
}) {
  const shared = {
    className,
    title,
    "aria-label": label,
    "aria-current": current ? ("true" as const) : undefined,
    "data-active": active,
  };

  if (!href) {
    return (
      <button type="button" onClick={onPress} {...shared}>
        {children}
      </button>
    );
  }

  const onClick = (e: MouseEvent<HTMLAnchorElement>) => {
    // Modified and middle clicks keep native anchor behavior (new tab etc.).
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) {
      return;
    }
    e.preventDefault();
    onPress?.();
  };

  return (
    <Link href={href} onClick={onClick} {...shared}>
      {children}
    </Link>
  );
}
