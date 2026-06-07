"use client";

import { useMemo } from "react";
import {
    Plus,
    Compass,
    Command,
    AtSign,
    MessageSquare,
    Sparkles,
    ArrowRight,
} from "lucide-react";
import { useAppStore } from "@/stores/app-store";
import { useAuthStore } from "@/stores/auth-store";
import { useNotificationStore } from "@/stores/notification-store";
import { UserAvatar } from "@/components/app/UserAvatar";
import { openCommandPalette } from "./openCommand";
import type { FriendListEntry } from "@/lib/api";

interface HomeHubProps {
    onCreateServer: () => void;
    onJoinServer: () => void;
    friends: FriendListEntry[];
}

function greeting() {
    const h = new Date().getHours();
    if (h < 5) return "Still up";
    if (h < 12) return "Good morning";
    if (h < 18) return "Good afternoon";
    return "Good evening";
}

export function HomeHub({
    onCreateServer,
    onJoinServer,
    friends,
}: HomeHubProps) {
    const dmConversations = useAppStore((s) => s.dmConversations);
    const setActiveDMConversation = useAppStore((s) => s.setActiveDMConversation);
    const user = useAuthStore((s) => s.user);
    const dmUnread = useNotificationStore((s) => s.dmUnread);
    const channelUnread = useNotificationStore((s) => s.channelUnread);
    const channelMentions = useNotificationStore((s) => s.channelMentions);

    const totalUnread = useMemo(
        () =>
            Object.values(dmUnread).reduce((a, b) => a + b, 0) +
            Object.values(channelUnread).reduce((a, b) => a + b, 0),
        [dmUnread, channelUnread]
    );
    const totalMentions = useMemo(
        () => Object.values(channelMentions).reduce((a, b) => a + b, 0),
        [channelMentions]
    );

    const onlineFriends = friends.filter(
        (f) => f.user.status && f.user.status !== "offline" && f.user.status !== "invisible"
    );

    const recentDMs = dmConversations.slice(0, 6);
    const name = user?.displayName || user?.username || "there";

    return (
        <div className="min-h-0 flex-1 overflow-y-auto bg-background">
            <div className="mx-auto max-w-3xl px-6 py-10">
                {/* Hero */}
                <div className="relative mb-8 overflow-hidden rounded-2xl border border-border-subtle bg-surface p-7 shadow-e1">
                    <div
                        className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full opacity-30 blur-3xl"
                        style={{ background: "var(--aurora-gradient)" }}
                    />
                    <div className="relative">
                        <div className="mb-2 flex items-center gap-2 text-[12px] font-medium text-text-muted">
                            <Sparkles className="h-3.5 w-3.5 text-accent" />
                            Welcome back
                        </div>
                        <h1 className="font-display text-[28px] font-bold tracking-[-0.02em] text-text-primary">
                            {greeting()}, {name}.
                        </h1>
                        <p className="mt-1.5 text-[14px] text-text-secondary">
                            {totalUnread > 0
                                ? `You have ${totalUnread} unread message${totalUnread === 1 ? "" : "s"} waiting.`
                                : "You're all caught up. Start a conversation or jump in somewhere."}
                        </p>

                        <button
                            onClick={openCommandPalette}
                            className="mt-5 inline-flex items-center gap-2 rounded-lg border border-border-highlight bg-surface-raised px-3.5 py-2 text-[13px] font-medium text-text-secondary transition-colors hover:border-border-active hover:text-text-primary"
                        >
                            <Command className="h-3.5 w-3.5" />
                            Search or jump to anything
                            <kbd className="rounded border border-border-highlight bg-surface px-1.5 py-0.5 text-[10px]">
                                ⌘K
                            </kbd>
                        </button>
                    </div>
                </div>

                {/* Stat cards */}
                <div className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-3">
                    {[
                        {
                            label: "Mentions",
                            value: totalMentions,
                            icon: AtSign,
                            tone: "text-accent",
                        },
                        {
                            label: "Unread",
                            value: totalUnread,
                            icon: MessageSquare,
                            tone: "text-live",
                        },
                        {
                            label: "Friends online",
                            value: onlineFriends.length,
                            icon: Sparkles,
                            tone: "text-success",
                        },
                    ].map((stat) => (
                        <div
                            key={stat.label}
                            className="rounded-xl border border-border-subtle bg-surface p-4"
                        >
                            <div className="mb-2 flex items-center justify-between">
                                <span className="text-[12px] font-medium text-text-muted">
                                    {stat.label}
                                </span>
                                <stat.icon className={`h-4 w-4 ${stat.tone}`} />
                            </div>
                            <div className="font-display text-[26px] font-bold text-text-primary">
                                {stat.value}
                            </div>
                        </div>
                    ))}
                </div>

                {/* Recent DMs */}
                {recentDMs.length > 0 && (
                    <div className="mb-8">
                        <h2 className="mb-3 text-[12px] font-semibold uppercase tracking-[0.08em] text-text-faint">
                            Recent conversations
                        </h2>
                        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                            {recentDMs.map((conversation) => {
                                const other = conversation.participants.find(
                                    (p) => p.id !== user?.id
                                );
                                const unread = dmUnread[conversation.id] || 0;
                                const label =
                                    conversation.name ||
                                    conversation.participants
                                        .filter((p) => p.id !== user?.id)
                                        .map((p) => p.displayName || p.username)
                                        .join(", ") ||
                                    "Direct Message";
                                return (
                                    <button
                                        key={conversation.id}
                                        onClick={() =>
                                            setActiveDMConversation(conversation.id)
                                        }
                                        className="group flex items-center gap-3 rounded-xl border border-border-subtle bg-surface p-3 text-left transition-colors hover:border-border-highlight hover:bg-hover-row"
                                    >
                                        <UserAvatar
                                            avatarUrl={other?.avatarUrl}
                                            username={other?.username || "dm"}
                                            className="h-9 w-9 flex-shrink-0"
                                        />
                                        <div className="min-w-0 flex-1">
                                            <div className="truncate text-[14px] font-semibold text-text-primary">
                                                {label}
                                            </div>
                                            <div className="truncate text-[12px] text-text-muted">
                                                {conversation.lastMessage?.content ||
                                                    "No messages yet"}
                                            </div>
                                        </div>
                                        {unread > 0 ? (
                                            <span className="h-5 min-w-5 flex-shrink-0 rounded-full bg-danger px-1.5 text-center text-[11px] font-bold leading-5 text-white">
                                                {unread > 99 ? "99+" : unread}
                                            </span>
                                        ) : (
                                            <ArrowRight className="h-4 w-4 flex-shrink-0 text-text-faint opacity-0 transition-opacity group-hover:opacity-100" />
                                        )}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* Get-started actions */}
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <button
                        onClick={onCreateServer}
                        className="group flex items-center gap-3 rounded-xl border border-border-subtle bg-surface p-4 text-left transition-colors hover:border-accent/40 hover:bg-accent-soft"
                    >
                        <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent/15 text-accent">
                            <Plus className="h-5 w-5" />
                        </span>
                        <div>
                            <div className="text-[14px] font-semibold text-text-primary">
                                Create a Space
                            </div>
                            <div className="text-[12px] text-text-muted">
                                Start a community of your own
                            </div>
                        </div>
                    </button>
                    <button
                        onClick={onJoinServer}
                        className="group flex items-center gap-3 rounded-xl border border-border-subtle bg-surface p-4 text-left transition-colors hover:border-info/40 hover:bg-info/10"
                    >
                        <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-info/15 text-info">
                            <Compass className="h-5 w-5" />
                        </span>
                        <div>
                            <div className="text-[14px] font-semibold text-text-primary">
                                Join a Space
                            </div>
                            <div className="text-[12px] text-text-muted">
                                Use an invite link to hop in
                            </div>
                        </div>
                    </button>
                </div>
            </div>
        </div>
    );
}
