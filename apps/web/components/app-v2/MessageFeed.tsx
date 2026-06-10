"use client";

import { Fragment } from "react";
import { cn } from "@corvus/ui";
import { SmilePlus, Reply, MessagesSquare, MoreHorizontal } from "lucide-react";
import { Avatar } from "@/components/ui";
import type { ChatMessage } from "./types";

const GROUP_WINDOW_MS = 7 * 60 * 1000;

export function timeShort(iso: string) {
  return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false });
}
function dayKey(iso: string) {
  return new Date(iso).toDateString();
}
function dayLabel(iso: string) {
  return new Date(iso)
    .toLocaleDateString([], { weekday: "long", month: "long", day: "numeric" })
    .toUpperCase();
}

/**
 * Shared grouped message list (brief §MessageArea) — used by the channel feed
 * and the thread panel. Messages from the same author within 7 minutes collapse
 * into a compact follow-up.
 */
export function MessageFeed({
  messages,
  compact,
  onReply,
  onOpenThread,
}: {
  messages: ChatMessage[];
  /** Tighter spacing for the narrow thread column. */
  compact?: boolean;
  onReply?: (id: string) => void;
  onOpenThread?: (id: string) => void;
}) {
  return (
    <>
      {messages.map((msg, i) => {
        const prev = messages[i - 1];
        const newDay = !prev || dayKey(prev.at) !== dayKey(msg.at);
        const grouped =
          !newDay &&
          prev &&
          prev.author.id === msg.author.id &&
          new Date(msg.at).getTime() - new Date(prev.at).getTime() < GROUP_WINDOW_MS;

        return (
          <Fragment key={msg.id}>
            {newDay && !compact && <DateSeparator label={dayLabel(msg.at)} />}
            <MessageRow
              message={msg}
              grouped={Boolean(grouped)}
              onReply={onReply}
              onOpenThread={onOpenThread}
            />
          </Fragment>
        );
      })}
    </>
  );
}

function MessageRow({
  message,
  grouped,
  onReply,
  onOpenThread,
}: {
  message: ChatMessage;
  grouped: boolean;
  onReply?: (id: string) => void;
  onOpenThread?: (id: string) => void;
}) {
  return (
    <div className="group relative flex gap-3 px-4 py-0.5 transition-colors hover:bg-hover-row">
      <div className="w-8 shrink-0">
        {grouped ? (
          <span className="hidden pt-[3px] text-right font-mono text-[10px] leading-5 text-text-faint group-hover:block">
            {timeShort(message.at)}
          </span>
        ) : (
          <Avatar src={message.author.avatar} name={message.author.name} size={32} radius={8} />
        )}
      </div>

      <div className="min-w-0 flex-1">
        {!grouped && (
          <div className="flex items-center gap-2">
            {message.author.roleColor && (
              <span
                className="inline-block h-2.5 w-0.5 rounded-full"
                style={{ background: message.author.roleColor }}
              />
            )}
            <span className="text-[14px] font-medium text-text-primary">{message.author.name}</span>
            <span className="font-mono text-[11px] tracking-[0.02em] text-text-muted">
              Today at {timeShort(message.at)}
            </span>
          </div>
        )}
        <div className="whitespace-pre-wrap break-words text-[15px] leading-[1.55] text-text-secondary">
          {message.text}
        </div>

        {message.reactions && message.reactions.length > 0 && (
          <div className="mt-1 flex flex-wrap gap-1">
            {message.reactions.map((r, idx) => (
              <button
                key={idx}
                type="button"
                data-reacted={r.reacted}
                className={cn(
                  "flex h-[22px] items-center gap-1.5 rounded-full border px-2 text-[12px] transition-colors",
                  r.reacted
                    ? "border-accent-muted bg-accent-soft"
                    : "border-border bg-surface-raised hover:border-border-active"
                )}
              >
                <span className="text-[14px] leading-none">{r.emoji}</span>
                <span className="font-mono text-[11px] text-text-secondary">{r.count}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="absolute -top-3 right-4 hidden items-center gap-0.5 rounded-sm border border-border bg-surface-overlay p-0.5 group-hover:flex">
        <ActionIcon label="React"><SmilePlus size={14} /></ActionIcon>
        <ActionIcon label="Reply" onClick={() => onReply?.(message.id)}><Reply size={14} /></ActionIcon>
        <ActionIcon label="Thread" onClick={() => onOpenThread?.(message.id)}><MessagesSquare size={14} /></ActionIcon>
        <ActionIcon label="More"><MoreHorizontal size={14} /></ActionIcon>
      </div>
    </div>
  );
}

function DateSeparator({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-3 px-4 py-4">
      <span className="h-px flex-1 bg-border" />
      <span className="font-mono text-[11px] tracking-[0.06em] text-text-muted">{label}</span>
      <span className="h-px flex-1 bg-border" />
    </div>
  );
}

function ActionIcon({ label, onClick, children }: { label: string; onClick?: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className="flex h-7 w-7 items-center justify-center rounded-[4px] text-text-faint transition-colors hover:bg-hover-row hover:text-text-primary"
    >
      {children}
    </button>
  );
}
