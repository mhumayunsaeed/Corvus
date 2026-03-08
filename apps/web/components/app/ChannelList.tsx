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
            case "text":
                return Hash;
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
            {/* Server Header with Dropdown */}
            <div className="relative">
                <button
                    onClick={() => setShowHeaderMenu((v) => !v)}
                    className="w-full h-12 px-4 flex items-center justify-between border-b border-border-subtle hover:bg-hover-row transition-colors group flex-shrink-0"
                >
                    <span className="text-emphasis font-semibold text-text-primary truncate">
                        {serverName}
                    </span>
                    <ChevronDown className={`w-4 h-4 text-text-muted group-hover:text-text-secondary transition-all flex-shrink-0 ${showHeaderMenu ? "rotate-180" : ""}`} />
                </button>

                {/* Dropdown Menu */}
                {showHeaderMenu && (
                    <>
                        <div
                            className="fixed inset-0 z-40"
                            onClick={() => setShowHeaderMenu(false)}
                        />
                        <div className="absolute top-12 left-2 right-2 z-50 bg-surface-overlay border border-border-highlight rounded-lg shadow-float py-1.5 animate-in fade-in slide-in-from-top-1 duration-150">
                            {isAdmin && (
                                <button
                                    onClick={() => {
                                        setShowHeaderMenu(false);
                                        onOpenServerSettings();
                                    }}
                                    className="w-full flex items-center gap-2.5 px-3 py-2 text-body text-text-primary hover:bg-accent-violet hover:text-white transition-colors rounded-sm mx-0"
                                >
                                    <Settings className="w-4 h-4" />
                                    Server Settings
                                </button>
                            )}
                            <button
                                onClick={() => {
                                    setShowHeaderMenu(false);
                                    onInvite();
                                }}
                                className="w-full flex items-center gap-2.5 px-3 py-2 text-body text-text-primary hover:bg-accent-violet hover:text-white transition-colors rounded-sm"
                            >
                                <UserPlus className="w-4 h-4" />
                                Invite People
                            </button>
                            <button
                                onClick={() => {
                                    setShowHeaderMenu(false);
                                    onOpenSettings();
                                }}
                                className="w-full flex items-center gap-2.5 px-3 py-2 text-body text-text-primary hover:bg-accent-violet hover:text-white transition-colors rounded-sm"
                            >
                                <Bell className="w-4 h-4" />
                                Notification Settings
                            </button>

                            {!isOwner && (
                                <>
                                    <div className="h-px bg-border mx-2 my-1" />
                                    <button
                                        onClick={() => {
                                            setShowHeaderMenu(false);
                                            handleLeaveServer();
                                        }}
                                        className="w-full flex items-center gap-2.5 px-3 py-2 text-body text-danger hover:bg-danger hover:text-white transition-colors rounded-sm"
                                    >
                                        <LogOut className="w-4 h-4" />
                                        Leave Server
                                    </button>
                                </>
                            )}
                        </div>
                    </>
                )}
            </div>

            {/* Channel list */}
            <div className="flex-1 overflow-y-auto px-2 py-1 scrollbar-none">
                {categories.map((category) => {
                    const categoryChannels = channels.filter((c) => c.category === category);
                    const isCollapsed = collapsedCategories.includes(category);

                    // Check if collapsed category has unread channels
                    const hasUnread = isCollapsed && categoryChannels.some(
                        (c) => (channelUnread[c.id] || 0) > 0
                    );

                    return (
                        <div key={category} className="mb-3">
                            {/* Category header */}
                            <div className="flex items-center justify-between pr-1">
                                <button
                                    onClick={() => toggleCategory(category)}
                                    className="flex-1 flex items-center gap-1 px-1 py-1 text-micro font-semibold text-text-muted hover:text-text-secondary uppercase tracking-[0.06em] transition-colors group"
                                >
                                    <div className="transition-transform duration-150">
                                        {isCollapsed ? (
                                            <ChevronRight className="w-3 h-3" />
                                        ) : (
                                            <ChevronDown className="w-3 h-3" />
                                        )}
                                    </div>
                                    {category}
                                    {hasUnread && (
                                        <span className="w-2 h-2 rounded-full bg-accent-violet ml-1" />
                                    )}
                                </button>
                                {isAdmin && (
                                    <button
                                        onClick={onCreateChannel}
                                        className="w-4 h-4 rounded hover:bg-hover-row flex items-center justify-center text-text-muted hover:text-text-primary opacity-0 group-hover:opacity-100 transition-all"
                                        title="Create Channel"
                                    >
                                        <Plus className="w-3 h-3" />
                                    </button>
                                )}
                            </div>

                            {/* Channels */}
                            {!isCollapsed && (
                                <div className="space-y-[2px] mt-0.5">
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
                                                    className={`w-full flex items-center gap-2 px-2 py-[6px] rounded-md transition-all duration-150 group relative ${isActive
                                                        ? isVoice
                                                            ? "bg-accent-teal/10 text-accent-teal"
                                                            : "bg-active-row text-text-primary"
                                                        : "text-text-muted hover:bg-hover-row hover:text-text-secondary"
                                                        } ${isJoining ? "opacity-50" : ""}`}
                                                >
                                                    {/* Active indicator */}
                                                    {isActive && !isVoice && (
                                                        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r-full bg-accent-violet" />
                                                    )}
                                                    <Icon
                                                        className={`w-[18px] h-[18px] flex-shrink-0 ${isActive
                                                            ? isVoice
                                                                ? "text-accent-teal"
                                                                : "text-text-primary"
                                                            : "text-text-faint"
                                                            }`}
                                                    />
                                                    <span className={`text-body truncate ${
                                                        isActive && !isVoice
                                                            ? "font-medium"
                                                            : !isVoice && unreadCount > 0
                                                                ? "font-medium text-text-primary"
                                                                : ""
                                                    }`}>
                                                        {channel.name}
                                                    </span>

                                                    <div className="ml-auto flex items-center gap-1">
                                                        {!isVoice && mentionCount > 0 && (
                                                            <span className="h-5 min-w-[20px] px-1.5 rounded-full bg-danger text-white text-[11px] font-semibold leading-5 text-center">
                                                                {mentionCount > 99 ? "99+" : mentionCount}
                                                            </span>
                                                        )}
                                                        {showUnreadDot && (
                                                            <span className="w-2 h-2 rounded-full bg-accent-violet" />
                                                        )}
                                                        {isActive && !isVoice && (
                                                            <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                                                <div className="w-5 h-5 rounded hover:bg-hover-row flex items-center justify-center text-text-muted hover:text-text-primary">
                                                                    <Settings className="w-3 h-3" />
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                </button>

                                                {/* Voice channel participants */}
                                                {isVoice && participants.length > 0 && (
                                                    <div className="ml-7 space-y-0.5 mt-0.5 mb-1">
                                                        {participants.map((p) => (
                                                            <div
                                                                key={p.userId}
                                                                className="flex items-center gap-2 px-2 py-0.5"
                                                            >
                                                                <div
                                                                    className={`relative w-5 h-5 rounded-full overflow-hidden flex-shrink-0 ${p.isSpeaking
                                                                        ? "ring-[2px] ring-accent-teal"
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
                                                                    className="text-micro font-semibold truncate flex-1"
                                                                    style={{ color: getUsernameColor(p.username) }}
                                                                >
                                                                    {p.displayName}
                                                                </span>
                                                                {p.isMuted && (
                                                                    <MicOff className="w-3 h-3 text-danger flex-shrink-0" />
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
