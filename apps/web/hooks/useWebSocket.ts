"use client";

import { useEffect, useRef, useCallback } from "react";
import { useAuthStore } from "@/stores/auth-store";
import { useChatStore } from "@/stores/chat-store";
import { useDMStore } from "@/stores/dm-store";
import { useAppStore } from "@/stores/app-store";
import { useVoiceStore } from "@/stores/voice-store";

const WS_URL = process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:3001/ws";

let globalWs: WebSocket | null = null;
let globalReconnectTimer: ReturnType<typeof setTimeout> | null = null;
let globalReconnectAttempts = 0;
const MAX_RECONNECT_DELAY = 30000;
const globalSubscribedChannels = new Set<string>();
const globalSubscribedDMConversations = new Set<string>();

export function useWebSocket() {
    const token = useAuthStore((s) => s.token);
    const userId = useAuthStore((s) => s.user?.id);
    const addMessage = useChatStore((s) => s.addMessage);
    const updateMessage = useChatStore((s) => s.updateMessage);
    const deleteMessage = useChatStore((s) => s.deleteMessage);
    const addReaction = useChatStore((s) => s.addReaction);
    const removeReaction = useChatStore((s) => s.removeReaction);
    const setTyping = useChatStore((s) => s.setTyping);
    const clearTyping = useChatStore((s) => s.clearTyping);
    const addDMMessage = useDMStore((s) => s.addMessage);
    const upsertDMConversation = useAppStore((s) => s.upsertDMConversation);
    const addVoiceChannelParticipant = useVoiceStore((s) => s.addChannelParticipant);
    const removeVoiceChannelParticipant = useVoiceStore((s) => s.removeChannelParticipant);
    const addVoiceParticipant = useVoiceStore((s) => s.addParticipant);
    const removeVoiceParticipant = useVoiceStore((s) => s.removeParticipant);
    const currentVoiceChannelId = useVoiceStore((s) => s.currentChannelId);

    const handlersRef = useRef({
        addMessage,
        updateMessage,
        deleteMessage,
        addReaction,
        removeReaction,
        setTyping,
        clearTyping,
        addDMMessage,
        upsertDMConversation,
        userId,
        addVoiceChannelParticipant,
        removeVoiceChannelParticipant,
        addVoiceParticipant,
        removeVoiceParticipant,
        currentVoiceChannelId,
    });

    handlersRef.current = {
        addMessage,
        updateMessage,
        deleteMessage,
        addReaction,
        removeReaction,
        setTyping,
        clearTyping,
        addDMMessage,
        upsertDMConversation,
        userId,
        addVoiceChannelParticipant,
        removeVoiceChannelParticipant,
        addVoiceParticipant,
        removeVoiceParticipant,
        currentVoiceChannelId,
    };

    useEffect(() => {
        if (!token) return;

        function connect() {
            if (globalWs?.readyState === WebSocket.OPEN || globalWs?.readyState === WebSocket.CONNECTING) {
                return;
            }

            globalWs = new WebSocket(`${WS_URL}?token=${token}`);

            globalWs.onopen = () => {
                globalReconnectAttempts = 0;

                // Re-subscribe after reconnect
                for (const channelId of globalSubscribedChannels) {
                    globalWs?.send(JSON.stringify({ type: "subscribe_channel", channelId }));
                }
                for (const conversationId of globalSubscribedDMConversations) {
                    globalWs?.send(JSON.stringify({ type: "subscribe_dm", conversationId }));
                }
            };

            globalWs.onmessage = (event) => {
                try {
                    const msg = JSON.parse(event.data);
                    const h = handlersRef.current;
                    const currentUserId = h.userId || "";

                    switch (msg.type) {
                        case "new_message":
                            h.addMessage(msg.data.channelId, msg.data);
                            if (msg.data.author.id !== currentUserId && typeof window !== "undefined" && window.__TAURI_INTERNALS__) {
                                import("@tauri-apps/plugin-notification").then(({ isPermissionGranted, sendNotification }) => {
                                    isPermissionGranted().then(granted => {
                                        if (granted) {
                                            sendNotification({ title: `#${msg.data.channelId} - ${msg.data.author.displayName}`, body: msg.data.content });
                                        }
                                    });
                                });
                            }
                            break;

                        case "message_update":
                            h.updateMessage(msg.data.channelId, msg.data.id, {
                                content: msg.data.content,
                                editedAt: msg.data.editedAt,
                            });
                            break;

                        case "message_delete":
                            h.deleteMessage(msg.data.channelId, msg.data.id);
                            break;

                        case "reaction_add":
                            h.addReaction(
                                msg.data.channelId,
                                msg.data.messageId,
                                msg.data.emoji,
                                msg.data.userId,
                                currentUserId
                            );
                            break;

                        case "reaction_remove":
                            h.removeReaction(
                                msg.data.channelId,
                                msg.data.messageId,
                                msg.data.emoji,
                                msg.data.userId,
                                currentUserId
                            );
                            break;

                        case "typing":
                            if (msg.data.userId !== currentUserId) {
                                if (msg.data.isTyping) {
                                    h.setTyping(msg.data.channelId, msg.data.userId, msg.data.username);
                                } else {
                                    h.clearTyping(msg.data.channelId, msg.data.userId);
                                }
                            }
                            break;

                        case "message_embeds_ready":
                            h.updateMessage(msg.data.channelId, msg.data.messageId, {
                                embeds: msg.data.embeds,
                            });
                            break;

                        case "new_dm_message":
                            h.addDMMessage(msg.data.conversationId, msg.data.message);
                            if (msg.data.conversation) {
                                h.upsertDMConversation(msg.data.conversation);
                            }
                            if (msg.data.message.author.id !== currentUserId && typeof window !== "undefined" && window.__TAURI_INTERNALS__) {
                                import("@tauri-apps/plugin-notification").then(({ isPermissionGranted, sendNotification }) => {
                                    isPermissionGranted().then(granted => {
                                        if (granted) {
                                            sendNotification({ title: msg.data.message.author.displayName, body: msg.data.message.content });
                                        }
                                    });
                                });
                            }
                            break;

                        case "voice_participant_join":
                            h.addVoiceChannelParticipant(msg.data.channelId, {
                                ...msg.data.participant,
                                isSpeaking: false,
                                isMuted: false,
                                isDeafened: false,
                                hasVideo: false,
                                isScreenSharing: false,
                            });
                            // Also update active voice channel if it matches
                            if (h.currentVoiceChannelId === msg.data.channelId) {
                                h.addVoiceParticipant({
                                    ...msg.data.participant,
                                    isSpeaking: false,
                                    isMuted: false,
                                    isDeafened: false,
                                    hasVideo: false,
                                    isScreenSharing: false,
                                });
                            }
                            break;

                        case "voice_participant_leave":
                            h.removeVoiceChannelParticipant(msg.data.channelId, msg.data.userId);
                            if (h.currentVoiceChannelId === msg.data.channelId) {
                                h.removeVoiceParticipant(msg.data.userId);
                            }
                            break;

                        case "incoming_call":
                            // Handle incoming DM call - dispatch custom event
                            window.dispatchEvent(
                                new CustomEvent("veyra:incoming_call", { detail: msg.data })
                            );
                            break;

                        case "call_ended":
                            window.dispatchEvent(
                                new CustomEvent("veyra:call_ended", { detail: msg.data })
                            );
                            break;
                    }
                } catch {
                    // Ignore malformed messages
                }
            };

            globalWs.onclose = () => {
                globalWs = null;
                // Reconnect with exponential backoff
                const delay = Math.min(1000 * Math.pow(2, globalReconnectAttempts), MAX_RECONNECT_DELAY);
                globalReconnectAttempts++;
                globalReconnectTimer = setTimeout(connect, delay);
            };

            globalWs.onerror = () => {
                // onclose will fire after onerror
            };
        }

        connect();

        return () => {
            if (globalReconnectTimer) {
                clearTimeout(globalReconnectTimer);
                globalReconnectTimer = null;
            }
            if (globalWs) {
                globalWs.close();
                globalWs = null;
            }
            globalReconnectAttempts = 0;
            globalSubscribedChannels.clear();
            globalSubscribedDMConversations.clear();
        };
    }, [token]);

    const subscribe = useCallback((channelId: string) => {
        globalSubscribedChannels.add(channelId);
        if (globalWs?.readyState === WebSocket.OPEN) {
            globalWs.send(JSON.stringify({ type: "subscribe_channel", channelId }));
        }
    }, []);

    const unsubscribe = useCallback((channelId: string) => {
        globalSubscribedChannels.delete(channelId);
        if (globalWs?.readyState === WebSocket.OPEN) {
            globalWs.send(JSON.stringify({ type: "unsubscribe_channel", channelId }));
        }
    }, []);

    const sendTypingStart = useCallback((channelId: string) => {
        if (globalWs?.readyState === WebSocket.OPEN) {
            globalWs.send(JSON.stringify({ type: "typing_start", channelId }));
        }
    }, []);

    const sendTypingStop = useCallback((channelId: string) => {
        if (globalWs?.readyState === WebSocket.OPEN) {
            globalWs.send(JSON.stringify({ type: "typing_stop", channelId }));
        }
    }, []);

    const subscribeDM = useCallback((conversationId: string) => {
        globalSubscribedDMConversations.add(conversationId);
        if (globalWs?.readyState === WebSocket.OPEN) {
            globalWs.send(JSON.stringify({ type: "subscribe_dm", conversationId }));
        }
    }, []);

    const unsubscribeDM = useCallback((conversationId: string) => {
        globalSubscribedDMConversations.delete(conversationId);
        if (globalWs?.readyState === WebSocket.OPEN) {
            globalWs.send(JSON.stringify({ type: "unsubscribe_dm", conversationId }));
        }
    }, []);

    return {
        subscribe,
        unsubscribe,
        sendTypingStart,
        sendTypingStop,
        subscribeDM,
        unsubscribeDM,
    };
}
