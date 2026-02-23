"use client";

import { useMemo, useState } from "react";
import { MessageSquare, Plus, Search, Users, X } from "lucide-react";
import type { DMConversationData, DMParticipantData, FriendListEntry } from "@/lib/api";
import { useAuthStore } from "@/stores/auth-store";
import { useNotificationStore } from "@/stores/notification-store";
import { parseAttachmentContent } from "@/lib/attachments";
import { UserDock } from "./UserDock";

interface DMSidebarProps {
    conversations: DMConversationData[];
    friends: FriendListEntry[];
    activeConversationId: string | null;
    onSelectConversation: (conversationId: string | null) => void;
    onCreateGroup: (participantIds: string[], name?: string) => Promise<void>;
    onOpenSettings: () => void;
}

function conversationTitle(conversation: DMConversationData, currentUserId: string | undefined) {
    if (conversation.type === "group") {
        if (conversation.name?.trim()) return conversation.name;
        const names = conversation.participants
            .filter((p) => p.id !== currentUserId)
            .map((p) => p.displayName);
        return names.slice(0, 3).join(", ") || "Group DM";
    }

    const peer = conversation.participants.find((p) => p.id !== currentUserId) || conversation.participants[0];
    return peer?.displayName || "Direct Message";
}

function conversationAvatar(conversation: DMConversationData, currentUserId: string | undefined) {
    if (conversation.type === "group") return null;
    const peer = conversation.participants.find((p) => p.id !== currentUserId) || conversation.participants[0];
    if (!peer) return null;
    return peer.avatarUrl || `https://api.dicebear.com/9.x/avataaars/svg?seed=${peer.username}`;
}

function isStickerMessage(content: string) {
    return content.trim().startsWith("sticker:");
}

function messagePrefix(author: DMParticipantData | undefined, currentUserId: string | undefined) {
    if (!author) return "";
    return author.id === currentUserId ? "You" : author.displayName;
}

export function DMSidebar({
    conversations,
    friends,
    activeConversationId,
    onSelectConversation,
    onCreateGroup,
    onOpenSettings,
}: DMSidebarProps) {
    const currentUserId = useAuthStore((s) => s.user?.id);
    const dmUnread = useNotificationStore((s) => s.dmUnread);
    const markDMRead = useNotificationStore((s) => s.markDMRead);
    const [showGroupModal, setShowGroupModal] = useState(false);
    const [groupName, setGroupName] = useState("");
    const [selectedFriendIds, setSelectedFriendIds] = useState<string[]>([]);
    const [creating, setCreating] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const selectableFriends = useMemo(() => friends.map((f) => f.user), [friends]);

    const toggleSelectedFriend = (friendUserId: string) => {
        setSelectedFriendIds((prev) =>
            prev.includes(friendUserId)
                ? prev.filter((id) => id !== friendUserId)
                : [...prev, friendUserId]
        );
    };

    const handleCreateGroup = async () => {
        if (selectedFriendIds.length < 2) {
            setError("Select at least 2 friends for a group DM.");
            return;
        }

        setCreating(true);
        setError(null);
        try {
            await onCreateGroup(selectedFriendIds, groupName.trim() || undefined);
            setShowGroupModal(false);
            setGroupName("");
            setSelectedFriendIds([]);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to create group DM.");
        } finally {
            setCreating(false);
        }
    };

    return (
        <>
            <div className="w-full lg:w-[300px] max-h-[42vh] lg:max-h-none bg-[#111318] border-b lg:border-b-0 lg:border-r border-[#1F2330] flex flex-col flex-shrink-0">
                <div className="h-12 border-b border-[#1F2330] px-3 flex items-center">
                    <button className="w-full h-8 rounded-md bg-[#1C1F2A] hover:bg-[#202432] text-text-muted text-body flex items-center gap-2 px-3 text-left transition-colors">
                        <Search className="w-4 h-4" />
                        Find or start a conversation
                    </button>
                </div>

                <div className="px-2 py-2 border-b border-[#1F2330]">
                    <button
                        onClick={() => onSelectConversation(null)}
                        className={`w-full flex items-center gap-2 px-2.5 py-2 rounded-md text-body transition-colors ${activeConversationId === null
                                ? "bg-[#353844] text-text-primary"
                                : "text-[#B7BCCB] hover:text-text-primary hover:bg-[#202432]"
                            }`}
                    >
                        <Users className="w-4 h-4" />
                        Friends
                    </button>
                </div>

                <div className="px-3 pt-3 pb-1 flex items-center justify-between">
                    <span className="text-[12px] font-semibold tracking-wide uppercase text-[#8E93A3]">
                        Direct Messages
                    </span>
                    <button
                        onClick={() => setShowGroupModal(true)}
                        className="w-7 h-7 rounded-md hover:bg-[#202432] text-[#8E93A3] hover:text-text-primary flex items-center justify-center transition-colors"
                        title="Create Group DM"
                    >
                        <Plus className="w-4 h-4" />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto px-2 py-1 space-y-1">
                    {conversations.length === 0 && (
                        <div className="px-2 py-3 text-micro text-text-muted">
                            No DMs yet. Start one from Friends.
                        </div>
                    )}

                    {conversations.map((conversation) => {
                        const title = conversationTitle(conversation, currentUserId);

                        let preview = conversation.lastMessage?.content || "No messages yet";
                        if (conversation.lastMessage?.type === "call") {
                            let duration = 0;
                            try {
                                if (conversation.lastMessage.metadata) {
                                    duration = JSON.parse(conversation.lastMessage.metadata).duration || 0;
                                }
                            } catch (e) { }

                            const mins = Math.floor(duration / 60);
                            const secs = duration % 60;
                            const hasDur = duration > 0;
                            const durStr = hasDur ? (mins > 0 ? `${mins}m ${secs}s` : `${secs}s`) : "0s";
                            preview = hasDur ? `Call lasted ${durStr}` : "Missed call";
                        } else if (conversation.lastMessage?.content) {
                            if (isStickerMessage(conversation.lastMessage.content)) {
                                preview = "[Sticker]";
                            } else {
                                const attachment = parseAttachmentContent(conversation.lastMessage.content);
                                if (attachment) {
                                    preview = `[Attachment] ${attachment.name}`;
                                }
                            }
                        }

                        if (conversation.lastMessage) {
                            const prefix = messagePrefix(conversation.lastMessage.author, currentUserId);
                            if (prefix) {
                                preview = `${prefix}: ${preview}`;
                            }
                        }

                        const avatar = conversationAvatar(conversation, currentUserId);
                        const isActive = conversation.id === activeConversationId;
                        const unreadCount = dmUnread[conversation.id] || 0;

                        return (
                            <button
                                key={conversation.id}
                                onClick={() => {
                                    markDMRead(conversation.id);
                                    onSelectConversation(conversation.id);
                                }}
                                className={`w-full text-left px-2.5 py-2 rounded-md transition-colors ${isActive
                                        ? "bg-[#353844]"
                                        : "hover:bg-[#202432]"
                                    }`}
                            >
                                <div className="flex items-center gap-2.5">
                                    {conversation.type === "group" ? (
                                        <div className="w-9 h-9 rounded-full bg-[#202432] border border-[#30374A] flex items-center justify-center text-[#AEB4C2]">
                                            <Users className="w-4 h-4" />
                                        </div>
                                    ) : avatar ? (
                                        <img
                                            src={avatar}
                                            alt={title}
                                            className="w-9 h-9 rounded-full bg-surface"
                                        />
                                    ) : (
                                        <div className="w-9 h-9 rounded-full bg-[#202432] border border-[#30374A] flex items-center justify-center text-[#AEB4C2]">
                                            <MessageSquare className="w-4 h-4" />
                                        </div>
                                    )}
                                    <div className="min-w-0">
                                        <div className={`text-body truncate ${isActive ? "text-text-primary" : "text-[#D2D7E2]"}`}>
                                            {title}
                                        </div>
                                        <div className="text-micro text-[#8E93A3] truncate">
                                            {preview}
                                        </div>
                                    </div>
                                    {unreadCount > 0 && (
                                        <span className="ml-auto h-5 min-w-[20px] px-1.5 rounded-full bg-accent-violet text-white text-[11px] font-semibold leading-5 text-center">
                                            {unreadCount > 99 ? "99+" : unreadCount}
                                        </span>
                                    )}
                                </div>
                            </button>
                        );
                    })}
                </div>

                <UserDock onOpenSettings={onOpenSettings} />
            </div>

            {showGroupModal && (
                <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="w-full max-w-md bg-surface border border-border rounded-xl">
                        <div className="px-4 py-3 border-b border-border flex items-center justify-between">
                            <h3 className="text-emphasis font-semibold text-text-primary">Create Group DM</h3>
                            <button
                                onClick={() => setShowGroupModal(false)}
                                className="w-7 h-7 rounded-md hover:bg-hover-row text-text-muted hover:text-text-primary flex items-center justify-center"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        <div className="p-4 space-y-3">
                            <input
                                value={groupName}
                                onChange={(e) => setGroupName(e.target.value)}
                                placeholder="Group name (optional)"
                                className="w-full h-10 rounded-md border border-border bg-surface-raised px-3 text-body text-text-primary placeholder:text-text-muted outline-none focus:border-accent-violet"
                            />

                            <div className="text-micro text-text-muted">
                                Select at least 2 friends
                            </div>

                            <div className="max-h-64 overflow-y-auto border border-border rounded-md">
                                {selectableFriends.length === 0 && (
                                    <div className="px-3 py-3 text-micro text-text-muted">
                                        Add friends first to create a group DM.
                                    </div>
                                )}
                                {selectableFriends.map((friend) => (
                                    <label
                                        key={friend.id}
                                        className="flex items-center gap-3 px-3 py-2.5 border-b border-border last:border-b-0 hover:bg-hover-row cursor-pointer"
                                    >
                                        <input
                                            type="checkbox"
                                            checked={selectedFriendIds.includes(friend.id)}
                                            onChange={() => toggleSelectedFriend(friend.id)}
                                            className="accent-accent-violet"
                                        />
                                        <img
                                            src={friend.avatarUrl || `https://api.dicebear.com/9.x/avataaars/svg?seed=${friend.username}`}
                                            alt={friend.displayName}
                                            className="w-8 h-8 rounded-full bg-surface-raised"
                                        />
                                        <div className="min-w-0">
                                            <div className="text-body text-text-primary truncate">
                                                {friend.displayName}
                                            </div>
                                            <div className="text-micro text-text-muted truncate">
                                                @{friend.username}
                                            </div>
                                        </div>
                                    </label>
                                ))}
                            </div>

                            {error && <p className="text-micro text-danger">{error}</p>}
                        </div>

                        <div className="px-4 py-3 border-t border-border flex justify-end gap-2">
                            <button
                                onClick={() => setShowGroupModal(false)}
                                className="px-4 h-9 rounded-md bg-surface-raised text-text-primary text-body hover:bg-hover-row"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleCreateGroup}
                                disabled={creating || selectableFriends.length < 2}
                                className="px-4 h-9 rounded-md bg-accent-violet text-white text-body hover:bg-accent-violet/90 disabled:opacity-50"
                            >
                                {creating ? "Creating..." : "Create Group"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
