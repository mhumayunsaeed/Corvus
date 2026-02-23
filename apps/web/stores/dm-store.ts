import { create } from "zustand";
import type { DMMessageData } from "@/lib/api";

interface DMState {
    messages: Record<string, DMMessageData[]>;
    cursors: Record<string, string | null>;
    hasMore: Record<string, boolean>;
    setMessages: (
        conversationId: string,
        messages: DMMessageData[],
        cursor: string | null,
        hasMore: boolean
    ) => void;
    prependMessages: (
        conversationId: string,
        messages: DMMessageData[],
        cursor: string | null,
        hasMore: boolean
    ) => void;
    addMessage: (conversationId: string, message: DMMessageData) => void;
    updateMessage: (conversationId: string, messageId: string, updates: Partial<DMMessageData>) => void;
    deleteMessage: (conversationId: string, messageId: string) => void;
    addReaction: (conversationId: string, messageId: string, emoji: string, userId: string, currentUserId: string) => void;
    removeReaction: (conversationId: string, messageId: string, emoji: string, userId: string, currentUserId: string) => void;
    clearConversation: (conversationId: string) => void;
}

function withReactions(message: DMMessageData): DMMessageData {
    return {
        ...message,
        reactions: message.reactions || [],
    };
}

export const useDMStore = create<DMState>((set) => ({
    messages: {},
    cursors: {},
    hasMore: {},

    setMessages: (conversationId, messages, cursor, hasMore) =>
        set((state) => ({
            messages: { ...state.messages, [conversationId]: messages.map(withReactions) },
            cursors: { ...state.cursors, [conversationId]: cursor },
            hasMore: { ...state.hasMore, [conversationId]: hasMore },
        })),

    prependMessages: (conversationId, messages, cursor, hasMore) =>
        set((state) => ({
            messages: {
                ...state.messages,
                [conversationId]: [
                    ...messages.map(withReactions),
                    ...((state.messages[conversationId] || []).map(withReactions)),
                ],
            },
            cursors: { ...state.cursors, [conversationId]: cursor },
            hasMore: { ...state.hasMore, [conversationId]: hasMore },
        })),

    addMessage: (conversationId, message) =>
        set((state) => {
            const existing = state.messages[conversationId] || [];
            if (existing.some((m) => m.id === message.id)) {
                return state;
            }
            return {
                messages: {
                    ...state.messages,
                    [conversationId]: [...existing.map(withReactions), withReactions(message)],
                },
            };
        }),

    updateMessage: (conversationId, messageId, updates) =>
        set((state) => {
            const existing = state.messages[conversationId];
            if (!existing) return state;
            return {
                messages: {
                    ...state.messages,
                    [conversationId]: existing.map((m) =>
                        m.id === messageId ? withReactions({ ...m, ...updates }) : withReactions(m)
                    ),
                },
            };
        }),

    deleteMessage: (conversationId, messageId) =>
        set((state) => {
            const existing = state.messages[conversationId];
            if (!existing) return state;
            return {
                messages: {
                    ...state.messages,
                    [conversationId]: existing.filter((m) => m.id !== messageId),
                },
            };
        }),

    addReaction: (conversationId, messageId, emoji, userId, currentUserId) =>
        set((state) => ({
            messages: {
                ...state.messages,
                [conversationId]: (state.messages[conversationId] || []).map((m) => {
                    if (m.id !== messageId) return m;
                    const existing = m.reactions.find((r) => r.emoji === emoji);
                    if (existing) {
                        return {
                            ...m,
                            reactions: m.reactions.map((r) =>
                                r.emoji === emoji
                                    ? {
                                        ...r,
                                        count: r.count + 1,
                                        reacted: r.reacted || userId === currentUserId,
                                    }
                                    : r
                            ),
                        };
                    }
                    return {
                        ...m,
                        reactions: [
                            ...m.reactions,
                            { emoji, count: 1, reacted: userId === currentUserId },
                        ],
                    };
                }),
            },
        })),

    removeReaction: (conversationId, messageId, emoji, userId, currentUserId) =>
        set((state) => ({
            messages: {
                ...state.messages,
                [conversationId]: (state.messages[conversationId] || []).map((m) => {
                    if (m.id !== messageId) return m;
                    return {
                        ...m,
                        reactions: m.reactions
                            .map((r) =>
                                r.emoji === emoji
                                    ? {
                                        ...r,
                                        count: r.count - 1,
                                        reacted: userId === currentUserId ? false : r.reacted,
                                    }
                                    : r
                            )
                            .filter((r) => r.count > 0),
                    };
                }),
            },
        })),

    clearConversation: (conversationId) =>
        set((state) => {
            const nextMessages = { ...state.messages };
            delete nextMessages[conversationId];
            const nextCursors = { ...state.cursors };
            delete nextCursors[conversationId];
            const nextHasMore = { ...state.hasMore };
            delete nextHasMore[conversationId];
            return {
                messages: nextMessages,
                cursors: nextCursors,
                hasMore: nextHasMore,
            };
        }),
}));
