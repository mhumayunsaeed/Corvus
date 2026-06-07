import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

export interface NotificationPreferences {
    enableDesktopNotifications: boolean;
    enableMessageNotifications: boolean;
    enableMentionNotifications: boolean;
    enableOtherNotifications: boolean;
    enableSound: boolean;
    playSoundWhenFocused: boolean;
    showDesktopWhenFocused: boolean;
    enableTaskbarBadge: boolean;
    soundVolume: number; // 0-100

    // Sound selection
    messageSound: string;
    mentionSound: string;
    otherSound: string;
    incomingRingtone: string;
    outgoingRingtone: string;
    callVolume: number; // 0-100, ringtone loudness
}

interface NotificationState {
    preferences: NotificationPreferences;
    channelUnread: Record<string, number>;
    channelMentions: Record<string, number>;
    dmUnread: Record<string, number>;
    channelServerMap: Record<string, string>; // channelId → serverId

    setPreference: <K extends keyof NotificationPreferences>(
        key: K,
        value: NotificationPreferences[K]
    ) => void;
    patchPreferences: (next: Partial<NotificationPreferences>) => void;

    incrementChannelUnread: (
        channelId: string,
        options?: { amount?: number; mention?: boolean }
    ) => void;
    incrementDMUnread: (conversationId: string, amount?: number) => void;

    markChannelRead: (channelId: string) => void;
    markDMRead: (conversationId: string) => void;
    clearAllUnread: () => void;

    registerChannelsForServer: (serverId: string, channelIds: string[]) => void;
    setChannelUnreadBatch: (counts: Record<string, number>) => void;
    setDMUnreadBatch: (counts: Record<string, number>) => void;

    getTotalUnread: () => number;
    getTotalMentions: () => number;
}

const defaultPreferences: NotificationPreferences = {
    enableDesktopNotifications: true,
    enableMessageNotifications: true,
    enableMentionNotifications: true,
    enableOtherNotifications: true,
    enableSound: true,
    playSoundWhenFocused: false,
    showDesktopWhenFocused: false,
    enableTaskbarBadge: true,
    soundVolume: 55,
    messageSound: "chime",
    mentionSound: "sparkle",
    otherSound: "soft",
    incomingRingtone: "aurora",
    outgoingRingtone: "smooth",
    callVolume: 70,
};

function incrementRecordValue(
    record: Record<string, number>,
    key: string,
    amount: number
): Record<string, number> {
    const current = record[key] || 0;
    return {
        ...record,
        [key]: Math.max(0, current + amount),
    };
}

function sumRecord(record: Record<string, number>): number {
    return Object.values(record).reduce((total, count) => total + count, 0);
}

/** Aggregate channel unread/mention counts per server */
export function getServerUnreadCounts(
    channelServerMap: Record<string, string>,
    channelUnread: Record<string, number>,
    channelMentions: Record<string, number>
): Record<string, { unread: number; mentions: number }> {
    const result: Record<string, { unread: number; mentions: number }> = {};
    for (const [channelId, serverId] of Object.entries(channelServerMap)) {
        const unread = channelUnread[channelId] || 0;
        const mentions = channelMentions[channelId] || 0;
        if (unread > 0 || mentions > 0) {
            if (!result[serverId]) {
                result[serverId] = { unread: 0, mentions: 0 };
            }
            result[serverId].unread += unread;
            result[serverId].mentions += mentions;
        }
    }
    return result;
}

export const useNotificationStore = create<NotificationState>()(
    persist(
        (set, get) => ({
            preferences: defaultPreferences,
            channelUnread: {},
            channelMentions: {},
            dmUnread: {},
            channelServerMap: {},

            setPreference: (key, value) =>
                set((state) => ({
                    preferences: {
                        ...state.preferences,
                        [key]: value,
                    },
                })),

            patchPreferences: (next) =>
                set((state) => ({
                    preferences: {
                        ...state.preferences,
                        ...next,
                    },
                })),

            incrementChannelUnread: (channelId, options) => {
                const amount = Math.max(1, options?.amount || 1);
                const mention = !!options?.mention;

                set((state) => ({
                    channelUnread: incrementRecordValue(state.channelUnread, channelId, amount),
                    channelMentions: mention
                        ? incrementRecordValue(state.channelMentions, channelId, 1)
                        : state.channelMentions,
                }));
            },

            incrementDMUnread: (conversationId, amount = 1) => {
                const safeAmount = Math.max(1, amount);
                set((state) => ({
                    dmUnread: incrementRecordValue(state.dmUnread, conversationId, safeAmount),
                }));
            },

            markChannelRead: (channelId) =>
                set((state) => {
                    const nextUnread = { ...state.channelUnread };
                    delete nextUnread[channelId];

                    const nextMentions = { ...state.channelMentions };
                    delete nextMentions[channelId];

                    return {
                        channelUnread: nextUnread,
                        channelMentions: nextMentions,
                    };
                }),

            markDMRead: (conversationId) =>
                set((state) => {
                    const next = { ...state.dmUnread };
                    delete next[conversationId];
                    return { dmUnread: next };
                }),

            clearAllUnread: () =>
                set({
                    channelUnread: {},
                    channelMentions: {},
                    dmUnread: {},
                }),

            registerChannelsForServer: (serverId, channelIds) =>
                set((state) => {
                    const next = { ...state.channelServerMap };
                    for (const id of channelIds) {
                        next[id] = serverId;
                    }
                    return { channelServerMap: next };
                }),

            setChannelUnreadBatch: (counts) =>
                set((state) => ({
                    channelUnread: { ...state.channelUnread, ...counts },
                })),

            setDMUnreadBatch: (counts) =>
                set({ dmUnread: counts }),

            getTotalUnread: () => {
                const state = get();
                return sumRecord(state.channelUnread) + sumRecord(state.dmUnread);
            },

            getTotalMentions: () => {
                const state = get();
                return sumRecord(state.channelMentions);
            },
        }),
        {
            name: "corvus-notification-preferences",
            storage: createJSONStorage(() => {
                if (typeof window !== "undefined") {
                    return localStorage;
                }
                return {
                    getItem: () => null,
                    setItem: () => {
                        // no-op on server
                    },
                    removeItem: () => {
                        // no-op on server
                    },
                };
            }),
            partialize: (state) => ({
                preferences: state.preferences,
            }),
            // Backfill any preference keys added after a user first persisted,
            // so newly introduced sound options fall back to their defaults.
            merge: (persisted, current) => {
                const saved = (persisted as Partial<NotificationState> | undefined)?.preferences;
                return {
                    ...current,
                    preferences: { ...defaultPreferences, ...(saved ?? {}) },
                };
            },
        }
    )
);
