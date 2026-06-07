"use client";

import { useCallback, useState, type CSSProperties } from "react";
import {
    Hash,
    Volume2,
    Radio,
    Megaphone,
    ChevronDown,
    ChevronRight,
    Home,
    Plus,
    Compass,
    Search,
    Settings,
    Lock,
    Loader2,
} from "lucide-react";
import { useAppStore } from "@/stores/app-store";
import { useAuthStore } from "@/stores/auth-store";
import { useVoiceStore } from "@/stores/voice-store";
import {
    useNotificationStore,
    getServerUnreadCounts,
} from "@/stores/notification-store";
import { joinVoiceChannel } from "@/lib/api";
import { UserDock } from "@/components/app/UserDock";
import { UserAvatar } from "@/components/app/UserAvatar";
import { openCommandPalette } from "./openCommand";

interface SidebarProps {
    onCreateServer: () => void;
    onJoinServer: () => void;
    onCreateChannel: () => void;
    onInvite: () => void;
    onOpenSettings: () => void;
    onOpenServerSettings: () => void;
    width?: number;
}

const channelIcon = (type: string) => {
    switch (type) {
        case "voice":
            return Volume2;
        case "stage":
            return Radio;
        case "announcement":
            return Megaphone;
        default:
            return Hash;
    }
};

function serverInitials(name: string) {
    return name
        .split(" ")
        .map((w) => w[0])
        .join("")
        .slice(0, 2)
        .toUpperCase();
}

export function Sidebar({
    onCreateServer,
    onJoinServer,
    onCreateChannel,
    onInvite,
    onOpenSettings,
    onOpenServerSettings,
    width = 264,
}: SidebarProps) {
    const [collapsedCategories, setCollapsedCategories] = useState<string[]>([]);
    const [joiningChannel, setJoiningChannel] = useState<string | null>(null);

    const servers = useAppStore((s) => s.servers);
    const channels = useAppStore((s) => s.channels);
    const dmConversations = useAppStore((s) => s.dmConversations);
    const activeServerId = useAppStore((s) => s.activeServerId);
    const activeChannelId = useAppStore((s) => s.activeChannelId);
    const activeDMConversationId = useAppStore((s) => s.activeDMConversationId);
    const setActiveServer = useAppStore((s) => s.setActiveServer);
    const setActiveChannel = useAppStore((s) => s.setActiveChannel);
    const setActiveDMConversation = useAppStore((s) => s.setActiveDMConversation);
    const user = useAuthStore((s) => s.user);

    const channelUnread = useNotificationStore((s) => s.channelUnread);
    const channelMentions = useNotificationStore((s) => s.channelMentions);
    const channelServerMap = useNotificationStore((s) => s.channelServerMap);
    const dmUnread = useNotificationStore((s) => s.dmUnread);
    const markChannelRead = useNotificationStore((s) => s.markChannelRead);

    const currentVoiceChannelId = useVoiceStore((s) => s.currentChannelId);
    const joinVoice = useVoiceStore((s) => s.joinChannel);

    const serverUnread = getServerUnreadCounts(
        channelServerMap,
        channelUnread,
        channelMentions
    );

    const isHome = activeServerId === null && activeDMConversationId === null;
    const activeServer = servers.find((s) => s.id === activeServerId) ?? null;
    const isAdmin =
        activeServer != null &&
        (activeServer.role === "admin" || activeServer.ownerId === user?.id);

    const categories = Array.from(new Set(channels.map((c) => c.category)));

    const toggleCategory = (category: string) =>
        setCollapsedCategories((prev) =>
            prev.includes(category)
                ? prev.filter((c) => c !== category)
                : [...prev, category]
        );

    const dmLabel = useCallback(
        (conversation: (typeof dmConversations)[number]) => {
            if (conversation.name) return conversation.name;
            const others = conversation.participants.filter(
                (p) => p.id !== user?.id
            );
            if (others.length === 0) return "Direct Message";
            return others.map((p) => p.displayName || p.username).join(", ");
        },
        [user?.id]
    );

    const handleChannelClick = useCallback(
        async (channel: { id: string; type: string }) => {
            if (channel.type === "voice" || channel.type === "stage") {
                if (currentVoiceChannelId === channel.id) return;
                setJoiningChannel(channel.id);
                try {
                    const result = await joinVoiceChannel(channel.id);
                    joinVoice({
                        channelId: channel.id,
                        serverId: result.serverId,
                        channelName: result.channelName,
                        serverName: result.serverName,
                        channelType: result.channelType,
                        token: result.token,
                        url: result.url,
                        roomName: result.roomName,
                        participants: result.participants,
                    });
                } catch (err) {
                    console.error("Failed to join voice channel:", err);
                } finally {
                    setJoiningChannel(null);
                }
            } else {
                setActiveChannel(channel.id);
                markChannelRead(channel.id);
            }
        },
        [currentVoiceChannelId, joinVoice, setActiveChannel, markChannelRead]
    );

    return (
        <aside
            className="flex h-full w-full flex-col bg-channel-sidebar lg:[width:var(--sidebar-w)] lg:flex-shrink-0"
            style={{ "--sidebar-w": `${width}px` } as CSSProperties}
        >
            {/* Brand + command trigger */}
            <div className="flex-shrink-0 px-3 pb-2 pt-3">
                <button
                    onClick={openCommandPalette}
                    aria-label="Open command palette"
                    aria-keyshortcuts="Meta+K Control+K"
                    className="group flex h-9 w-full items-center gap-2.5 rounded-lg border border-border-subtle bg-surface-raised px-2.5 text-text-muted transition-colors hover:border-border-highlight hover:text-text-secondary"
                >
                    <Search className="h-3.5 w-3.5" />
                    <span className="flex-1 text-left text-[13px]">Jump to…</span>
                    <kbd className="rounded border border-border-highlight bg-surface px-1.5 py-0.5 text-[10px] font-medium">
                        ⌘K
                    </kbd>
                </button>
            </div>

            <nav className="min-h-0 flex-1 space-y-4 overflow-y-auto px-2 pb-3 scrollbar-none">
                {/* Home */}
                <button
                    onClick={() => {
                        setActiveServer(null);
                        setActiveDMConversation(null);
                    }}
                    className={`flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-[14px] font-medium transition-colors ${
                        isHome
                            ? "bg-accent-soft text-accent"
                            : "text-text-secondary hover:bg-hover-row hover:text-text-primary"
                    }`}
                >
                    <Home className="h-4 w-4" />
                    Home
                </button>

                {/* Direct messages */}
                {dmConversations.length > 0 && (
                    <div>
                        <div className="px-2.5 pb-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-text-faint">
                            Direct Messages
                        </div>
                        <div className="space-y-0.5">
                            {dmConversations.slice(0, 12).map((conversation) => {
                                const active =
                                    conversation.id === activeDMConversationId;
                                const unread = dmUnread[conversation.id] || 0;
                                const other = conversation.participants.find(
                                    (p) => p.id !== user?.id
                                );
                                return (
                                    <button
                                        key={conversation.id}
                                        onClick={() =>
                                            setActiveDMConversation(conversation.id)
                                        }
                                        className={`group flex w-full items-center gap-2.5 rounded-lg px-2 py-1.5 text-left transition-colors ${
                                            active
                                                ? "bg-active-row text-text-primary"
                                                : "text-text-secondary hover:bg-hover-row hover:text-text-primary"
                                        }`}
                                    >
                                        <UserAvatar
                                            avatarUrl={other?.avatarUrl}
                                            username={other?.username || "dm"}
                                            className="h-6 w-6 flex-shrink-0"
                                        />
                                        <span className="flex-1 truncate text-[13px] font-medium">
                                            {dmLabel(conversation)}
                                        </span>
                                        {unread > 0 && (
                                            <span className="h-[18px] min-w-[18px] flex-shrink-0 rounded-full bg-danger px-1 text-center text-[10px] font-bold leading-[18px] text-white">
                                                {unread > 99 ? "99+" : unread}
                                            </span>
                                        )}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* Spaces */}
                <div>
                    <div className="flex items-center justify-between px-2.5 pb-1">
                        <span className="text-[10px] font-semibold uppercase tracking-[0.08em] text-text-faint">
                            Spaces
                        </span>
                        <div className="flex items-center gap-0.5">
                            <button
                                onClick={onCreateServer}
                                title="Create a Space"
                                aria-label="Create a Space"
                                className="flex h-5 w-5 items-center justify-center rounded text-text-muted transition-colors hover:bg-hover-row-strong hover:text-success"
                            >
                                <Plus className="h-3.5 w-3.5" />
                            </button>
                            <button
                                onClick={onJoinServer}
                                title="Join a Space"
                                aria-label="Join a Space"
                                className="flex h-5 w-5 items-center justify-center rounded text-text-muted transition-colors hover:bg-hover-row-strong hover:text-info"
                            >
                                <Compass className="h-3.5 w-3.5" />
                            </button>
                        </div>
                    </div>

                    <div className="space-y-0.5">
                        {servers.map((server) => {
                            const active = server.id === activeServerId;
                            const badge = serverUnread[server.id];
                            const hasMentions = !!badge && badge.mentions > 0;
                            const hasUnread = !!badge && badge.unread > 0;
                            return (
                                <div key={server.id}>
                                    <button
                                        onClick={() => setActiveServer(server.id)}
                                        className={`group flex w-full items-center gap-2.5 rounded-lg px-2 py-1.5 text-left transition-colors ${
                                            active
                                                ? "bg-active-row text-text-primary"
                                                : "text-text-secondary hover:bg-hover-row hover:text-text-primary"
                                        }`}
                                    >
                                        <span className="relative flex-shrink-0">
                                            {server.iconUrl ? (
                                                <img
                                                    src={server.iconUrl}
                                                    alt={server.name}
                                                    className="h-6 w-6 rounded-md object-cover"
                                                />
                                            ) : (
                                                <span
                                                    className={`flex h-6 w-6 items-center justify-center rounded-md text-[10px] font-bold ${
                                                        active
                                                            ? "bg-accent text-white"
                                                            : "bg-surface-raised text-text-secondary"
                                                    }`}
                                                >
                                                    {serverInitials(server.name)}
                                                </span>
                                            )}
                                        </span>
                                        <span className="flex-1 truncate text-[13px] font-semibold">
                                            {server.name}
                                        </span>
                                        {hasMentions ? (
                                            <span className="h-[18px] min-w-[18px] flex-shrink-0 rounded-full bg-danger px-1 text-center text-[10px] font-bold leading-[18px] text-white">
                                                {badge.mentions > 99 ? "99+" : badge.mentions}
                                            </span>
                                        ) : hasUnread ? (
                                            <span className="h-2 w-2 flex-shrink-0 rounded-full bg-text-secondary" />
                                        ) : (
                                            <ChevronRight
                                                className={`h-3.5 w-3.5 flex-shrink-0 text-text-faint transition-transform ${active ? "rotate-90" : "opacity-0 group-hover:opacity-100"}`}
                                            />
                                        )}
                                    </button>

                                    {/* Channels of the active space */}
                                    {active && (
                                        <div className="mb-1 ml-2 mt-0.5 space-y-2 border-l border-border-subtle pl-2">
                                            {isAdmin && channels.length === 0 && (
                                                <button
                                                    onClick={onCreateChannel}
                                                    className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-[12px] text-text-muted hover:bg-hover-row hover:text-text-secondary"
                                                >
                                                    <Plus className="h-3.5 w-3.5" /> Create a channel
                                                </button>
                                            )}
                                            {categories.map((category) => {
                                                const categoryChannels = channels
                                                    .filter((c) => c.category === category)
                                                    .sort((a, b) => a.position - b.position);
                                                if (categoryChannels.length === 0) return null;
                                                const collapsed =
                                                    collapsedCategories.includes(category);
                                                return (
                                                    <div key={category}>
                                                        {category && (
                                                            <button
                                                                onClick={() => toggleCategory(category)}
                                                                className="flex w-full items-center gap-1 px-1.5 py-1 text-[10px] font-semibold uppercase tracking-[0.06em] text-text-faint transition-colors hover:text-text-muted"
                                                            >
                                                                <ChevronDown
                                                                    className={`h-3 w-3 transition-transform ${collapsed ? "-rotate-90" : ""}`}
                                                                />
                                                                {category}
                                                            </button>
                                                        )}
                                                        {!collapsed &&
                                                            categoryChannels.map((channel) => {
                                                                const Icon = channelIcon(channel.type);
                                                                const isActiveChannel =
                                                                    channel.id === activeChannelId;
                                                                const unread =
                                                                    channelUnread[channel.id] || 0;
                                                                const mentions =
                                                                    channelMentions[channel.id] || 0;
                                                                const isVoiceActive =
                                                                    currentVoiceChannelId === channel.id;
                                                                return (
                                                                    <button
                                                                        key={channel.id}
                                                                        onClick={() =>
                                                                            handleChannelClick(channel)
                                                                        }
                                                                        className={`group flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left transition-colors ${
                                                                            isActiveChannel || isVoiceActive
                                                                                ? "bg-active-row text-text-primary"
                                                                                : unread > 0
                                                                                  ? "text-text-primary hover:bg-hover-row"
                                                                                  : "text-text-muted hover:bg-hover-row hover:text-text-secondary"
                                                                        }`}
                                                                    >
                                                                        {joiningChannel === channel.id ? (
                                                                            <Loader2 className="h-3.5 w-3.5 flex-shrink-0 animate-spin" />
                                                                        ) : (
                                                                            <Icon className="h-3.5 w-3.5 flex-shrink-0" />
                                                                        )}
                                                                        <span className="flex-1 truncate text-[13px] font-medium">
                                                                            {channel.name}
                                                                        </span>
                                                                        {mentions > 0 && (
                                                                            <span className="h-[16px] min-w-[16px] flex-shrink-0 rounded-full bg-danger px-1 text-center text-[9px] font-bold leading-[16px] text-white">
                                                                                {mentions > 99 ? "99+" : mentions}
                                                                            </span>
                                                                        )}
                                                                    </button>
                                                                );
                                                            })}
                                                    </div>
                                                );
                                            })}

                                            {/* Space quick actions */}
                                            <div className="flex items-center gap-1 px-1 pt-0.5">
                                                <button
                                                    onClick={onInvite}
                                                    className="text-[11px] text-text-muted transition-colors hover:text-text-secondary"
                                                >
                                                    Invite
                                                </button>
                                                {isAdmin && (
                                                    <>
                                                        <span className="text-text-faint">·</span>
                                                        <button
                                                            onClick={onCreateChannel}
                                                            className="text-[11px] text-text-muted transition-colors hover:text-text-secondary"
                                                        >
                                                            New channel
                                                        </button>
                                                        <span className="text-text-faint">·</span>
                                                        <button
                                                            onClick={onOpenServerSettings}
                                                            className="flex items-center gap-1 text-[11px] text-text-muted transition-colors hover:text-text-secondary"
                                                        >
                                                            <Settings className="h-3 w-3" /> Settings
                                                        </button>
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            );
                        })}

                        {servers.length === 0 && (
                            <button
                                onClick={onCreateServer}
                                className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-[13px] text-text-muted transition-colors hover:bg-hover-row hover:text-text-secondary"
                            >
                                <Plus className="h-4 w-4" /> Create your first Space
                            </button>
                        )}
                    </div>
                </div>

                {/* Private/E2E hint footer note (brand flavor) */}
                <div className="px-2.5 pt-1">
                    <div className="flex items-center gap-1.5 text-[10px] text-text-faint">
                        <Lock className="h-3 w-3" /> Private by design
                    </div>
                </div>
            </nav>

            {/* Self panel (reused) */}
            <div className="flex-shrink-0 border-t border-border-subtle pt-1">
                <UserDock onOpenSettings={onOpenSettings} />
            </div>
        </aside>
    );
}
