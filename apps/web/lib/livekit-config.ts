import { RoomOptions, AudioPresets, DefaultReconnectPolicy } from "livekit-client";

/**
 * Aggressive LiveKit RoomOptions for instant join, clean audio, and no artifacts.
 *
 * Key decisions:
 * - Browser noiseSuppression OFF — RNNoise WASM handles it instead (avoids phase cancellation)
 * - DTX OFF — prevents choppy silence / robotic artifacts in voice chat
 * - RED ON — redundant audio encoding for packet loss resilience without added latency
 * - Opus music preset — 48kHz stereo-capable at higher bitrate for cleaner voice
 */
export function createRoomOptions(overrides?: {
    inputDeviceId?: string;
    outputDeviceId?: string;
}): RoomOptions {
    return {
        adaptiveStream: true,
        dynacast: true,

        audioCaptureDefaults: {
            echoCancellation: true,
            noiseSuppression: false,
            autoGainControl: true,
            channelCount: 1,
            sampleRate: 48000,
            deviceId: overrides?.inputDeviceId,
        },

        audioOutput: {
            deviceId: overrides?.outputDeviceId ?? "default",
        },

        publishDefaults: {
            audioPreset: AudioPresets.music,
            dtx: false,
            red: true,
        },

        reconnectPolicy: new DefaultReconnectPolicy(),
        disconnectOnPageLeave: true,
        stopLocalTrackOnUnpublish: true,
    };
}
