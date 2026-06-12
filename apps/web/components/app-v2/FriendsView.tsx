"use client";

import { useState } from "react";
import { cn } from "@corvus/ui";
import { MessageSquare, Phone, Check, X, UserPlus } from "lucide-react";
import { Avatar } from "@/components/ui";
import type { FriendEntry, Presence } from "./types";

type FriendsTab = "online" | "all" | "pending" | "add";

const TABS: { id: FriendsTab; label: string }[] = [
  { id: "online", label: "Online" },
  { id: "all", label: "All" },
  { id: "pending", label: "Pending" },
  { id: "add", label: "Add friend" },
];

const DOT: Record<Presence, string> = {
  online: "bg-status-online",
  idle: "bg-status-idle",
  dnd: "bg-status-dnd",
  offline: "bg-text-faint",
};

const PRESENCE_LABEL: Record<Presence, string> = {
  online: "online",
  idle: "idle",
  dnd: "do not disturb",
  offline: "offline",
};

/**
 * Friends (brief §Home) — typographic rows on 1px rules, not cards. Square
 * avatars, mono presence text, quiet inline actions. Tabs share the system
 * tab pattern.
 */
export function FriendsView({
  friends,
  onMessage,
  onCall,
  onSendRequest,
  onAccept,
  onDecline,
  embedded,
}: {
  friends: FriendEntry[];
  onMessage?: (id: string) => void;
  onCall?: (id: string) => void;
  /** Send a friend request by exact username — instant, optimistic. */
  onSendRequest?: (username: string) => void;
  onAccept?: (id: string) => void;
  /** Decline an incoming request or cancel an outgoing one. */
  onDecline?: (id: string) => void;
  /** When embedded (Home tab) the view skips its own header. */
  embedded?: boolean;
}) {
  const [tab, setTab] = useState<FriendsTab>("online");
  const [query, setQuery] = useState("");

  const sendRequest = () => {
    const username = query.trim();
    if (!username) return;
    onSendRequest?.(username);
    setQuery("");
    setTab("pending");
  };

  const accepted = friends.filter((f) => !f.pending);
  const visible =
    tab === "online"
      ? accepted.filter((f) => f.presence !== "offline")
      : tab === "all"
        ? accepted
        : friends.filter((f) => f.pending);

  return (
    <div className="flex h-full min-w-0 flex-1 flex-col">
      {!embedded && (
        <header className="flex h-12 shrink-0 items-center gap-3 border-b border-border px-4">
          <h1 className="text-[15px] font-semibold text-text-primary">Friends</h1>
        </header>
      )}

      <div className="flex shrink-0 items-center gap-1 border-b border-border px-4 py-2">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            data-active={tab === t.id}
            onClick={() => setTab(t.id)}
            className={cn(
              "h-7 rounded px-3 text-[13px] transition-colors",
              tab === t.id
                ? "bg-surface-overlay text-text-primary"
                : "text-text-secondary hover:bg-hover-row hover:text-text-primary"
            )}
          >
            {t.label}
            {t.id === "pending" && friends.some((f) => f.pending === "incoming") && (
              <span className="ml-1.5 inline-block h-1.5 w-1.5 rounded-full bg-accent align-middle" />
            )}
          </button>
        ))}
      </div>

      {tab === "add" ? (
        <div className="mx-auto w-full max-w-[520px] px-4 py-10">
          <p className="font-mono text-[11px] uppercase tracking-[0.08em] text-text-muted">
            Add a friend
          </p>
          <p className="mt-2 text-[13px] leading-[1.6] text-text-secondary">
            Send a request with their exact username. They&apos;ll see it under Pending.
          </p>
          <div className="mt-4 flex gap-2">
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") sendRequest();
              }}
              placeholder="username"
              className="h-10 min-w-0 flex-1 rounded-md border border-border bg-surface-input px-3 font-mono text-[13px] text-text-primary outline-none transition-colors placeholder:text-text-faint focus:border-border-active"
            />
            <button
              type="button"
              disabled={!query.trim()}
              onClick={sendRequest}
              className={cn(
                "flex h-10 shrink-0 items-center gap-2 rounded-md px-4 text-[13px] font-medium transition-colors",
                query.trim()
                  ? "bg-accent text-on-accent hover:bg-accent-violet-bright"
                  : "cursor-not-allowed bg-surface-overlay text-text-faint"
              )}
            >
              <UserPlus size={14} /> Send request
            </button>
          </div>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto">
          <p className="px-4 pb-1 pt-4 font-mono text-[11px] uppercase tracking-[0.08em] text-text-muted">
            {tab === "pending" ? "Pending" : tab === "online" ? "Online" : "All friends"} —{" "}
            {visible.length}
          </p>
          {visible.map((f) => (
            <div
              key={f.id}
              className="group mx-2 flex h-[52px] items-center gap-3 rounded-sm border-b border-border px-2 transition-colors last:border-b-0 hover:bg-hover-row"
            >
              <div className="relative">
                <Avatar src={f.avatar} name={f.name} size={32} radius={8} />
                <span
                  className={cn(
                    "absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-background",
                    DOT[f.presence]
                  )}
                />
              </div>
              <div className="min-w-0 flex-1 leading-tight">
                <p className="truncate text-[14px] font-medium text-text-primary">{f.name}</p>
                <p className="truncate font-mono text-[11px] text-text-muted">
                  {f.pending
                    ? f.pending === "incoming"
                      ? "incoming request"
                      : "request sent"
                    : f.status ?? PRESENCE_LABEL[f.presence]}
                </p>
              </div>

              <div className="hidden items-center gap-1 group-hover:flex">
                {f.pending === "incoming" ? (
                  <>
                    <RowAction label="Accept" tone="success" onClick={() => onAccept?.(f.id)}>
                      <Check size={15} />
                    </RowAction>
                    <RowAction label="Decline" tone="danger" onClick={() => onDecline?.(f.id)}>
                      <X size={15} />
                    </RowAction>
                  </>
                ) : f.pending === "outgoing" ? (
                  <RowAction label="Cancel request" tone="danger" onClick={() => onDecline?.(f.id)}>
                    <X size={15} />
                  </RowAction>
                ) : (
                  <>
                    <RowAction label="Message" onClick={() => onMessage?.(f.id)}>
                      <MessageSquare size={15} />
                    </RowAction>
                    <RowAction label="Call" onClick={() => onCall?.(f.id)}>
                      <Phone size={15} />
                    </RowAction>
                  </>
                )}
              </div>
            </div>
          ))}
          {visible.length === 0 && (
            <p className="px-4 py-8 text-[13px] text-text-muted">
              {tab === "online" ? "No one's online right now." : "Nothing here yet."}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

function RowAction({
  label,
  tone,
  onClick,
  children,
}: {
  label: string;
  tone?: "success" | "danger";
  onClick?: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      className={cn(
        "flex h-8 w-8 items-center justify-center rounded-sm border border-border bg-surface-raised transition-colors",
        tone === "success"
          ? "text-success hover:bg-success/10"
          : tone === "danger"
            ? "text-danger hover:bg-danger/10"
            : "text-text-secondary hover:bg-hover-row hover:text-text-primary"
      )}
    >
      {children}
    </button>
  );
}
