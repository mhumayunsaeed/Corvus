"use client";

import { useEffect, useRef, useCallback } from "react";
import { useAuthStore } from "@/stores/auth-store";
import { useChatStore } from "@/stores/chat-store";
import { useDMStore } from "@/stores/dm-store";
import { useAppStore } from "@/stores/app-store";
import { useVoiceStore } from "@/stores/voice-store";
import { useNotificationStore } from "@/stores/notification-store";
import { ensureWsUrl } from "@/lib/endpoints";
import {
    playNotificationTone,
    showSystemNotification,
    summarizeNotificationBody,
} from "@/lib/notifications";

let globalWs: WebSocket | null = null;
let globalReconnectTimer: ReturnType<typeof setTimeout> | null = null;
let globalReconnectAttempts = 0;
const MAX_RECONNECT_DELAY = 30000;
const globalSubscribedChannels = new Set<string>();
const globalSubscribedDMConversations = new Set<string>();

const TAG_TARGET_PATTERN = /@(everyone|here)\b/i;

function escapeRegExp(value: string) {
    return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function isMessageTaggingUser(
    content: string,
    username: string | undefined,
    displayName: string | undefined
) {
    if (!content.trim()) return false;
    if (TAG_TARGET_PATTERN.test(content)) return true;

    const targets = [username, displayName]
        .filter((value): value is string => !!value)
        .map((value) => value.trim())
        .filter((value) => value.length > 0);

    for (const target of targets) {
        const normalized = target.toLowerCase().replace(/\s+/g, "\\s+");
        const mentionRegex = new RegExp(`(^|\\s)@${normalized}(\\b|$)`, "i");
        if (mentionRegex.test(content)) {
            return true;
        }

        const escaped = escapeRegExp(target.toLowerCase());
        const exactRegex = new RegExp(`(^|\\s)@${escaped}(\\b|$)`, "i");
        if (exactRegex.test(content)) {
            return true;
        }
    }

    return false;
}

function isWindowFocused() {
    if (typeof document === "undefined") return true;
    return document.hasFocus();
}

function shouldShowForegroundNotification(allowWhenFocused: boolean) {
    if (allowWhenFocused) return true;
    return !isWindowFocused();
}

function getConversationTitle(
    conversationId: string,
    currentUserId: string,
    conversations: Array<{
        id: string;
        type: "direct" | "group";
        name: string | null;
        participants: Array<{ id: string; displayName: string }>;
    }>
) {
    const conversation = conversations.find((item) => item.id === conversationId);
    if (!conversation) return "Direct Message";

    if (conversation.type === "group") {
        if (conversation.name?.trim()) return conversation.name.trim();
        return "Group DM";
    }

    const peer =
        conversation.participants.find((participant) => participant.id !== currentUserId) ||
        conversation.participants[0];

    return peer?.displayName || "Direct Message";
}

export function useWebSocket() {
    const token = useAuthStore((s) => s.token);
    const userId = useAuthStore((s) => s.user?.id);
    const username = useAuthStore((s) => s.user?.username);
    const displayName = useAuthStore((s) => s.user?.displayName);
    const addMessage = useChatStore((s) => s.addMessage);
    const updateMessage = useChatStore((s) => s.updateMessage);
    const deleteMessage = useChatStore((s) => s.deleteMessage);
    const addReaction = useChatStore((s) => s.addReaction);
    const removeReaction = useChatStore((s) => s.removeReaction);
    const setTyping = useChatStore((s) => s.setTyping);
    const clearTyping = useChatStore((s) => s.clearTyping);
    const addDMMessage = useDMStore((s) => s.addMessage);
    const updateDMMessage = useDMStore((s) => s.updateMessage);
    const deleteDMMessage = useDMStore((s) => s.deleteMessage);
    const addDMReaction = useDMStore((s) => s.addReaction);
    const removeDMReaction = useDMStore((s) => s.removeReaction);
    const upsertDMConversation = useAppStore((s) => s.upsertDMConversation);
    const activeChannelId = useAppStore((s) => s.activeChannelId);
    const activeDMConversationId = useAppStore((s) => s.activeDMConversationId);
    const channels = useAppStore((s) => s.channels);
    const dmConversations = useAppStore((s) => s.dmConversations);
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
        updateDMMessage,
        deleteDMMessage,
        addDMReaction,
        removeDMReaction,
        upsertDMConversation,
        userId,
        username,
        displayName,
        activeChannelId,
        activeDMConversationId,
        channels,
        dmConversations,
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
        updateDMMessage,
        deleteDMMessage,
        addDMReaction,
        removeDMReaction,
        upsertDMConversation,
        userId,
        username,
        displayName,
        activeChannelId,
        activeDMConversationId,
        channels,
        dmConversations,
        addVoiceChannelParticipant,
        removeVoiceChannelParticipant,
        addVoiceParticipant,
        removeVoiceParticipant,
        currentVoiceChannelId,
    };

    useEffect(() => {
        if (!token) return;
        const wsUrl = ensureWsUrl();

        function connect() {
            if (globalWs?.readyState === WebSocket.OPEN || globalWs?.readyState === WebSocket.CONNECTING) {
                return;
            }

            globalWs = new WebSocket(`${wsUrl}?token=${token}`);

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
                        case "new_message": {
                            h.addMessage(msg.data.channelId, msg.data);

                            if (msg.data.author.id === currentUserId) {
                                break;
                            }

                            const notificationStore = useNotificationStore.getState();
                            const prefs = notificationStore.preferences;
                            const focused = isWindowFocused();
                            const isActiveChannel = h.activeChannelId === msg.data.channelId;
                            const isTag = isMessageTaggingUser(
                                msg.data.content,
                                h.username,
                                h.displayName
                            );

                            if (!isActiveChannel || !focused) {
                                notificationStore.incrementChannelUnread(msg.data.channelId, {
                                    mention: isTag,
                                });
                            }

                            const typeEnabled = isTag
                                ? prefs.enableMentionNotifications
                                : prefs.enableMessageNotifications;

                            if (!typeEnabled) {
                                break;
                            }

                            const canPlaySound =
                                prefs.enableSound &&
                                shouldShowForegroundNotification(prefs.playSoundWhenFocused);
                            const canShowDesktop =
                                prefs.enableDesktopNotifications &&
                                shouldShowForegroundNotification(prefs.showDesktopWhenFocused);

                            const channelName =
                                h.channels.find((channel) => channel.id === msg.data.channelId)?.name ||
                                msg.data.channelId;
                            const preview = summarizeNotificationBody(msg.data.content);

                            if (canPlaySound) {
                                playNotificationTone(
                                    isTag ? "mention" : "message",
                                    prefs.soundVolume
                                ).catch(() => {
                                    // Ignore autoplay / audio context errors.
                                });
                            }

                            if (canShowDesktop) {
                                const title = isTag
                                    ? `Tagged in #${channelName}`
                                    : `#${channelName}`;
                                showSystemNotification(
                                    title,
                                    `${msg.data.author.displayName}: ${preview}`
                                ).catch(() => {
                                    // Ignore desktop notification errors.
                                });
                            }

                            break;
                        }

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

                        case "dm_message_update":
                            h.updateDMMessage(msg.data.conversationId, msg.data.id, {
                                content: msg.data.content,
                                editedAt: msg.data.editedAt,
                            });
                            break;

                        case "dm_message_delete":
                            h.deleteDMMessage(msg.data.conversationId, msg.data.id);
                            break;

                        case "dm_reaction_add":
                            h.addDMReaction(
                                msg.data.conversationId,
                                msg.data.messageId,
                                msg.data.emoji,
                                msg.data.userId,
                                currentUserId
                            );
                            break;

                        case "dm_reaction_remove":
                            h.removeDMReaction(
                                msg.data.conversationId,
                                msg.data.messageId,
                                msg.data.emoji,
                                msg.data.userId,
                                currentUserId
                            );
                            break;

                        case "new_dm_message": {
                            h.addDMMessage(msg.data.conversationId, msg.data.message);
                            if (msg.data.conversation) {
                                h.upsertDMConversation(msg.data.conversation);
                            }

                            if (msg.data.message.author.id === currentUserId) {
                                break;
                            }

                            const notificationStore = useNotificationStore.getState();
                            const prefs = notificationStore.preferences;
                            const focused = isWindowFocused();
                            const isActiveConversation =
                                h.activeDMConversationId === msg.data.conversationId;

                            if (!isActiveConversation || !focused) {
                                notificationStore.incrementDMUnread(msg.data.conversationId);
                            }

                            if (!prefs.enableMessageNotifications) {
                                break;
                            }

                            const canPlaySound =
                                prefs.enableSound &&
                                shouldShowForegroundNotification(prefs.playSoundWhenFocused);
                            const canShowDesktop =
                                prefs.enableDesktopNotifications &&
                                shouldShowForegroundNotification(prefs.showDesktopWhenFocused);

                            if (canPlaySound) {
                                playNotificationTone("message", prefs.soundVolume).catch(() => {
                                    // Ignore autoplay / audio context errors.
                                });
                            }

                            if (canShowDesktop) {
                                const mergedConversations = msg.data.conversation
                                    ? [
                                          msg.data.conversation,
                                          ...h.dmConversations.filter(
                                              (conversation) =>
                                                  conversation.id !== msg.data.conversation.id
                                          ),
                                      ]
                                    : h.dmConversations;

                                const conversationTitle = getConversationTitle(
                                    msg.data.conversationId,
                                    currentUserId,
                                    mergedConversations
                                );

                                const preview = summarizeNotificationBody(msg.data.message.content);
                                showSystemNotification(
                                    conversationTitle,
                                    `${msg.data.message.author.displayName}: ${preview}`
                                ).catch(() => {
                                    // Ignore desktop notification errors.
                                });
                            }

                            break;
                        }

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

                        case "incoming_call": {
                            const notificationStore = useNotificationStore.getState();
                            const prefs = notificationStore.preferences;

                            if (prefs.enableOtherNotifications) {
                                const canPlaySound =
                                    prefs.enableSound &&
                                    shouldShowForegroundNotification(prefs.playSoundWhenFocused);
                                const canShowDesktop =
                                    prefs.enableDesktopNotifications &&
                                    shouldShowForegroundNotification(prefs.showDesktopWhenFocused);

                                if (canPlaySound) {
                                    playNotificationTone("other", prefs.soundVolume).catch(() => {
                                        // Ignore autoplay / audio context errors.
                                    });
                                }

                                if (canShowDesktop) {
                                    const callerName = msg.data.callerName || "Someone";
                                    showSystemNotification(
                                        "Incoming call",
                                        `${callerName} is calling you.`
                                    ).catch(() => {
                                        // Ignore desktop notification errors.
                                    });
                                }
                            }

                            // Handle incoming DM call - dispatch custom event
                            window.dispatchEvent(
                                new CustomEvent("corvus:incoming_call", { detail: msg.data })
                            );
                            break;
                        }

                        case "call_ended":
                            window.dispatchEvent(
                                new CustomEvent("corvus:call_ended", { detail: msg.data })
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
