"use client";

import { useMemo, useState, type CSSProperties } from "react";
import { MessageSquare, Plus, Search, Users, X } from "lucide-react";
import type { DMConversationData, DMParticipantData, FriendListEntry } from "@/lib/api";
import { useAuthStore } from "@/stores/auth-store";
import { useNotificationStore } from "@/stores/notification-store";
import { parseAttachmentContent } from "@/lib/attachments";
import { UserDock } from "./UserDock";
import { UserAvatar } from "./UserAvatar";
import { getUsernameColor } from "@/lib/color-utils";

interface DMSidebarProps {
    conversations: DMConversationData[];
    friends: FriendListEntry[];
    activeConversationId: string | null;
    onSelectConversation: (conversationId: string | null) => void;
    onCreateGroup: (participantIds: string[], name?: string) => Promise<void>;
    onOpenSettings: () => void;
    panelWidth?: number;
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
    panelWidth = 360,
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
            <div
                className="w-full lg:[width:var(--panel-width)] max-h-[42vh] lg:max-h-none bg-channel-sidebar border-b lg:border-b-0 lg:border-r border-border-subtle flex flex-col flex-shrink-0 relative overflow-visible"
                style={{ "--panel-width": `${panelWidth}px` } as CSSProperties}
            >
                {/* Search bar */}
                <div className="h-[52px] border-b border-border-subtle px-3 flex items-center">
                    <button className="w-full h-8 rounded-lg bg-surface-raised hover:bg-surface-overlay text-text-faint text-[13px] flex items-center gap-2 px-3 text-left transition-colors border border-border">
                        <Search className="w-3.5 h-3.5 flex-shrink-0" />
                        <span className="truncate">Find a conversation</span>
                    </button>
                </div>

                {/* Friends shortcut */}
                <div className="px-1.5 py-2">
                    <button
                        onClick={() => onSelectConversation(null)}
                        className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-[13px] transition-all duration-150 relative ${
                            activeConversationId === null
                                ? "bg-active-row text-text-primary font-medium"
                                : "text-text-muted hover:text-text-secondary hover:bg-hover-row"
                        }`}
                    >
                        {activeConversationId === null && (
                            <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-[18px] rounded-r-full bg-accent-violet shadow-[0_0_6px_rgba(232,163,61,0.5)]" />
                        )}
                        <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${
                            activeConversationId === null ? "bg-accent-violet/20 text-accent-violet" : "bg-surface-raised text-text-faint"
                        }`}>
                            <Users className="w-3.5 h-3.5" />
                        </div>
                        Friends
                    </button>
                </div>

                {/* DM section header */}
                <div className="px-3 pt-1 pb-1.5 flex items-center justify-between">
                    <span className="text-[10px] font-semibold tracking-[0.08em] uppercase text-text-faint">
                        Direct Messages
                    </span>
                    <button
                        onClick={() => setShowGroupModal(true)}
                        className="w-5 h-5 rounded flex items-center justify-center text-text-faint hover:text-text-secondary hover:bg-hover-row transition-colors"
                        title="Create Group DM"
                    >
                        <Plus className="w-3.5 h-3.5" />
                    </button>
                </div>

                {/* Conversations list */}
                <div className="flex-1 overflow-y-auto px-1.5 pb-1 space-y-[1px] scrollbar-none">
                    {conversations.length === 0 && (
                        <div className="px-2.5 py-3 text-[12px] text-text-faint">
                            No DMs yet. Start a conversation from Friends.
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

                        const peer = conversation.type !== "group"
                            ? (conversation.participants.find((p) => p.id !== currentUserId) || conversation.participants[0])
                            : null;
                        const isActive = conversation.id === activeConversationId;
                        const unreadCount = dmUnread[conversation.id] || 0;

                        return (
                            <button
                                key={conversation.id}
                                onClick={() => {
                                    markDMRead(conversation.id);
                                    onSelectConversation(conversation.id);
                                }}
                                className={`w-full text-left px-2.5 py-2 rounded-lg transition-all duration-150 relative group/dm ${
                                    isActive ? "bg-active-row" : "hover:bg-hover-row"
                                }`}
                            >
                                {isActive && (
                                    <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-7 rounded-r-full bg-accent-violet shadow-[0_0_6px_rgba(232,163,61,0.4)]" />
                                )}
                                <div className="flex items-center gap-2.5">
                                    {/* Avatar */}
                                    {conversation.type === "group" ? (
                                        <div className="w-8 h-8 rounded-xl bg-surface-raised border border-border flex items-center justify-center text-text-muted flex-shrink-0">
                                            <Users className="w-3.5 h-3.5" />
                                        </div>
                                    ) : peer ? (
                                        <UserAvatar
                                            avatarUrl={peer.avatarUrl}
                                            username={peer.username}
                                            className="w-8 h-8 flex-shrink-0"
                                        />
                                    ) : (
                                        <div className="w-8 h-8 rounded-xl bg-surface-raised border border-border flex items-center justify-center text-text-muted flex-shrink-0">
                                            <MessageSquare className="w-3.5 h-3.5" />
                                        </div>
                                    )}

                                    {/* Text */}
                                    <div className="min-w-0 flex-1">
                                        <div
                                            className={`text-[13px] truncate font-medium ${
                                                isActive ? "text-text-primary" : "text-text-secondary group-hover/dm:text-text-primary"
                                            }`}
                                            style={
                                                peer && !isActive
                                                    ? { color: getUsernameColor(peer.username) }
                                                    : undefined
                                            }
                                        >
                                            {title}
                                        </div>
                                        <div className="text-[11px] text-text-faint truncate leading-tight mt-0.5">
                                            {preview}
                                        </div>
                                    </div>

                                    {/* Unread badge */}
                                    {unreadCount > 0 && (
                                        <span className="ml-auto h-[18px] min-w-[18px] px-1 rounded-full bg-accent-violet text-on-accent text-[10px] font-bold leading-[18px] text-center flex-shrink-0">
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

            {/* Create Group DM Modal */}
            {showGroupModal && (
                <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
                    <div className="w-full max-w-[420px] bg-surface-overlay border border-border-highlight rounded-2xl shadow-modal animate-scale-in">
                        <div className="px-5 py-4 border-b border-border flex items-center justify-between">
                            <h3 className="text-[15px] font-semibold text-text-primary tracking-[-0.01em]">Create Group DM</h3>
                            <button
                                onClick={() => setShowGroupModal(false)}
                                className="w-7 h-7 rounded-lg hover:bg-hover-row text-text-muted hover:text-text-primary flex items-center justify-center transition-colors"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        <div className="p-5 space-y-3.5">
                            <input
                                value={groupName}
                                onChange={(e) => setGroupName(e.target.value)}
                                placeholder="Group name (optional)"
                                className="w-full h-9 rounded-xl border border-border-highlight bg-surface-raised px-3 text-[13px] text-text-primary placeholder:text-text-faint outline-none focus:border-accent-violet/50 focus:shadow-focus-violet transition-all"
                            />

                            <div className="text-[11px] text-text-faint font-medium uppercase tracking-[0.07em]">
                                Select at least 2 friends
                            </div>

                            <div className="max-h-60 overflow-y-auto border border-border rounded-xl">
                                {selectableFriends.length === 0 && (
                                    <div className="px-3 py-4 text-[12px] text-text-muted text-center">
                                        Add friends first to create a group DM.
                                    </div>
                                )}
                                {selectableFriends.map((friend) => (
                                    <label
                                        key={friend.id}
                                        className="flex items-center gap-3 px-3 py-2.5 border-b border-border last:border-b-0 hover:bg-hover-row cursor-pointer transition-colors"
                                    >
                                        <input
                                            type="checkbox"
                                            checked={selectedFriendIds.includes(friend.id)}
                                            onChange={() => toggleSelectedFriend(friend.id)}
                                            className="accent-accent-violet w-4 h-4 rounded"
                                        />
                                        <UserAvatar
                                            avatarUrl={friend.avatarUrl}
                                            username={friend.username}
                                            className="w-7 h-7"
                                        />
                                        <div className="min-w-0">
                                            <div
                                                className="text-[13px] font-medium truncate"
                                                style={{ color: getUsernameColor(friend.username) }}
                                            >
                                                {friend.displayName}
                                            </div>
                                            <div className="text-[11px] text-text-faint truncate">@{friend.username}</div>
                                        </div>
                                    </label>
                                ))}
                            </div>

                            {error && <p className="text-[12px] text-danger">{error}</p>}
                        </div>

                        <div className="px-5 py-3.5 border-t border-border flex justify-end gap-2">
                            <button
                                onClick={() => setShowGroupModal(false)}
                                className="px-4 h-9 rounded-xl bg-surface-raised border border-border text-text-secondary text-[13px] font-medium hover:bg-hover-row transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleCreateGroup}
                                disabled={creating || selectableFriends.length < 2}
                                className="px-4 h-9 rounded-xl text-[13px] font-semibold text-white disabled:opacity-50 transition-all hover:brightness-110"
                                style={{ background: "linear-gradient(135deg, #E8A33D, #C9862B)" }}
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
