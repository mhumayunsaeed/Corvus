"use client";

import { useRef, useState } from "react";
import { cn } from "@corvus/ui";
import { Plus, Smile, ArrowUp, Video, FileUp, ImagePlay, X, FileText, CornerUpLeft } from "lucide-react";
import { EmojiPicker, GifPicker, MentionMenu } from "./Pickers";
import type { Attachment, MemberRef } from "./types";

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function kindOf(file: File): Attachment["kind"] {
  if (file.type.startsWith("image/")) return file.type === "image/gif" ? "gif" : "image";
  if (file.type.startsWith("video/")) return "video";
  return "file";
}

/**
 * Message composer (brief §Composer) — one component for channels, DMs, and
 * group DMs. Replies, files (with live previews), GIFs, emoji, and mentions
 * all stage inside the same quiet input frame before send.
 */
export function Composer({
  channelName,
  onSend,
  onRecordClip,
  members,
  replyTo,
  onCancelReply,
}: {
  channelName: string;
  onSend?: (text: string, attachments?: Attachment[]) => void;
  /** Opens the async clip recorder (brief §Clips). */
  onRecordClip?: () => void;
  /** Space members — enables the @mention menu. */
  members?: MemberRef[];
  /** Active reply target — shown as a dismissible line above the input. */
  replyTo?: { authorName: string; text: string } | null;
  onCancelReply?: () => void;
}) {
  const [value, setValue] = useState("");
  const [focused, setFocused] = useState(false);
  const [attachOpen, setAttachOpen] = useState(false);
  const [picker, setPicker] = useState<null | "emoji" | "gif">(null);
  const [pending, setPending] = useState<Attachment[]>([]);
  const ref = useRef<HTMLTextAreaElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  // “@token” at the caret end opens the mention menu.
  const mentionMatch = members?.length ? /(?:^|\s)@(\w*)$/.exec(value) : null;

  const grow = () => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 240)}px`;
  };

  const canSend = value.trim().length > 0 || pending.length > 0;

  const send = () => {
    if (!canSend) return;
    onSend?.(value.trim(), pending.length ? pending : undefined);
    setValue("");
    setPending([]);
    onCancelReply?.();
    if (ref.current) ref.current.style.height = "auto";
  };

  const addFiles = (files: FileList | null) => {
    if (!files) return;
    const next: Attachment[] = Array.from(files).map((f) => ({
      kind: kindOf(f),
      name: f.name,
      size: formatSize(f.size),
      url: URL.createObjectURL(f),
    }));
    setPending((p) => [...p, ...next]);
  };

  const showActionRow = focused || value.length > 0 || pending.length > 0;

  return (
    <div className="shrink-0 border-t border-border bg-background px-4 py-3">
      {/* Reply line — connects the composer to the original message. */}
      {replyTo && (
        <div className="mb-1.5 flex items-center gap-2 px-1">
          <CornerUpLeft size={12} className="shrink-0 text-text-faint" />
          <span className="font-mono text-[11px] text-text-muted">
            replying to {replyTo.authorName}
          </span>
          <span className="min-w-0 truncate text-[11px] text-text-faint">{replyTo.text}</span>
          <button
            type="button"
            aria-label="Cancel reply"
            onClick={onCancelReply}
            className="ml-auto flex h-5 w-5 shrink-0 items-center justify-center rounded-sm text-text-faint transition-colors hover:bg-hover-row hover:text-text-primary"
          >
            <X size={12} />
          </button>
        </div>
      )}

      <div
        className={cn(
          "flex flex-col rounded-lg border bg-surface-raised transition-colors",
          focused ? "border-border-active" : "border-border"
        )}
      >
        {/* Staged attachments */}
        {pending.length > 0 && (
          <div className="flex flex-wrap gap-2 border-b border-border/50 px-3 pb-1 pt-3">
            {pending.map((att, i) => (
              <div
                key={i}
                className="group/att relative overflow-hidden rounded-md border border-border bg-surface-overlay"
              >
                {(att.kind === "image" || att.kind === "gif") && att.url ? (
                  <img src={att.url} alt={att.name} className="block h-16 w-16 object-cover" />
                ) : (
                  <div className="flex h-16 w-[140px] flex-col justify-center gap-0.5 px-2.5">
                    <FileText size={14} className="text-text-muted" />
                    <span className="truncate text-[11px] text-text-primary">{att.name}</span>
                    <span className="font-mono text-[10px] text-text-faint">{att.size}</span>
                  </div>
                )}
                <button
                  type="button"
                  aria-label={`Remove ${att.name}`}
                  onClick={() => setPending((p) => p.filter((_, j) => j !== i))}
                  className="absolute right-1 top-1 hidden h-5 w-5 items-center justify-center rounded-sm bg-black/60 text-white group-hover/att:flex"
                >
                  <X size={11} />
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="relative flex items-center gap-2 px-3 py-2.5">
          <input
            ref={fileRef}
            type="file"
            multiple
            hidden
            onChange={(e) => {
              addFiles(e.target.files);
              e.target.value = "";
            }}
          />
          <button
            type="button"
            aria-label="Attach"
            onClick={() => setAttachOpen((v) => !v)}
            className="text-text-faint transition-colors hover:text-text-primary"
          >
            <Plus size={18} />
          </button>
          {attachOpen && (
            <div
              className="absolute bottom-full left-0 z-30 mb-2 min-w-[200px] rounded-[10px] border border-border bg-surface-overlay p-1"
              style={{ boxShadow: "0 8px 24px rgba(0,0,0,0.3)" }}
            >
              <AttachItem
                icon={<FileUp size={15} />}
                label="Upload files"
                onClick={() => {
                  setAttachOpen(false);
                  fileRef.current?.click();
                }}
              />
              <AttachItem
                icon={<Video size={15} />}
                label="Record clip"
                hint="Ctrl+Shift+R"
                onClick={() => {
                  setAttachOpen(false);
                  onRecordClip?.();
                }}
              />
            </div>
          )}
          <textarea
            ref={ref}
            rows={1}
            value={value}
            onChange={(e) => {
              setValue(e.target.value);
              grow();
            }}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                send();
              }
            }}
            placeholder={`Message ${channelName}`}
            className="max-h-[240px] min-h-5 flex-1 resize-none bg-transparent text-[14px] leading-[1.5] text-text-primary outline-none placeholder:text-text-muted"
          />
          <button
            type="button"
            aria-label="GIF"
            onClick={() => setPicker((p) => (p === "gif" ? null : "gif"))}
            className={cn(
              "transition-colors hover:text-text-primary",
              picker === "gif" ? "text-text-primary" : "text-text-faint"
            )}
          >
            <ImagePlay size={18} />
          </button>
          <button
            type="button"
            aria-label="Emoji"
            onClick={() => setPicker((p) => (p === "emoji" ? null : "emoji"))}
            className={cn(
              "transition-colors hover:text-text-primary",
              picker === "emoji" ? "text-text-primary" : "text-text-faint"
            )}
          >
            <Smile size={18} />
          </button>

          {picker === "emoji" && (
            <EmojiPicker
              onPick={(e) => {
                setValue((v) => `${v}${e}`);
                setPicker(null);
                ref.current?.focus();
              }}
            />
          )}
          {picker === "gif" && (
            <GifPicker
              onPick={(gif) => {
                setPending((p) => [...p, { kind: "gif", name: gif.name, url: gif.url }]);
                setPicker(null);
                ref.current?.focus();
              }}
            />
          )}
          {mentionMatch && members && (
            <MentionMenu
              members={members}
              query={mentionMatch[1]}
              onPick={(name) => {
                setValue((v) => v.replace(/@\w*$/, `@${name} `));
                ref.current?.focus();
              }}
            />
          )}
        </div>

        {showActionRow && (
          <div className="flex items-center justify-between border-t border-border/50 px-3 py-2">
            <span className="font-mono text-[11px] text-text-faint">
              ** bold &nbsp; * italic &nbsp; ` code
            </span>
            <button
              type="button"
              aria-label="Send message"
              onClick={send}
              disabled={!canSend}
              className={cn(
                "flex h-7 w-7 items-center justify-center rounded-md transition-opacity",
                !canSend
                  ? "cursor-not-allowed bg-surface-overlay text-text-faint"
                  : "bg-accent text-on-accent hover:opacity-85"
              )}
            >
              <ArrowUp size={14} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function AttachItem({
  icon,
  label,
  hint,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  hint?: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex h-9 w-full items-center gap-2.5 rounded-sm px-2.5 text-left text-text-secondary transition-colors hover:bg-hover-row hover:text-text-primary"
    >
      {icon}
      <span className="text-[13px]">{label}</span>
      {hint && <span className="ml-auto font-mono text-[10px] text-text-faint">{hint}</span>}
    </button>
  );
}
