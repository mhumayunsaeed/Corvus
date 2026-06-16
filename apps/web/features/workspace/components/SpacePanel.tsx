"use client";

import { useState } from "react";
import { cn } from "@corvus/ui";
import { ChevronDown, Plus } from "lucide-react";
import { Avatar, ChannelGlyph } from "@/shared/components/ui";
import { ItemLink } from "./ItemLink";
import { UserDock } from "./UserDock";
import type { ChannelSection, ChannelSummary, MemberRef, Presence } from "./types";

/**
 * 260px space sidebar (brief §SpacePanel). Real header + typographic section
 * labels + channel rows with monospace type glyphs. Footer is the personal
 * dock (the one circular avatar).
 */
export function SpacePanel({
  spaceName,
  sections,
  activeChannelId,
  me,
  onSelectChannel,
  onOpenSpaceSettings,
  onAddChannel,
  onAddSection,
  channelHref,
  muted,
  deafened,
  onToggleMute,
  onToggleDeafen,
  onSetStatus,
}: {
  spaceName: string;
  sections: ChannelSection[];
  activeChannelId?: string;
  me: MemberRef & { statusText?: string };
  onSelectChannel?: (id: string) => void;
  onOpenSpaceSettings?: () => void;
  /** Open the add-channel dialog for a section. */
  onAddChannel?: (sectionId: string) => void;
  /** Open the add-section dialog. */
  onAddSection?: () => void;
  /** Real href per channel (routed shell) — rows render as anchors. */
  channelHref?: (id: string) => string;
  /** Self mute/deafen — carried into the next call you join. */
  muted?: boolean;
  deafened?: boolean;
  onToggleMute?: () => void;
  onToggleDeafen?: () => void;
  /** Presence + custom status from the dock's status card. */
  onSetStatus?: (presence: Presence, text?: string) => void;
}) {
  return (
    <aside className="flex h-full w-[260px] shrink-0 flex-col overflow-hidden border-r border-border bg-surface-raised">
      {/* Header */}
      <button
        type="button"
        onClick={onOpenSpaceSettings}
        className="flex h-12 shrink-0 items-center justify-between border-b border-border px-4 text-left transition-colors hover:bg-hover-row"
      >
        <span className="truncate text-[15px] font-semibold text-text-primary">{spaceName}</span>
        <ChevronDown size={16} className="text-text-faint" />
      </button>

      {/* Channels */}
      <div className="flex-1 overflow-y-auto py-2">
        {sections.map((section) => (
          <Section
            key={section.id}
            section={section}
            activeChannelId={activeChannelId}
            onSelect={onSelectChannel}
            onAddChannel={onAddChannel}
            hrefFor={channelHref}
          />
        ))}
        {onAddSection && (
          <button
            type="button"
            onClick={onAddSection}
            className="mx-2 mt-2 flex h-8 w-[calc(100%-16px)] items-center gap-2 rounded-sm px-2 text-[13px] text-text-faint transition-colors hover:bg-hover-row hover:text-text-primary"
          >
            <Plus size={13} />
            Add section
          </button>
        )}
      </div>

      {/* Footer — personal dock */}
      <UserDock
        me={me}
        muted={muted}
        deafened={deafened}
        onToggleMute={onToggleMute}
        onToggleDeafen={onToggleDeafen}
        onOpenSettings={onOpenSpaceSettings}
        onSetStatus={onSetStatus}
      />
    </aside>
  );
}

function Section({
  section,
  activeChannelId,
  onSelect,
  onAddChannel,
  hrefFor,
}: {
  section: ChannelSection;
  activeChannelId?: string;
  onSelect?: (id: string) => void;
  onAddChannel?: (sectionId: string) => void;
  hrefFor?: (id: string) => string;
}) {
  const [collapsed, setCollapsed] = useState(false);
  return (
    <div className="mb-1">
      <div className="group flex items-center justify-between px-2.5 pb-1 pt-4">
        <button
          type="button"
          onClick={() => setCollapsed((v) => !v)}
          className="font-mono text-[11px] font-medium uppercase tracking-[0.08em] text-text-muted transition-colors hover:text-text-secondary"
        >
          {section.name}
        </button>
        <button
          type="button"
          aria-label={`Add channel to ${section.name}`}
          title="Add channel"
          onClick={() => onAddChannel?.(section.id)}
          className="text-text-faint opacity-0 transition-opacity hover:text-text-primary group-hover:opacity-100"
        >
          <Plus size={14} />
        </button>
      </div>
      {!collapsed && section.channels.map((ch) => (
        <ChannelRow
          key={ch.id}
          channel={ch}
          active={ch.id === activeChannelId}
          onSelect={onSelect}
          href={hrefFor?.(ch.id)}
        />
      ))}
    </div>
  );
}

function ChannelRow({
  channel,
  active,
  onSelect,
  href,
}: {
  channel: ChannelSummary;
  active?: boolean;
  onSelect?: (id: string) => void;
  href?: string;
}) {
  return (
    <div className="relative">
      {channel.unread && !active && (
        <span className="absolute left-0 top-1/2 h-4 w-[3px] -translate-y-1/2 rounded-r bg-accent" />
      )}
      <ItemLink
        href={href}
        onPress={() => onSelect?.(channel.id)}
        active={active}
        current={active}
        className={cn(
          "mx-2 flex h-[30px] w-[calc(100%-16px)] items-center gap-2 rounded-sm px-2 text-[14px] transition-colors duration-100",
          active
            ? "bg-surface-overlay font-medium text-text-primary"
            : channel.unread
              ? "font-medium text-text-primary hover:bg-hover-row"
              : "text-text-secondary hover:bg-hover-row hover:text-text-primary"
        )}
      >
        <ChannelGlyph type={channel.type} size={14} />
        <span className="truncate">{channel.name}</span>
      </ItemLink>

      {/* Voice participants inline */}
      {channel.type === "voice" && channel.participants && channel.participants.length > 0 && (
        <div className="mb-1 ml-7 mt-0.5 flex flex-col gap-1">
          {channel.participants.slice(0, 3).map((p) => (
            <div key={p.id} className="flex items-center gap-2">
              <Avatar src={p.avatar} name={p.name} size={16} radius={4} />
              <span className="truncate font-mono text-[11px] text-text-muted">{p.name}</span>
            </div>
          ))}
          {channel.participants.length > 3 && (
            <span className="ml-[26px] font-mono text-[11px] text-text-faint">
              +{channel.participants.length - 3} more
            </span>
          )}
        </div>
      )}
    </div>
  );
}

