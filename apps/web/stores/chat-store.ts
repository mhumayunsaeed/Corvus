import { create } from "zustand";
import type { MessageData } from "@/lib/api";

interface TypingUser {
    userId: string;
    username: string;
    timeout: ReturnType<typeof setTimeout>;
}

interface ChatState {
    // Messages per channel
    messages: Record<string, MessageData[]>;
    // Pagination cursors per channel
    cursors: Record<string, string | null>;
    hasMore: Record<string, boolean>;
    // Typing indicators per channel
    typingUsers: Record<string, TypingUser[]>;
    // Loading states
    loadingChannels: Set<string>;

    // Actions
    setMessages: (channelId: string, messages: MessageData[], cursor: string | null, hasMore: boolean) => void;
    prependMessages: (channelId: string, messages: MessageData[], cursor: string | null, hasMore: boolean) => void;
    addMessage: (channelId: string, message: MessageData) => void;
    updateMessage: (channelId: string, messageId: string, updates: Partial<MessageData>) => void;
    deleteMessage: (channelId: string, messageId: string) => void;
    addReaction: (channelId: string, messageId: string, emoji: string, userId: string, currentUserId: string) => void;
    removeReaction: (channelId: string, messageId: string, emoji: string, userId: string, currentUserId: string) => void;
    setTyping: (channelId: string, userId: string, username: string) => void;
    clearTyping: (channelId: string, userId: string) => void;
    setLoading: (channelId: string, loading: boolean) => void;
    clearChannel: (channelId: string) => void;
}

export const useChatStore = create<ChatState>((set, get) => ({
    messages: {},
    cursors: {},
    hasMore: {},
    typingUsers: {},
    loadingChannels: new Set(),

    setMessages: (channelId, messages, cursor, hasMore) =>
        set((state) => ({
            messages: { ...state.messages, [channelId]: messages },
            cursors: { ...state.cursors, [channelId]: cursor },
            hasMore: { ...state.hasMore, [channelId]: hasMore },
        })),

    prependMessages: (channelId, messages, cursor, hasMore) =>
        set((state) => ({
            messages: {
                ...state.messages,
                [channelId]: [...messages, ...(state.messages[channelId] || [])],
            },
            cursors: { ...state.cursors, [channelId]: cursor },
            hasMore: { ...state.hasMore, [channelId]: hasMore },
        })),

    addMessage: (channelId, message) =>
        set((state) => {
            const existing = state.messages[channelId] || [];
            // Deduplicate
            if (existing.some((m) => m.id === message.id)) return state;
            return {
                messages: {
                    ...state.messages,
                    [channelId]: [...existing, message],
                },
            };
        }),

    updateMessage: (channelId, messageId, updates) =>
        set((state) => ({
            messages: {
                ...state.messages,
                [channelId]: (state.messages[channelId] || []).map((m) =>
                    m.id === messageId ? { ...m, ...updates } : m
                ),
            },
        })),

    deleteMessage: (channelId, messageId) =>
        set((state) => ({
            messages: {
                ...state.messages,
                [channelId]: (state.messages[channelId] || []).filter(
                    (m) => m.id !== messageId
                ),
            },
        })),

    addReaction: (channelId, messageId, emoji, userId, currentUserId) =>
        set((state) => ({
            messages: {
                ...state.messages,
                [channelId]: (state.messages[channelId] || []).map((m) => {
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

    removeReaction: (channelId, messageId, emoji, userId, currentUserId) =>
        set((state) => ({
            messages: {
                ...state.messages,
                [channelId]: (state.messages[channelId] || []).map((m) => {
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

    setTyping: (channelId, userId, username) =>
        set((state) => {
            const current = state.typingUsers[channelId] || [];
            // Clear existing timeout for this user
            const existing = current.find((t) => t.userId === userId);
            if (existing) clearTimeout(existing.timeout);

            // Auto-clear typing after 5 seconds
            const timeout = setTimeout(() => {
                get().clearTyping(channelId, userId);
            }, 5000);

            const filtered = current.filter((t) => t.userId !== userId);
            return {
                typingUsers: {
                    ...state.typingUsers,
                    [channelId]: [...filtered, { userId, username, timeout }],
                },
            };
        }),

    clearTyping: (channelId, userId) =>
        set((state) => {
            const current = state.typingUsers[channelId] || [];
            const existing = current.find((t) => t.userId === userId);
            if (existing) clearTimeout(existing.timeout);
            return {
                typingUsers: {
                    ...state.typingUsers,
                    [channelId]: current.filter((t) => t.userId !== userId),
                },
            };
        }),

    setLoading: (channelId, loading) =>
        set((state) => {
            const newSet = new Set(state.loadingChannels);
            if (loading) newSet.add(channelId);
            else newSet.delete(channelId);
            return { loadingChannels: newSet };
        }),

    clearChannel: (channelId) =>
        set((state) => {
            const newMessages = { ...state.messages };
            delete newMessages[channelId];
            const newCursors = { ...state.cursors };
            delete newCursors[channelId];
            const newHasMore = { ...state.hasMore };
            delete newHasMore[channelId];
            return { messages: newMessages, cursors: newCursors, hasMore: newHasMore };
        }),
}));
