"use client";

import { useEffect, useRef } from "react";

export function useRingtone(
    playing: boolean,
    type: "incoming" | "outgoing" = "incoming",
    maxDurationMs?: number
) {
    const contextRef = useRef<AudioContext | null>(null);
    const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => {
        if (!playing) {
            if (intervalRef.current) clearInterval(intervalRef.current);
            if (timeoutRef.current) clearTimeout(timeoutRef.current);
            if (contextRef.current) {
                contextRef.current.close().catch(() => { });
                contextRef.current = null;
            }
            return;
        }

        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        if (!AudioContextClass) return;

        const ctx = new AudioContextClass();
        contextRef.current = ctx;

        const playDualTone = (
            startOffset: number,
            duration: number,
            freq1: number,
            freq2: number,
            volume: number
        ) => {
            if (ctx.state === "suspended") ctx.resume().catch(() => { });

            const osc1 = ctx.createOscillator();
            const osc2 = ctx.createOscillator();
            const gainNode = ctx.createGain();

            const startAt = ctx.currentTime + startOffset;
            const stopAt = startAt + duration;

            osc1.type = "sine";
            osc2.type = "triangle";
            osc1.frequency.setValueAtTime(freq1, startAt);
            osc2.frequency.setValueAtTime(freq2, startAt);

            osc1.connect(gainNode);
            osc2.connect(gainNode);
            gainNode.connect(ctx.destination);

            // Envelope to avoid popping and keep call tones comfortable.
            gainNode.gain.setValueAtTime(0, startAt);
            gainNode.gain.linearRampToValueAtTime(volume, startAt + 0.02);
            gainNode.gain.setValueAtTime(volume, stopAt - 0.03);
            gainNode.gain.linearRampToValueAtTime(0, stopAt);

            osc1.start(startAt);
            osc2.start(startAt);
            osc1.stop(stopAt + 0.02);
            osc2.stop(stopAt + 0.02);
        };

        const playPattern = () => {
            if (type === "outgoing") {
                // Outgoing ringback: two longer pulses, then pause.
                playDualTone(0, 0.4, 425, 510, 0.12);
                playDualTone(0.55, 0.4, 425, 510, 0.12);
                return;
            }

            // Incoming ringtone: faster three-note pattern.
            playDualTone(0, 0.2, 660, 880, 0.14);
            playDualTone(0.28, 0.2, 784, 988, 0.14);
            playDualTone(0.56, 0.24, 523, 784, 0.14);
        };

        playPattern();
        const intervalMs = type === "outgoing" ? 4500 : 2200;
        intervalRef.current = setInterval(playPattern, intervalMs);

        if (typeof maxDurationMs === "number" && maxDurationMs > 0) {
            timeoutRef.current = setTimeout(() => {
                if (intervalRef.current) {
                    clearInterval(intervalRef.current);
                    intervalRef.current = null;
                }
                if (contextRef.current) {
                    contextRef.current.close().catch(() => { });
                    contextRef.current = null;
                }
            }, maxDurationMs);
        }

        return () => {
            if (intervalRef.current) clearInterval(intervalRef.current);
            if (timeoutRef.current) clearTimeout(timeoutRef.current);
            if (contextRef.current) {
                contextRef.current.close().catch(() => { });
                contextRef.current = null;
            }
        };
    }, [playing, type, maxDurationMs]);
}
