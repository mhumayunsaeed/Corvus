"use client";

import { useState, type CSSProperties } from "react";
import {
    Hash,
    Volume2,
    Megaphone,
    ChevronDown,
    ChevronRight,
    Settings,
    MicOff,
    Bell,
    Plus,
    UserPlus,
    Radio,
    LogOut,
    Lock,
} from "lucide-react";
import { useAppStore } from "@/stores/app-store";
import { useVoiceStore } from "@/stores/voice-store";
import { useNotificationStore } from "@/stores/notification-store";
import { useAuthStore } from "@/stores/auth-store";
import { joinVoiceChannel, leaveServer } from "@/lib/api";
import { UserDock } from "./UserDock";
import { UserAvatar } from "./UserAvatar";
import { getUsernameColor } from "@/lib/color-utils";

interface ChannelListProps {
    serverName: string;
    serverId: string;
    serverRole: string;
    serverOwnerId: string;
    onCreateChannel: () => void;
    onInvite: () => void;
    onOpenSettings: () => void;
    onOpenServerSettings: () => void;
    panelWidth?: number;
}

export function ChannelList({
    serverName,
    serverId,
    serverRole,
    serverOwnerId,
    onCreateChannel,
    onInvite,
    onOpenSettings,
    onOpenServerSettings,
    panelWidth = 360,
}: ChannelListProps) {
    const [collapsedCategories, setCollapsedCategories] = useState<string[]>([]);
    const [joiningChannel, setJoiningChannel] = useState<string | null>(null);
    const [showHeaderMenu, setShowHeaderMenu] = useState(false);
    const channels = useAppStore((s) => s.channels);
    const activeChannelId = useAppStore((s) => s.activeChannelId);
    const setActiveChannel = useAppStore((s) => s.setActiveChannel);
    const removeServer = useAppStore((s) => s.removeServer);
    const channelUnread = useNotificationStore((s) => s.channelUnread);
    const channelMentions = useNotificationStore((s) => s.channelMentions);
    const markChannelRead = useNotificationStore((s) => s.markChannelRead);
    const currentVoiceChannelId = useVoiceStore((s) => s.currentChannelId);
    const channelParticipants = useVoiceStore((s) => s.channelParticipants);
    const joinVoice = useVoiceStore((s) => s.joinChannel);
    const user = useAuthStore((s) => s.user);

    const isOwner = user?.id === serverOwnerId;
    const isAdmin = serverRole === "admin" || isOwner;

    const categories = Array.from(new Set(channels.map((c) => c.category)));

    const toggleCategory = (category: string) => {
        setCollapsedCategories((prev) =>
            prev.includes(category)
                ? prev.filter((c) => c !== category)
                : [...prev, category]
        );
    };

    const getChannelIcon = (type: string) => {
        switch (type) {
            case "text": return Hash;
            case "voice": return Volume2;
            case "stage": return Radio;
            case "announcement": return Megaphone;
            default: return Hash;
        }
    };

    const handleChannelClick = async (channel: { id: string; type: string; name: string }) => {
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
    };

    const handleLeaveServer = async () => {
        if (!user) return;
        if (!window.confirm(`Leave "${serverName}"? You will lose access to all channels.`)) return;
        try {
            await leaveServer(serverId, user.id);
            removeServer(serverId);
        } catch (err) {
            console.error("Failed to leave server:", err);
        }
    };

    return (
        <div
            className="w-full lg:[width:var(--panel-width)] max-h-[42vh] lg:max-h-none bg-channel-sidebar flex flex-col border-b lg:border-b-0 lg:border-r border-border-subtle flex-shrink-0 relative overflow-visible"
            style={{ "--panel-width": `${panelWidth}px` } as CSSProperties}
        >
            {/* Server Header */}
            <div className="relative">
                <button
                    onClick={() => setShowHeaderMenu((v) => !v)}
                    className="w-full h-[52px] px-4 flex items-center justify-between hover:bg-hover-row transition-colors group flex-shrink-0 border-b border-border-subtle"
                >
                    <span className="text-[14px] font-semibold text-text-primary truncate tracking-[-0.01em]">
                        {serverName}
                    </span>
                    <div className={`w-5 h-5 rounded-md flex items-center justify-center text-text-muted group-hover:text-text-secondary transition-all ${showHeaderMenu ? "bg-hover-row-strong rotate-180" : ""}`}>
                        <ChevronDown className="w-3.5 h-3.5" />
                    </div>
                </button>

                {/* Dropdown Menu */}
                {showHeaderMenu && (
                    <>
                        <div
                            className="fixed inset-0 z-40"
                            onClick={() => setShowHeaderMenu(false)}
                        />
                        <div className="absolute top-[52px] left-2 right-2 z-50 bg-surface-overlay border border-border-highlight rounded-xl shadow-float-lg py-1.5 animate-scale-in origin-top">
                            {isAdmin && (
                                <button
                                    onClick={() => {
                                        setShowHeaderMenu(false);
                                        onOpenServerSettings();
                                    }}
                                    className="w-full flex items-center gap-2.5 px-3 py-2 text-[13px] text-text-secondary hover:bg-hover-row-strong hover:text-text-primary transition-colors rounded-lg mx-0"
                                >
                                    <Settings className="w-3.5 h-3.5 text-text-muted" />
                                    Server Settings
                                </button>
                            )}
                            {isAdmin && (
                                <button
                                    onClick={() => {
                                        setShowHeaderMenu(false);
                                        onCreateChannel();
                                    }}
                                    className="w-full flex items-center gap-2.5 px-3 py-2 text-[13px] text-text-secondary hover:bg-hover-row-strong hover:text-text-primary transition-colors rounded-lg"
                                >
                                    <Plus className="w-3.5 h-3.5 text-text-muted" />
                                    Create Channel
                                </button>
                            )}
                            <button
                                onClick={() => {
                                    setShowHeaderMenu(false);
                                    onInvite();
                                }}
                                className="w-full flex items-center gap-2.5 px-3 py-2 text-[13px] text-text-secondary hover:bg-hover-row-strong hover:text-text-primary transition-colors rounded-lg"
                            >
                                <UserPlus className="w-3.5 h-3.5 text-text-muted" />
                                Invite People
                            </button>
                            <button
                                onClick={() => {
                                    setShowHeaderMenu(false);
                                    onOpenSettings();
                                }}
                                className="w-full flex items-center gap-2.5 px-3 py-2 text-[13px] text-text-secondary hover:bg-hover-row-strong hover:text-text-primary transition-colors rounded-lg"
                            >
                                <Bell className="w-3.5 h-3.5 text-text-muted" />
                                Notification Settings
                            </button>

                            {!isOwner && (
                                <>
                                    <div className="h-px bg-border mx-2 my-1.5" />
                                    <button
                                        onClick={() => {
                                            setShowHeaderMenu(false);
                                            handleLeaveServer();
                                        }}
                                        className="w-full flex items-center gap-2.5 px-3 py-2 text-[13px] text-danger hover:bg-danger/10 transition-colors rounded-lg"
                                    >
                                        <LogOut className="w-3.5 h-3.5" />
                                        Leave Server
                                    </button>
                                </>
                            )}
                        </div>
                    </>
                )}
            </div>

            {/* Channel list */}
            <div className="flex-1 overflow-y-auto px-1.5 py-2 scrollbar-none">
                {categories.map((category) => {
                    const categoryChannels = channels.filter((c) => c.category === category);
                    const isCollapsed = collapsedCategories.includes(category);

                    const hasUnread = isCollapsed && categoryChannels.some(
                        (c) => (channelUnread[c.id] || 0) > 0
                    );

                    return (
                        <div key={category} className="mb-1">
                            {/* Category header */}
                            <div className="flex items-center justify-between px-1 mb-0.5">
                                <button
                                    onClick={() => toggleCategory(category)}
                                    className="flex-1 flex items-center gap-1 py-1.5 text-[11px] font-semibold text-text-faint hover:text-text-muted uppercase tracking-[0.08em] transition-colors group/cat"
                                >
                                    <span className={`transition-transform duration-150 ${isCollapsed ? "" : "rotate-0"}`}>
                                        {isCollapsed ? (
                                            <ChevronRight className="w-3 h-3" />
                                        ) : (
                                            <ChevronDown className="w-3 h-3" />
                                        )}
                                    </span>
                                    <span className="group-hover/cat:text-text-secondary transition-colors">{category}</span>
                                    {hasUnread && (
                                        <span className="w-1.5 h-1.5 rounded-full bg-accent-violet ml-1 animate-pulse" />
                                    )}
                                </button>
                                {isAdmin && (
                                    <button
                                        onClick={onCreateChannel}
                                        className="w-5 h-5 rounded flex items-center justify-center text-text-faint hover:text-text-secondary hover:bg-hover-row transition-all opacity-0 group-hover:opacity-100"
                                        title="Create Channel"
                                    >
                                        <Plus className="w-3 h-3" />
                                    </button>
                                )}
                            </div>

                            {/* Channels */}
                            {!isCollapsed && (
                                <div className="space-y-[1px]">
                                    {categoryChannels.map((channel) => {
                                        const Icon = getChannelIcon(channel.type);
                                        const isVoice = channel.type === "voice" || channel.type === "stage";
                                        const isActive = isVoice
                                            ? currentVoiceChannelId === channel.id
                                            : channel.id === activeChannelId;
                                        const isJoining = joiningChannel === channel.id;
                                        const participants = channelParticipants[channel.id] || [];
                                        const unreadCount = channelUnread[channel.id] || 0;
                                        const mentionCount = channelMentions[channel.id] || 0;
                                        const showUnreadDot = !isVoice && mentionCount === 0 && unreadCount > 0;

                                        return (
                                            <div key={channel.id}>
                                                <button
                                                    onClick={() => handleChannelClick(channel)}
                                                    disabled={isJoining}
                                                    className={`w-full flex items-center gap-2 px-2.5 py-[5px] rounded-lg transition-all duration-150 group/ch relative ${
                                                        isActive
                                                            ? isVoice
                                                                ? "bg-active-row-teal text-accent-teal"
                                                                : "bg-active-row text-text-primary"
                                                            : "text-text-muted hover:bg-hover-row hover:text-text-secondary"
                                                    } ${isJoining ? "opacity-50 cursor-wait" : ""}`}
                                                >
                                                    {/* Active left bar */}
                                                    {isActive && !isVoice && (
                                                        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-[18px] rounded-r-full bg-accent-violet shadow-[0_0_6px_rgba(124,106,247,0.5)]" />
                                                    )}

                                                    <Icon
                                                        className={`w-[15px] h-[15px] flex-shrink-0 ${
                                                            isActive
                                                                ? isVoice ? "text-accent-teal" : "text-text-secondary"
                                                                : "text-text-faint group-hover/ch:text-text-muted"
                                                        }`}
                                                    />
                                                    <span className={`text-[13px] truncate flex-1 text-left transition-colors ${
                                                        isActive && !isVoice
                                                            ? "font-medium text-text-primary"
                                                            : !isVoice && unreadCount > 0
                                                                ? "font-semibold text-text-primary"
                                                                : ""
                                                    }`}>
                                                        {channel.name}
                                                    </span>

                                                    <div className="ml-auto flex items-center gap-1 flex-shrink-0">
                                                        {/* Mention badge */}
                                                        {!isVoice && mentionCount > 0 && (
                                                            <span className="h-[18px] min-w-[18px] px-1 rounded-full bg-danger text-white text-[10px] font-bold leading-[18px] text-center">
                                                                {mentionCount > 99 ? "99+" : mentionCount}
                                                            </span>
                                                        )}
                                                        {/* Unread dot */}
                                                        {showUnreadDot && (
                                                            <span className="w-1.5 h-1.5 rounded-full bg-text-secondary" />
                                                        )}
                                                        {/* Hover actions */}
                                                        {isActive && !isVoice && (
                                                            <div className="flex items-center gap-0.5 opacity-0 group-hover/ch:opacity-100 transition-opacity">
                                                                <div className="w-[18px] h-[18px] rounded flex items-center justify-center text-text-muted hover:text-text-primary hover:bg-hover-row-strong transition-colors">
                                                                    <Settings className="w-3 h-3" />
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                </button>

                                                {/* Voice channel participants */}
                                                {isVoice && participants.length > 0 && (
                                                    <div className="ml-8 space-y-0.5 mt-0.5 mb-1 pl-1 border-l border-border">
                                                        {participants.map((p) => (
                                                            <div
                                                                key={p.userId}
                                                                className="flex items-center gap-1.5 px-1 py-0.5 rounded-md hover:bg-hover-row transition-colors"
                                                            >
                                                                <div
                                                                    className={`relative w-4 h-4 rounded-full overflow-hidden flex-shrink-0 ${
                                                                        p.isSpeaking
                                                                            ? "ring-[1.5px] ring-accent-teal shadow-glow-teal-sm"
                                                                            : ""
                                                                    }`}
                                                                >
                                                                    <UserAvatar
                                                                        avatarUrl={p.avatarUrl}
                                                                        username={p.username}
                                                                        className="w-full h-full"
                                                                    />
                                                                </div>
                                                                <span
                                                                    className="text-[11px] font-medium truncate flex-1"
                                                                    style={{ color: getUsernameColor(p.username) }}
                                                                >
                                                                    {p.displayName}
                                                                </span>
                                                                {p.isMuted && (
                                                                    <MicOff className="w-2.5 h-2.5 text-danger flex-shrink-0" />
                                                                )}
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

            <UserDock onOpenSettings={onOpenSettings} />
        </div>
    );
}
