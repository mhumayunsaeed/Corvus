"use client";

import { X } from "lucide-react";
import type { ChatMessage } from "./types";
import { Composer } from "./Composer";
import { MessageFeed } from "./MessageFeed";

/**
 * Thread panel (brief §ThreadPanel). A flex column to the right of the main
 * area — not a modal overlay. Reuses the message + composer components.
 */
export function ThreadPanel({
  parent,
  replies,
  onClose,
}: {
  parent: ChatMessage;
  replies: ChatMessage[];
  onClose: () => void;
}) {
  return (
    <section className="absolute inset-0 z-30 flex h-full w-full shrink-0 flex-col bg-background shadow-e3 lg:static lg:w-[320px] lg:shadow-[inset_1px_0_rgb(var(--c-border-subtle))]">
      <header className="flex h-12 shrink-0 items-center justify-between border-b border-border px-4">
        <div className="min-w-0">
          <div className="text-[14px] font-semibold text-text-primary">Thread</div>
          <div className="truncate font-mono text-[11px] text-text-muted">
            {parent.text.slice(0, 40)}
            {parent.text.length > 40 ? "…" : ""}
          </div>
        </div>
        <button
          type="button"
          aria-label="Close thread"
          onClick={onClose}
          className="text-text-faint transition-colors hover:text-text-primary"
        >
          <X size={16} />
        </button>
      </header>

      <div className="flex flex-1 flex-col overflow-y-auto py-3">
        {/* Parent, then a divider, then replies. */}
        <MessageFeed messages={[parent]} compact />
        <div className="flex items-center gap-3 px-4 py-3">
          <span className="h-px flex-1 bg-border" />
          <span className="font-mono text-[11px] tracking-[0.06em] text-text-muted">
            {replies.length} {replies.length === 1 ? "REPLY" : "REPLIES"}
          </span>
          <span className="h-px flex-1 bg-border" />
        </div>
        <MessageFeed messages={replies} compact />
      </div>

      <Composer channelName="thread" />
    </section>
  );
}
