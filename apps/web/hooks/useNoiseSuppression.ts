"use client";

import { useEffect, useRef } from "react";
import { useRoomContext } from "@livekit/components-react";
import { RoomEvent, Track } from "livekit-client";
import type { LocalTrackPublication } from "livekit-client";
import { useVoiceStore } from "@/stores/voice-store";
import { createNoiseSuppressor, type NoiseSuppressor } from "@/lib/noise-suppression";

/**
 * Wires the existing RNNoise WASM noise suppressor into the LiveKit room.
 *
 * Must be called inside a <LiveKitRoom> provider.
 *
 * - When noiseSuppression is enabled (default), intercepts the published mic track
 *   and replaces it with a noise-suppressed version via RTCRtpSender.replaceTrack().
 * - On toggle off or unmount, restores the original track and cleans up.
 */
export function useNoiseSuppression() {
    const room = useRoomContext();
    const noiseSuppression = useVoiceStore((s) => s.noiseSuppression);
    const isMuted = useVoiceStore((s) => s.isMuted);
    const suppressorRef = useRef<NoiseSuppressor | null>(null);
    const originalTrackRef = useRef<MediaStreamTrack | null>(null);

    useEffect(() => {
        let cancelled = false;

        const applyNS = async () => {
            const lp = room.localParticipant;
            if (!lp) return;

            const micPub = lp.getTrackPublication(Track.Source.Microphone);
            const msTrack = micPub?.track?.mediaStreamTrack;
            if (!msTrack) return;

            // Don't re-apply if we already have a suppressor for this track
            if (suppressorRef.current && originalTrackRef.current === msTrack) return;

            // Clean up any previous suppressor
            if (suppressorRef.current) {
                suppressorRef.current.destroy();
                suppressorRef.current = null;
            }

            originalTrackRef.current = msTrack;

            try {
                const suppressor = await createNoiseSuppressor(msTrack);
                if (cancelled) {
                    suppressor.destroy();
                    return;
                }
                suppressorRef.current = suppressor;

                // Replace the track on the RTC sender
                const sender = (micPub!.track as any)?.sender as RTCRtpSender | undefined;
                if (sender) {
                    await sender.replaceTrack(suppressor.track);
                }
            } catch (err) {
                console.error("Failed to apply noise suppression:", err);
            }
        };

        const restoreOriginal = async () => {
            if (!suppressorRef.current || !originalTrackRef.current) return;

            const lp = room.localParticipant;
            const micPub = lp?.getTrackPublication(Track.Source.Microphone);
            const sender = (micPub?.track as any)?.sender as RTCRtpSender | undefined;

            if (sender && originalTrackRef.current) {
                try {
                    await sender.replaceTrack(originalTrackRef.current);
                } catch {
                    // Track may already be stopped
                }
            }

            suppressorRef.current.destroy();
            suppressorRef.current = null;
            originalTrackRef.current = null;
        };

        if (!noiseSuppression || isMuted) {
            void restoreOriginal();
            return;
        }

        // If mic track already exists, apply now
        const micPub = room.localParticipant?.getTrackPublication(Track.Source.Microphone);
        if (micPub?.track) {
            applyNS();
        }

        // Also listen for future track publishes (e.g. after unmute)
        const onTrackPublished = (pub: LocalTrackPublication) => {
            if (pub.source === Track.Source.Microphone && noiseSuppression) {
                applyNS();
            }
        };

        room.on(RoomEvent.LocalTrackPublished, onTrackPublished);

        return () => {
            cancelled = true;
            room.off(RoomEvent.LocalTrackPublished, onTrackPublished);
            if (suppressorRef.current) {
                suppressorRef.current.destroy();
                suppressorRef.current = null;
            }
            originalTrackRef.current = null;
        };
    }, [isMuted, noiseSuppression, room]);
}
