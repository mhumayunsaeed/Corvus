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
}

interface NotificationState {
    preferences: NotificationPreferences;
    channelUnread: Record<string, number>;
    channelMentions: Record<string, number>;
    dmUnread: Record<string, number>;

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

export const useNotificationStore = create<NotificationState>()(
    persist(
        (set, get) => ({
            preferences: defaultPreferences,
            channelUnread: {},
            channelMentions: {},
            dmUnread: {},

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
        }
    )
);
