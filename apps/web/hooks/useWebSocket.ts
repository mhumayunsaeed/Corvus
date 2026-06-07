"use client";

import { useEffect, useRef, useCallback } from "react";
import { useAuthStore } from "@/stores/auth-store";
import { useChatStore } from "@/stores/chat-store";
import { useDMStore } from "@/stores/dm-store";
import { useAppStore } from "@/stores/app-store";
import { useVoiceStore } from "@/stores/voice-store";
import { useNotificationStore } from "@/stores/notification-store";
import {
    playNotificationTone,
    showSystemNotification,
    summarizeNotificationBody,
} from "@/lib/notifications";
import { useToastStore } from "@/stores/toast-store";
import {
    initPresence,
    sendChannelTyping,
    sendDMTyping,
    setRealtimeHandler,
    subscribeChannel as rtSubscribeChannel,
    subscribeDM as rtSubscribeDM,
    subscribeUser as rtSubscribeUser,
    teardownRealtime,
    unsubscribeChannel as rtUnsubscribeChannel,
    unsubscribeDM as rtUnsubscribeDM,
    updateSelfPresence,
    type RealtimeMessage,
} from "@/lib/supabase/realtime";

const globalSubscribedChannels = new Set<string>();
const globalSubscribedDMConversations = new Set<string>();
const PRESENCE_STATUSES = new Set([
    "online",
    "idle",
    "dnd",
    "invisible",
    "offline",
]);

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
    const userStatus = useAuthStore((s) => s.user?.status);
    const applyPresence = useAuthStore((s) => s.applyPresence);
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
    const setDMTyping = useDMStore((s) => s.setDMTyping);
    const clearDMTyping = useDMStore((s) => s.clearDMTyping);
    const addDMPinnedMessage = useDMStore((s) => s.addPinnedMessage);
    const removeDMPinnedMessage = useDMStore((s) => s.removePinnedMessage);
    const upsertDMConversation = useAppStore((s) => s.upsertDMConversation);
    const applyUserPresence = useAppStore((s) => s.applyUserPresence);
    const activeChannelId = useAppStore((s) => s.activeChannelId);
    const activeDMConversationId = useAppStore((s) => s.activeDMConversationId);
    const channels = useAppStore((s) => s.channels);
    const dmConversations = useAppStore((s) => s.dmConversations);
    const addVoiceChannelParticipant = useVoiceStore((s) => s.addChannelParticipant);
    const removeVoiceChannelParticipant = useVoiceStore((s) => s.removeChannelParticipant);
    const addVoiceParticipant = useVoiceStore((s) => s.addParticipant);
    const removeVoiceParticipant = useVoiceStore((s) => s.removeParticipant);
    const currentVoiceChannelId = useVoiceStore((s) => s.currentChannelId);
    const addStageSpeaker = useVoiceStore((s) => s.addStageSpeaker);
    const removeStageSpeaker = useVoiceStore((s) => s.removeStageSpeaker);
    const addStageRaisedHand = useVoiceStore((s) => s.addStageRaisedHand);
    const removeStageRaisedHand = useVoiceStore((s) => s.removeStageRaisedHand);

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
        setDMTyping,
        clearDMTyping,
        addDMPinnedMessage,
        removeDMPinnedMessage,
        upsertDMConversation,
        applyPresence,
        applyUserPresence,
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
        addStageSpeaker,
        removeStageSpeaker,
        addStageRaisedHand,
        removeStageRaisedHand,
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
        setDMTyping,
        clearDMTyping,
        addDMPinnedMessage,
        removeDMPinnedMessage,
        upsertDMConversation,
        applyPresence,
        applyUserPresence,
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
        addStageSpeaker,
        removeStageSpeaker,
        addStageRaisedHand,
        removeStageRaisedHand,
    };

    useEffect(() => {
        if (!token) {
            teardownRealtime();
            setRealtimeHandler(null);
            globalSubscribedChannels.clear();
            globalSubscribedDMConversations.clear();
            return;
        }

        function handleRealtimeMessage(msg: RealtimeMessage) {
            try {
                    const h = handlersRef.current;
                    const currentUserId = h.userId || "";

                    switch (msg.type) {
                        case "presence_update": {
                            const updatedUserId =
                                typeof msg.data?.userId === "string"
                                    ? msg.data.userId
                                    : null;
                            const nextStatus =
                                typeof msg.data?.status === "string"
                                    ? msg.data.status
                                    : null;

                            if (!updatedUserId || !nextStatus) {
                                break;
                            }

                            if (!PRESENCE_STATUSES.has(nextStatus)) {
                                break;
                            }

                            const normalizedStatus = nextStatus as
                                | "online"
                                | "idle"
                                | "dnd"
                                | "invisible"
                                | "offline";

                            h.applyPresence(updatedUserId, normalizedStatus);
                            h.applyUserPresence(updatedUserId, normalizedStatus);

                            window.dispatchEvent(
                                new CustomEvent("corvus:presence_update", {
                                    detail: {
                                        userId: updatedUserId,
                                        status: normalizedStatus,
                                    },
                                })
                            );
                            break;
                        }

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
                                    prefs.soundVolume,
                                    isTag ? prefs.mentionSound : prefs.messageSound
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

                            // In-app toast when focused but viewing different channel
                            if (focused && !isActiveChannel) {
                                const toastTitle = isTag
                                    ? `Tagged in #${channelName}`
                                    : `#${channelName}`;
                                const mappedServerId = notificationStore.channelServerMap[msg.data.channelId];
                                useToastStore.getState().addToast({
                                    title: toastTitle,
                                    body: `${msg.data.author.displayName}: ${preview}`,
                                    avatarUrl: msg.data.author.avatarUrl,
                                    channelId: msg.data.channelId,
                                    serverId: mappedServerId,
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
                            // The actor applies their own reaction optimistically;
                            // skip the self-echo so the count doesn't double.
                            if (msg.data.userId !== currentUserId) {
                                h.addReaction(
                                    msg.data.channelId,
                                    msg.data.messageId,
                                    msg.data.emoji,
                                    msg.data.userId,
                                    currentUserId
                                );
                            }
                            break;

                        case "reaction_remove":
                            if (msg.data.userId !== currentUserId) {
                                h.removeReaction(
                                    msg.data.channelId,
                                    msg.data.messageId,
                                    msg.data.emoji,
                                    msg.data.userId,
                                    currentUserId
                                );
                            }
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
                            if (msg.data.userId !== currentUserId) {
                                h.addDMReaction(
                                    msg.data.conversationId,
                                    msg.data.messageId,
                                    msg.data.emoji,
                                    msg.data.userId,
                                    currentUserId
                                );
                            }
                            break;

                        case "dm_reaction_remove":
                            if (msg.data.userId !== currentUserId) {
                                h.removeDMReaction(
                                    msg.data.conversationId,
                                    msg.data.messageId,
                                    msg.data.emoji,
                                    msg.data.userId,
                                    currentUserId
                                );
                            }
                            break;

                        case "dm_typing":
                            if (msg.data.userId !== currentUserId) {
                                if (msg.data.isTyping) {
                                    h.setDMTyping(msg.data.conversationId, msg.data.userId, msg.data.username);
                                } else {
                                    h.clearDMTyping(msg.data.conversationId, msg.data.userId);
                                }
                            }
                            break;

                        case "dm_message_pin":
                            h.addDMPinnedMessage(msg.data.conversationId, msg.data.message);
                            break;

                        case "dm_message_unpin":
                            h.removeDMPinnedMessage(msg.data.conversationId, msg.data.messageId);
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
                                playNotificationTone("message", prefs.soundVolume, prefs.messageSound).catch(() => {
                                    // Ignore autoplay / audio context errors.
                                });
                            }

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

                            const dmPreview = summarizeNotificationBody(msg.data.message.content);

                            if (canShowDesktop) {
                                showSystemNotification(
                                    conversationTitle,
                                    `${msg.data.message.author.displayName}: ${dmPreview}`
                                ).catch(() => {
                                    // Ignore desktop notification errors.
                                });
                            }

                            // In-app toast when focused but viewing different conversation
                            if (focused && !isActiveConversation) {
                                useToastStore.getState().addToast({
                                    title: conversationTitle,
                                    body: `${msg.data.message.author.displayName}: ${dmPreview}`,
                                    avatarUrl: msg.data.message.author.avatarUrl,
                                    conversationId: msg.data.conversationId,
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

                        case "stage_speak_request":
                            if (h.currentVoiceChannelId === msg.data.channelId) {
                                h.addStageRaisedHand(msg.data.userId);
                            }
                            break;

                        case "stage_speaker_added":
                            if (h.currentVoiceChannelId === msg.data.channelId) {
                                h.addStageSpeaker(msg.data.userId);
                            }
                            break;

                        case "stage_speaker_removed":
                            if (h.currentVoiceChannelId === msg.data.channelId) {
                                h.removeStageSpeaker(msg.data.userId);
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
                                    playNotificationTone("other", prefs.soundVolume, prefs.otherSound).catch(() => {
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

                        case "call_declined": {
                            const declinedByName =
                                (msg.data as { declinedByName?: string }).declinedByName ||
                                "They";
                            useToastStore.getState().addToast({
                                variant: "info",
                                title: "Call declined",
                                body: `${declinedByName} declined the call.`,
                            });
                            window.dispatchEvent(
                                new CustomEvent("corvus:call_declined", { detail: msg.data })
                            );
                            break;
                        }
                    }
                } catch {
                    // Ignore malformed messages
                }
            };

        // Wire the Supabase Realtime transport.
        setRealtimeHandler(handleRealtimeMessage);

        const h = handlersRef.current;
        if (h.userId) {
            const status = useAuthStore.getState().user?.status ?? "online";
            initPresence(h.userId, status);
            rtSubscribeUser(h.userId);
        }

        // (Re)subscribe to any topics requested before this effect ran.
        for (const channelId of globalSubscribedChannels) rtSubscribeChannel(channelId);
        for (const conversationId of globalSubscribedDMConversations) rtSubscribeDM(conversationId);

        return () => {
            teardownRealtime();
            setRealtimeHandler(null);
            globalSubscribedChannels.clear();
            globalSubscribedDMConversations.clear();
        };
    }, [token]);

    // Re-broadcast our own presence when the chosen status changes.
    useEffect(() => {
        if (token && userStatus) {
            updateSelfPresence(userStatus);
        }
    }, [token, userStatus]);

    const subscribe = useCallback((channelId: string) => {
        globalSubscribedChannels.add(channelId);
        rtSubscribeChannel(channelId);
    }, []);

    const unsubscribe = useCallback((channelId: string) => {
        globalSubscribedChannels.delete(channelId);
        rtUnsubscribeChannel(channelId);
    }, []);

    const sendTypingStart = useCallback((channelId: string) => {
        const h = handlersRef.current;
        if (h.userId) sendChannelTyping(channelId, h.userId, h.username || "", true);
    }, []);

    const sendTypingStop = useCallback((channelId: string) => {
        const h = handlersRef.current;
        if (h.userId) sendChannelTyping(channelId, h.userId, h.username || "", false);
    }, []);

    const subscribeDM = useCallback((conversationId: string) => {
        globalSubscribedDMConversations.add(conversationId);
        rtSubscribeDM(conversationId);
    }, []);

    const unsubscribeDM = useCallback((conversationId: string) => {
        globalSubscribedDMConversations.delete(conversationId);
        rtUnsubscribeDM(conversationId);
    }, []);

    const sendDMTypingStart = useCallback((conversationId: string) => {
        const h = handlersRef.current;
        if (h.userId) sendDMTyping(conversationId, h.userId, h.username || "", true);
    }, []);

    const sendDMTypingStop = useCallback((conversationId: string) => {
        const h = handlersRef.current;
        if (h.userId) sendDMTyping(conversationId, h.userId, h.username || "", false);
    }, []);

    return {
        subscribe,
        unsubscribe,
        sendTypingStart,
        sendTypingStop,
        subscribeDM,
        unsubscribeDM,
        sendDMTypingStart,
        sendDMTypingStop,
    };
}
