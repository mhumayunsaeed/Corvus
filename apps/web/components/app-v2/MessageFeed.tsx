"use client";

import { Fragment, useState } from "react";
import { cn } from "@corvus/ui";
import {
  SmilePlus,
  Reply,
  MessagesSquare,
  MoreHorizontal,
  CornerUpLeft,
  FileText,
  Download,
  Play,
  Pin,
  PinOff,
  Copy,
  Pencil,
  Trash2,
} from "lucide-react";
import { Avatar } from "@/components/ui";
import type { Attachment, ChatMessage, LinkEmbed } from "./types";
import { ClipEmbed } from "./ClipRecorder";
import { GitHubEvent } from "./GitHubView";

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

const QUICK_REACTIONS = ["👍", "🔥", "❤️", "😂", "🎉", "👀", "✅", "🚀"];

/**
 * Shared grouped message list (brief §MessageArea) — one feed for channels,
 * DMs, and group DMs. Messages from the same author within 7 minutes collapse
 * into a compact follow-up; replies always show their reference line.
 */
export interface MessageActions {
  onReply?: (id: string) => void;
  onOpenThread?: (id: string) => void;
  onReact?: (id: string, emoji: string) => void;
  onPin?: (id: string) => void;
  onEdit?: (id: string, text: string) => void;
  onDelete?: (id: string) => void;
}

export function MessageFeed({
  messages,
  compact,
  meId,
  onReply,
  onOpenThread,
  onReact,
  onPin,
  onEdit,
  onDelete,
}: {
  messages: ChatMessage[];
  /** Tighter spacing for the narrow thread column. */
  compact?: boolean;
  /** Current user id — enables Edit/Delete on own messages. */
  meId?: string;
} & MessageActions) {
  return (
    <>
      {messages.map((msg, i) => {
        const prev = messages[i - 1];
        const newDay = !prev || dayKey(prev.at) !== dayKey(msg.at);
        const grouped =
          !newDay &&
          !msg.replyTo &&
          prev &&
          !prev.githubEvent &&
          prev.author.id === msg.author.id &&
          new Date(msg.at).getTime() - new Date(prev.at).getTime() < GROUP_WINDOW_MS;

        if (msg.githubEvent) {
          return (
            <Fragment key={msg.id}>
              {newDay && !compact && <DateSeparator label={dayLabel(msg.at)} />}
              <GitHubEvent text={msg.githubEvent.text} meta={msg.githubEvent.meta} />
            </Fragment>
          );
        }

        return (
          <Fragment key={msg.id}>
            {newDay && !compact && <DateSeparator label={dayLabel(msg.at)} />}
            <MessageRow
              message={msg}
              grouped={Boolean(grouped)}
              mine={meId !== undefined && msg.author.id === meId}
              onReply={onReply}
              onOpenThread={onOpenThread}
              onReact={onReact}
              onPin={onPin}
              onEdit={onEdit}
              onDelete={onDelete}
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
  mine,
  onReply,
  onOpenThread,
  onReact,
  onPin,
  onEdit,
  onDelete,
}: {
  message: ChatMessage;
  grouped: boolean;
  mine: boolean;
} & MessageActions) {
  const [reactOpen, setReactOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(message.text);

  return (
    <div
      className={cn(
        "group relative flex flex-col px-4 py-0.5 transition-colors hover:bg-hover-row",
        reactOpen && "bg-hover-row"
      )}
    >
      {/* Reply reference — a quiet line that connects to the original. */}
      {message.replyTo && (
        <div className="mb-0.5 flex items-center gap-1.5 pl-11">
          <CornerUpLeft size={11} className="shrink-0 text-text-faint" />
          <span className="font-mono text-[11px] text-text-muted">{message.replyTo.authorName}</span>
          <span className="truncate text-[11px] text-text-faint">{message.replyTo.text}</span>
        </div>
      )}

      <div className="flex gap-3">
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

          {editing ? (
            <div className="mt-1">
              <textarea
                value={draft}
                autoFocus
                rows={Math.max(1, draft.split("\n").length)}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    if (draft.trim()) onEdit?.(message.id, draft.trim());
                    setEditing(false);
                  }
                  if (e.key === "Escape") {
                    setDraft(message.text);
                    setEditing(false);
                  }
                }}
                className="w-full resize-none rounded-md border border-border-active bg-surface-raised px-3 py-2 text-[14px] leading-[1.5] text-text-primary outline-none"
              />
              <p className="mt-1 font-mono text-[10px] text-text-faint">
                enter to save · esc to cancel
              </p>
            </div>
          ) : (
            message.text && (
              <div className="whitespace-pre-wrap break-words text-[15px] leading-[1.55] text-text-secondary">
                <Linkified text={message.text} />
                {message.edited && (
                  <span className="ml-1.5 font-mono text-[10px] text-text-faint">(edited)</span>
                )}
              </div>
            )
          )}

          {message.attachments?.map((att, i) => <AttachmentView key={i} attachment={att} />)}

          {message.embed && <LinkEmbedCard embed={message.embed} />}

          {message.clip && <ClipEmbed duration={message.clip.duration} size={message.clip.size} />}

          {message.reactions && message.reactions.length > 0 && (
            <div className="mt-1 flex flex-wrap gap-1">
              {message.reactions.map((r, idx) => (
                <button
                  key={idx}
                  type="button"
                  data-reacted={r.reacted}
                  onClick={() => onReact?.(message.id, r.emoji)}
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
              {onReact && (
                <button
                  type="button"
                  aria-label="Add reaction"
                  onClick={() => setReactOpen((v) => !v)}
                  className="flex h-[22px] items-center rounded-full border border-border bg-surface-raised px-2 text-text-faint opacity-0 transition-all hover:border-border-active hover:text-text-primary group-hover:opacity-100"
                >
                  <SmilePlus size={12} />
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Hover toolbar */}
      <div
        className={cn(
          "absolute -top-3 right-4 items-center gap-0.5 rounded-sm border border-border bg-surface-overlay p-0.5 group-hover:flex",
          menuOpen ? "flex" : "hidden"
        )}
      >
        <ActionIcon label="React" onClick={() => setReactOpen((v) => !v)}>
          <SmilePlus size={14} />
        </ActionIcon>
        <ActionIcon label="Reply" onClick={() => onReply?.(message.id)}>
          <Reply size={14} />
        </ActionIcon>
        <ActionIcon label="Thread" onClick={() => onOpenThread?.(message.id)}>
          <MessagesSquare size={14} />
        </ActionIcon>
        <ActionIcon label="More" onClick={() => setMenuOpen((v) => !v)}>
          <MoreHorizontal size={14} />
        </ActionIcon>
      </div>

      {/* More menu */}
      {menuOpen && (
        <div
          className="absolute right-4 top-4 z-30 min-w-[200px] rounded-[10px] border border-border bg-surface-overlay p-1"
          style={{ boxShadow: "0 8px 24px rgba(0,0,0,0.3)" }}
        >
          <MenuItem
            icon={<Copy size={14} />}
            label="Copy text"
            onClick={() => {
              void navigator.clipboard?.writeText(message.text);
              setMenuOpen(false);
            }}
          />
          {onPin && (
            <MenuItem
              icon={message.pinned ? <PinOff size={14} /> : <Pin size={14} />}
              label={message.pinned ? "Unpin message" : "Pin message"}
              onClick={() => {
                onPin(message.id);
                setMenuOpen(false);
              }}
            />
          )}
          {mine && onEdit && (
            <MenuItem
              icon={<Pencil size={14} />}
              label="Edit message"
              onClick={() => {
                setDraft(message.text);
                setEditing(true);
                setMenuOpen(false);
              }}
            />
          )}
          {mine && onDelete && (
            <MenuItem
              icon={<Trash2 size={14} />}
              label="Delete message"
              danger
              onClick={() => {
                onDelete(message.id);
                setMenuOpen(false);
              }}
            />
          )}
        </div>
      )}

      {/* Quick reaction menu */}
      {reactOpen && (
        <div
          className="absolute -top-3 right-4 z-30 flex translate-y-[-100%] items-center gap-0.5 rounded-[10px] border border-border bg-surface-overlay p-1"
          style={{ boxShadow: "0 8px 24px rgba(0,0,0,0.3)" }}
        >
          {QUICK_REACTIONS.map((e) => (
            <button
              key={e}
              type="button"
              onClick={() => {
                onReact?.(message.id, e);
                setReactOpen(false);
              }}
              className="flex h-8 w-8 items-center justify-center rounded-sm text-[17px] leading-none transition-colors hover:bg-hover-row"
            >
              {e}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/* ── Content renderers ──────────────────────────────────────────────── */

const URL_RE = /(https?:\/\/[^\s<>"]+)/g;

function Linkified({ text }: { text: string }) {
  const parts = text.split(URL_RE);
  if (parts.length === 1) return <>{text}</>;
  return (
    <>
      {parts.map((part, i) =>
        /^https?:\/\//.test(part) ? (
          <a
            key={i}
            href={part}
            target="_blank"
            rel="noreferrer noopener"
            className="text-accent underline decoration-accent/40 underline-offset-2 transition-colors hover:decoration-accent"
          >
            {part}
          </a>
        ) : (
          <Fragment key={i}>{part}</Fragment>
        )
      )}
    </>
  );
}

function AttachmentView({ attachment }: { attachment: Attachment }) {
  if (attachment.kind === "image" || attachment.kind === "gif") {
    return (
      <div className="relative mt-2 max-w-[420px] overflow-hidden rounded-[10px] border border-border bg-surface-raised">
        {attachment.url ? (
          <img
            src={attachment.url}
            alt={attachment.name}
            className="block max-h-[320px] w-full object-cover"
          />
        ) : (
          <div className="flex aspect-video items-center justify-center bg-surface-overlay">
            <span className="font-mono text-[11px] text-text-muted">{attachment.name}</span>
          </div>
        )}
        {attachment.kind === "gif" && (
          <span className="absolute left-2 top-2 rounded-[3px] border border-border bg-surface-overlay/90 px-1.5 py-px font-mono text-[10px] tracking-[0.08em] text-text-secondary">
            GIF
          </span>
        )}
      </div>
    );
  }

  if (attachment.kind === "video") {
    return (
      <div className="mt-2 max-w-[480px] overflow-hidden rounded-[10px] border border-border bg-surface-raised">
        {attachment.url ? (
          <video src={attachment.url} controls className="block max-h-[320px] w-full" />
        ) : (
          <div className="flex aspect-video items-center justify-center bg-surface-overlay">
            <span className="flex h-11 w-11 items-center justify-center rounded-full bg-black/60 text-white">
              <Play size={18} fill="currentColor" />
            </span>
          </div>
        )}
        <div className="flex justify-between px-3 py-2 font-mono text-[12px] text-text-muted">
          <span className="truncate">{attachment.name}</span>
          {attachment.size && <span className="shrink-0 pl-3">{attachment.size}</span>}
        </div>
      </div>
    );
  }

  // Generic file chip
  return (
    <a
      href={attachment.url}
      download={attachment.name}
      className="mt-2 flex max-w-[380px] items-center gap-3 rounded-[10px] border border-border bg-surface-raised px-3.5 py-3 transition-colors hover:border-border-active"
    >
      <FileText size={18} className="shrink-0 text-text-muted" />
      <span className="min-w-0 flex-1 leading-tight">
        <span className="block truncate text-[13px] font-medium text-text-primary">
          {attachment.name}
        </span>
        {attachment.size && (
          <span className="font-mono text-[11px] text-text-muted">{attachment.size}</span>
        )}
      </span>
      <Download size={15} className="shrink-0 text-text-faint" />
    </a>
  );
}

function LinkEmbedCard({ embed }: { embed: LinkEmbed }) {
  return (
    <a
      href={embed.url}
      target="_blank"
      rel="noreferrer noopener"
      className="mt-2 block max-w-[440px] rounded-r-[6px] border-y border-r border-border border-l-2 border-l-accent bg-surface-raised px-4 py-3 transition-colors hover:bg-hover-row"
    >
      <span className="font-mono text-[10px] uppercase tracking-[0.08em] text-text-muted">
        {embed.domain}
      </span>
      <span className="mt-0.5 block text-[14px] font-medium leading-[1.4] text-text-primary">
        {embed.title}
      </span>
      {embed.description && (
        <span className="mt-0.5 line-clamp-2 block text-[12px] leading-[1.5] text-text-secondary">
          {embed.description}
        </span>
      )}
    </a>
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

function MenuItem({
  icon,
  label,
  danger,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  danger?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex h-9 w-full items-center gap-2.5 rounded-sm px-2.5 text-left transition-colors hover:bg-hover-row",
        danger ? "text-danger" : "text-text-secondary hover:text-text-primary"
      )}
    >
      {icon}
      <span className="text-[13px]">{label}</span>
    </button>
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
