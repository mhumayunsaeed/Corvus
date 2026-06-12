"use client";

import { cn } from "@corvus/ui";
import { MessageSquare, Plus, Settings, Home } from "lucide-react";
import { ItemLink } from "./ItemLink";
import type { SpaceSummary } from "./types";

/**
 * 56px nav rail (brief §NavRail). Home, then space icons. Active state is a
 * border + subtle radius morph — no Discord pill, no blob. Unread is a 6px dot.
 */
export function NavRail({
  spaces,
  activeSpaceId,
  homeActive,
  dmsActive,
  dmsUnread,
  onOpenHome,
  onSelectSpace,
  onOpenDMs,
  onAddSpace,
  onOpenSettings,
  homeHref,
  dmsHref,
  spaceHref,
}: {
  spaces: SpaceSummary[];
  activeSpaceId?: string;
  homeActive?: boolean;
  dmsActive?: boolean;
  dmsUnread?: boolean;
  onOpenHome?: () => void;
  onSelectSpace?: (id: string) => void;
  onOpenDMs?: () => void;
  onAddSpace?: () => void;
  onOpenSettings?: () => void;
  /** Real hrefs (routed shell) — items render as anchors when provided. */
  homeHref?: string;
  dmsHref?: string;
  spaceHref?: (id: string) => string;
}) {
  return (
    <nav
      aria-label="Spaces"
      className="flex h-full w-14 shrink-0 flex-col items-center border-r border-border bg-background py-3"
    >
      <ItemLink
        href={homeHref}
        onPress={onOpenHome}
        label="Home"
        active={homeActive}
        className={cn(
          "mb-1 flex h-10 w-10 items-center justify-center border",
          "transition-[border-radius,background-color,border-color,color] duration-200",
          homeActive
            ? "rounded-[14px] border-accent bg-accent-soft text-text-primary"
            : "rounded-[10px] border-border bg-surface-raised text-text-secondary hover:rounded-[12px] hover:bg-surface-overlay hover:text-text-primary"
        )}
      >
        <Home size={17} />
      </ItemLink>
      <div className="mb-2 h-px w-8 shrink-0 bg-border" />

      <div className="flex flex-1 flex-col items-center gap-1 overflow-y-auto scrollbar-none">
        {spaces.map((space) => {
          const active = space.id === activeSpaceId && !dmsActive && !homeActive;
          return (
            <ItemLink
              key={space.id}
              href={spaceHref?.(space.id)}
              onPress={() => onSelectSpace?.(space.id)}
              label={space.name}
              current={active}
              active={active}
              className={cn(
                "relative flex h-10 w-10 items-center justify-center border text-[14px] font-medium text-text-primary",
                "transition-[border-radius,background-color,border-color] duration-200",
                active
                  ? "rounded-[14px] border-accent bg-accent-soft"
                  : "rounded-[10px] border-border bg-surface-raised hover:rounded-[12px] hover:bg-surface-overlay"
              )}
            >
              {space.icon ? (
                <img src={space.icon} alt="" className="h-full w-full rounded-[inherit] object-cover" />
              ) : (
                <span aria-hidden>{space.name[0]?.toUpperCase()}</span>
              )}
              {space.unread && !active && (
                <span className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-accent" />
              )}
            </ItemLink>
          );
        })}
      </div>

      <div className="mt-2 flex flex-col items-center gap-3 pt-2">
        <RailIcon label="Direct messages" active={dmsActive} unread={dmsUnread} href={dmsHref} onClick={onOpenDMs}>
          <MessageSquare size={20} />
        </RailIcon>
        <RailIcon label="Add a space" onClick={onAddSpace}>
          <Plus size={20} />
        </RailIcon>
        <RailIcon label="Settings" onClick={onOpenSettings}>
          <Settings size={20} />
        </RailIcon>
      </div>
    </nav>
  );
}

function RailIcon({
  label,
  active,
  unread,
  href,
  onClick,
  children,
}: {
  label: string;
  active?: boolean;
  unread?: boolean;
  href?: string;
  onClick?: () => void;
  children: React.ReactNode;
}) {
  return (
    <ItemLink
      href={href}
      onPress={onClick}
      label={label}
      active={active}
      className={cn(
        "relative flex h-9 w-9 items-center justify-center transition-colors",
        active ? "text-text-primary" : "text-text-faint hover:text-text-primary"
      )}
    >
      {children}
      {unread && (
        <span className="absolute right-1 top-1 h-1.5 w-1.5 rounded-full bg-accent" />
      )}
    </ItemLink>
  );
}
