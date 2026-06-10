"use client";

import { Users, Search, Inbox } from "lucide-react";
import { ChannelGlyph, type ChannelType } from "@/components/ui";
import type { ChatMessage } from "./types";
import { Composer } from "./Composer";
import { MessageFeed } from "./MessageFeed";

/** Channel message view (brief §MessageArea). */
export function MessageArea({
  channelName,
  channelType,
  topic,
  messages,
  onToggleMembers,
  onOpenThread,
}: {
  channelName: string;
  channelType: ChannelType;
  topic?: string;
  messages: ChatMessage[];
  onToggleMembers?: () => void;
  onOpenThread?: (messageId: string) => void;
}) {
  return (
    <section className="flex h-full min-w-0 flex-1 flex-col bg-background">
      <header className="flex h-12 shrink-0 items-center gap-3 border-b border-border px-4">
        <ChannelGlyph type={channelType} size={14} />
        <h1 className="text-[15px] font-semibold text-text-primary">{channelName}</h1>
        {topic && (
          <>
            <span className="h-4 w-px bg-border" />
            <p className="truncate text-[13px] text-text-muted">{topic}</p>
          </>
        )}
        <div className="ml-auto flex items-center gap-1 text-text-faint">
          <HeaderIcon label="Members" onClick={onToggleMembers}><Users size={18} /></HeaderIcon>
          <HeaderIcon label="Search"><Search size={18} /></HeaderIcon>
          <HeaderIcon label="Inbox"><Inbox size={18} /></HeaderIcon>
        </div>
      </header>

      <div className="flex flex-1 flex-col overflow-y-auto py-4">
        {messages.length === 0 ? (
          <WelcomeState channelName={channelName} channelType={channelType} />
        ) : (
          <MessageFeed messages={messages} onOpenThread={onOpenThread} />
        )}
      </div>

      <Composer channelName={channelName} />
    </section>
  );
}

function WelcomeState({ channelName, channelType }: { channelName: string; channelType: ChannelType }) {
  return (
    <div className="px-4 py-8">
      <ChannelGlyph type={channelType} size={32} />
      <h2 className="mt-4 text-[24px] font-semibold text-text-primary">{channelName}</h2>
      <p className="mt-1 text-[15px] text-text-secondary">This is the beginning of {channelName}.</p>
      <p className="mt-0.5 text-[13px] text-text-muted">Send a message to get started.</p>
    </div>
  );
}

function HeaderIcon({ label, onClick, children }: { label: string; onClick?: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className="flex h-8 w-8 items-center justify-center rounded-sm transition-colors hover:bg-hover-row hover:text-text-primary"
    >
      {children}
    </button>
  );
}
