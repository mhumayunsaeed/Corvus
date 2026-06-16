"use client";

import { useEffect, useState } from "react";
import { cn } from "@corvus/ui";
import { MessageSquare, Phone, Check, X, UserPlus, Loader2 } from "lucide-react";
import { Avatar } from "@/shared/components/ui";
import type { FriendSearchResult } from "@/shared/lib/api";
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
  onSearchUsers,
  onAccept,
  onDecline,
  embedded,
}: {
  friends: FriendEntry[];
  onMessage?: (id: string) => void;
  onCall?: (id: string) => void;
  /** Send a friend request by exact username — instant, optimistic. */
  onSendRequest?: (target: string) => void;
  onSearchUsers?: (query: string) => Promise<FriendSearchResult[]>;
  onAccept?: (id: string) => void;
  /** Decline an incoming request or cancel an outgoing one. */
  onDecline?: (id: string) => void;
  /** When embedded (Home tab) the view skips its own header. */
  embedded?: boolean;
}) {
  const [tab, setTab] = useState<FriendsTab>("online");
  const [query, setQuery] = useState("");
  const [searchResults, setSearchResults] = useState<FriendSearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  useEffect(() => {
    if (tab !== "add" || !onSearchUsers) {
      setSearchResults([]);
      setSearching(false);
      setSearchError(null);
      return;
    }

    const nextQuery = query.trim();
    if (nextQuery.length < 2) {
      setSearchResults([]);
      setSearching(false);
      setSearchError(null);
      return;
    }

    let active = true;
    setSearching(true);
    setSearchError(null);

    const timer = window.setTimeout(() => {
      onSearchUsers(nextQuery)
        .then((users) => {
          if (active) setSearchResults(users);
        })
        .catch((err) => {
          if (!active) return;
          setSearchResults([]);
          setSearchError(err instanceof Error ? err.message : "Could not search users.");
        })
        .finally(() => {
          if (active) setSearching(false);
        });
    }, 250);

    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [onSearchUsers, query, tab]);

  const sendRequest = () => {
    const target = query.trim();
    if (!target) return;
    onSendRequest?.(target);
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
          <div className="mt-5 overflow-hidden rounded-md border border-border">
            <div className="flex h-9 items-center justify-between border-b border-border bg-surface-subtle px-3">
              <span className="font-mono text-[11px] uppercase tracking-[0.08em] text-text-muted">
                Search results
              </span>
              {searching && <Loader2 size={14} className="animate-spin text-text-muted" />}
            </div>
            {searchError ? (
              <p className="px-3 py-4 text-[13px] text-danger">{searchError}</p>
            ) : query.trim().length < 2 ? (
              <p className="px-3 py-4 text-[13px] text-text-muted">
                Type at least 2 characters to search.
              </p>
            ) : searchResults.length === 0 && !searching ? (
              <p className="px-3 py-4 text-[13px] text-text-muted">No users found.</p>
            ) : (
              searchResults.map((user) => (
                <div
                  key={user.id}
                  className="flex min-h-[56px] items-center gap-3 border-b border-border px-3 last:border-b-0"
                >
                  <Avatar
                    src={user.avatarUrl}
                    name={user.displayName || user.username}
                    size={32}
                    radius={8}
                  />
                  <div className="min-w-0 flex-1 leading-tight">
                    <p className="truncate text-[14px] font-medium text-text-primary">
                      {user.displayName || user.username}
                    </p>
                    <p className="truncate font-mono text-[11px] text-text-muted">
                      @{user.username} - {relationLabel(user)}
                    </p>
                  </div>
                  <SearchResultAction
                    user={user}
                    onSendRequest={onSendRequest}
                    onAccept={onAccept}
                  />
                </div>
              ))
            )}
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

function relationLabel(user: FriendSearchResult) {
  switch (user.relationStatus) {
    case "friends":
      return "friends";
    case "incoming_request":
      return "incoming request";
    case "outgoing_request":
      return "request sent";
    case "blocked_by_you":
      return "blocked";
    case "blocked_you":
      return "unavailable";
    default:
      return "not connected";
  }
}

function SearchResultAction({
  user,
  onSendRequest,
  onAccept,
}: {
  user: FriendSearchResult;
  onSendRequest?: (target: string) => void;
  onAccept?: (id: string) => void;
}) {
  if (user.relationStatus === "incoming_request" && user.pendingRequestId) {
    return (
      <button
        type="button"
        onClick={() => onAccept?.(user.pendingRequestId!)}
        className="flex h-8 shrink-0 items-center gap-2 rounded-sm border border-border bg-surface-raised px-3 text-[12px] font-medium text-success transition-colors hover:bg-success/10"
      >
        <Check size={14} /> Accept
      </button>
    );
  }

  if (user.relationStatus !== "none") {
    return (
      <button
        type="button"
        disabled
        className="h-8 shrink-0 cursor-not-allowed rounded-sm border border-border bg-surface-overlay px-3 text-[12px] text-text-faint"
      >
        {user.relationStatus === "outgoing_request" ? "Pending" : "Added"}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={() => onSendRequest?.(user.id)}
      className="flex h-8 shrink-0 items-center gap-2 rounded-sm border border-border bg-surface-raised px-3 text-[12px] font-medium text-text-secondary transition-colors hover:bg-hover-row hover:text-text-primary"
    >
      <UserPlus size={14} /> Add
    </button>
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
