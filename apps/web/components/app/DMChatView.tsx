"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Hash, Loader2, Phone, Send, Video } from "lucide-react";
import { fetchDMMessages, sendDMMessage, type DMConversationData, type DMMessageData } from "@/lib/api";
import { useAuthStore } from "@/stores/auth-store";
import { useDMStore } from "@/stores/dm-store";

interface DMChatViewProps {
    conversation: DMConversationData;
    onConversationUpdated: (conversation: DMConversationData) => void;
    onSubscribeDM: (conversationId: string) => void;
    onUnsubscribeDM: (conversationId: string) => void;
    onStartCall: (conversationId: string, withVideo: boolean) => Promise<void>;
}

const EMPTY_DM_MESSAGES: DMMessageData[] = [];

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

export function DMChatView({
    conversation,
    onConversationUpdated,
    onSubscribeDM,
    onUnsubscribeDM,
    onStartCall,
}: DMChatViewProps) {
    const currentUserId = useAuthStore((s) => s.user?.id);
    const [loading, setLoading] = useState(true);
    const [loadingOlder, setLoadingOlder] = useState(false);
    const [messageInput, setMessageInput] = useState("");
    const [sending, setSending] = useState(false);
    const [startingCall, setStartingCall] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);
    const endRef = useRef<HTMLDivElement>(null);

    const conversationMessages = useDMStore((s) => s.messages[conversation.id]);
    const messages = conversationMessages ?? EMPTY_DM_MESSAGES;
    const hasMore = useDMStore((s) => s.hasMore[conversation.id] ?? true);
    const setStoreMessages = useDMStore((s) => s.setMessages);
    const prependStoreMessages = useDMStore((s) => s.prependMessages);
    const addStoreMessage = useDMStore((s) => s.addMessage);

    const title = useMemo(
        () => conversationTitle(conversation, currentUserId),
        [conversation, currentUserId]
    );

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

    const handleSend = useCallback(async () => {
        const content = messageInput.trim();
        if (!content || sending) return;

        setSending(true);
        setMessageInput("");
        try {
            const result = await sendDMMessage(conversation.id, content);
            addStoreMessage(conversation.id, result.message);

            onConversationUpdated({
                ...conversation,
                updatedAt: result.message.createdAt,
                lastMessage: {
                    id: result.message.id,
                    content: result.message.content,
                    type: result.message.type,
                    metadata: result.message.metadata,
                    createdAt: result.message.createdAt,
                    author: result.message.author,
                },
            });

            setTimeout(() => endRef.current?.scrollIntoView({ behavior: "smooth" }), 20);
        } catch (err) {
            console.error("Failed to send DM message:", err);
            setMessageInput(content);
        } finally {
            setSending(false);
        }
    }, [messageInput, sending, conversation, onConversationUpdated, addStoreMessage]);

    const formatTime = (value: string) =>
        new Date(value).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });

    const handleStartCall = useCallback(
        async (withVideo: boolean) => {
            if (startingCall) return;
            setStartingCall(true);
            try {
                await onStartCall(conversation.id, withVideo);
            } catch (err) {
                console.error("Failed to start call:", err);
            } finally {
                setStartingCall(false);
            }
        },
        [conversation.id, onStartCall, startingCall]
    );

    return (
        <div className="flex-1 flex flex-col bg-background min-w-0">
            <div className="h-12 border-b border-border flex items-center px-4 gap-3 flex-shrink-0">
                <Hash className="w-5 h-5 text-text-muted" />
                <span className="text-emphasis font-semibold text-text-primary truncate">{title}</span>
                <div className="ml-auto flex items-center gap-1.5">
                    <button
                        onClick={() => handleStartCall(false)}
                        disabled={startingCall}
                        title="Start voice call"
                        className="w-8 h-8 rounded-md text-text-muted hover:text-text-primary hover:bg-hover-row disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center"
                    >
                        <Phone className="w-4 h-4" />
                    </button>
                    <button
                        onClick={() => handleStartCall(true)}
                        disabled={startingCall}
                        title="Start video call"
                        className="w-8 h-8 rounded-md text-text-muted hover:text-text-primary hover:bg-hover-row disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center"
                    >
                        <Video className="w-4 h-4" />
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

                {messages.map((message) => {
                    if (message.type === "call") {
                        let duration = 0;
                        try {
                            if (message.metadata) {
                                const meta = JSON.parse(message.metadata);
                                duration = meta.duration || 0;
                            }
                        } catch (e) { }

                        const mins = Math.floor(duration / 60);
                        const secs = duration % 60;
                        const hasDur = duration > 0;
                        const durStr = hasDur ? (mins > 0 ? `${mins}m ${secs}s` : `${secs}s`) : "0s";

                        return (
                            <div key={message.id} className="flex gap-3 my-4 items-center px-4 py-3 mx-2 bg-surface-raised border border-border rounded-xl shadow-sm">
                                <div className="w-10 h-10 rounded-full bg-accent-violet/15 flex items-center justify-center text-accent-violet border border-accent-violet/30 flex-shrink-0">
                                    <Phone className="w-5 h-5" />
                                </div>
                                <div className="min-w-0">
                                    <div className="text-body font-semibold text-text-primary">
                                        {message.author.displayName} started a call
                                    </div>
                                    <div className={`text-micro flex items-center gap-1.5 mt-0.5 ${hasDur ? 'text-accent-teal' : 'text-danger'}`}>
                                        <span className="w-1.5 h-1.5 rounded-full bg-current" />
                                        {hasDur ? `Call lasted ${durStr}` : "Missed call"} • {formatTime(message.createdAt)}
                                    </div>
                                </div>
                            </div>
                        );
                    }

                    const avatar =
                        message.author.avatarUrl ||
                        `https://api.dicebear.com/9.x/avataaars/svg?seed=${message.author.username}`;
                    return (
                        <div key={message.id} className="flex gap-3">
                            <img
                                src={avatar}
                                alt={message.author.displayName}
                                className="w-9 h-9 rounded-full bg-surface-raised"
                            />
                            <div className="min-w-0">
                                <div className="flex items-baseline gap-2">
                                    <span className="text-body font-semibold text-text-primary">
                                        {message.author.displayName}
                                    </span>
                                    <span className="text-micro text-text-muted">
                                        {formatTime(message.createdAt)}
                                    </span>
                                </div>
                                <p className="text-body text-text-primary whitespace-pre-wrap break-words">
                                    {message.content}
                                </p>
                            </div>
                        </div>
                    );
                })}

                <div ref={endRef} />
            </div>

            <div className="p-4 border-t border-border">
                <div className="flex items-end gap-2 bg-surface-raised border border-border rounded-xl px-3 py-2">
                    <textarea
                        value={messageInput}
                        onChange={(e) => setMessageInput(e.target.value)}
                        placeholder={`Message ${title}`}
                        className="flex-1 bg-transparent text-body text-text-primary placeholder:text-text-muted outline-none resize-none max-h-36"
                        rows={1}
                        onKeyDown={(e) => {
                            if (e.key === "Enter" && !e.shiftKey) {
                                e.preventDefault();
                                handleSend();
                            }
                        }}
                    />
                    <button
                        onClick={handleSend}
                        disabled={sending || !messageInput.trim()}
                        className="w-8 h-8 rounded-md bg-accent-violet text-white hover:bg-accent-violet/90 disabled:opacity-50 flex items-center justify-center"
                    >
                        <Send className="w-4 h-4" />
                    </button>
                </div>
            </div>
        </div>
    );
}
