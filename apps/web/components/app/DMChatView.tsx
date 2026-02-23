"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Download, FileText, Image as ImageIcon, Loader2, Pencil, Phone, PhoneOff, Plus, Search, Send, Smile, Trash2, UserPlus, Users, Video } from "lucide-react";
import {
    addDMReaction,
    fetchDMMessages,
    fetchLinkPreview,
    sendDMMessage,
    editDMMessage,
    deleteDMMessage,
    fetchStickerById,
    removeDMReaction,
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
import { EmojiPicker } from "./EmojiPicker";
import { GifPicker } from "./GifPicker";
import { StickerPicker } from "./StickerPicker";
import { CallModal } from "./CallModal";
import { LinkEmbed } from "./LinkEmbed";
import { SlashCommandMenu } from "./SlashCommandMenu";
import { extractMessageUrls, linkifyMessageText } from "@/lib/link-utils";
import {
    extractSlashQuery,
    filterSlashCommands,
    formatSlashCommandInput,
} from "@/lib/slash-commands";

interface DMChatViewProps {
    conversation: DMConversationData;
    onConversationUpdated: (conversation: DMConversationData) => void;
    onSubscribeDM: (conversationId: string) => void;
    onUnsubscribeDM: (conversationId: string) => void;
    onStartCall: (conversationId: string, withVideo: boolean) => Promise<void>;
    activeCall: {
        token: string;
        url: string;
        initialVideo: boolean;
    } | null;
    onEndCall: () => Promise<void>;
}

const EMPTY_DM_MESSAGES: DMMessageData[] = [];
const STICKER_PREFIX = "sticker:";
const DM_STATUS_COLORS: Record<string, string> = {
    online: "#23A55A",
    idle: "#F0B232",
    dnd: "#F23F43",
    invisible: "#80848E",
    offline: "#80848E",
};

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

export function DMChatView({
    conversation,
    onConversationUpdated,
    onSubscribeDM,
    onUnsubscribeDM,
    onStartCall,
    activeCall,
    onEndCall,
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
    const [showEmojiPicker, setShowEmojiPicker] = useState(false);
    const [showGifPicker, setShowGifPicker] = useState(false);
    const [showStickerPicker, setShowStickerPicker] = useState(false);
    const [uploadingAttachment, setUploadingAttachment] = useState(false);
    const [stickerCache, setStickerCache] = useState<Record<string, StickerData | null>>({});
    const [previewCache, setPreviewCache] = useState<Record<string, MessageEmbedData | null>>({});
    const [reactionPickerMessageId, setReactionPickerMessageId] = useState<string | null>(null);
    const [selectedSlashIndex, setSelectedSlashIndex] = useState(0);
    const [endingCall, setEndingCall] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);
    const endRef = useRef<HTMLDivElement>(null);
    const attachmentInputRef = useRef<HTMLInputElement>(null);

    const conversationMessages = useDMStore((s) => s.messages[conversation.id]);
    const messages = conversationMessages ?? EMPTY_DM_MESSAGES;
    const hasMore = useDMStore((s) => s.hasMore[conversation.id] ?? true);
    const setStoreMessages = useDMStore((s) => s.setMessages);
    const prependStoreMessages = useDMStore((s) => s.prependMessages);
    const addStoreMessage = useDMStore((s) => s.addMessage);
    const updateStoreMessage = useDMStore((s) => s.updateMessage);
    const deleteStoreMessage = useDMStore((s) => s.deleteMessage);

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

            setPreviewCache((prev) => {
                const next = { ...prev };
                for (const [url, embed] of fetched) {
                    next[url] = embed;
                }
                return next;
            });
        })();

        return () => {
            cancelled = true;
        };
    }, [previewUrls, previewCache]);

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
        try {
            const result = await sendDMMessage(conversation.id, content);
            addStoreMessage(conversation.id, result.message);
            syncConversationFromMessage(result.message);
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
    }, [messageInput, sending, conversation.id, addStoreMessage, syncConversationFromMessage]);

    const applySlashSelection = useCallback(
        (index: number) => {
            const command = filteredSlashCommands[index];
            if (!command) return;
            setMessageInput(formatSlashCommandInput(command));
            setSelectedSlashIndex(0);
        },
        [filteredSlashCommands]
    );

    const handleComposerKeyDown = useCallback(
        (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
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
            applySlashSelection,
            filteredSlashCommands.length,
            handleSend,
            messageInput,
            selectedSlashIndex,
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
        return linkifyMessageText(content);
    };

    const formatTime = (value: string) =>
        new Date(value).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });

    const ActionPill = ({ message, isOwn }: { message: DMMessageData; isOwn: boolean }) => (
        <div className="absolute -top-3 right-2 flex items-center gap-0.5 bg-surface border border-border rounded-lg px-1 py-1 shadow-lg z-20">
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
                    className="min-w-7 h-7 px-1 rounded-md hover:bg-surface-raised flex items-center justify-center text-[13px] transition-colors"
                    title={`React with ${emoji}`}
                >
                    {emoji}
                </button>
            ))}
            <div className="relative">
                <button
                    onClick={() =>
                        setReactionPickerMessageId(
                            reactionPickerMessageId === message.id ? null : message.id
                        )
                    }
                    className="w-7 h-7 rounded-md hover:bg-surface-raised flex items-center justify-center text-text-muted hover:text-text-primary transition-colors"
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
            {isOwn && (
                <>
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

    const handleEndCall = useCallback(async () => {
        if (endingCall) return;
        setEndingCall(true);
        try {
            await onEndCall();
        } catch (err) {
            console.error("Failed to end call:", err);
        } finally {
            setEndingCall(false);
        }
    }, [endingCall, onEndCall]);

    const handleSendSticker = useCallback(
        async (sticker: StickerData) => {
            try {
                const result = await sendDMMessage(conversation.id, `${STICKER_PREFIX}${sticker.id}`);
                addStoreMessage(conversation.id, result.message);
                syncConversationFromMessage(result.message);
                setStickerCache((prev) => ({ ...prev, [sticker.id]: sticker }));
                setShowStickerPicker(false);
                setTimeout(() => endRef.current?.scrollIntoView({ behavior: "smooth" }), 20);
            } catch (err) {
                console.error("Failed to send sticker:", err);
            }
        },
        [conversation.id, addStoreMessage, syncConversationFromMessage]
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
                    encodeAttachmentContent(result.attachment)
                );
                addStoreMessage(conversation.id, sent.message);
                syncConversationFromMessage(sent.message);
                setTimeout(() => endRef.current?.scrollIntoView({ behavior: "smooth" }), 20);
            } catch (err) {
                console.error("Failed to upload attachment:", err);
                alert(err instanceof Error ? err.message : "Failed to upload attachment.");
            } finally {
                setUploadingAttachment(false);
            }
        },
        [conversation.id, addStoreMessage, syncConversationFromMessage]
    );

    return (
        <div className="flex-1 min-w-0 min-h-0 bg-[#111318] flex">
            <div className="flex-1 min-w-0 flex flex-col border-r border-[#1F2330]">
                <div className="h-12 border-b border-[#1F2330] flex items-center px-4 gap-3 flex-shrink-0">
                    <div className="w-7 h-7 rounded-full overflow-hidden bg-[#232734] flex items-center justify-center text-[#CDD3DF]">
                        {conversation.type === "group" || !peer ? (
                            <Users className="w-4 h-4" />
                        ) : (
                            <img
                                src={peer.avatarUrl || `https://api.dicebear.com/9.x/avataaars/svg?seed=${peer.username}`}
                                alt={peer.displayName}
                                className="w-full h-full object-cover"
                            />
                        )}
                    </div>
                    <div className="min-w-0">
                        <p className="text-body font-semibold text-text-primary truncate">{title}</p>
                        <p className="text-micro text-[#8E93A3] truncate">
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
                            className="w-8 h-8 rounded-md text-[#AAB1C0] hover:text-text-primary hover:bg-[#202432] disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center"
                        >
                            <Phone className="w-4 h-4" />
                        </button>
                        <button
                            onClick={() => handleStartCall(true)}
                            disabled={startingCall || !!activeCall}
                            title={activeCall ? "Call already active" : "Start video call"}
                            className="w-8 h-8 rounded-md text-[#AAB1C0] hover:text-text-primary hover:bg-[#202432] disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center"
                        >
                            <Video className="w-4 h-4" />
                        </button>
                        <button
                            type="button"
                            title="Search"
                            className="w-8 h-8 rounded-md text-[#AAB1C0] hover:text-text-primary hover:bg-[#202432] transition-colors flex items-center justify-center"
                        >
                            <Search className="w-4 h-4" />
                        </button>
                        <button
                            type="button"
                            title="Add Friend"
                            className="w-8 h-8 rounded-md text-[#AAB1C0] hover:text-text-primary hover:bg-[#202432] transition-colors flex items-center justify-center"
                        >
                            <UserPlus className="w-4 h-4" />
                        </button>
                    </div>
                </div>

                {activeCall && (
                    <CallModal
                        onClose={handleEndCall}
                        token={activeCall.token}
                        url={activeCall.url}
                        initialVideo={activeCall.initialVideo}
                        participants={conversation.participants}
                        className={endingCall ? "opacity-70" : ""}
                    />
                )}

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

                {messages.map((message) => {
                    if (message.type === "call") {
                        let duration = 0;
                        try {
                            if (message.metadata) {
                                const meta = JSON.parse(message.metadata);
                                duration = meta.duration || 0;
                            }
                        } catch {
                            // ignore malformed metadata
                        }

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
                                key={message.id}
                                className={`relative my-1 px-1 py-2 pl-4 ${
                                    hasDur ? "border-b border-[#262B39]" : "border-b border-[#4A232C]/70"
                                }`}
                            >
                                <span
                                    className={`absolute left-0 top-2 bottom-2 w-[2px] rounded-full ${
                                        hasDur ? "bg-[#5865F2]/70" : "bg-[#F75F6E]"
                                    }`}
                                />

                                <div
                                    className={`flex items-center gap-2 ${
                                        hasDur ? "text-[#C8CDDA]" : "text-[#F1B5BD]"
                                    }`}
                                >
                                    <div
                                        className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 ${
                                            hasDur
                                                ? "bg-[#1E2534] text-[#9DB0FF]"
                                                : "bg-[#3A1B22] text-[#F97B8E]"
                                        }`}
                                    >
                                        {hasDur ? (
                                            <Phone className="w-3.5 h-3.5" />
                                        ) : (
                                            <PhoneOff className="w-3.5 h-3.5" />
                                        )}
                                    </div>

                                    <div className="min-w-0 flex-1">
                                        <div
                                            className={`text-[13px] font-semibold truncate ${
                                                hasDur ? "text-[#E6E9F3]" : "text-[#FFC8CF]"
                                            }`}
                                        >
                                            {callTitle}
                                        </div>
                                        <div className="text-[12px] flex items-center gap-1.5">
                                            <span className={hasDur ? "text-[#8E93A3]" : "text-[#E98D9A]"}>
                                                {callSubtitle}
                                            </span>
                                            <span className={hasDur ? "text-[#8E93A3]" : "text-[#D87886]"}>
                                                • {formatTime(message.createdAt)}
                                            </span>
                                        </div>
                                    </div>

                                    <span
                                        className={`px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                                            hasDur
                                                ? "bg-[#232A3A] text-[#AEB7CF]"
                                                : "bg-[#4A232C] text-[#FFB0BC]"
                                        }`}
                                    >
                                        {hasDur ? "Connected" : "Missed"}
                                    </span>
                                </div>
                            </div>
                        );
                    }

                    const avatar =
                        message.author.avatarUrl ||
                        `https://api.dicebear.com/9.x/avataaars/svg?seed=${message.author.username}`;
                    const isOwn = message.author.id === currentUserId;
                    const messageEmbeds = getMessageEmbeds(message.content);

                    return (
                        <div
                            key={message.id}
                            className={`relative flex gap-3 group p-1 -m-1 rounded-md transition-colors ${
                                hoveredMessage === message.id ? "bg-hover-row" : ""
                            }`}
                            onMouseEnter={() => setHoveredMessage(message.id)}
                            onMouseLeave={() => setHoveredMessage(null)}
                        >
                            <img
                                src={avatar}
                                alt={message.author.displayName}
                                className="w-9 h-9 rounded-full bg-surface-raised flex-shrink-0"
                            />
                            <div className="min-w-0 flex-1">
                                <div className="flex items-baseline gap-2">
                                    <span className="text-body font-semibold text-text-primary">
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

                <div ref={endRef} />
            </div>

                <div className="p-4 border-t border-[#1F2330]">
                    <div className="relative flex items-center gap-2 bg-[#1A1D28] border border-[#2A2F3F] rounded-lg px-3 py-2">
                    {showSlashCommandMenu && (
                        <SlashCommandMenu
                            commands={filteredSlashCommands}
                            selectedIndex={selectedSlashIndex}
                            onSelect={(command) => setMessageInput(formatSlashCommandInput(command))}
                            onHover={setSelectedSlashIndex}
                        />
                    )}
                    <button
                        onClick={() => attachmentInputRef.current?.click()}
                        disabled={uploadingAttachment}
                        className="w-8 h-8 rounded-md flex items-center justify-center text-text-muted hover:text-text-primary hover:bg-[#272B39] transition-colors disabled:opacity-50"
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
                        value={messageInput}
                        onChange={(e) => setMessageInput(e.target.value)}
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
                                className={`w-8 h-8 rounded-md flex items-center justify-center transition-colors ${showStickerPicker ? "text-accent-violet" : "text-text-muted hover:text-text-primary hover:bg-[#272B39]"}`}
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
                                className={`w-8 h-8 rounded-md flex items-center justify-center transition-colors ${showGifPicker ? "text-accent-violet" : "text-text-muted hover:text-text-primary hover:bg-[#272B39]"}`}
                                title="GIF"
                            >
                                <span className="text-[11px] font-bold leading-none">GIF</span>
                            </button>
                            {showGifPicker && (
                                <div className="absolute bottom-full right-0 mb-2 z-50">
                                    <GifPicker
                                        onSelect={async (gifUrl) => {
                                            try {
                                                const result = await sendDMMessage(conversation.id, gifUrl);
                                                addStoreMessage(conversation.id, result.message);
                                                syncConversationFromMessage(result.message);
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
                                className={`w-8 h-8 rounded-md flex items-center justify-center transition-colors ${showEmojiPicker ? "text-accent-violet" : "text-text-muted hover:text-text-primary hover:bg-[#272B39]"}`}
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
                    <div className="mt-1.5 px-1 text-micro text-[#8E93A3]">
                        Free uploads: {FREE_ATTACHMENT_MAX_LABEL} per file
                    </div>
                </div>

            </div>

            <aside className="hidden xl:flex w-[240px] flex-col bg-[#0E1016]">
                <div className="h-12 border-b border-[#1F2330] px-4 flex items-center text-[12px] font-semibold tracking-wide uppercase text-[#8E93A3]">
                    Members - {members.length}
                </div>
                <div className="flex-1 overflow-y-auto px-2 py-3 space-y-1">
                    {members.map((member) => {
                        const avatar =
                            member.avatarUrl ||
                            `https://api.dicebear.com/9.x/avataaars/svg?seed=${member.username}`;
                        const statusColor = DM_STATUS_COLORS[member.status] || DM_STATUS_COLORS.offline;
                        const isYou = member.id === currentUserId;

                        return (
                            <div
                                key={member.id}
                                className="flex items-center gap-2 px-2 py-2 rounded-md hover:bg-[#1A1E2B] transition-colors"
                            >
                                <div className="relative">
                                    <img
                                        src={avatar}
                                        alt={member.displayName}
                                        className="w-8 h-8 rounded-full bg-[#222633]"
                                    />
                                    <span
                                        className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full ring-2 ring-[#0E1016]"
                                        style={{ backgroundColor: statusColor }}
                                    />
                                </div>
                                <div className="min-w-0">
                                    <div className="text-body text-[#D2D7E2] truncate">
                                        {member.displayName}
                                        {isYou ? " (You)" : ""}
                                    </div>
                                    <div className="text-micro text-[#8E93A3] truncate capitalize">
                                        {member.status || "offline"}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </aside>
        </div>
    );
}

