"use client";

import { cn } from "@corvus/ui";
import { Search, Plus } from "lucide-react";
import { Avatar } from "@/components/ui";
import { ItemLink } from "./ItemLink";
import { UserDock } from "./UserDock";
import type { DMSummary, MemberRef, Presence } from "./types";

const DOT: Record<Presence, string> = {
  online: "bg-status-online",
  idle: "bg-status-idle",
  dnd: "bg-status-dnd",
  offline: "bg-text-faint",
};

/**
 * DM panel (brief §Direct Messages). Replaces the SpacePanel when DMs are
 * active. DM avatars use a 6px radius (vs the channel feed's 8px).
 */
export function DMPanel({
  conversations,
  activeId,
  onSelect,
  onNewConversation,
  conversationHref,
  me,
  muted,
  deafened,
  onToggleMute,
  onToggleDeafen,
  onOpenSettings,
  onSetStatus,
}: {
  conversations: DMSummary[];
  activeId?: string;
  onSelect?: (id: string) => void;
  /** Open the new DM / group DM dialog. */
  onNewConversation?: () => void;
  /** Real href per conversation (routed shell) — rows render as anchors. */
  conversationHref?: (id: string) => string;
  /** Personal dock (same as the space sidebar). */
  me?: MemberRef & { statusText?: string };
  muted?: boolean;
  deafened?: boolean;
  onToggleMute?: () => void;
  onToggleDeafen?: () => void;
  onOpenSettings?: () => void;
  onSetStatus?: (presence: Presence, text?: string) => void;
}) {
  return (
    <aside className="flex h-full w-[260px] shrink-0 flex-col overflow-hidden border-r border-border bg-surface-raised">
      <div className="px-4 pb-2 pt-3.5">
        <div className="flex items-center justify-between">
          <h2 className="text-[15px] font-semibold text-text-primary">Direct Messages</h2>
          <button
            type="button"
            aria-label="New conversation"
            title="New DM or group"
            onClick={onNewConversation}
            className="flex h-6 w-6 items-center justify-center rounded-sm text-text-faint transition-colors hover:bg-hover-row hover:text-text-primary"
          >
            <Plus size={15} />
          </button>
        </div>
        <div className="mt-3 flex h-8 items-center gap-2 rounded-md border border-border bg-surface-overlay px-2.5">
          <Search size={14} className="text-text-faint" />
          <input
            placeholder="Search conversations…"
            className="w-full bg-transparent text-[13px] text-text-primary outline-none placeholder:text-text-muted"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto py-1">
        {conversations.map((c) => (
          <ItemLink
            key={c.id}
            href={conversationHref?.(c.id)}
            onPress={() => onSelect?.(c.id)}
            active={c.id === activeId}
            current={c.id === activeId}
            className={cn(
              "mx-2 flex h-11 w-[calc(100%-16px)] items-center gap-2.5 rounded-sm px-2 transition-colors",
              c.id === activeId ? "bg-surface-overlay" : "hover:bg-hover-row"
            )}
          >
            {c.group && c.group.length > 0 ? (
              <GroupStack members={c.group} />
            ) : (
              <div className="relative">
                <Avatar src={c.avatar} name={c.name} size={28} radius={6} />
                {c.presence && (
                  <span
                    className={cn(
                      "absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-surface-raised",
                      DOT[c.presence]
                    )}
                  />
                )}
              </div>
            )}
            <span className="min-w-0 flex-1 truncate text-left text-[14px] font-[450] text-text-primary">
              {c.name}
            </span>
            {c.unreadCount ? (
              <span className="flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-accent px-1.5 font-mono text-[11px] font-semibold text-on-accent">
                {c.unreadCount}
              </span>
            ) : c.lastLabel ? (
              <span className="font-mono text-[11px] text-text-faint">{c.lastLabel}</span>
            ) : null}
          </ItemLink>
        ))}
      </div>

      {me && (
        <UserDock
          me={me}
          muted={muted}
          deafened={deafened}
          onToggleMute={onToggleMute}
          onToggleDeafen={onToggleDeafen}
          onOpenSettings={onOpenSettings}
          onSetStatus={onSetStatus}
        />
      )}
    </aside>
  );
}

function GroupStack({ members }: { members: { id: string; name: string; avatar?: string | null }[] }) {
  return (
    <div className="flex w-7 shrink-0 items-center">
      {members.slice(0, 2).map((m, i) => (
        <div key={m.id} className={cn("rounded-full border-2 border-surface-raised", i > 0 && "-ml-2.5")}>
          <Avatar src={m.avatar} name={m.name} size={20} shape="circle" />
        </div>
      ))}
    </div>
  );
}
