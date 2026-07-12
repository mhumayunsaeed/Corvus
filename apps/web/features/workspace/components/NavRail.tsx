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
      className="fixed inset-x-0 bottom-0 z-40 flex h-14 shrink-0 flex-row items-center bg-bg-deep px-2 shadow-[0_-1px_rgb(var(--c-border-subtle))] md:static md:h-full md:w-14 md:flex-col md:py-3 md:shadow-[inset_-1px_0_rgb(var(--c-border-subtle))]"
    >
      <ItemLink
        href={homeHref}
        onPress={onOpenHome}
        label="Home"
        active={homeActive}
        className={cn(
          "relative mb-0 flex h-10 w-10 items-center justify-center md:mb-1",
          "transition-[border-radius,background-color,color] duration-200",
          homeActive
            ? "rounded-[10px] bg-accent-soft text-accent after:absolute after:bottom-[-7px] after:h-0.5 after:w-5 after:rounded-full after:bg-accent md:after:bottom-auto md:after:left-[-7px] md:after:h-5 md:after:w-0.5"
            : "rounded-[10px] text-text-secondary hover:bg-surface-raised hover:text-text-primary"
        )}
      >
        <Home size={17} />
      </ItemLink>
      <div className="mx-2 h-8 w-px shrink-0 bg-border-subtle md:mx-0 md:mb-2 md:h-px md:w-8" />

      <div className="flex flex-1 flex-row items-center gap-1 overflow-x-auto scrollbar-none md:flex-col md:overflow-x-hidden md:overflow-y-auto">
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
                "relative flex h-10 w-10 shrink-0 items-center justify-center text-[14px] font-medium text-text-primary",
                "transition-[border-radius,background-color] duration-200",
                active
                  ? "rounded-[10px] bg-accent-soft after:absolute after:bottom-[-7px] after:h-0.5 after:w-5 after:rounded-full after:bg-accent md:after:bottom-auto md:after:left-[-7px] md:after:h-5 md:after:w-0.5"
                  : "rounded-[10px] bg-surface-raised hover:bg-surface-overlay"
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

      <div className="ml-2 flex flex-row items-center gap-1 md:ml-0 md:mt-2 md:flex-col md:gap-2 md:pt-2">
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
