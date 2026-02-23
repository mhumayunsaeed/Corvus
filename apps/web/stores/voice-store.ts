import { create } from "zustand";

export type ScreenShareQuality = "720p30" | "1080p30" | "1080p60" | "source";

export const SCREEN_SHARE_PRESETS: Record<ScreenShareQuality, { label: string; width: number; height: number; frameRate: number } | null> = {
    "720p30": { label: "720p 30fps", width: 1280, height: 720, frameRate: 30 },
    "1080p30": { label: "1080p 30fps", width: 1920, height: 1080, frameRate: 30 },
    "1080p60": { label: "1080p 60fps", width: 1920, height: 1080, frameRate: 60 },
    "source": null, // Native resolution
};

function defaultNoiseSuppressionEnabled(): boolean {
    if (typeof navigator === "undefined") {
        return true;
    }

    const hardwareConcurrency = navigator.hardwareConcurrency || 8;
    const deviceMemory =
        (navigator as Navigator & { deviceMemory?: number }).deviceMemory || 8;

    // RNNoise is CPU-intensive. Keep it enabled by default on mid/high-end devices.
    return hardwareConcurrency >= 6 && deviceMemory >= 8;
}

export interface VoiceParticipant {
    userId: string;
    username: string;
    displayName: string;
    avatarUrl: string | null;
    isSpeaking?: boolean;
    isMuted?: boolean;
    isDeafened?: boolean;
    hasVideo?: boolean;
    isScreenSharing?: boolean;
}

interface VoiceState {
    // Current connection state
    currentChannelId: string | null;
    currentServerId: string | null;
    currentChannelName: string | null;
    currentServerName: string | null;
    currentChannelType: string | null;
    livekitToken: string | null;
    livekitUrl: string | null;
    roomName: string | null;

    // Participants in the connected voice channel
    participants: VoiceParticipant[];

    // Local user state
    isMuted: boolean;
    isDeafened: boolean;
    hasVideo: boolean;
    isScreenSharing: boolean;
    screenShareQuality: ScreenShareQuality;
    noiseSuppression: boolean;

    // Participants in all voice channels (for ChannelList display)
    channelParticipants: Record<string, VoiceParticipant[]>;

    // Actions
    joinChannel: (data: {
        channelId: string;
        serverId: string;
        channelName: string;
        serverName: string;
        channelType: string;
        token: string;
        url: string;
        roomName: string;
        participants: VoiceParticipant[];
    }) => void;
    leaveChannel: () => void;
    setParticipants: (participants: VoiceParticipant[]) => void;
    addParticipant: (participant: VoiceParticipant) => void;
    removeParticipant: (userId: string) => void;
    updateParticipant: (userId: string, updates: Partial<VoiceParticipant>) => void;
    setLocalMuted: (muted: boolean) => void;
    setLocalDeafened: (deafened: boolean) => void;
    setLocalVideo: (hasVideo: boolean) => void;
    setLocalScreenSharing: (sharing: boolean) => void;
    setScreenShareQuality: (quality: ScreenShareQuality) => void;
    setNoiseSuppression: (enabled: boolean) => void;
    setChannelParticipants: (channelId: string, participants: VoiceParticipant[]) => void;
    addChannelParticipant: (channelId: string, participant: VoiceParticipant) => void;
    removeChannelParticipant: (channelId: string, userId: string) => void;
    setAllChannelParticipants: (states: Record<string, VoiceParticipant[]>) => void;
}

export const useVoiceStore = create<VoiceState>((set) => ({
    currentChannelId: null,
    currentServerId: null,
    currentChannelName: null,
    currentServerName: null,
    currentChannelType: null,
    livekitToken: null,
    livekitUrl: null,
    roomName: null,
    participants: [],
    isMuted: false,
    isDeafened: false,
    hasVideo: false,
    isScreenSharing: false,
    screenShareQuality: "1080p30" as ScreenShareQuality,
    noiseSuppression: defaultNoiseSuppressionEnabled(),
    channelParticipants: {},

    joinChannel: (data) =>
        set({
            currentChannelId: data.channelId,
            currentServerId: data.serverId,
            currentChannelName: data.channelName,
            currentServerName: data.serverName,
            currentChannelType: data.channelType,
            livekitToken: data.token,
            livekitUrl: data.url,
            roomName: data.roomName,
            participants: data.participants,
            isMuted: false,
            isDeafened: false,
            hasVideo: false,
            isScreenSharing: false,
        }),

    leaveChannel: () =>
        set({
            currentChannelId: null,
            currentServerId: null,
            currentChannelName: null,
            currentServerName: null,
            currentChannelType: null,
            livekitToken: null,
            livekitUrl: null,
            roomName: null,
            participants: [],
            isMuted: false,
            isDeafened: false,
            hasVideo: false,
            isScreenSharing: false,
        }),

    setParticipants: (participants) => set({ participants }),

    addParticipant: (participant) =>
        set((state) => {
            if (state.participants.some((p) => p.userId === participant.userId)) {
                return state;
            }
            return { participants: [...state.participants, participant] };
        }),

    removeParticipant: (userId) =>
        set((state) => ({
            participants: state.participants.filter((p) => p.userId !== userId),
        })),

    updateParticipant: (userId, updates) =>
        set((state) => ({
            participants: state.participants.map((p) =>
                p.userId === userId ? { ...p, ...updates } : p
            ),
        })),

    setLocalMuted: (muted) => set({ isMuted: muted }),
    setLocalDeafened: (deafened) => set({ isDeafened: deafened }),
    setLocalVideo: (hasVideo) => set({ hasVideo }),
    setLocalScreenSharing: (sharing) => set({ isScreenSharing: sharing }),
    setScreenShareQuality: (quality) => set({ screenShareQuality: quality }),
    setNoiseSuppression: (enabled) => set({ noiseSuppression: enabled }),

    setChannelParticipants: (channelId, participants) =>
        set((state) => ({
            channelParticipants: {
                ...state.channelParticipants,
                [channelId]: participants,
            },
        })),

    addChannelParticipant: (channelId, participant) =>
        set((state) => {
            const existing = state.channelParticipants[channelId] || [];
            if (existing.some((p) => p.userId === participant.userId)) return state;
            return {
                channelParticipants: {
                    ...state.channelParticipants,
                    [channelId]: [...existing, participant],
                },
            };
        }),

    removeChannelParticipant: (channelId, userId) =>
        set((state) => {
            const existing = state.channelParticipants[channelId] || [];
            const filtered = existing.filter((p) => p.userId !== userId);
            return {
                channelParticipants: {
                    ...state.channelParticipants,
                    [channelId]: filtered,
                },
            };
        }),

    setAllChannelParticipants: (states) =>
        set({ channelParticipants: states }),
}));
