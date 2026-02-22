"use client";

import { useState } from "react";
import {
    Hash,
    Volume2,
    Megaphone,
    ChevronDown,
    ChevronRight,
    Settings,
    Mic,
    MicOff,
    Headphones,
    Bell,
    Plus,
    UserPlus,
    Radio,
} from "lucide-react";
import { useAppStore } from "@/stores/app-store";
import { useAuthStore } from "@/stores/auth-store";
import { useVoiceStore } from "@/stores/voice-store";
import { joinVoiceChannel } from "@/lib/api";

interface ChannelListProps {
    serverName: string;
    onCreateChannel: () => void;
    onInvite: () => void;
    onOpenSettings: () => void;
}

const statusColors: Record<string, string> = {
    online: "#3ECF8E",
    idle: "#F59E0B",
    dnd: "#F75F6E",
    invisible: "#6B7280",
    offline: "#6B7280",
};

export function ChannelList({ serverName, onCreateChannel, onInvite, onOpenSettings }: ChannelListProps) {
    const [collapsedCategories, setCollapsedCategories] = useState<string[]>([]);
    const [joiningChannel, setJoiningChannel] = useState<string | null>(null);
    const channels = useAppStore((s) => s.channels);
    const activeChannelId = useAppStore((s) => s.activeChannelId);
    const setActiveChannel = useAppStore((s) => s.setActiveChannel);
    const user = useAuthStore((s) => s.user);

    const currentVoiceChannelId = useVoiceStore((s) => s.currentChannelId);
    const channelParticipants = useVoiceStore((s) => s.channelParticipants);
    const joinVoice = useVoiceStore((s) => s.joinChannel);

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
            // Join voice channel
            if (currentVoiceChannelId === channel.id) return; // Already connected
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
        }
    };

    const userAvatar = user?.avatar || `https://api.dicebear.com/9.x/avataaars/svg?seed=${user?.username || "user"}`;
    const userStatus = user?.status || "online";

    return (
        <div className="w-[240px] bg-channel-sidebar flex flex-col border-r border-border flex-shrink-0">
            {/* Server Header */}
            <button className="h-12 px-4 flex items-center justify-between border-b border-border hover:bg-hover-row transition-colors group flex-shrink-0">
                <span className="text-emphasis font-semibold text-text-primary truncate">
                    {serverName}
                </span>
                <ChevronDown className="w-4 h-4 text-text-muted group-hover:text-text-primary transition-colors flex-shrink-0" />
            </button>

            {/* Quick actions */}
            <div className="px-2 py-2 flex items-center gap-1 border-b border-border">
                <button
                    onClick={onInvite}
                    className="flex-1 flex items-center gap-2 px-3 py-1.5 rounded-md text-micro text-text-muted hover:text-text-primary hover:bg-hover-row transition-colors"
                >
                    <UserPlus className="w-3.5 h-3.5" />
                    Invite
                </button>
                <button className="flex-1 flex items-center gap-2 px-3 py-1.5 rounded-md text-micro text-text-muted hover:text-text-primary hover:bg-hover-row transition-colors">
                    <Bell className="w-3.5 h-3.5" />
                    Notifications
                </button>
            </div>

            {/* Channel list */}
            <div className="flex-1 overflow-y-auto px-2 py-2 scrollbar-none">
                {categories.map((category) => {
                    const categoryChannels = channels.filter((c) => c.category === category);
                    const isCollapsed = collapsedCategories.includes(category);

                    return (
                        <div key={category} className="mb-3">
                            {/* Category header */}
                            <div className="flex items-center justify-between pr-1">
                                <button
                                    onClick={() => toggleCategory(category)}
                                    className="flex-1 flex items-center gap-1 px-1 py-1 text-micro font-semibold text-text-muted hover:text-text-primary uppercase tracking-[0.06em] transition-colors group"
                                >
                                    <div className="transition-transform duration-150">
                                        {isCollapsed ? (
                                            <ChevronRight className="w-3 h-3" />
                                        ) : (
                                            <ChevronDown className="w-3 h-3" />
                                        )}
                                    </div>
                                    {category}
                                </button>
                                <button
                                    onClick={onCreateChannel}
                                    className="w-4 h-4 rounded hover:bg-hover-row flex items-center justify-center text-text-muted hover:text-text-primary opacity-0 group-hover:opacity-100 transition-all"
                                    title="Create Channel"
                                >
                                    <Plus className="w-3 h-3" />
                                </button>
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

                                        return (
                                            <div key={channel.id}>
                                                <button
                                                    onClick={() => handleChannelClick(channel)}
                                                    disabled={isJoining}
                                                    className={`w-full flex items-center gap-2 px-2 py-[6px] rounded-md transition-all duration-150 group relative ${isActive
                                                            ? isVoice
                                                                ? "bg-accent-teal/10 text-accent-teal"
                                                                : "bg-surface-raised text-text-primary"
                                                            : "text-text-muted hover:bg-surface-raised/50 hover:text-text-primary"
                                                        } ${isJoining ? "opacity-50" : ""}`}
                                                >
                                                    <Icon
                                                        className={`w-[18px] h-[18px] flex-shrink-0 ${isActive
                                                                ? isVoice
                                                                    ? "text-accent-teal"
                                                                    : "text-text-primary"
                                                                : "text-text-muted"
                                                            }`}
                                                    />
                                                    <span className="text-body truncate">
                                                        {channel.name}
                                                    </span>

                                                    {isActive && !isVoice && (
                                                        <div className="ml-auto flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                                            <div className="w-5 h-5 rounded hover:bg-hover-row flex items-center justify-center text-text-muted hover:text-text-primary">
                                                                <Settings className="w-3 h-3" />
                                                            </div>
                                                        </div>
                                                    )}
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
                                                                    <img
                                                                        src={
                                                                            p.avatarUrl ||
                                                                            `https://api.dicebear.com/9.x/avataaars/svg?seed=${p.username}`
                                                                        }
                                                                        alt=""
                                                                        className="w-full h-full"
                                                                    />
                                                                </div>
                                                                <span className="text-micro text-text-muted truncate flex-1">
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

            {/* User panel (bottom) */}
            <div className="h-[52px] px-2 flex items-center gap-2 bg-background/50 border-t border-border flex-shrink-0">
                <div className="relative">
                    <img
                        src={userAvatar}
                        alt={user?.displayName || "You"}
                        className="w-8 h-8 rounded-full bg-surface"
                    />
                    <div
                        className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-background"
                        style={{ backgroundColor: statusColors[userStatus] }}
                    />
                </div>
                <div className="flex-1 min-w-0">
                    <div className="text-body font-medium text-text-primary truncate leading-tight">
                        {user?.displayName || "User"}
                    </div>
                    <div className="text-micro text-text-muted leading-tight truncate">
                        @{user?.username || "user"}
                    </div>
                </div>
                <div className="flex items-center gap-0.5">
                    <button className="w-7 h-7 rounded-md hover:bg-hover-row flex items-center justify-center text-text-muted hover:text-text-primary transition-colors">
                        <Mic className="w-[14px] h-[14px]" />
                    </button>
                    <button className="w-7 h-7 rounded-md hover:bg-hover-row flex items-center justify-center text-text-muted hover:text-text-primary transition-colors">
                        <Headphones className="w-[14px] h-[14px]" />
                    </button>
                    <button onClick={onOpenSettings} className="w-7 h-7 rounded-md hover:bg-hover-row flex items-center justify-center text-text-muted hover:text-text-primary transition-colors">
                        <Settings className="w-[14px] h-[14px]" />
                    </button>
                </div>
            </div>
        </div>
    );
}
