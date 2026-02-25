import { create } from "zustand";
import type { ServerData, ChannelData, DMConversationData } from "@/lib/api";

interface AppState {
    // Active selections
    activeServerId: string | null;
    activeChannelId: string | null;
    activeDMConversationId: string | null;

    // Data
    servers: ServerData[];
    channels: ChannelData[];
    dmConversations: DMConversationData[];

    // Actions
    setActiveServer: (serverId: string | null) => void;
    setActiveChannel: (channelId: string | null) => void;
    setActiveDMConversation: (conversationId: string | null) => void;
    setServers: (servers: ServerData[]) => void;
    setChannels: (channels: ChannelData[]) => void;
    setDMConversations: (conversations: DMConversationData[]) => void;
    upsertDMConversation: (conversation: DMConversationData) => void;
    applyUserPresence: (userId: string, status: string) => void;
    addServer: (server: ServerData) => void;
    removeServer: (serverId: string) => void;
    addChannel: (channel: ChannelData) => void;
    removeChannel: (channelId: string) => void;
}

export const useAppStore = create<AppState>((set) => ({
    activeServerId: null,
    activeChannelId: null,
    activeDMConversationId: null,
    servers: [],
    channels: [],
    dmConversations: [],

    setActiveServer: (serverId) =>
        set((state) => ({
            activeServerId: serverId,
            activeChannelId: null,
            activeDMConversationId:
                serverId === null ? state.activeDMConversationId : null,
        })),

    setActiveChannel: (channelId) => set({ activeChannelId: channelId }),

    setActiveDMConversation: (conversationId) =>
        set({ activeDMConversationId: conversationId, activeServerId: null, activeChannelId: null }),

    setServers: (servers) => set({ servers }),

    setChannels: (channels) => set({ channels }),

    setDMConversations: (conversations) =>
        set({ dmConversations: conversations }),

    upsertDMConversation: (conversation) =>
        set((state) => {
            const existing = state.dmConversations.find((c) => c.id === conversation.id);
            if (!existing) {
                return { dmConversations: [conversation, ...state.dmConversations] };
            }
            const updated = state.dmConversations
                .map((c) => (c.id === conversation.id ? conversation : c))
                .sort((a, b) => +new Date(b.updatedAt) - +new Date(a.updatedAt));
            return { dmConversations: updated };
        }),

    applyUserPresence: (userId, status) =>
        set((state) => {
            let changed = false;

            const dmConversations = state.dmConversations.map((conversation) => {
                let conversationChanged = false;

                const participants = conversation.participants.map((participant) => {
                    if (participant.id !== userId || participant.status === status) {
                        return participant;
                    }
                    conversationChanged = true;
                    return { ...participant, status };
                });

                let lastMessage = conversation.lastMessage;
                if (
                    conversation.lastMessage?.author.id === userId &&
                    conversation.lastMessage.author.status !== status
                ) {
                    conversationChanged = true;
                    lastMessage = {
                        ...conversation.lastMessage,
                        author: {
                            ...conversation.lastMessage.author,
                            status,
                        },
                    };
                }

                if (!conversationChanged) {
                    return conversation;
                }

                changed = true;
                return {
                    ...conversation,
                    participants,
                    lastMessage,
                };
            });

            if (!changed) return state;
            return { dmConversations };
        }),

    addServer: (server) =>
        set((state) => ({ servers: [...state.servers, server] })),

    removeServer: (serverId) =>
        set((state) => ({
            servers: state.servers.filter((s) => s.id !== serverId),
            activeServerId: state.activeServerId === serverId ? null : state.activeServerId,
        })),

    addChannel: (channel) =>
        set((state) => ({ channels: [...state.channels, channel] })),

    removeChannel: (channelId) =>
        set((state) => ({
            channels: state.channels.filter((c) => c.id !== channelId),
            activeChannelId: state.activeChannelId === channelId ? null : state.activeChannelId,
        })),
}));
