"use client";

import { useState } from "react";
import { cn } from "@corvus/ui";
import { ChevronDown, Plus, Mic, Headphones, Settings } from "lucide-react";
import { Avatar, ChannelGlyph } from "@/components/ui";
import type { ChannelSection, ChannelSummary, MemberRef, Presence } from "./types";

const PRESENCE_DOT: Record<Presence, string> = {
  online: "bg-status-online",
  idle: "bg-status-idle",
  dnd: "bg-status-dnd",
  offline: "bg-text-faint",
};

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
}: {
  spaceName: string;
  sections: ChannelSection[];
  activeChannelId?: string;
  me: MemberRef & { statusText?: string };
  onSelectChannel?: (id: string) => void;
  onOpenSpaceSettings?: () => void;
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
          <Section key={section.id} section={section} activeChannelId={activeChannelId} onSelect={onSelectChannel} />
        ))}
      </div>

      {/* Footer — personal dock */}
      <div className="flex h-[52px] shrink-0 items-center gap-2.5 border-t border-border bg-surface-raised px-2.5">
        <div className="relative">
          <Avatar src={me.avatar} name={me.name} size={28} shape="circle" />
          {me.presence && (
            <span
              className={cn(
                "absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-surface-raised",
                PRESENCE_DOT[me.presence]
              )}
            />
          )}
        </div>
        <div className="min-w-0 flex-1 leading-tight">
          <div className="truncate text-[13px] font-medium text-text-primary">{me.name}</div>
          <div className="truncate font-mono text-[11px] text-text-muted">
            {me.statusText ?? me.presence ?? "online"}
          </div>
        </div>
        <div className="flex items-center gap-0.5 text-text-faint">
          <DockIcon label="Mute"><Mic size={16} /></DockIcon>
          <DockIcon label="Deafen"><Headphones size={16} /></DockIcon>
          <DockIcon label="User settings"><Settings size={16} /></DockIcon>
        </div>
      </div>
    </aside>
  );
}

function Section({
  section,
  activeChannelId,
  onSelect,
}: {
  section: ChannelSection;
  activeChannelId?: string;
  onSelect?: (id: string) => void;
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
        />
      ))}
    </div>
  );
}

function ChannelRow({
  channel,
  active,
  onSelect,
}: {
  channel: ChannelSummary;
  active?: boolean;
  onSelect?: (id: string) => void;
}) {
  return (
    <div className="relative">
      {channel.unread && !active && (
        <span className="absolute left-0 top-1/2 h-4 w-[3px] -translate-y-1/2 rounded-r bg-accent" />
      )}
      <button
        type="button"
        data-active={active}
        onClick={() => onSelect?.(channel.id)}
        className={cn(
          "mx-2 flex h-[30px] w-[calc(100%-16px)] items-center gap-2 rounded-sm px-2 text-[14px] transition-colors duration-100",
          active
            ? "bg-surface-overlay font-medium text-text-primary"
            : channel.unread
              ? "font-medium text-text-primary hover:bg-hover-row"
              : "text-text-secondary hover:bg-hover-row hover:text-text-primary"
        )}
      >
        <ChannelGlyph type={channel.type} size={10} />
        <span className="truncate">{channel.name}</span>
      </button>

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

function DockIcon({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-label={label}
      className="flex h-7 w-7 items-center justify-center rounded-sm transition-colors hover:bg-hover-row hover:text-text-primary"
    >
      {children}
    </button>
  );
}
