"use client";

import { useMemo } from "react";
import { Plus, LogIn } from "lucide-react";
import { useAppStore } from "@/stores/app-store";
import { useAuthStore } from "@/stores/auth-store";
import { useNotificationStore } from "@/stores/notification-store";
import { Avatar } from "@/components/ui";
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

const STATUS_DOT: Record<string, string> = {
    online: "bg-status-online",
    idle: "bg-status-idle",
    dnd: "bg-status-dnd",
};

function shortTime(iso?: string) {
    if (!iso) return "";
    const d = new Date(iso);
    const now = new Date();
    if (d.toDateString() === now.toDateString()) {
        return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false });
    }
    const days = Math.floor((+now - +d) / 86_400_000);
    if (days < 7) return d.toLocaleDateString([], { weekday: "short" });
    return d.toLocaleDateString([], { month: "short", day: "numeric" });
}

export function HomeHub({ onCreateServer, onJoinServer, friends }: HomeHubProps) {
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

    const stats: { label: string; value: number }[] = [
        { label: "Mentions", value: totalMentions },
        { label: "Unread", value: totalUnread },
        { label: "Friends online", value: onlineFriends.length },
    ];

    const summaryParts = [
        totalMentions > 0 && `${totalMentions} mention${totalMentions === 1 ? "" : "s"}`,
        totalUnread > 0 && `${totalUnread} unread message${totalUnread === 1 ? "" : "s"}`,
    ].filter(Boolean) as string[];

    return (
        <div className="min-h-0 flex-1 overflow-y-auto bg-background">
            <div className="mx-auto max-w-[680px] px-6 py-10">
                {/* Greeting */}
                <div>
                    <p className="mb-1.5 font-mono text-[13px] uppercase tracking-[0.06em] text-text-muted">
                        {greeting()}
                    </p>
                    <h1 className="text-[36px] font-semibold leading-[1.1] tracking-[-0.025em] text-text-primary">
                        {name}.
                    </h1>
                    {summaryParts.length > 0 && (
                        <p className="mt-3 text-[14px] text-text-secondary">{summaryParts.join(" and ")}.</p>
                    )}
                </div>

                {/* Command bar */}
                <button
                    onClick={openCommandPalette}
                    className="mt-8 flex h-10 w-full items-center gap-2.5 rounded-[6px] border border-border bg-surface-raised px-3 transition-colors hover:border-border-active hover:bg-surface-overlay"
                >
                    <span className="font-mono text-[14px] text-text-muted">⌘</span>
                    <span className="flex-1 text-left text-[14px] text-text-muted">Search or jump to anything</span>
                    <kbd className="rounded-[4px] border border-border bg-surface-overlay px-1.5 py-0.5 font-mono text-[11px] tracking-[0.04em] text-text-muted">
                        ⌘K
                    </kbd>
                </button>

                {/* Stats row */}
                <div className="mt-10 flex items-center overflow-hidden rounded-[10px] border border-border bg-surface-raised">
                    {stats.map((stat, i) => (
                        <div key={stat.label} className="flex flex-1 items-center">
                            {i > 0 && <span className="h-12 w-px flex-shrink-0 bg-border" />}
                            <div className="flex flex-1 cursor-default flex-col gap-1.5 px-5 py-4 transition-colors hover:bg-hover-row">
                                <span className="font-mono text-[11px] uppercase tracking-[0.08em] text-text-muted">
                                    {stat.label}
                                </span>
                                <span
                                    data-nonzero={stat.value > 0}
                                    className="font-mono text-[28px] font-semibold leading-none tracking-[-0.02em] text-text-primary data-[nonzero=true]:text-accent"
                                >
                                    {stat.value}
                                </span>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Recent conversations */}
                {recentDMs.length > 0 && (
                    <section className="mt-10">
                        <h2 className="mb-2 font-mono text-[11px] uppercase tracking-[0.1em] text-text-muted">
                            Recent
                        </h2>
                        <div className="flex flex-col">
                            {recentDMs.map((conversation) => {
                                const other = conversation.participants.find((p) => p.id !== user?.id);
                                const unread = dmUnread[conversation.id] || 0;
                                const label =
                                    conversation.name ||
                                    conversation.participants
                                        .filter((p) => p.id !== user?.id)
                                        .map((p) => p.displayName || p.username)
                                        .join(", ") ||
                                    "Direct Message";
                                const status = other?.status ?? "offline";
                                return (
                                    <button
                                        key={conversation.id}
                                        onClick={() => setActiveDMConversation(conversation.id)}
                                        className="flex h-11 items-center gap-2.5 rounded-[4px] px-2.5 text-left transition-colors hover:bg-hover-row"
                                    >
                                        <div className="relative flex-shrink-0">
                                            <Avatar
                                                src={other?.avatarUrl}
                                                name={other?.displayName || other?.username || label}
                                                size={28}
                                                radius={6}
                                            />
                                            <span
                                                className={`absolute -bottom-px -right-px h-[6px] w-[6px] rounded-full border-2 border-surface-raised ${STATUS_DOT[status] ?? "bg-text-faint"}`}
                                            />
                                        </div>
                                        <div className="flex min-w-0 flex-1 flex-col gap-px">
                                            <span className="truncate text-[14px] font-medium text-text-primary">{label}</span>
                                            <span className="truncate font-mono text-[12px] text-text-muted">
                                                {conversation.lastMessage?.content || "No messages yet"}
                                            </span>
                                        </div>
                                        <span
                                            className={`flex-shrink-0 font-mono text-[11px] ${unread > 0 ? "text-accent" : "text-text-muted"}`}
                                        >
                                            {unread > 0
                                                ? unread > 99
                                                    ? "99+"
                                                    : unread
                                                : shortTime(conversation.lastMessage?.createdAt)}
                                        </span>
                                    </button>
                                );
                            })}
                        </div>
                    </section>
                )}

                {/* Quick actions */}
                <section className="mt-8">
                    <h2 className="mb-2 font-mono text-[11px] uppercase tracking-[0.1em] text-text-muted">
                        Spaces
                    </h2>
                    <div className="grid grid-cols-2 gap-2">
                        <ActionButton
                            icon={<Plus size={16} />}
                            label="Create a Space"
                            description="Start a community"
                            onClick={onCreateServer}
                        />
                        <ActionButton
                            icon={<LogIn size={16} />}
                            label="Join a Space"
                            description="Use an invite link"
                            onClick={onJoinServer}
                        />
                    </div>
                </section>
            </div>
        </div>
    );
}

function ActionButton({
    icon,
    label,
    description,
    onClick,
}: {
    icon: React.ReactNode;
    label: string;
    description: string;
    onClick: () => void;
}) {
    return (
        <button
            onClick={onClick}
            className="group flex h-[52px] items-center gap-3 rounded-[10px] border border-border bg-surface-raised px-3.5 text-left transition-colors hover:border-border-active hover:bg-surface-overlay"
        >
            <span className="flex h-7 w-7 flex-shrink-0 items-center justify-center text-text-secondary transition-colors group-hover:text-text-primary">
                {icon}
            </span>
            <span className="flex flex-col gap-0.5">
                <span className="text-[14px] font-medium text-text-primary">{label}</span>
                <span className="font-mono text-[11px] text-text-muted">{description}</span>
            </span>
        </button>
    );
}
