"use client";

import { useLayoutEffect, useRef, useState } from "react";
import { Users, Search, Pin, Phone, Video, AtSign } from "lucide-react";
import { ChannelGlyph, type ChannelType } from "@/shared/components/ui";
import type { Attachment, ChatMessage, MemberRef } from "./types";
import { Composer } from "./Composer";
import { MessageFeed } from "./MessageFeed";

/** Channel message view (brief §MessageArea). DM mode adds call actions. */
export function MessageArea({
  channelName,
  channelType,
  topic,
  messages,
  members,
  dm,
  onToggleMembers,
  onOpenThread,
  onOpenSearch,
  onOpenPins,
  onRecordClip,
  onSend,
  onReact,
  meId,
  onPin,
  onEdit,
  onDelete,
  feedId,
  loading,
  hasMore,
  onLoadOlder,
}: {
  channelName: string;
  channelType: ChannelType;
  topic?: string;
  messages: ChatMessage[];
  /** Space members — powers the composer's @mention menu. */
  members?: MemberRef[];
  /** DM mode — replaces the glyph with presence and adds call buttons. */
  dm?: { onVoiceCall?: () => void; onVideoCall?: () => void };
  onToggleMembers?: () => void;
  onOpenThread?: (messageId: string) => void;
  onOpenSearch?: () => void;
  onOpenPins?: () => void;
  onRecordClip?: () => void;
  onSend?: (text: string, attachments?: Attachment[], replyTo?: ChatMessage["replyTo"]) => void;
  onReact?: (messageId: string, emoji: string) => void;
  meId?: string;
  onPin?: (messageId: string) => void;
  onEdit?: (messageId: string, text: string) => void;
  onDelete?: (messageId: string) => void;
  feedId?: string;
  loading?: boolean;
  hasMore?: boolean;
  onLoadOlder?: () => Promise<void>;
}) {
  const [replyToId, setReplyToId] = useState<string | null>(null);
  const replyTo = messages.find((m) => m.id === replyToId) ?? null;
  const scrollRef = useRef<HTMLDivElement>(null);
  const nearBottom = useRef(true);
  const prependHeight = useRef<number | null>(null);
  const loadRequested = useRef(false);
  const [showNewMessages, setShowNewMessages] = useState(false);

  useLayoutEffect(() => {
    const element = scrollRef.current;
    if (!element) return;
    element.scrollTop = element.scrollHeight;
    nearBottom.current = true;
    setShowNewMessages(false);
  }, [feedId]);

  useLayoutEffect(() => {
    const element = scrollRef.current;
    if (!element) return;
    if (prependHeight.current !== null) {
      element.scrollTop += element.scrollHeight - prependHeight.current;
      prependHeight.current = null;
      loadRequested.current = false;
    } else if (nearBottom.current) {
      element.scrollTop = element.scrollHeight;
    } else {
      setShowNewMessages(true);
    }
  }, [messages.length]);

  const handleScroll = () => {
    const element = scrollRef.current;
    if (!element) return;
    nearBottom.current = element.scrollHeight - element.scrollTop - element.clientHeight < 120;
    if (nearBottom.current) setShowNewMessages(false);
    if (element.scrollTop < 80 && hasMore && onLoadOlder && !loading && !loadRequested.current) {
      loadRequested.current = true;
      prependHeight.current = element.scrollHeight;
      void onLoadOlder().finally(() => window.setTimeout(() => {
        if (prependHeight.current !== null) prependHeight.current = null;
        loadRequested.current = false;
      }, 0));
    }
  };

  return (
    <section className="flex h-full min-w-0 flex-1 flex-col bg-background">
      <header className="flex h-12 shrink-0 items-center gap-3 border-b border-border px-4">
        {dm ? (
          <AtSign aria-hidden size={16} className="shrink-0 text-text-muted" />
        ) : (
          <ChannelGlyph type={channelType} size={16} />
        )}
        <h1 className="text-[15px] font-semibold text-text-primary">{channelName}</h1>
        {topic && (
          <>
            <span className="h-4 w-px bg-border" />
            <p className="truncate text-[13px] text-text-muted">{topic}</p>
          </>
        )}
        <div className="ml-auto flex items-center gap-1 text-text-faint">
          {dm && (
            <>
              <HeaderIcon label="Start voice call" onClick={dm.onVoiceCall}><Phone size={17} /></HeaderIcon>
              <HeaderIcon label="Start video call" onClick={dm.onVideoCall}><Video size={18} /></HeaderIcon>
              <span className="mx-1 h-4 w-px bg-border" />
            </>
          )}
          <HeaderIcon label="Pinned messages" onClick={onOpenPins}><Pin size={17} /></HeaderIcon>
          {!dm && (
            <HeaderIcon label="Members" onClick={onToggleMembers}><Users size={18} /></HeaderIcon>
          )}
          <HeaderIcon label="Search" onClick={onOpenSearch}><Search size={18} /></HeaderIcon>
        </div>
      </header>

      <div ref={scrollRef} onScroll={handleScroll} className="relative flex flex-1 flex-col overflow-y-auto py-4">
        {loading && messages.length === 0 ? (
          <div aria-label="Loading messages" className="space-y-5 px-4 py-6">
            {[0, 1, 2, 3].map((item) => (
              <div key={item} className="flex animate-pulse gap-3">
                <div className="h-9 w-9 rounded-md bg-surface-overlay" />
                <div className="flex-1 space-y-2"><div className="h-3 w-28 rounded bg-surface-overlay" /><div className="h-3 w-2/3 rounded bg-surface-overlay" /></div>
              </div>
            ))}
          </div>
        ) : messages.length === 0 ? (
          <WelcomeState channelName={channelName} channelType={channelType} dm={Boolean(dm)} />
        ) : (
          <MessageFeed
            messages={messages}
            meId={meId}
            onOpenThread={onOpenThread}
            onReply={setReplyToId}
            onReact={onReact}
            onPin={onPin}
            onEdit={onEdit}
            onDelete={onDelete}
          />
        )}
        {showNewMessages && (
          <button
            type="button"
            onClick={() => {
              const element = scrollRef.current;
              if (element) element.scrollTop = element.scrollHeight;
              nearBottom.current = true;
              setShowNewMessages(false);
            }}
            className="sticky bottom-2 mx-auto rounded-full bg-accent px-3 py-1.5 text-xs font-medium text-on-accent shadow-e2"
          >
            New messages
          </button>
        )}
      </div>

      <Composer
        channelName={channelName}
        onSend={(text, attachments) => {
          onSend?.(
            text,
            attachments,
            replyTo
              ? { id: replyTo.id, authorName: replyTo.author.name, text: replyTo.text }
              : undefined
          );
          setReplyToId(null);
        }}
        onRecordClip={onRecordClip}
        members={members}
        replyTo={replyTo ? { authorName: replyTo.author.name, text: replyTo.text } : null}
        onCancelReply={() => setReplyToId(null)}
      />
    </section>
  );
}

function WelcomeState({
  channelName,
  channelType,
  dm,
}: {
  channelName: string;
  channelType: ChannelType;
  dm?: boolean;
}) {
  return (
    <div className="mt-auto px-4 pb-2 pt-12">
      <div className="flex h-16 w-16 items-center justify-center rounded-[18px] border border-border bg-surface-raised">
        {dm ? (
          <AtSign aria-hidden size={26} className="text-text-muted" />
        ) : (
          <ChannelGlyph type={channelType} size={26} />
        )}
      </div>
      <h2 className="mt-4 text-[22px] font-semibold text-text-primary">
        {dm ? channelName : `Welcome to #${channelName}`}
      </h2>
      <p className="mt-1.5 max-w-[520px] text-[14px] leading-relaxed text-text-secondary">
        {dm
          ? `This is the beginning of your direct message history with ${channelName}.`
          : `This is the very start of #${channelName}. Say something to get the conversation going.`}
      </p>
      <div className="mt-6 h-px bg-border" />
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
