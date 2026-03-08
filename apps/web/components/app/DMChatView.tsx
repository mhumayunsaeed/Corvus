"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { CornerDownRight, Download, FileText, Image as ImageIcon, Loader2, PanelRightClose, PanelRightOpen, Pencil, Phone, PhoneOff, Pin, Plus, Reply, Search, Send, Smile, Trash2, UserPlus, Users, Video, X } from "lucide-react";
import {
    addDMReaction,
    fetchDMMessages,
    fetchDMPins,
    fetchLinkPreview,
    pinDMMessage,
    sendDMMessage,
    editDMMessage,
    deleteDMMessage,
    fetchStickerById,
    removeDMReaction,
    unpinDMMessage,
    uploadAttachment,
    type DMConversationData,
    type DMMessageData,
    type MessageEmbedData,
    type StickerData,
} from "@/lib/api";
import {
    encodeAttachmentContent,
    formatAttachmentSize,
    FREE_ATTACHMENT_MAX_LABEL,
    parseAttachmentContent,
    resolveAttachmentUrl,
    validateAttachmentFile,
    ATTACHMENT_INPUT_ACCEPT,
} from "@/lib/attachments";
import { API_URL } from "@/lib/endpoints";
import { useAuthStore } from "@/stores/auth-store";
import { useDMStore } from "@/stores/dm-store";
import { useRuntimeThrottled } from "@/hooks/useRuntimeThrottled";
import { useVirtualWindow } from "@/hooks/useVirtualWindow";
import { EmojiPicker } from "./EmojiPicker";
import { GifPicker } from "./GifPicker";
import { StickerPicker } from "./StickerPicker";
import { LinkEmbed } from "./LinkEmbed";
import { SlashCommandMenu } from "./SlashCommandMenu";
import { MentionMenu, extractMentionQuery, filterMentionUsers, applyMention, type MentionUser } from "./MentionMenu";
import { extractMessageUrls, linkifyAndMentionText } from "@/lib/link-utils";
import {
    extractSlashQuery,
    filterSlashCommands,
    formatSlashCommandInput,
} from "@/lib/slash-commands";
import { UserAvatar } from "./UserAvatar";
import { getUsernameColor } from "@/lib/color-utils";

interface DMChatViewProps {
    conversation: DMConversationData;
    onConversationUpdated: (conversation: DMConversationData) => void;
    onSubscribeDM: (conversationId: string) => void;
    onUnsubscribeDM: (conversationId: string) => void;
    onStartCall: (conversationId: string, withVideo: boolean) => Promise<void>;
    onDMTypingStart?: (conversationId: string) => void;
    onDMTypingStop?: (conversationId: string) => void;
    activeCall: {
        token: string;
        url: string;
        initialVideo: boolean;
    } | null;
}

const EMPTY_DM_MESSAGES: DMMessageData[] = [];
const EMPTY_PINNED_MESSAGES: DMMessageData[] = [];
const STICKER_PREFIX = "sticker:";
const MAX_STICKER_CACHE_ENTRIES = 200;
const MAX_PREVIEW_CACHE_ENTRIES = 500;
const DM_STATUS_COLORS: Record<string, string> = {
    online: "#23A55A",
    idle: "#F0B232",
    dnd: "#F23F43",
    invisible: "#80848E",
    offline: "#80848E",
};

function mergeCacheWithLimit<T>(
    prev: Record<string, T>,
    entries: Array<readonly [string, T]>,
    limit: number
) {
    if (entries.length === 0) return prev;

    const next: Record<string, T> = { ...prev };
    for (const [key, value] of entries) {
        next[key] = value;
    }

    const keys = Object.keys(next);
    if (keys.length <= limit) return next;

    const keptKeys = keys.slice(keys.length - limit);
    const trimmed: Record<string, T> = {};
    for (const key of keptKeys) {
        trimmed[key] = next[key];
    }
    return trimmed;
}

function parseCallDuration(metadata: string | null | undefined): number {
    if (!metadata) return 0;
    try {
        const parsed = JSON.parse(metadata) as { duration?: unknown };
        const duration = parsed.duration;
        return typeof duration === "number" && duration > 0 ? duration : 0;
    } catch {
        return 0;
    }
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

function getStickerId(content: string): string | null {
    const trimmed = content.trim();
    if (!trimmed.startsWith(STICKER_PREFIX)) return null;
    const id = trimmed.slice(STICKER_PREFIX.length).trim();
    return id.length > 0 ? id : null;
}

const EMPTY_DM_TYPING_USERS: Array<{ userId: string; username: string }> = [];

export function DMChatView({
    conversation,
    onConversationUpdated,
    onSubscribeDM,
    onUnsubscribeDM,
    onStartCall,
    onDMTypingStart,
    onDMTypingStop,
    activeCall,
}: DMChatViewProps) {
    const currentUserId = useAuthStore((s) => s.user?.id);
    const [loading, setLoading] = useState(true);
    const [loadingOlder, setLoadingOlder] = useState(false);
    const [messageInput, setMessageInput] = useState("");
    const [sending, setSending] = useState(false);
    const [startingCall, setStartingCall] = useState(false);
    const [hoveredMessage, setHoveredMessage] = useState<string | null>(null);
    const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
    const [editContent, setEditContent] = useState("");
    const [replyTo, setReplyTo] = useState<DMMessageData | null>(null);
    const [showEmojiPicker, setShowEmojiPicker] = useState(false);
    const [showGifPicker, setShowGifPicker] = useState(false);
    const [showStickerPicker, setShowStickerPicker] = useState(false);
    const [showMembersPane, setShowMembersPane] = useState(true);
    const [showPinsPanel, setShowPinsPanel] = useState(false);
    const [uploadingAttachment, setUploadingAttachment] = useState(false);
    const [stickerCache, setStickerCache] = useState<Record<string, StickerData | null>>({});
    const [previewCache, setPreviewCache] = useState<Record<string, MessageEmbedData | null>>({});
    const [reactionPickerMessageId, setReactionPickerMessageId] = useState<string | null>(null);
    const [selectedSlashIndex, setSelectedSlashIndex] = useState(0);
    const [selectedMentionIndex, setSelectedMentionIndex] = useState(0);
    const [cursorPosition, setCursorPosition] = useState(0);
    const containerRef = useRef<HTMLDivElement>(null);
    const endRef = useRef<HTMLDivElement>(null);
    const attachmentInputRef = useRef<HTMLInputElement>(null);
    const dmTextareaRef = useRef<HTMLTextAreaElement>(null);
    const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const conversationMessages = useDMStore((s) => s.messages[conversation.id]);
    const messages = conversationMessages ?? EMPTY_DM_MESSAGES;
    const hasMore = useDMStore((s) => s.hasMore[conversation.id] ?? true);
    const setStoreMessages = useDMStore((s) => s.setMessages);
    const prependStoreMessages = useDMStore((s) => s.prependMessages);
    const addStoreMessage = useDMStore((s) => s.addMessage);
    const updateStoreMessage = useDMStore((s) => s.updateMessage);
    const deleteStoreMessage = useDMStore((s) => s.deleteMessage);
    const dmTypingUsers = useDMStore((s) => s.typingUsers[conversation.id]);
    const typingUsers = dmTypingUsers ?? EMPTY_DM_TYPING_USERS;
    const conversationPinnedMessages = useDMStore((s) => s.pinnedMessages[conversation.id]);
    const pinnedMessages = conversationPinnedMessages ?? EMPTY_PINNED_MESSAGES;
    const setPinnedMessages = useDMStore((s) => s.setPinnedMessages);
    const runtimeThrottled = useRuntimeThrottled();

    const stopTyping = useCallback(() => {
        if (typingTimeoutRef.current) {
            clearTimeout(typingTimeoutRef.current);
            typingTimeoutRef.current = null;
        }
        onDMTypingStop?.(conversation.id);
    }, [conversation.id, onDMTypingStop]);

    const title = useMemo(
        () => conversationTitle(conversation, currentUserId),
        [conversation, currentUserId]
    );
    const peer = useMemo(
        () =>
            conversation.participants.find((participant) => participant.id !== currentUserId) ||
            conversation.participants[0] ||
            null,
        [conversation.participants, currentUserId]
    );
    const members = useMemo(() => {
        const sorted = [...conversation.participants];
        sorted.sort((a, b) => {
            if (a.id === currentUserId) return 1;
            if (b.id === currentUserId) return -1;
            return a.displayName.localeCompare(b.displayName);
        });
        return sorted;
    }, [conversation.participants, currentUserId]);
    const slashQuery = useMemo(() => extractSlashQuery(messageInput), [messageInput]);
    const filteredSlashCommands = useMemo(
        () => filterSlashCommands(slashQuery),
        [slashQuery]
    );
    const showSlashCommandMenu = slashQuery !== null && filteredSlashCommands.length > 0;

    const dmMentionUsers = useMemo<MentionUser[]>(
        () => conversation.participants.map((p) => ({
            id: p.id,
            displayName: p.displayName,
            username: p.username,
            avatarUrl: p.avatarUrl,
        })),
        [conversation.participants]
    );
    const mentionQuery = useMemo(() => extractMentionQuery(messageInput, cursorPosition), [messageInput, cursorPosition]);
    const filteredMentionUsers = useMemo(
        () => mentionQuery !== null ? filterMentionUsers(dmMentionUsers, mentionQuery) : [],
        [mentionQuery, dmMentionUsers]
    );
    const showMentionMenu = !showSlashCommandMenu && filteredMentionUsers.length > 0;

    const callDurationByMessageId = useMemo(() => {
        const durations = new Map<string, number>();
        for (const message of messages) {
            if (message.type === "call") {
                durations.set(message.id, parseCallDuration(message.metadata));
            }
        }
        return durations;
    }, [messages]);
    const virtualMessages = useVirtualWindow({
        items: messages,
        getItemKey: (message) => message.id,
        containerRef,
        estimateSize: 96,
        overscan: 8,
        enabled: messages.length > 80,
    });

    const stickerIdsInMessages = useMemo(() => {
        const ids = new Set<string>();
        for (const message of messages) {
            const stickerId = getStickerId(message.content);
            if (stickerId) ids.add(stickerId);
        }
        return Array.from(ids);
    }, [messages]);

    useEffect(() => {
        setSelectedSlashIndex(0);
    }, [slashQuery]);

    useEffect(() => {
        return () => {
            stopTyping();
        };
    }, [stopTyping]);

    useEffect(() => {
        if (runtimeThrottled) return;

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

            setStickerCache((prev) =>
                mergeCacheWithLimit(
                    prev,
                    resolvedEntries,
                    MAX_STICKER_CACHE_ENTRIES
                )
            );
        })();

        return () => {
            cancelled = true;
        };
    }, [runtimeThrottled, stickerIdsInMessages, stickerCache]);

    const previewUrls = useMemo(() => {
        const urls = new Set<string>();
        for (const message of messages) {
            if (getStickerId(message.content) || parseAttachmentContent(message.content)) {
                continue;
            }
            for (const url of extractMessageUrls(message.content)) {
                urls.add(url);
            }
        }
        return Array.from(urls);
    }, [messages]);

    useEffect(() => {
        if (runtimeThrottled) return;

        const missing = previewUrls.filter(
            (url) => !Object.prototype.hasOwnProperty.call(previewCache, url)
        );
        if (missing.length === 0) return;

        let cancelled = false;

        (async () => {
            const fetched = await Promise.all(
                missing.map(async (url) => {
                    try {
                        const result = await fetchLinkPreview(url);
                        if (!result.embed) return [url, null] as const;
                        return [
                            url,
                            {
                                id: `preview:${url}`,
                                ...result.embed,
                            } as MessageEmbedData,
                        ] as const;
                    } catch {
                        return [url, null] as const;
                    }
                })
            );

            if (cancelled) return;

            setPreviewCache((prev) =>
                mergeCacheWithLimit(
                    prev,
                    fetched,
                    MAX_PREVIEW_CACHE_ENTRIES
                )
            );
        })();

        return () => {
            cancelled = true;
        };
    }, [previewUrls, previewCache, runtimeThrottled]);

    // Load pinned messages
    useEffect(() => {
        fetchDMPins(conversation.id)
            .then((data) => setPinnedMessages(conversation.id, data.pins.map((p) => p.message)))
            .catch(console.error);
    }, [conversation.id, setPinnedMessages]);

    useEffect(() => {
        let mounted = true;
        onSubscribeDM(conversation.id);

        (async () => {
            try {
                const existingMessages = useDMStore.getState().messages[conversation.id];
                if (!existingMessages || existingMessages.length === 0) {
                    setLoading(true);
                    const data = await fetchDMMessages(conversation.id);
                    if (!mounted) return;
                    setStoreMessages(
                        conversation.id,
                        data.messages,
                        data.nextCursor,
                        data.hasMore
                    );
                }
                setTimeout(() => endRef.current?.scrollIntoView({ behavior: "auto" }), 20);
            } catch (err) {
                console.error("Failed to load DM messages:", err);
            } finally {
                if (mounted) setLoading(false);
            }
        })();

        return () => {
            mounted = false;
            onUnsubscribeDM(conversation.id);
        };
    }, [conversation.id, onSubscribeDM, onUnsubscribeDM, setStoreMessages]);

    useEffect(() => {
        const container = containerRef.current;
        if (!container) return;
        const isNearBottom =
            container.scrollHeight - container.scrollTop - container.clientHeight < 150;
        if (isNearBottom) {
            endRef.current?.scrollIntoView({ behavior: "smooth" });
        }
    }, [messages.length]);

    const loadOlder = useCallback(async () => {
        if (loadingOlder || !hasMore || messages.length === 0) return;
        const oldest = messages[0];
        setLoadingOlder(true);
        try {
            const data = await fetchDMMessages(conversation.id, oldest.id);
            prependStoreMessages(
                conversation.id,
                data.messages,
                data.nextCursor,
                data.hasMore
            );
        } catch (err) {
            console.error("Failed to load older DM messages:", err);
        } finally {
            setLoadingOlder(false);
        }
    }, [loadingOlder, hasMore, messages, conversation.id, prependStoreMessages]);

    const handleScroll = useCallback(() => {
        const container = containerRef.current;
        if (!container) return;
        if (container.scrollTop < 100) {
            loadOlder();
        }
    }, [loadOlder]);

    const syncConversationFromMessage = useCallback(
        (message: DMMessageData) => {
            const stickerId = getStickerId(message.content);
            const attachment = parseAttachmentContent(message.content);
            const lastMessageContent = stickerId
                ? "[Sticker]"
                : attachment
                    ? `[Attachment] ${attachment.name}`
                    : message.content;

            onConversationUpdated({
                ...conversation,
                updatedAt: message.createdAt,
                lastMessage: {
                    id: message.id,
                    content: lastMessageContent,
                    type: message.type,
                    metadata: message.metadata,
                    createdAt: message.createdAt,
                    author: message.author,
                },
            });
        },
        [conversation, onConversationUpdated]
    );

    const handleSend = useCallback(async () => {
        const content = messageInput.trim();
        if (!content || sending) return;

        setSending(true);
        setMessageInput("");
        stopTyping();

        try {
            const result = await sendDMMessage(conversation.id, content, replyTo?.id);
            addStoreMessage(conversation.id, result.message);
            syncConversationFromMessage(result.message);
            setReplyTo(null);
            setTimeout(() => endRef.current?.scrollIntoView({ behavior: "smooth" }), 20);
        } catch (err) {
            console.error("Failed to send DM message:", err);
            if (err instanceof Error) {
                alert(err.message);
            }
            setMessageInput(content);
        } finally {
            setSending(false);
        }
    }, [messageInput, sending, conversation.id, replyTo?.id, addStoreMessage, syncConversationFromMessage, stopTyping]);

    const applySlashSelection = useCallback(
        (index: number) => {
            const command = filteredSlashCommands[index];
            if (!command) return;
            setMessageInput(formatSlashCommandInput(command));
            setSelectedSlashIndex(0);
        },
        [filteredSlashCommands]
    );

    const applyMentionSelection = useCallback(
        (user: MentionUser) => {
            const { newText, newCursor } = applyMention(messageInput, cursorPosition, user);
            setMessageInput(newText);
            setCursorPosition(newCursor);
            setSelectedMentionIndex(0);
            setTimeout(() => {
                if (dmTextareaRef.current) {
                    dmTextareaRef.current.selectionStart = newCursor;
                    dmTextareaRef.current.selectionEnd = newCursor;
                    dmTextareaRef.current.focus();
                }
            }, 0);
        },
        [messageInput, cursorPosition]
    );

    const handleComposerKeyDown = useCallback(
        (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
            if (showMentionMenu) {
                if (e.key === "ArrowDown") {
                    e.preventDefault();
                    setSelectedMentionIndex((prev) => (prev + 1) % filteredMentionUsers.length);
                    return;
                }
                if (e.key === "ArrowUp") {
                    e.preventDefault();
                    setSelectedMentionIndex((prev) =>
                        (prev - 1 + filteredMentionUsers.length) % filteredMentionUsers.length
                    );
                    return;
                }
                if (e.key === "Tab" || (e.key === "Enter" && !e.shiftKey)) {
                    e.preventDefault();
                    applyMentionSelection(filteredMentionUsers[selectedMentionIndex]);
                    return;
                }
                if (e.key === "Escape") {
                    e.preventDefault();
                    setCursorPosition(0);
                    return;
                }
            }

            if (showSlashCommandMenu) {
                if (e.key === "ArrowDown") {
                    e.preventDefault();
                    setSelectedSlashIndex((prev) => (prev + 1) % filteredSlashCommands.length);
                    return;
                }
                if (e.key === "ArrowUp") {
                    e.preventDefault();
                    setSelectedSlashIndex((prev) =>
                        (prev - 1 + filteredSlashCommands.length) % filteredSlashCommands.length
                    );
                    return;
                }
                if (e.key === "Tab") {
                    e.preventDefault();
                    applySlashSelection(selectedSlashIndex);
                    return;
                }
                if (e.key === "Enter" && !e.shiftKey && /^\s*\/\S*$/.test(messageInput)) {
                    e.preventDefault();
                    applySlashSelection(selectedSlashIndex);
                    return;
                }
            }

            if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSend();
            }
        },
        [
            applyMentionSelection,
            applySlashSelection,
            filteredMentionUsers,
            filteredSlashCommands.length,
            handleSend,
            messageInput,
            selectedMentionIndex,
            selectedSlashIndex,
            showMentionMenu,
            showSlashCommandMenu,
        ]
    );

    const handleEdit = async (messageId: string) => {
        const content = editContent.trim();
        if (!content) return;

        const targetMessage = messages.find((msg) => msg.id === messageId);
        const targetConversationId = targetMessage?.conversationId || conversation.id;

        try {
            const result = await editDMMessage(targetConversationId, messageId, content);
            updateStoreMessage(targetConversationId, messageId, {
                content: result.message.content,
                editedAt: result.message.editedAt || new Date().toISOString(),
            });
            if (conversation.lastMessage?.id === messageId) {
                onConversationUpdated({
                    ...conversation,
                    lastMessage: {
                        ...conversation.lastMessage,
                        content: result.message.content,
                    },
                });
            }
            setEditingMessageId(null);
            setEditContent("");
        } catch (err) {
            console.error("Failed to edit DM message:", err);
            if (err instanceof Error && /message not found/i.test(err.message)) {
                deleteStoreMessage(targetConversationId, messageId);
                setEditingMessageId(null);
                setEditContent("");
                return;
            }
            if (err instanceof Error) {
                alert(err.message);
            }
        }
    };

    const handleDelete = async (messageId: string) => {
        const targetMessage = messages.find((msg) => msg.id === messageId);
        const targetConversationId = targetMessage?.conversationId || conversation.id;

        try {
            await deleteDMMessage(targetConversationId, messageId);
            deleteStoreMessage(targetConversationId, messageId);
            if (conversation.lastMessage?.id === messageId) {
                onConversationUpdated({
                    ...conversation,
                    lastMessage: null,
                });
            }
        } catch (err) {
            console.error("Failed to delete DM message:", err);
            if (err instanceof Error && /message not found/i.test(err.message)) {
                // If it was already removed remotely, keep local state in sync.
                deleteStoreMessage(targetConversationId, messageId);
                return;
            }
            if (err instanceof Error) {
                alert(err.message);
            }
        }
    };

    const handleReaction = async (messageId: string, emoji: string, alreadyReacted: boolean) => {
        try {
            if (alreadyReacted) {
                await removeDMReaction(conversation.id, messageId, emoji);
            } else {
                await addDMReaction(conversation.id, messageId, emoji);
            }
        } catch (err) {
            console.error("Failed to toggle DM reaction:", err);
        }
    };

    const getMessageEmbeds = useCallback(
        (content: string) =>
            extractMessageUrls(content)
                .map((url) => previewCache[url])
                .filter((embed): embed is MessageEmbedData => !!embed),
        [previewCache]
    );

    const isGifUrl = (content: string) => {
        const trimmed = content.trim();
        return /^https?:\/\/.*\.(gif|webp)(\?.*)?$/i.test(trimmed) ||
            trimmed.includes("tenor.com/") ||
            trimmed.includes("giphy.com/");
    };

    const isDirectVideoUrl = (content: string) => {
        const trimmed = content.trim();
        return /^https?:\/\/.*\.(mp4|webm|mov|m4v|ogg)(\?.*)?$/i.test(trimmed);
    };

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
            const attachmentUrl = resolveAttachmentUrl(attachment.url, API_URL);

            if (attachment.kind === "image") {
                return (
                    <img
                        src={attachmentUrl}
                        alt={attachment.name}
                        className="max-w-[360px] max-h-[280px] rounded-lg mt-1"
                        loading="lazy"
                    />
                );
            }

            if (attachment.kind === "video") {
                return (
                    <video
                        src={attachmentUrl}
                        controls
                        className="max-w-[420px] max-h-[320px] rounded-lg mt-1 bg-black"
                    />
                );
            }

            return (
                <a
                    href={attachmentUrl}
                    download={attachment.name}
                    className="mt-1 inline-flex items-center gap-2 rounded-lg border border-border bg-surface-raised px-3 py-2 text-body text-text-primary hover:bg-hover-row"
                >
                    <FileText className="w-4 h-4 text-text-muted" />
                    <span className="truncate max-w-[280px]">{attachment.name}</span>
                    <span className="text-micro text-text-muted">{formatAttachmentSize(attachment.size)}</span>
                    <Download className="w-4 h-4 text-text-muted" />
                </a>
            );
        }

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

        if (isDirectVideoUrl(content.trim())) {
            return (
                <video
                    src={content.trim()}
                    controls
                    className="max-w-[420px] max-h-[320px] rounded-lg mt-1 bg-black"
                />
            );
        }
        return linkifyAndMentionText(content);
    };

    const formatTime = (value: string) =>
        new Date(value).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });

    const ActionPill = ({ message, isOwn }: { message: DMMessageData; isOwn: boolean }) => {
        const isPinned = pinnedMessages.some((p) => p.id === message.id);
        return (
            <div className="absolute -top-3 right-2 flex items-center gap-0.5 bg-surface border border-border rounded-lg px-1 py-1 shadow-[0_4px_12px_rgba(0,0,0,0.2)] z-20">
                {["👍", "❤️", "😂"].map((emoji) => (
                    <button
                        key={`${message.id}-quick-${emoji}`}
                        onClick={() =>
                            handleReaction(
                                message.id,
                                emoji,
                                message.reactions.some((reaction) => reaction.emoji === emoji && reaction.reacted)
                            )
                        }
                        className="min-w-7 h-7 px-1 rounded-md hover:bg-hover-row flex items-center justify-center text-[13px] transition-colors"
                        title={`React with ${emoji}`}
                    >
                        {emoji}
                    </button>
                ))}
                <div className="w-px h-4 bg-border mx-0.5" />
                <div className="relative">
                    <button
                        onClick={() =>
                            setReactionPickerMessageId(
                                reactionPickerMessageId === message.id ? null : message.id
                            )
                        }
                        className="w-7 h-7 rounded-md hover:bg-hover-row flex items-center justify-center text-text-muted hover:text-text-primary transition-colors"
                        title="Add reaction"
                    >
                        <Smile className="w-[14px] h-[14px]" />
                    </button>
                    {reactionPickerMessageId === message.id && (
                        <div className="absolute top-full right-0 mt-2 z-50">
                            <EmojiPicker
                                onSelect={(emoji) => {
                                    handleReaction(
                                        message.id,
                                        emoji,
                                        message.reactions.some(
                                            (reaction) => reaction.emoji === emoji && reaction.reacted
                                        )
                                    );
                                    setReactionPickerMessageId(null);
                                }}
                                onClose={() => setReactionPickerMessageId(null)}
                            />
                        </div>
                    )}
                </div>
                <button
                    onClick={() => setReplyTo(message)}
                    className="w-7 h-7 rounded-md hover:bg-hover-row flex items-center justify-center text-text-muted hover:text-text-primary transition-colors"
                    title="Reply"
                >
                    <Reply className="w-[14px] h-[14px]" />
                </button>
                <button
                    onClick={() => isPinned ? handleUnpin(message.id) : handlePin(message.id)}
                    className={`w-7 h-7 rounded-md hover:bg-hover-row flex items-center justify-center transition-colors ${isPinned ? "text-accent-violet" : "text-text-muted hover:text-text-primary"}`}
                    title={isPinned ? "Unpin" : "Pin"}
                >
                    <Pin className="w-[14px] h-[14px]" />
                </button>
                {isOwn && (
                    <>
                        <button
                            onClick={() => {
                                setEditingMessageId(message.id);
                                setEditContent(message.content);
                            }}
                            className="w-7 h-7 rounded-md hover:bg-hover-row flex items-center justify-center text-text-muted hover:text-text-primary transition-colors"
                            title="Edit"
                        >
                            <Pencil className="w-[14px] h-[14px]" />
                        </button>
                        <div className="w-px h-4 bg-border mx-0.5" />
                        <button
                            onClick={() => handleDelete(message.id)}
                            className="w-7 h-7 rounded-md hover:bg-danger/10 flex items-center justify-center text-text-muted hover:text-danger transition-colors"
                            title="Delete"
                        >
                            <Trash2 className="w-[14px] h-[14px]" />
                        </button>
                    </>
                )}
            </div>
        );
    };

    const handleStartCall = useCallback(
        async (withVideo: boolean) => {
            if (startingCall || activeCall) return;
            setStartingCall(true);
            try {
                await onStartCall(conversation.id, withVideo);
            } catch (err) {
                console.error("Failed to start call:", err);
            } finally {
                setStartingCall(false);
            }
        },
        [activeCall, conversation.id, onStartCall, startingCall]
    );

    const handleSendSticker = useCallback(
        async (sticker: StickerData) => {
            try {
                const result = await sendDMMessage(conversation.id, `${STICKER_PREFIX}${sticker.id}`, replyTo?.id);
                addStoreMessage(conversation.id, result.message);
                syncConversationFromMessage(result.message);
                setStickerCache((prev) =>
                    mergeCacheWithLimit(
                        prev,
                        [[sticker.id, sticker]],
                        MAX_STICKER_CACHE_ENTRIES
                    )
                );
                setReplyTo(null);
                setShowStickerPicker(false);
                setTimeout(() => endRef.current?.scrollIntoView({ behavior: "smooth" }), 20);
            } catch (err) {
                console.error("Failed to send sticker:", err);
            }
        },
        [conversation.id, replyTo?.id, addStoreMessage, syncConversationFromMessage]
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
                const sent = await sendDMMessage(
                    conversation.id,
                    encodeAttachmentContent(result.attachment),
                    replyTo?.id
                );
                addStoreMessage(conversation.id, sent.message);
                syncConversationFromMessage(sent.message);
                setReplyTo(null);
                setTimeout(() => endRef.current?.scrollIntoView({ behavior: "smooth" }), 20);
            } catch (err) {
                console.error("Failed to upload attachment:", err);
                alert(err instanceof Error ? err.message : "Failed to upload attachment.");
            } finally {
                setUploadingAttachment(false);
            }
        },
        [conversation.id, replyTo?.id, addStoreMessage, syncConversationFromMessage]
    );

    const formatReplyContent = (content: string) => {
        if (getStickerId(content)) return "[Sticker]";
        const attachment = parseAttachmentContent(content);
        if (attachment) return `[Attachment] ${attachment.name}`;
        return content;
    };

    const handlePin = async (messageId: string) => {
        try {
            await pinDMMessage(conversation.id, messageId);
        } catch (err) {
            console.error("Failed to pin message:", err);
        }
    };

    const handleUnpin = async (messageId: string) => {
        try {
            await unpinDMMessage(conversation.id, messageId);
        } catch (err) {
            console.error("Failed to unpin message:", err);
        }
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const nextValue = e.target.value;
        setMessageInput(nextValue);
        setCursorPosition(e.target.selectionStart || 0);
        setSelectedMentionIndex(0);

        const hasContent = nextValue.trim().length > 0;

        if (!hasContent) {
            stopTyping();
            return;
        }

        if (!typingTimeoutRef.current) {
            onDMTypingStart?.(conversation.id);
        } else {
            clearTimeout(typingTimeoutRef.current);
        }

        typingTimeoutRef.current = setTimeout(() => {
            stopTyping();
        }, 3000);
    };

    return (
        <div className="flex-1 min-w-0 min-h-0 bg-channel-sidebar flex">
            <div className="flex-1 min-w-0 flex flex-col border-r border-border-subtle">
                <div className="h-12 border-b border-border-subtle flex items-center px-4 gap-3 flex-shrink-0">
                    <div className="w-7 h-7 rounded-full overflow-hidden bg-surface-raised flex items-center justify-center text-text-secondary">
                        {conversation.type === "group" || !peer ? (
                            <Users className="w-4 h-4" />
                        ) : (
                            <UserAvatar
                                avatarUrl={peer.avatarUrl}
                                username={peer.username}
                                className="w-full h-full"
                            />
                        )}
                    </div>
                    <div className="min-w-0">
                        <p
                            className="text-body font-semibold truncate"
                            style={{ color: peer ? getUsernameColor(peer.username) : "inherit" }}
                        >
                            {title}
                        </p>
                        <p className="text-micro text-text-muted truncate">
                            {conversation.type === "group"
                                ? `${conversation.participants.length} members`
                                : peer?.status || "offline"}
                        </p>
                    </div>
                    {activeCall && (
                        <span className="text-micro text-accent-teal font-medium">In call</span>
                    )}
                    <div className="ml-auto flex items-center gap-1">
                        <button
                            onClick={() => handleStartCall(false)}
                            disabled={startingCall || !!activeCall}
                            title={activeCall ? "Call already active" : "Start voice call"}
                            className="w-8 h-8 rounded-lg text-text-muted hover:text-text-primary hover:bg-hover-row disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center"
                        >
                            <Phone className="w-4 h-4" />
                        </button>
                        <button
                            onClick={() => handleStartCall(true)}
                            disabled={startingCall || !!activeCall}
                            title={activeCall ? "Call already active" : "Start video call"}
                            className="w-8 h-8 rounded-lg text-text-muted hover:text-text-primary hover:bg-hover-row disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center"
                        >
                            <Video className="w-4 h-4" />
                        </button>
                        <button
                            type="button"
                            title={showPinsPanel ? "Hide pinned messages" : "Pinned messages"}
                            onClick={() => setShowPinsPanel((prev) => !prev)}
                            className={`w-8 h-8 rounded-lg hover:bg-hover-row transition-colors flex items-center justify-center ${showPinsPanel ? "text-accent-violet" : "text-text-muted hover:text-text-primary"}`}
                        >
                            <Pin className="w-4 h-4" />
                        </button>
                        <button
                            type="button"
                            title="Search"
                            className="w-8 h-8 rounded-lg text-text-muted hover:text-text-primary hover:bg-hover-row transition-colors flex items-center justify-center"
                        >
                            <Search className="w-4 h-4" />
                        </button>
                        <button
                            type="button"
                            title="Add Friend"
                            className="w-8 h-8 rounded-lg text-text-muted hover:text-text-primary hover:bg-hover-row transition-colors flex items-center justify-center"
                        >
                            <UserPlus className="w-4 h-4" />
                        </button>
                        <button
                            type="button"
                            title={showMembersPane ? "Hide members" : "Show members"}
                            onClick={() => setShowMembersPane((prev) => !prev)}
                            className="hidden xl:flex w-8 h-8 rounded-lg text-text-muted hover:text-text-primary hover:bg-hover-row transition-colors items-center justify-center"
                        >
                            {showMembersPane ? (
                                <PanelRightClose className="w-4 h-4" />
                            ) : (
                                <PanelRightOpen className="w-4 h-4" />
                            )}
                        </button>
                    </div>
                </div>

                <div
                    ref={containerRef}
                    onScroll={handleScroll}
                    className="flex-1 overflow-y-auto px-4 py-4 space-y-3"
                >
                    {loadingOlder && (
                        <div className="flex justify-center py-2">
                            <Loader2 className="w-5 h-5 text-text-muted animate-spin" />
                        </div>
                    )}

                    {loading && (
                        <div className="flex justify-center py-10">
                            <Loader2 className="w-6 h-6 text-accent-violet animate-spin" />
                        </div>
                    )}

                    {!loading && messages.length === 0 && (
                        <div className="text-center py-10">
                            <p className="text-heading font-bold text-text-primary mb-1">
                                Start your conversation
                            </p>
                            <p className="text-body text-text-muted">
                                Send a message to begin this DM.
                            </p>
                        </div>
                    )}

                    {virtualMessages.topSpacer > 0 && (
                        <div style={{ height: `${virtualMessages.topSpacer}px` }} />
                    )}

                    {virtualMessages.items.map(({ item: message, key, measureRef }) => {
                        if (message.type === "call") {
                            const duration = callDurationByMessageId.get(message.id) || 0;

                            const mins = Math.floor(duration / 60);
                            const secs = duration % 60;
                            const hasDur = duration > 0;
                            const durStr = hasDur ? (mins > 0 ? `${mins}m ${secs}s` : `${secs}s`) : "0s";
                            const callTitle = hasDur
                                ? `${message.author.displayName} started a call`
                                : `Missed call from ${message.author.displayName}`;
                            const callSubtitle = hasDur
                                ? `Call lasted ${durStr}`
                                : "You missed this call";

                            return (
                                <div
                                    key={key}
                                    ref={measureRef}
                                    className={`relative my-2 px-3 py-3 rounded-lg border ${hasDur
                                        ? "bg-surface border-border"
                                        : "bg-danger/5 border-danger/10"
                                        }`}
                                >
                                    <div className={`flex items-center gap-3 ${hasDur ? "text-text-primary" : "text-danger"}`}>
                                        <div
                                            className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${hasDur
                                                ? "bg-surface-raised text-text-primary"
                                                : "bg-danger/10 text-danger"
                                                }`}
                                        >
                                            {hasDur ? (
                                                <Phone className="w-5 h-5" />
                                            ) : (
                                                <PhoneOff className="w-5 h-5" />
                                            )}
                                        </div>

                                        <div className="min-w-0 flex-1">
                                            <div className="text-[14px] font-semibold truncate leading-tight">
                                                {callTitle}
                                            </div>
                                            <div className="text-micro mt-0.5 flex items-center gap-1.5 opacity-80">
                                                <span>
                                                    {callSubtitle}
                                                </span>
                                                <span className="opacity-50">•</span>
                                                <span>
                                                    {formatTime(message.createdAt)}
                                                </span>
                                            </div>
                                        </div>

                                        <div
                                            className={`px-2.5 py-1 rounded-full text-micro font-bold tracking-wide uppercase ${hasDur
                                                ? "bg-surface-raised text-text-muted"
                                                : "bg-danger/10 text-danger"
                                                }`}
                                        >
                                            {hasDur ? "Connected" : "Missed"}
                                        </div>
                                    </div>
                                </div>
                            );
                        }

                        const isOwn = message.author.id === currentUserId;
                        const messageEmbeds = getMessageEmbeds(message.content);
                        const authorColor = getUsernameColor(message.author.username);

                        return (
                            <div
                                key={key}
                                ref={measureRef}
                                className={`relative flex gap-3 group p-1 pl-1 -m-1 mt-[1px] rounded-md transition-colors ${hoveredMessage === message.id ? "bg-hover-row" : ""
                                    }`}
                                onMouseEnter={() => setHoveredMessage(message.id)}
                                onMouseLeave={() => setHoveredMessage(null)}
                            >
                                <UserAvatar
                                    avatarUrl={message.author.avatarUrl}
                                    username={message.author.username}
                                    className="w-9 h-9 mt-0.5"
                                />
                                <div className="min-w-0 flex-1">
                                    {message.replyTo && (
                                        <div className="flex items-center gap-1.5 mb-1 text-micro text-text-muted">
                                            <CornerDownRight className="w-3 h-3" />
                                            <span className="text-accent-violet font-medium">
                                                {message.replyTo.author.displayName}
                                            </span>
                                            <span className="truncate max-w-[300px]">
                                                {formatReplyContent(message.replyTo.content)}
                                            </span>
                                        </div>
                                    )}
                                    <div className="flex items-baseline gap-2">
                                        <span
                                            className="text-[15px] font-semibold hover:underline cursor-pointer"
                                            style={{ color: authorColor }}
                                        >
                                            {message.author.displayName}
                                        </span>
                                        <span className="text-micro text-text-muted">
                                            {formatTime(message.createdAt)}
                                        </span>
                                        {message.editedAt && (
                                            <span className="text-micro text-text-muted">(edited)</span>
                                        )}
                                    </div>

                                    {editingMessageId === message.id ? (
                                        <div className="space-y-2 mt-1">
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
                                        <>
                                            <div className="text-body text-text-primary whitespace-pre-wrap break-words">
                                                {renderContent(message.content)}
                                            </div>
                                            {messageEmbeds.length > 0 && (
                                                <div className="mt-1">
                                                    {messageEmbeds.map((embed) => (
                                                        <LinkEmbed key={embed.id} embed={embed} />
                                                    ))}
                                                </div>
                                            )}
                                        </>
                                    )}

                                    {message.reactions.length > 0 && (
                                        <div className="flex gap-1.5 mt-2">
                                            {message.reactions.map((reaction, idx) => (
                                                <button
                                                    key={`${message.id}-reaction-${idx}`}
                                                    onClick={() => handleReaction(message.id, reaction.emoji, reaction.reacted)}
                                                    className={`flex items-center gap-1.5 px-2 py-0.5 rounded-md text-micro transition-all ${reaction.reacted
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
                                                    onClick={() =>
                                                        setReactionPickerMessageId(
                                                            reactionPickerMessageId === message.id ? null : message.id
                                                        )
                                                    }
                                                    className="flex items-center justify-center w-6 h-6 rounded-md bg-surface-raised border border-border hover:border-accent-violet/40 transition-all"
                                                >
                                                    <Plus className="w-3 h-3 text-text-muted" />
                                                </button>
                                                {reactionPickerMessageId === message.id && (
                                                    <div className="absolute top-full left-0 mt-2 z-50">
                                                        <EmojiPicker
                                                            onSelect={(emoji) => {
                                                                handleReaction(
                                                                    message.id,
                                                                    emoji,
                                                                    message.reactions.some(
                                                                        (reaction) =>
                                                                            reaction.emoji === emoji && reaction.reacted
                                                                    )
                                                                );
                                                                setReactionPickerMessageId(null);
                                                            }}
                                                            onClose={() => setReactionPickerMessageId(null)}
                                                        />
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {hoveredMessage === message.id && editingMessageId !== message.id && (
                                    <ActionPill message={message} isOwn={isOwn} />
                                )}
                            </div>
                        );
                    })}

                    {virtualMessages.bottomSpacer > 0 && (
                        <div style={{ height: `${virtualMessages.bottomSpacer}px` }} />
                    )}

                    <div ref={endRef} />
                </div>

                {/* Typing indicator */}
                {typingUsers.length > 0 && (
                    <div className="px-4 py-1">
                        <div className="flex items-center gap-2 text-micro text-[#8E93A3]">
                            <div className="flex gap-0.5">
                                <span className="w-1.5 h-1.5 rounded-full bg-[#8E93A3] animate-bounce" style={{ animationDelay: "0ms" }} />
                                <span className="w-1.5 h-1.5 rounded-full bg-[#8E93A3] animate-bounce" style={{ animationDelay: "150ms" }} />
                                <span className="w-1.5 h-1.5 rounded-full bg-[#8E93A3] animate-bounce" style={{ animationDelay: "300ms" }} />
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

                <div className={`px-4 pb-4 ${replyTo ? "pt-0" : "p-4"} border-t border-border-subtle`}>
                    <div className={`relative flex items-center gap-2 bg-surface-raised border border-border focus-within:border-accent-violet/40 focus-within:shadow-[0_0_0_1px_rgba(124,106,247,0.15)] transition-all px-3 py-2 ${replyTo ? "rounded-b-xl" : "rounded-lg"}`}>
                        {showSlashCommandMenu && (
                            <SlashCommandMenu
                                commands={filteredSlashCommands}
                                selectedIndex={selectedSlashIndex}
                                onSelect={(command) => setMessageInput(formatSlashCommandInput(command))}
                                onHover={setSelectedSlashIndex}
                            />
                        )}
                        {showMentionMenu && (
                            <MentionMenu
                                users={filteredMentionUsers}
                                selectedIndex={selectedMentionIndex}
                                onSelect={applyMentionSelection}
                                onHover={setSelectedMentionIndex}
                            />
                        )}
                        <button
                            onClick={() => attachmentInputRef.current?.click()}
                            disabled={uploadingAttachment}
                            className="w-8 h-8 rounded-md flex items-center justify-center text-text-muted hover:text-text-primary hover:bg-hover-row transition-colors disabled:opacity-50"
                            title="Upload file"
                        >
                            {uploadingAttachment ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                                <Plus className="w-4 h-4" />
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
                            ref={dmTextareaRef}
                            value={messageInput}
                            onChange={handleInputChange}
                            onSelect={(e) => setCursorPosition((e.target as HTMLTextAreaElement).selectionStart || 0)}
                            placeholder={`Message ${title}`}
                            className="flex-1 bg-transparent text-body text-text-primary placeholder:text-text-muted outline-none resize-none max-h-36 min-h-[22px] py-1 leading-[1.45]"
                            rows={1}
                            onKeyDown={handleComposerKeyDown}
                        />
                        <div className="flex items-center gap-0.5 flex-shrink-0">
                            <div className="relative">
                                <button
                                    onClick={() => {
                                        setShowStickerPicker(!showStickerPicker);
                                        setShowGifPicker(false);
                                        setShowEmojiPicker(false);
                                    }}
                                    className={`w-8 h-8 rounded-md flex items-center justify-center transition-colors ${showStickerPicker ? "text-accent-violet" : "text-text-muted hover:text-text-primary hover:bg-hover-row"}`}
                                    title="Sticker"
                                >
                                    <ImageIcon className="w-4 h-4" />
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
                                    className={`w-8 h-8 rounded-md flex items-center justify-center transition-colors ${showGifPicker ? "text-accent-violet" : "text-text-muted hover:text-text-primary hover:bg-hover-row"}`}
                                    title="GIF"
                                >
                                    <span className="text-[11px] font-bold leading-none">GIF</span>
                                </button>
                                {showGifPicker && (
                                    <div className="absolute bottom-full right-0 mb-2 z-50">
                                        <GifPicker
                                            onSelect={async (gifUrl) => {
                                                try {
                                                    const result = await sendDMMessage(conversation.id, gifUrl, replyTo?.id);
                                                    addStoreMessage(conversation.id, result.message);
                                                    syncConversationFromMessage(result.message);
                                                    setReplyTo(null);
                                                    setShowGifPicker(false);
                                                } catch (err) {
                                                    console.error("Failed to send GIF:", err);
                                                }
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
                                    className={`w-8 h-8 rounded-md flex items-center justify-center transition-colors ${showEmojiPicker ? "text-accent-violet" : "text-text-muted hover:text-text-primary hover:bg-hover-row"}`}
                                    title="Emoji"
                                >
                                    <Smile className="w-4 h-4" />
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
                        <button
                            onClick={handleSend}
                            disabled={sending || !messageInput.trim()}
                            className="w-8 h-8 rounded-md bg-accent-violet text-white hover:bg-accent-violet/90 disabled:opacity-50 flex items-center justify-center"
                        >
                            <Send className="w-4 h-4" />
                        </button>
                    </div>
                    <div className="mt-1.5 px-1 text-micro text-text-muted">
                        Free uploads: {FREE_ATTACHMENT_MAX_LABEL} per file
                    </div>
                </div>

            </div>

            {showPinsPanel && (
                <aside className="hidden xl:flex w-[280px] flex-col bg-channel-sidebar border-l border-border-subtle">
                    <div className="h-12 border-b border-border-subtle px-4 flex items-center justify-between">
                        <span className="text-[12px] font-semibold tracking-wide uppercase text-text-faint">
                            Pinned Messages
                        </span>
                        <button
                            onClick={() => setShowPinsPanel(false)}
                            className="w-6 h-6 rounded hover:bg-hover-row flex items-center justify-center text-text-muted hover:text-text-primary transition-colors"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                    <div className="flex-1 overflow-y-auto px-3 py-3 space-y-2">
                        {pinnedMessages.length === 0 ? (
                            <div className="text-center py-8 text-text-muted text-micro">
                                No pinned messages yet
                            </div>
                        ) : (
                            pinnedMessages.map((msg) => (
                                <div
                                    key={msg.id}
                                    className="p-2.5 rounded-lg bg-surface-raised border border-border hover:border-border/80 transition-colors"
                                >
                                    <div className="flex items-center gap-2 mb-1">
                                        <UserAvatar
                                            avatarUrl={msg.author.avatarUrl}
                                            username={msg.author.username}
                                            className="w-5 h-5"
                                        />
                                        <span
                                            className="text-micro font-semibold"
                                            style={{ color: getUsernameColor(msg.author.username) }}
                                        >
                                            {msg.author.displayName}
                                        </span>
                                        <span className="text-micro text-text-muted ml-auto">
                                            {formatTime(msg.createdAt)}
                                        </span>
                                    </div>
                                    <div className="text-micro text-text-primary line-clamp-3">
                                        {formatReplyContent(msg.content)}
                                    </div>
                                    <button
                                        onClick={() => handleUnpin(msg.id)}
                                        className="mt-1.5 text-micro text-text-muted hover:text-danger transition-colors"
                                    >
                                        Unpin
                                    </button>
                                </div>
                            ))
                        )}
                    </div>
                </aside>
            )}

            {showMembersPane && (
                <aside className="hidden xl:flex w-[240px] flex-col bg-channel-sidebar border-l border-border-subtle">
                    <div className="h-12 border-b border-border-subtle px-4 flex items-center text-[12px] font-semibold tracking-wide uppercase text-text-faint">
                        Members - {members.length}
                    </div>
                    <div className="flex-1 overflow-y-auto px-2 py-3 space-y-1">
                        {members.map((member) => {
                            const statusColor = DM_STATUS_COLORS[member.status] || DM_STATUS_COLORS.offline;
                            const isYou = member.id === currentUserId;
                            const statusText =
                                isYou && member.status === "offline"
                                    ? ""
                                    : member.status || "offline";
                            const memberColor = getUsernameColor(member.username);

                            return (
                                <div
                                    key={member.id}
                                    className="flex items-center gap-2 px-2 py-2 rounded-lg hover:bg-hover-row transition-colors"
                                >
                                    <div className="relative">
                                        <UserAvatar
                                            avatarUrl={member.avatarUrl}
                                            username={member.username}
                                            className="w-8 h-8"
                                        />
                                        <span
                                            className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full ring-2 ring-channel-sidebar"
                                            style={{ backgroundColor: statusColor }}
                                        />
                                    </div>
                                    <div className="min-w-0">
                                        <div
                                            className="text-[14px] font-semibold truncate"
                                            style={{ color: memberColor }}
                                        >
                                            {member.displayName}
                                            {isYou ? " (You)" : ""}
                                        </div>
                                        {statusText && (
                                            <div className="text-micro text-text-muted truncate capitalize">
                                                {statusText}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </aside>
            )}
        </div>
    );
}
