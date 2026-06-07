"use client";

import { useEffect, useRef } from "react";
import { startRingtone, type RingtoneHandle } from "@/lib/sounds";
import { useNotificationStore } from "@/stores/notification-store";

/**
 * Plays a looping call ringtone while `playing` is true. The voicing is taken
 * from the user's notification preferences (incoming / outgoing ringtone), and
 * loudness from the call volume + master sound toggle.
 */
export function useRingtone(
    playing: boolean,
    type: "incoming" | "outgoing" = "incoming",
    maxDurationMs?: number
) {
    const handleRef = useRef<RingtoneHandle | null>(null);
    const prefs = useNotificationStore((s) => s.preferences);

    const ringtoneName = type === "incoming" ? prefs.incomingRingtone : prefs.outgoingRingtone;
    const soundEnabled = prefs.enableSound;
    const callVolume = prefs.callVolume;

    useEffect(() => {
        const stop = () => {
            if (handleRef.current) {
                handleRef.current.stop();
                handleRef.current = null;
            }
        };

        if (!playing || !soundEnabled) {
            stop();
            return;
        }

        handleRef.current = startRingtone({
            direction: type,
            name: ringtoneName,
            volumePercent: callVolume,
            maxDurationMs,
        });

        return stop;
    }, [playing, type, ringtoneName, soundEnabled, callVolume, maxDurationMs]);
}
