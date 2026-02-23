"use client";

import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import {
    Smile,
    Plus,
    Image as ImageIcon,
    Search,
    Users,
    Bookmark,
    Hash,
    X,
    Pencil,
    Trash2,
    Reply,
    Loader2,
    CornerDownRight,
    Download,
    FileText,
} from "lucide-react";
import { LinkEmbed } from "./LinkEmbed";
import { EmojiPicker } from "./EmojiPicker";
import { GifPicker } from "./GifPicker";
import { StickerPicker } from "./StickerPicker";
import { useChatStore } from "@/stores/chat-store";
import { useAuthStore } from "@/stores/auth-store";
import {
    sendMessage,
    editMessage,
    deleteMessageApi,
    addReaction,
    removeReaction,
    fetchMessages,
    fetchStickerById,
    uploadAttachment,
    type MessageData,
    type StickerData,
} from "@/lib/api";
import {
    encodeAttachmentContent,
    formatAttachmentSize,
    FREE_ATTACHMENT_MAX_LABEL,
    parseAttachmentContent,
    validateAttachmentFile,
    ATTACHMENT_INPUT_ACCEPT,
} from "@/lib/attachments";

interface ChatViewProps {
    channelId: string;
    channelName: string;
    channelDescription?: string | null;
    onSubscribe: (channelId: string) => void;
    onUnsubscribe: (channelId: string) => void;
    onTypingStart: (channelId: string) => void;
    onTypingStop: (channelId: string) => void;
}

const EMPTY_MESSAGES: MessageData[] = [];
const EMPTY_TYPING_USERS: Array<{ userId: string; username: string }> = [];
const STICKER_PREFIX = "sticker:";

function getStickerId(content: string): string | null {
    const trimmed = content.trim();
    if (!trimmed.startsWith(STICKER_PREFIX)) return null;
    const id = trimmed.slice(STICKER_PREFIX.length).trim();
    return id.length > 0 ? id : null;
}

export function ChatView({
    channelId,
    channelName,
    channelDescription,
    onSubscribe,
    onUnsubscribe,
    onTypingStart,
    onTypingStop,
}: ChatViewProps) {
    const [messageInput, setMessageInput] = useState("");
    const [hoveredMessage, setHoveredMessage] = useState<string | null>(null);
    const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
    const [editContent, setEditContent] = useState("");
    const [replyTo, setReplyTo] = useState<MessageData | null>(null);
    const [loadingOlder, setLoadingOlder] = useState(false);
    const [showEmojiPicker, setShowEmojiPicker] = useState(false);
    const [showGifPicker, setShowGifPicker] = useState(false);
    const [showStickerPicker, setShowStickerPicker] = useState(false);
    const [uploadingAttachment, setUploadingAttachment] = useState(false);
    const [stickerCache, setStickerCache] = useState<Record<string, StickerData | null>>({});
    const [reactionPickerMessageId, setReactionPickerMessageId] = useState<string | null>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const messagesContainerRef = useRef<HTMLDivElement>(null);
    const attachmentInputRef = useRef<HTMLInputElement>(null);
    const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const prevChannelRef = useRef<string | null>(null);

    const channelMessages = useChatStore((s) => s.messages[channelId]);
    const messages = channelMessages ?? EMPTY_MESSAGES;
    const hasMore = useChatStore((s) => s.hasMore[channelId] ?? true);
    const cursor = useChatStore((s) => s.cursors[channelId]);
    const channelTypingUsers = useChatStore((s) => s.typingUsers[channelId]);
    const typingUsers = channelTypingUsers ?? EMPTY_TYPING_USERS;
    const setMessages = useChatStore((s) => s.setMessages);
    const prependMessages = useChatStore((s) => s.prependMessages);
    const userId = useAuthStore((s) => s.user?.id);
    const stickerIdsInMessages = useMemo(() => {
        const ids = new Set<string>();
        for (const message of messages) {
            const stickerId = getStickerId(message.content);
            if (stickerId) ids.add(stickerId);
        }
        return Array.from(ids);
    }, [messages]);

    // Subscribe/unsubscribe to channel & load initial messages
    useEffect(() => {
        if (prevChannelRef.current && prevChannelRef.current !== channelId) {
            onUnsubscribe(prevChannelRef.current);
        }
        prevChannelRef.current = channelId;

        onSubscribe(channelId);

        // Load messages if not already loaded
        const existingMessages = useChatStore.getState().messages[channelId];
        if (!existingMessages || existingMessages.length === 0) {
            fetchMessages(channelId)
                .then((result) => {
                    setMessages(channelId, result.messages, result.nextCursor, result.hasMore);
                    // Scroll to bottom on initial load
                    setTimeout(() => {
                        messagesEndRef.current?.scrollIntoView({ behavior: "auto" });
                    }, 50);
                })
                .catch(console.error);
        } else {
            setTimeout(() => {
                messagesEndRef.current?.scrollIntoView({ behavior: "auto" });
            }, 50);
        }

        return () => {
            onUnsubscribe(channelId);
        };
    }, [channelId]); // eslint-disable-line react-hooks/exhaustive-deps

    // Auto-scroll on new messages
    useEffect(() => {
        const container = messagesContainerRef.current;
        if (!container) return;

        // Only auto-scroll if user is near bottom
        const isNearBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 150;
        if (isNearBottom) {
            messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
        }
    }, [messages]);

    useEffect(() => {
        const unresolved = stickerIdsInMessages.filter(
            (id) => !Object.prototype.hasOwnProperty.call(stickerCache, id)
        );
        if (unresolved.length === 0) return;

        let cancelled = false;

        (async () => {
            const resolvedEntries = await Promise.all(
                unresolved.map(async (id) => {
                    try {
                        const result = await fetchStickerById(id);
                        return [id, result.sticker] as const;
                    } catch {
                        return [id, null] as const;
                    }
                })
            );

            if (cancelled) return;

            setStickerCache((prev) => {
                const next = { ...prev };
                for (const [id, sticker] of resolvedEntries) {
                    next[id] = sticker;
                }
                return next;
            });
        })();

        return () => {
            cancelled = true;
        };
    }, [stickerIdsInMessages, stickerCache]);

    // Load older messages
    const loadOlderMessages = useCallback(async () => {
        if (loadingOlder || !hasMore) return;

        // Get the oldest message ID as cursor
        const oldestMessage = messages[0];
        if (!oldestMessage) return;

        setLoadingOlder(true);
        try {
            const result = await fetchMessages(channelId, oldestMessage.id);
            prependMessages(channelId, result.messages, result.nextCursor, result.hasMore);
        } catch (err) {
            console.error("Failed to load older messages:", err);
        } finally {
            setLoadingOlder(false);
        }
    }, [channelId, loadingOlder, hasMore, messages, prependMessages]);

    // Scroll handler for infinite scroll
    const handleScroll = useCallback(() => {
        const container = messagesContainerRef.current;
        if (!container) return;

        if (container.scrollTop < 100 && hasMore && !loadingOlder) {
            loadOlderMessages();
        }
    }, [hasMore, loadingOlder, loadOlderMessages]);

    const handleSend = async () => {
        const content = messageInput.trim();
        if (!content) return;

        setMessageInput("");

        // Stop typing
        if (typingTimeoutRef.current) {
            clearTimeout(typingTimeoutRef.current);
            typingTimeoutRef.current = null;
        }
        onTypingStop(channelId);

        try {
            await sendMessage(channelId, {
                content,
                replyToId: replyTo?.id,
            });
            setReplyTo(null);
        } catch (err) {
            console.error("Failed to send message:", err);
            setMessageInput(content); // Restore input on error
        }
    };

    const handleSendSticker = useCallback(
        async (sticker: StickerData) => {
            try {
                await sendMessage(channelId, {
                    content: `${STICKER_PREFIX}${sticker.id}`,
                    replyToId: replyTo?.id,
                });
                setStickerCache((prev) => ({ ...prev, [sticker.id]: sticker }));
                setReplyTo(null);
                setShowStickerPicker(false);
            } catch (err) {
                console.error("Failed to send sticker:", err);
            }
        },
        [channelId, replyTo?.id]
    );

    const handleAttachmentSelect = useCallback(
        async (e: React.ChangeEvent<HTMLInputElement>) => {
            const file = e.target.files?.[0];
            e.target.value = "";
            if (!file) return;

            const validationError = validateAttachmentFile(file);
            if (validationError) {
                alert(validationError);
                return;
            }

            setUploadingAttachment(true);
            try {
                const result = await uploadAttachment(file);
                await sendMessage(channelId, {
                    content: encodeAttachmentContent(result.attachment),
                    replyToId: replyTo?.id,
                });
                setReplyTo(null);
            } catch (err) {
                console.error("Failed to upload attachment:", err);
                alert(err instanceof Error ? err.message : "Failed to upload attachment.");
            } finally {
                setUploadingAttachment(false);
            }
        },
        [channelId, replyTo?.id]
    );

    const handleKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        setMessageInput(e.target.value);

        // Typing indicator debounce
        if (typingTimeoutRef.current) {
            clearTimeout(typingTimeoutRef.current);
        }

        if (e.target.value.trim()) {
            onTypingStart(channelId);
            typingTimeoutRef.current = setTimeout(() => {
                onTypingStop(channelId);
                typingTimeoutRef.current = null;
            }, 3000);
        } else {
            onTypingStop(channelId);
        }
    };

    const handleEdit = async (messageId: string) => {
        const content = editContent.trim();
        if (!content) return;

        try {
            await editMessage(messageId, content);
            setEditingMessageId(null);
            setEditContent("");
        } catch (err) {
            console.error("Failed to edit message:", err);
        }
    };

    const handleDelete = async (messageId: string) => {
        try {
            await deleteMessageApi(messageId);
        } catch (err) {
            console.error("Failed to delete message:", err);
        }
    };

    const handleReaction = async (messageId: string, emoji: string, alreadyReacted: boolean) => {
        try {
            if (alreadyReacted) {
                await removeReaction(messageId, emoji);
            } else {
                await addReaction(messageId, emoji);
            }
        } catch (err) {
            console.error("Failed to toggle reaction:", err);
        }
    };

    /* Format relative time */
    const formatTime = (dateStr: string) => {
        const date = new Date(dateStr);
        const diff = Date.now() - date.getTime();
        const mins = Math.floor(diff / 60000);
        if (mins < 1) return "Just now";
        if (mins < 60) return `${mins}m ago`;
        const hrs = Math.floor(mins / 60);
        if (hrs < 24) return `${hrs}h ago`;
        return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    };

    /* Check if content is a GIF URL */
    const isGifUrl = (content: string) => {
        const trimmed = content.trim();
        return /^https?:\/\/.*\.(gif|webp)(\?.*)?$/i.test(trimmed) ||
            trimmed.includes("tenor.com/") ||
            trimmed.includes("giphy.com/");
    };

    /* Render message content with code blocks and GIFs */
    const renderContent = (content: string) => {
        const stickerId = getStickerId(content);
        if (stickerId) {
            const sticker = stickerCache[stickerId];
            if (!sticker) {
                return (
                    <div className="w-24 h-24 rounded-lg bg-surface-raised border border-border flex items-center justify-center text-micro text-text-muted">
                        Sticker
                    </div>
                );
            }

            return (
                <img
                    src={sticker.imageData}
                    alt={sticker.name}
                    className="w-24 h-24 rounded-lg object-contain"
                    loading="lazy"
                />
            );
        }

        const attachment = parseAttachmentContent(content);
        if (attachment) {
            if (attachment.kind === "image") {
                return (
                    <img
                        src={attachment.url}
                        alt={attachment.name}
                        className="max-w-[360px] max-h-[280px] rounded-lg mt-1"
                        loading="lazy"
                    />
                );
            }

            if (attachment.kind === "video") {
                return (
                    <video
                        src={attachment.url}
                        controls
                        className="max-w-[420px] max-h-[320px] rounded-lg mt-1 bg-black"
                    />
                );
            }

            return (
                <a
                    href={attachment.url}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-1 inline-flex items-center gap-2 rounded-lg border border-border bg-surface-raised px-3 py-2 text-body text-text-primary hover:bg-hover-row"
                >
                    <FileText className="w-4 h-4 text-text-muted" />
                    <span className="truncate max-w-[280px]">{attachment.name}</span>
                    <span className="text-micro text-text-muted">{formatAttachmentSize(attachment.size)}</span>
                    <Download className="w-4 h-4 text-text-muted" />
                </a>
            );
        }

        // Check if the entire message is a GIF
        if (isGifUrl(content.trim())) {
            return (
                <img
                    src={content.trim()}
                    alt="GIF"
                    className="max-w-[300px] max-h-[250px] rounded-lg mt-1"
                    loading="lazy"
                />
            );
        }

        const codeBlockRegex = /```(\w+)?\n([\s\S]*?)```/g;
        const parts: React.ReactNode[] = [];
        let lastIndex = 0;
        let match;

        while ((match = codeBlockRegex.exec(content)) !== null) {
            if (match.index > lastIndex) {
                parts.push(
                    <span key={lastIndex}>{content.substring(lastIndex, match.index)}</span>
                );
            }
            const code = match[2];
            parts.push(
                <pre
                    key={match.index}
                    className="bg-[#0A0A0F] rounded-lg p-4 my-2 overflow-x-auto border-l-[3px] border-accent-violet"
                >
                    <code className="text-sm font-mono text-accent-teal leading-relaxed">
                        {code}
                    </code>
                </pre>
            );
            lastIndex = match.index + match[0].length;
        }

        if (lastIndex < content.length) {
            parts.push(<span key={lastIndex}>{content.substring(lastIndex)}</span>);
        }
        return parts.length > 0 ? parts : content;
    };

    const formatReplyContent = (content: string) => {
        if (getStickerId(content)) return "[Sticker]";
        const attachment = parseAttachmentContent(content);
        if (attachment) return `[Attachment] ${attachment.name}`;
        return content;
    };

    /* Group consecutive messages from same user */
    const groupMessages = (msgs: MessageData[]) => {
        const grouped: MessageData[][] = [];
        let currentGroup: MessageData[] = [];
        let lastUserId: string | null = null;
        let lastTimestamp: Date | null = null;

        msgs.forEach((message) => {
            const msgTime = new Date(message.createdAt);
            const timeDiff = lastTimestamp
                ? (msgTime.getTime() - lastTimestamp.getTime()) / 60000
                : Infinity;

            if (message.author.id === lastUserId && timeDiff < 5 && !message.replyTo) {
                currentGroup.push(message);
            } else {
                if (currentGroup.length > 0) grouped.push(currentGroup);
                currentGroup = [message];
                lastUserId = message.author.id;
            }
            lastTimestamp = msgTime;
        });
        if (currentGroup.length > 0) grouped.push(currentGroup);
        return grouped;
    };

    const messageGroups = groupMessages(messages);

    /* Action pill buttons */
    const ActionPill = ({ message }: { message: MessageData }) => (
        <div className="absolute -top-4 right-4 flex items-center gap-0.5 bg-surface border border-border rounded-lg px-1 py-1 shadow-lg z-20">
            <div className="relative">
                <button
                    onClick={() => setReactionPickerMessageId(
                        reactionPickerMessageId === message.id ? null : message.id
                    )}
                    className="w-7 h-7 rounded-md hover:bg-surface-raised flex items-center justify-center text-text-muted hover:text-text-primary transition-colors"
                    title="Add Reaction"
                >
                    <Smile className="w-[14px] h-[14px]" />
                </button>
                {reactionPickerMessageId === message.id && (
                    <div className="absolute bottom-full right-0 mb-2">
                        <EmojiPicker
                            onSelect={(emoji) => {
                                handleReaction(message.id, emoji, message.reactions.some(r => r.emoji === emoji && r.reacted));
                                setReactionPickerMessageId(null);
                            }}
                            onClose={() => setReactionPickerMessageId(null)}
                        />
                    </div>
                )}
            </div>
            <button
                onClick={() => setReplyTo(message)}
                className="w-7 h-7 rounded-md hover:bg-surface-raised flex items-center justify-center text-text-muted hover:text-text-primary transition-colors"
                title="Reply"
            >
                <Reply className="w-[14px] h-[14px]" />
            </button>
            {message.author.id === userId && (
                <button
                    onClick={() => {
                        setEditingMessageId(message.id);
                        setEditContent(message.content);
                    }}
                    className="w-7 h-7 rounded-md hover:bg-surface-raised flex items-center justify-center text-text-muted hover:text-text-primary transition-colors"
                    title="Edit"
                >
                    <Pencil className="w-[14px] h-[14px]" />
                </button>
            )}
            <div className="w-px h-4 bg-border mx-0.5" />
            <button
                onClick={() => handleDelete(message.id)}
                className="w-7 h-7 rounded-md hover:bg-danger/10 flex items-center justify-center text-text-muted hover:text-danger transition-colors"
                title="Delete"
            >
                <Trash2 className="w-[14px] h-[14px]" />
            </button>
        </div>
    );

    return (
        <div className="flex-1 flex flex-col bg-background min-w-0">
            {/* Top bar */}
            <div className="h-12 border-b border-border flex items-center px-4 gap-3 flex-shrink-0">
                <Hash className="w-5 h-5 text-text-muted flex-shrink-0" />
                <span className="text-emphasis font-semibold text-text-primary">
                    {channelName}
                </span>
                {channelDescription && (
                    <>
                        <div className="w-px h-5 bg-border" />
                        <span className="text-body text-text-muted truncate">
                            {channelDescription}
                        </span>
                    </>
                )}
                <div className="ml-auto flex items-center gap-1">
                    {[Search, Users, Bookmark].map((Icon, i) => (
                        <button
                            key={i}
                            className="w-8 h-8 rounded-md hover:bg-surface-raised flex items-center justify-center text-text-muted hover:text-text-primary transition-colors"
                        >
                            <Icon className="w-[18px] h-[18px]" />
                        </button>
                    ))}
                </div>
            </div>

            {/* Messages */}
            <div
                ref={messagesContainerRef}
                onScroll={handleScroll}
                className="flex-1 overflow-y-auto px-4 py-4 space-y-5"
            >
                {/* Load more indicator */}
                {loadingOlder && (
                    <div className="flex justify-center py-2">
                        <Loader2 className="w-5 h-5 text-text-muted animate-spin" />
                    </div>
                )}

                {!hasMore && messages.length > 0 && (
                    <div className="text-center py-4">
                        <div className="text-heading font-bold text-text-primary mb-1">
                            Welcome to #{channelName}!
                        </div>
                        <div className="text-body text-text-muted">
                            This is the beginning of the channel.
                        </div>
                    </div>
                )}

                {messages.length === 0 && (
                    <div className="flex-1 flex items-center justify-center min-h-[200px]">
                        <div className="text-center">
                            <Hash className="w-12 h-12 text-text-muted mx-auto mb-3 opacity-30" />
                            <div className="text-heading font-bold text-text-primary mb-1">
                                Welcome to #{channelName}!
                            </div>
                            <div className="text-body text-text-muted">
                                No messages yet. Start the conversation!
                            </div>
                        </div>
                    </div>
                )}

                {messageGroups.map((group, groupIndex) => {
                    const firstMessage = group[0];
                    const author = firstMessage.author;
                    const avatarUrl = author.avatarUrl || `https://api.dicebear.com/9.x/avataaars/svg?seed=${author.username}`;

                    return (
                        <div key={groupIndex} className="flex gap-3 group/msggroup">
                            <img
                                src={avatarUrl}
                                alt={author.displayName}
                                className="w-10 h-10 rounded-full flex-shrink-0 mt-0.5 bg-surface"
                            />

                            <div className="flex-1 min-w-0">
                                {/* First message */}
                                <div
                                    className={`relative p-1 -m-1 rounded-md transition-colors duration-100 ${
                                        hoveredMessage === firstMessage.id ? "bg-hover-row" : ""
                                    }`}
                                    onMouseEnter={() => setHoveredMessage(firstMessage.id)}
                                    onMouseLeave={() => setHoveredMessage(null)}
                                >
                                    {/* Reply reference */}
                                    {firstMessage.replyTo && (
                                        <div className="flex items-center gap-1.5 mb-1 text-micro text-text-muted">
                                            <CornerDownRight className="w-3 h-3" />
                                            <span className="text-accent-violet font-medium">
                                                {firstMessage.replyTo.author.displayName}
                                            </span>
                                            <span className="truncate max-w-[300px]">
                                                {formatReplyContent(firstMessage.replyTo.content)}
                                            </span>
                                        </div>
                                    )}

                                    <div className="flex items-baseline gap-2 mb-0.5">
                                        <span className="font-semibold text-body text-accent-violet hover:underline cursor-pointer">
                                            {author.displayName}
                                        </span>
                                        <span className="text-micro text-text-muted">
                                            {formatTime(firstMessage.createdAt)}
                                        </span>
                                        {firstMessage.editedAt && (
                                            <span className="text-micro text-text-muted">(edited)</span>
                                        )}
                                    </div>

                                    {editingMessageId === firstMessage.id ? (
                                        <div className="space-y-2">
                                            <textarea
                                                value={editContent}
                                                onChange={(e) => setEditContent(e.target.value)}
                                                className="w-full px-3 py-2 bg-surface-raised border border-border rounded-lg text-text-primary text-[14px] outline-none focus:border-accent-violet resize-none"
                                                rows={2}
                                                autoFocus
                                                onKeyDown={(e) => {
                                                    if (e.key === "Enter" && !e.shiftKey) {
                                                        e.preventDefault();
                                                        handleEdit(firstMessage.id);
                                                    }
                                                    if (e.key === "Escape") {
                                                        setEditingMessageId(null);
                                                    }
                                                }}
                                            />
                                            <div className="flex items-center gap-2 text-micro text-text-muted">
                                                <span>Press Enter to save, Escape to cancel</span>
                                                <button
                                                    onClick={() => setEditingMessageId(null)}
                                                    className="text-danger hover:underline"
                                                >
                                                    Cancel
                                                </button>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="text-[14px] text-text-primary leading-[1.6]">
                                            {renderContent(firstMessage.content)}
                                        </div>
                                    )}

                                    {/* Link embeds */}
                                    {firstMessage.embeds?.length > 0 && (
                                        <div className="mt-1">
                                            {firstMessage.embeds.map((embed) => (
                                                <LinkEmbed key={embed.id} embed={embed} />
                                            ))}
                                        </div>
                                    )}

                                    {/* Reactions */}
                                    {firstMessage.reactions.length > 0 && (
                                        <div className="flex gap-1.5 mt-2">
                                            {firstMessage.reactions.map((reaction, idx) => (
                                                <button
                                                    key={idx}
                                                    onClick={() => handleReaction(firstMessage.id, reaction.emoji, reaction.reacted)}
                                                    className={`flex items-center gap-1.5 px-2 py-0.5 rounded-md text-micro transition-all ${
                                                        reaction.reacted
                                                            ? "bg-reaction-own border border-accent-violet"
                                                            : "bg-surface-raised border border-border hover:border-accent-violet/40"
                                                    }`}
                                                >
                                                    <span>{reaction.emoji}</span>
                                                    <span className="text-text-muted">{reaction.count}</span>
                                                </button>
                                            ))}
                                            <div className="relative">
                                                <button
                                                    onClick={() => setReactionPickerMessageId(
                                                        reactionPickerMessageId === firstMessage.id ? null : firstMessage.id
                                                    )}
                                                    className="flex items-center justify-center w-6 h-6 rounded-md bg-surface-raised border border-border hover:border-accent-violet/40 transition-all"
                                                >
                                                    <Plus className="w-3 h-3 text-text-muted" />
                                                </button>
                                                {reactionPickerMessageId === firstMessage.id && (
                                                    <div className="absolute bottom-full left-0 mb-2 z-50">
                                                        <EmojiPicker
                                                            onSelect={(emoji) => {
                                                                handleReaction(firstMessage.id, emoji, firstMessage.reactions.some(r => r.emoji === emoji && r.reacted));
                                                                setReactionPickerMessageId(null);
                                                            }}
                                                            onClose={() => setReactionPickerMessageId(null)}
                                                        />
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    )}

                                    {hoveredMessage === firstMessage.id && editingMessageId !== firstMessage.id && (
                                        <ActionPill message={firstMessage} />
                                    )}
                                </div>

                                {/* Subsequent grouped messages */}
                                {group.slice(1).map((message) => (
                                    <div
                                        key={message.id}
                                        className={`relative p-1 -m-1 rounded-md mt-0.5 transition-colors duration-100 ${
                                            hoveredMessage === message.id ? "bg-hover-row" : ""
                                        }`}
                                        onMouseEnter={() => setHoveredMessage(message.id)}
                                        onMouseLeave={() => setHoveredMessage(null)}
                                    >
                                        {editingMessageId === message.id ? (
                                            <div className="space-y-2">
                                                <textarea
                                                    value={editContent}
                                                    onChange={(e) => setEditContent(e.target.value)}
                                                    className="w-full px-3 py-2 bg-surface-raised border border-border rounded-lg text-text-primary text-[14px] outline-none focus:border-accent-violet resize-none"
                                                    rows={2}
                                                    autoFocus
                                                    onKeyDown={(e) => {
                                                        if (e.key === "Enter" && !e.shiftKey) {
                                                            e.preventDefault();
                                                            handleEdit(message.id);
                                                        }
                                                        if (e.key === "Escape") {
                                                            setEditingMessageId(null);
                                                        }
                                                    }}
                                                />
                                                <div className="flex items-center gap-2 text-micro text-text-muted">
                                                    <span>Enter to save, Escape to cancel</span>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="text-[14px] text-text-primary leading-[1.6]">
                                                {renderContent(message.content)}
                                                {message.editedAt && (
                                                    <span className="text-micro text-text-muted ml-1">(edited)</span>
                                                )}
                                            </div>
                                        )}

                                        {/* Link embeds */}
                                        {message.embeds?.length > 0 && (
                                            <div className="mt-1">
                                                {message.embeds.map((embed) => (
                                                    <LinkEmbed key={embed.id} embed={embed} />
                                                ))}
                                            </div>
                                        )}

                                        {message.reactions.length > 0 && (
                                            <div className="flex gap-1.5 mt-2">
                                                {message.reactions.map((reaction, idx) => (
                                                    <button
                                                        key={idx}
                                                        onClick={() => handleReaction(message.id, reaction.emoji, reaction.reacted)}
                                                        className={`flex items-center gap-1.5 px-2 py-0.5 rounded-md text-micro transition-all ${
                                                            reaction.reacted
                                                                ? "bg-reaction-own border border-accent-violet"
                                                                : "bg-surface-raised border border-border hover:border-accent-violet/40"
                                                        }`}
                                                    >
                                                        <span>{reaction.emoji}</span>
                                                        <span className="text-text-muted">{reaction.count}</span>
                                                    </button>
                                                ))}
                                            </div>
                                        )}

                                        {hoveredMessage === message.id && editingMessageId !== message.id && (
                                            <ActionPill message={message} />
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    );
                })}
                <div ref={messagesEndRef} />
            </div>

            {/* Typing indicator */}
            {typingUsers.length > 0 && (
                <div className="px-4 py-1">
                    <div className="flex items-center gap-2 text-micro text-text-muted">
                        <div className="flex gap-0.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-text-muted animate-bounce" style={{ animationDelay: "0ms" }} />
                            <span className="w-1.5 h-1.5 rounded-full bg-text-muted animate-bounce" style={{ animationDelay: "150ms" }} />
                            <span className="w-1.5 h-1.5 rounded-full bg-text-muted animate-bounce" style={{ animationDelay: "300ms" }} />
                        </div>
                        <span>
                            {typingUsers.length === 1
                                ? `${typingUsers[0].username} is typing...`
                                : typingUsers.length === 2
                                    ? `${typingUsers[0].username} and ${typingUsers[1].username} are typing...`
                                    : `${typingUsers[0].username} and ${typingUsers.length - 1} others are typing...`
                            }
                        </span>
                    </div>
                </div>
            )}

            {/* Reply preview */}
            {replyTo && (
                <div className="px-4 pt-2">
                    <div className="flex items-center gap-2 px-3 py-2 bg-surface-raised border border-border rounded-t-xl">
                        <Reply className="w-4 h-4 text-accent-violet flex-shrink-0" />
                        <span className="text-micro text-text-muted">Replying to</span>
                        <span className="text-micro text-accent-violet font-medium">
                            {replyTo.author.displayName}
                        </span>
                        <span className="text-micro text-text-muted truncate flex-1">
                            {formatReplyContent(replyTo.content)}
                        </span>
                        <button
                            onClick={() => setReplyTo(null)}
                            className="w-5 h-5 rounded hover:bg-hover-row flex items-center justify-center text-text-muted hover:text-text-primary transition-colors"
                        >
                            <X className="w-3.5 h-3.5" />
                        </button>
                    </div>
                </div>
            )}

            {/* Message input */}
            <div className={`px-4 pb-4 ${replyTo ? "pt-0" : "pt-2"}`}>
                <div className={`bg-surface-raised border border-border focus-within:border-accent-violet/40 focus-within:shadow-[0_0_0_1px_rgba(124,106,247,0.15)] transition-all ${
                    replyTo ? "rounded-b-xl" : "rounded-xl"
                }`}>
                    <div className="flex items-center gap-2 p-3">
                        <button
                            onClick={() => attachmentInputRef.current?.click()}
                            disabled={uploadingAttachment}
                            className="w-8 h-8 rounded-lg hover:bg-hover-row flex items-center justify-center text-text-muted hover:text-text-primary transition-colors flex-shrink-0 disabled:opacity-50"
                            title="Upload file"
                        >
                            {uploadingAttachment ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                                <Plus className="w-5 h-5" />
                            )}
                        </button>
                        <input
                            ref={attachmentInputRef}
                            type="file"
                            className="hidden"
                            accept={ATTACHMENT_INPUT_ACCEPT}
                            onChange={handleAttachmentSelect}
                        />

                        <textarea
                            value={messageInput}
                            onChange={handleInputChange}
                            onKeyDown={handleKeyPress}
                            placeholder={`Message #${channelName}`}
                            className="flex-1 bg-transparent text-text-primary placeholder:text-text-muted resize-none outline-none min-h-[22px] max-h-[200px] py-1 text-[14px] leading-[1.45]"
                            rows={1}
                        />

                        <div className="flex items-center gap-0.5 flex-shrink-0">
                            <div className="relative">
                                <button
                                    onClick={() => {
                                        setShowStickerPicker(!showStickerPicker);
                                        setShowGifPicker(false);
                                        setShowEmojiPicker(false);
                                    }}
                                    className={`w-8 h-8 rounded-lg hover:bg-hover-row flex items-center justify-center transition-colors ${showStickerPicker ? "text-accent-violet" : "text-text-muted hover:text-text-primary"}`}
                                    title="Sticker"
                                >
                                    <ImageIcon className="w-[18px] h-[18px]" />
                                </button>
                                {showStickerPicker && (
                                    <div className="absolute bottom-full right-0 mb-2 z-50">
                                        <StickerPicker
                                            onSelect={handleSendSticker}
                                            onClose={() => setShowStickerPicker(false)}
                                        />
                                    </div>
                                )}
                            </div>
                            <div className="relative">
                                <button
                                    onClick={() => {
                                        setShowGifPicker(!showGifPicker);
                                        setShowEmojiPicker(false);
                                        setShowStickerPicker(false);
                                    }}
                                    className={`w-8 h-8 rounded-lg hover:bg-hover-row flex items-center justify-center transition-colors ${showGifPicker ? "text-accent-violet" : "text-text-muted hover:text-text-primary"}`}
                                    title="GIF"
                                >
                                    <span className="text-[11px] font-bold leading-none">GIF</span>
                                </button>
                                {showGifPicker && (
                                    <div className="absolute bottom-full right-0 mb-2 z-50">
                                        <GifPicker
                                            onSelect={(gifUrl) => {
                                                sendMessage(channelId, { content: gifUrl, replyToId: replyTo?.id }).catch(console.error);
                                                setReplyTo(null);
                                                setShowGifPicker(false);
                                            }}
                                            onClose={() => setShowGifPicker(false)}
                                        />
                                    </div>
                                )}
                            </div>
                            <div className="relative">
                                <button
                                    onClick={() => {
                                        setShowEmojiPicker(!showEmojiPicker);
                                        setShowGifPicker(false);
                                        setShowStickerPicker(false);
                                    }}
                                    className={`w-8 h-8 rounded-lg hover:bg-hover-row flex items-center justify-center transition-colors ${showEmojiPicker ? "text-accent-violet" : "text-text-muted hover:text-text-primary"}`}
                                    title="Emoji"
                                >
                                    <Smile className="w-[18px] h-[18px]" />
                                </button>
                                {showEmojiPicker && (
                                    <div className="absolute bottom-full right-0 mb-2 z-50">
                                        <EmojiPicker
                                            onSelect={(emoji) => {
                                                setMessageInput((prev) => prev + emoji);
                                                setShowEmojiPicker(false);
                                            }}
                                            onClose={() => setShowEmojiPicker(false)}
                                        />
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                <div className="mt-1.5 flex items-center justify-between text-micro text-text-muted px-1">
                    <span>Press Enter to send, Shift+Enter for new line</span>
                    <span>Free uploads: {FREE_ATTACHMENT_MAX_LABEL} per file</span>
                </div>
            </div>
        </div>
    );
}
