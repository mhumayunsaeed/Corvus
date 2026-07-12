"use client";

import { X, Pin } from "lucide-react";
import { Avatar } from "@/shared/components/ui";
import type { ChatMessage } from "./types";
import { timeShort } from "./MessageFeed";

/**
 * Pinned messages (brief §MessageArea) — the Thread Panel slot, as a quiet
 * typographic list. No cards; rows on 1px rules.
 */
export function PinnedPanel({
  messages,
  onClose,
  onJump,
}: {
  messages: ChatMessage[];
  onClose: () => void;
  onJump?: (id: string) => void;
}) {
  const pinned = messages.filter((m) => m.pinned);

  return (
    <aside className="absolute inset-0 z-30 flex h-full w-full shrink-0 flex-col bg-surface-raised shadow-e3 lg:static lg:w-[360px] lg:shadow-[inset_1px_0_rgb(var(--c-border-subtle))]">
      <div className="flex h-12 shrink-0 items-center justify-between border-b border-border px-4">
        <span className="font-mono text-[11px] uppercase tracking-[0.08em] text-text-muted">
          Pinned — {pinned.length}
        </span>
        <button
          type="button"
          aria-label="Close pinned messages"
          onClick={onClose}
          className="flex h-7 w-7 items-center justify-center rounded-sm text-text-faint transition-colors hover:bg-hover-row hover:text-text-primary"
        >
          <X size={16} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {pinned.length === 0 ? (
          <div className="px-4 py-10 text-center">
            <Pin size={20} className="mx-auto text-text-faint" />
            <p className="mt-3 text-[13px] leading-[1.6] text-text-muted">
              Nothing pinned yet. Pin a message from its hover menu and it&apos;ll stay here.
            </p>
          </div>
        ) : (
          pinned.map((m) => (
            <button
              key={m.id}
              type="button"
              onClick={() => onJump?.(m.id)}
              className="w-full border-b border-border px-4 py-3 text-left transition-colors hover:bg-hover-row"
            >
              <div className="flex items-center gap-2">
                <Avatar src={m.author.avatar} name={m.author.name} size={20} radius={5} />
                <span className="text-[13px] font-medium text-text-primary">{m.author.name}</span>
                <span className="ml-auto font-mono text-[10px] text-text-faint">{timeShort(m.at)}</span>
              </div>
              <p className="mt-1.5 line-clamp-3 text-[13px] leading-[1.5] text-text-secondary">
                {m.text}
              </p>
            </button>
          ))
        )}
      </div>
    </aside>
  );
}
