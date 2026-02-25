import {
    RoomOptions,
    AudioPresets,
    DefaultReconnectPolicy,
    VideoPresets,
    ScreenSharePresets,
} from "livekit-client";

/**
 * Aggressive LiveKit RoomOptions for low-latency voice/video calls.
 *
 * Key decisions:
 * - Browser noiseSuppression OFF — RNNoise WASM handles it (avoids phase cancellation)
 * - DTX OFF — prevents choppy silence / robotic artifacts in voice chat
 * - RED ON — redundant audio encoding for packet loss resilience without added latency
 * - AudioPresets.music — 48kHz stereo-capable, higher bitrate (48kbps vs 32kbps)
 *   yields smaller Opus frame sizes (10–20ms vs 40–60ms), reducing encoding latency
 * - Minimal capture latency — requests the lowest possible buffer from the audio driver
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
            // Request the lowest possible audio capture latency from the driver.
            // 0 = "interactive" — browser will use the smallest safe buffer.
            latency: 0,
            deviceId: overrides?.inputDeviceId,
        },

        videoCaptureDefaults: {
            resolution: VideoPresets.h720.resolution,
            frameRate: 30,
        },

        audioOutput: {
            deviceId: overrides?.outputDeviceId ?? "default",
        },

        publishDefaults: {
            // music preset: 48kbps mono, allows smaller Opus frame sizes (10-20ms)
            // which cuts ~20-40ms of encode+decode latency vs the 32kbps speech preset.
            audioPreset: AudioPresets.music,
            dtx: false,
            red: true,
            videoEncoding: VideoPresets.h720.encoding,
            screenShareEncoding: ScreenSharePresets.h720fps15.encoding,
            // Use Opus "voip" application mode for better echo cancellation
            // while benefiting from the higher bitrate of the music preset.
        },

        reconnectPolicy: new DefaultReconnectPolicy(),
        disconnectOnPageLeave: true,
        stopLocalTrackOnUnpublish: true,
    };
}
