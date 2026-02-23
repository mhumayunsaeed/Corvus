"use client";

import { useState } from "react";
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
} from "lucide-react";
import { useAppStore } from "@/stores/app-store";
import { useVoiceStore } from "@/stores/voice-store";
import { useNotificationStore } from "@/stores/notification-store";
import { joinVoiceChannel } from "@/lib/api";
import { UserDock } from "./UserDock";

interface ChannelListProps {
    serverName: string;
    onCreateChannel: () => void;
    onInvite: () => void;
    onOpenSettings: () => void;
}

export function ChannelList({ serverName, onCreateChannel, onInvite, onOpenSettings }: ChannelListProps) {
    const [collapsedCategories, setCollapsedCategories] = useState<string[]>([]);
    const [joiningChannel, setJoiningChannel] = useState<string | null>(null);
    const channels = useAppStore((s) => s.channels);
    const activeChannelId = useAppStore((s) => s.activeChannelId);
    const setActiveChannel = useAppStore((s) => s.setActiveChannel);
    const channelUnread = useNotificationStore((s) => s.channelUnread);
    const channelMentions = useNotificationStore((s) => s.channelMentions);
    const markChannelRead = useNotificationStore((s) => s.markChannelRead);
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
            markChannelRead(channel.id);
        }
    };

    return (
        <div className="w-full lg:w-[300px] max-h-[42vh] lg:max-h-none bg-[#111318] flex flex-col border-b lg:border-b-0 lg:border-r border-[#1F2330] flex-shrink-0">
            {/* Server Header */}
            <button className="h-12 px-4 flex items-center justify-between border-b border-[#1F2330] hover:bg-[#202432] transition-colors group flex-shrink-0">
                <span className="text-emphasis font-semibold text-text-primary truncate">
                    {serverName}
                </span>
                <ChevronDown className="w-4 h-4 text-[#9EA4B4] group-hover:text-text-primary transition-colors flex-shrink-0" />
            </button>

            {/* Quick actions */}
            <div className="px-2 py-2 flex items-center gap-1 border-b border-[#1F2330]">
                <button
                    onClick={onInvite}
                    className="flex-1 flex items-center gap-2 px-3 py-1.5 rounded-md text-micro text-[#B7BCCB] hover:text-text-primary hover:bg-[#202432] transition-colors"
                >
                    <UserPlus className="w-3.5 h-3.5" />
                    Invite
                </button>
                <button
                    onClick={onOpenSettings}
                    className="flex-1 flex items-center gap-2 px-3 py-1.5 rounded-md text-micro text-[#B7BCCB] hover:text-text-primary hover:bg-[#202432] transition-colors"
                >
                    <Bell className="w-3.5 h-3.5" />
                    Notifications
                </button>
            </div>

            {/* Channel list */}
            <div className="flex-1 overflow-y-auto px-2 py-1 scrollbar-none">
                {categories.map((category) => {
                    const categoryChannels = channels.filter((c) => c.category === category);
                    const isCollapsed = collapsedCategories.includes(category);

                    return (
                        <div key={category} className="mb-3">
                            {/* Category header */}
                            <div className="flex items-center justify-between pr-1">
                                <button
                                    onClick={() => toggleCategory(category)}
                                    className="flex-1 flex items-center gap-1 px-1 py-1 text-micro font-semibold text-[#8E93A3] hover:text-[#D2D7E2] uppercase tracking-[0.06em] transition-colors group"
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
                                    className="w-4 h-4 rounded hover:bg-[#202432] flex items-center justify-center text-[#8E93A3] hover:text-text-primary opacity-0 group-hover:opacity-100 transition-all"
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
                                                                ? "bg-accent-teal/15 text-accent-teal"
                                                                : "bg-[#353844] text-text-primary"
                                                            : "text-[#B7BCCB] hover:bg-[#202432] hover:text-text-primary"
                                                        } ${isJoining ? "opacity-50" : ""}`}
                                                >
                                                    <Icon
                                                        className={`w-[18px] h-[18px] flex-shrink-0 ${isActive
                                                                ? isVoice
                                                                    ? "text-accent-teal"
                                                                    : "text-[#DDE2ED]"
                                                                : "text-[#8E93A3]"
                                                            }`}
                                                    />
                                                    <span className="text-body truncate">
                                                        {channel.name}
                                                    </span>

                                                    <div className="ml-auto flex items-center gap-1">
                                                        {!isVoice && mentionCount > 0 && (
                                                            <span className="h-5 min-w-[20px] px-1.5 rounded-full bg-danger text-white text-[11px] font-semibold leading-5 text-center">
                                                                {mentionCount > 99 ? "99+" : mentionCount}
                                                            </span>
                                                        )}
                                                        {showUnreadDot && (
                                                            <span className="w-2 h-2 rounded-full bg-accent-violet/90" />
                                                        )}
                                                        {isActive && !isVoice && (
                                                            <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                                                <div className="w-5 h-5 rounded hover:bg-[#272B39] flex items-center justify-center text-[#8E93A3] hover:text-text-primary">
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
                                                                    <img
                                                                        src={
                                                                            p.avatarUrl ||
                                                                            `https://api.dicebear.com/9.x/avataaars/svg?seed=${p.username}`
                                                                        }
                                                                        alt=""
                                                                        className="w-full h-full"
                                                                    />
                                                                </div>
                                                                <span className="text-micro text-[#8E93A3] truncate flex-1">
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
