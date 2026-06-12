"use client";

import { useState } from "react";
import { cn } from "@corvus/ui";
import { Avatar, ChannelGlyph } from "@/components/ui";
import { FriendsView } from "./FriendsView";
import type { AppShellData } from "./AppShell";

type HomeTab = "overview" | "friends";

/**
 * Home (brief §Home Screen) — no hero card, no gradient blob, no colored stat
 * icons. A single unified bordered stat row with mono numbers, then plain
 * typographic lists: jump back in, active now.
 */
export function HomeView({
  data,
  onOpenChannel,
  onOpenDM,
}: {
  data: AppShellData;
  onOpenChannel?: (spaceId: string, channelId: string) => void;
  onOpenDM?: (friendId: string) => void;
}) {
  const [tab, setTab] = useState<HomeTab>("overview");

  const friends = data.friends ?? [];
  const friendsOnline = friends.filter((f) => !f.pending && f.presence !== "offline").length;

  const allChannels = Object.entries(data.sectionsBySpace).flatMap(([spaceId, sections]) =>
    sections.flatMap((s) => s.channels.map((c) => ({ ...c, spaceId })))
  );
  const unread = allChannels.filter((c) => c.unread);
  const dmUnread = (data.dmConversations ?? []).reduce((n, c) => n + (c.unreadCount ?? 0), 0);

  const recent = allChannels.filter((c) => c.type !== "voice").slice(0, 5);
  const voiceActive = Object.entries(data.voiceByChannel ?? {}).flatMap(([channelId, parts]) => {
    const ch = allChannels.find((c) => c.id === channelId);
    return ch && parts.length > 0 ? [{ channel: ch, parts }] : [];
  });

  const stats = [
    { value: String(unread.length), label: "Unread channels" },
    { value: String(dmUnread), label: "DM mentions" },
    { value: String(friendsOnline), label: "Friends online" },
    { value: String(data.spaces.length), label: "Spaces" },
  ];

  return (
    <section className="flex h-full min-w-0 flex-1 flex-col bg-background">
      <header className="flex h-12 shrink-0 items-center gap-3 border-b border-border px-4">
        <h1 className="text-[15px] font-semibold text-text-primary">Home</h1>
        <span className="font-mono text-[11px] text-text-muted">
          {new Date().toLocaleDateString([], { weekday: "long", month: "long", day: "numeric" })}
        </span>
      </header>

      <div className="flex shrink-0 items-center gap-1 border-b border-border px-4 py-2">
        {(
          [
            { id: "overview", label: "Overview" },
            { id: "friends", label: "Friends" },
          ] as { id: HomeTab; label: string }[]
        ).map((t) => (
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
          </button>
        ))}
      </div>

      {tab === "friends" ? (
        <FriendsView friends={friends} embedded onMessage={onOpenDM} onCall={onOpenDM} />
      ) : (
        <div className="flex-1 overflow-y-auto">
          <div className="mx-auto max-w-[760px] px-6 py-8">
            {/* Unified stat row */}
            <dl className="grid grid-cols-2 border-y border-border sm:grid-cols-4">
              {stats.map((s, i) => (
                <div
                  key={s.label}
                  className={[
                    "px-5 py-5",
                    i < stats.length - 1 ? "sm:border-r sm:border-border" : "",
                    i % 2 === 0 ? "border-r border-border sm:border-r" : "",
                    i < 2 ? "border-b border-border sm:border-b-0" : "",
                  ].join(" ")}
                >
                  <dt className="font-mono text-[20px] leading-none text-text-primary">{s.value}</dt>
                  <dd className="mt-2 text-[12px] tracking-[0.04em] text-text-muted">{s.label}</dd>
                </div>
              ))}
            </dl>

            {/* Jump back in */}
            <p className="pt-10 font-mono text-[11px] uppercase tracking-[0.08em] text-text-muted">
              Jump back in
            </p>
            <div className="mt-2">
              {recent.map((ch) => {
                const space = data.spaces.find((s) => s.id === ch.spaceId);
                return (
                  <button
                    key={ch.id}
                    type="button"
                    onClick={() => onOpenChannel?.(ch.spaceId, ch.id)}
                    className="flex h-10 w-full items-center gap-3 border-b border-border px-1 text-left transition-colors hover:bg-hover-row"
                  >
                    <ChannelGlyph type={ch.type} size={11} />
                    <span
                      className={cn(
                        "min-w-0 flex-1 truncate text-[14px]",
                        ch.unread ? "font-medium text-text-primary" : "text-text-secondary"
                      )}
                    >
                      {ch.name}
                    </span>
                    <span className="font-mono text-[11px] text-text-faint">{space?.name}</span>
                    {ch.unread && <span className="h-1.5 w-1.5 rounded-full bg-accent" />}
                  </button>
                );
              })}
            </div>

            {/* Active now */}
            <p className="pt-10 font-mono text-[11px] uppercase tracking-[0.08em] text-text-muted">
              Active now
            </p>
            {voiceActive.length === 0 ? (
              <p className="mt-2 text-[13px] text-text-muted">
                No voice channels are live. When friends hop in, they&apos;ll show up here.
              </p>
            ) : (
              <div className="mt-2">
                {voiceActive.map(({ channel, parts }) => (
                  <button
                    key={channel.id}
                    type="button"
                    onClick={() => onOpenChannel?.(channel.spaceId, channel.id)}
                    className="flex h-12 w-full items-center gap-3 border-b border-border px-1 text-left transition-colors hover:bg-hover-row"
                  >
                    <ChannelGlyph type="voice" size={12} />
                    <span className="min-w-0 flex-1 truncate text-[14px] text-text-primary">
                      {channel.name}
                    </span>
                    <div className="flex items-center">
                      {parts.slice(0, 4).map((p, i) => (
                        <div key={p.id} className={cn(i > 0 && "-ml-1.5")}>
                          <Avatar src={p.avatar} name={p.name} size={22} radius={5} />
                        </div>
                      ))}
                    </div>
                    <span className="font-mono text-[11px] text-status-online">live</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
