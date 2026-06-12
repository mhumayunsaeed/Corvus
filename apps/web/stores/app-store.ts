import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import type { ServerData, ChannelData, DMConversationData, WorkspaceModulesData } from "@/lib/api";

interface AppState {
    // Active selections
    activeServerId: string | null;
    activeChannelId: string | null;
    activeDMConversationId: string | null;

    // Data
    servers: ServerData[];
    channels: ChannelData[];
    dmConversations: DMConversationData[];
    // Per-space channel cache — lets re-opening a space render instantly while
    // fresh data loads in the background.
    channelsByServer: Record<string, ChannelData[]>;
    workspaceModules: WorkspaceModulesData;

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
    updateServer: (serverId: string, updates: Partial<ServerData>) => void;
    addChannel: (channel: ChannelData) => void;
    removeChannel: (channelId: string) => void;
    setWorkspaceModules: (serverId: string, modules: WorkspaceModulesData) => void;
    upsertBoardState: (channelId: string, board: unknown) => void;
    upsertDocsState: (channelId: string, docs: unknown) => void;
    upsertIncidentState: (channelId: string, incident: unknown) => void;
    upsertGitHubState: (channelId: string, pullRequests: unknown, config?: unknown) => void;
}

const emptyWorkspaceModules: WorkspaceModulesData = {
    boardsByChannel: {},
    docsByChannel: {},
    incidentsByChannel: {},
    canvasByChannel: {},
    prsByChannel: {},
    githubConfigByChannel: {},
};

export const useAppStore = create<AppState>()(
    persist(
        (set) => ({
    activeServerId: null,
    activeChannelId: null,
    activeDMConversationId: null,
    servers: [],
    channels: [],
    dmConversations: [],
    channelsByServer: {},
    workspaceModules: emptyWorkspaceModules,

    setActiveServer: (serverId) =>
        set((state) => ({
            activeServerId: serverId,
            activeChannelId: null,
            // Render cached channels for the space immediately; the loader
            // refreshes them via setChannels right after.
            channels: serverId ? state.channelsByServer[serverId] || [] : [],
            activeDMConversationId:
                serverId === null ? state.activeDMConversationId : null,
        })),

    setActiveChannel: (channelId) => set({ activeChannelId: channelId }),

    setActiveDMConversation: (conversationId) =>
        set({ activeDMConversationId: conversationId, activeServerId: null, activeChannelId: null }),

    setServers: (servers) => set({ servers }),

    setChannels: (channels) =>
        set((state) => {
            const serverId = channels[0]?.serverId;
            return {
                channels,
                channelsByServer: serverId
                    ? { ...state.channelsByServer, [serverId]: channels }
                    : state.channelsByServer,
            };
        }),

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

    updateServer: (serverId, updates) =>
        set((state) => ({
            servers: state.servers.map((s) =>
                s.id === serverId ? { ...s, ...updates } : s
            ),
        })),

    addChannel: (channel) =>
        set((state) => {
            const channels = [...state.channels, channel];
            return {
                channels,
                channelsByServer: {
                    ...state.channelsByServer,
                    [channel.serverId]: channels,
                },
            };
        }),

    removeChannel: (channelId) =>
        set((state) => {
            const channels = state.channels.filter((c) => c.id !== channelId);
            const serverId = channels[0]?.serverId;
            return {
                channels,
                channelsByServer: serverId
                    ? { ...state.channelsByServer, [serverId]: channels }
                    : state.channelsByServer,
                activeChannelId:
                    state.activeChannelId === channelId ? null : state.activeChannelId,
            };
        }),

    setWorkspaceModules: (_serverId, modules) =>
        set((state) => ({
            workspaceModules: {
                boardsByChannel: { ...state.workspaceModules.boardsByChannel, ...modules.boardsByChannel },
                docsByChannel: { ...state.workspaceModules.docsByChannel, ...modules.docsByChannel },
                incidentsByChannel: {
                    ...state.workspaceModules.incidentsByChannel,
                    ...modules.incidentsByChannel,
                },
                canvasByChannel: { ...state.workspaceModules.canvasByChannel, ...modules.canvasByChannel },
                prsByChannel: { ...state.workspaceModules.prsByChannel, ...modules.prsByChannel },
                githubConfigByChannel: {
                    ...state.workspaceModules.githubConfigByChannel,
                    ...modules.githubConfigByChannel,
                },
            },
        })),

    upsertBoardState: (channelId, board) =>
        set((state) => ({
            workspaceModules: {
                ...state.workspaceModules,
                boardsByChannel: { ...state.workspaceModules.boardsByChannel, [channelId]: board },
            },
        })),

    upsertDocsState: (channelId, docs) =>
        set((state) => ({
            workspaceModules: {
                ...state.workspaceModules,
                docsByChannel: { ...state.workspaceModules.docsByChannel, [channelId]: docs },
            },
        })),

    upsertIncidentState: (channelId, incident) =>
        set((state) => ({
            workspaceModules: {
                ...state.workspaceModules,
                incidentsByChannel: { ...state.workspaceModules.incidentsByChannel, [channelId]: incident },
            },
        })),

    upsertGitHubState: (channelId, pullRequests, config) =>
        set((state) => ({
            workspaceModules: {
                ...state.workspaceModules,
                prsByChannel: { ...state.workspaceModules.prsByChannel, [channelId]: pullRequests },
                githubConfigByChannel:
                    config === undefined
                        ? state.workspaceModules.githubConfigByChannel
                        : { ...state.workspaceModules.githubConfigByChannel, [channelId]: config },
            },
        })),
        }),
        {
            name: "corvus-app-cache",
            storage: createJSONStorage(() => {
                if (typeof window !== "undefined") return localStorage;
                return {
                    getItem: () => null,
                    setItem: () => {},
                    removeItem: () => {},
                };
            }),
            partialize: (state) => ({
                servers: state.servers,
                channelsByServer: state.channelsByServer,
                dmConversations: state.dmConversations,
                workspaceModules: state.workspaceModules,
            }),
        }
    )
);
