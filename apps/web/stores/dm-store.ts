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
    clearConversation: (conversationId: string) => void;
}

export const useDMStore = create<DMState>((set) => ({
    messages: {},
    cursors: {},
    hasMore: {},

    setMessages: (conversationId, messages, cursor, hasMore) =>
        set((state) => ({
            messages: { ...state.messages, [conversationId]: messages },
            cursors: { ...state.cursors, [conversationId]: cursor },
            hasMore: { ...state.hasMore, [conversationId]: hasMore },
        })),

    prependMessages: (conversationId, messages, cursor, hasMore) =>
        set((state) => ({
            messages: {
                ...state.messages,
                [conversationId]: [...messages, ...(state.messages[conversationId] || [])],
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
                    [conversationId]: [...existing, message],
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
                        m.id === messageId ? { ...m, ...updates } : m
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

