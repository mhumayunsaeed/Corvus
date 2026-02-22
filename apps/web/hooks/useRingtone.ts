"use client";

import { useEffect, useRef } from "react";

export function useRingtone(playing: boolean, type: "incoming" | "outgoing" = "incoming") {
    const contextRef = useRef<AudioContext | null>(null);
    const intervalRef = useRef<NodeJS.Timeout | null>(null);

    useEffect(() => {
        if (!playing) {
            if (intervalRef.current) clearInterval(intervalRef.current);
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

        const playTone = () => {
            if (ctx.state === "suspended") ctx.resume().catch(() => { });

            const osc1 = ctx.createOscillator();
            const osc2 = ctx.createOscillator();
            const gainNode = ctx.createGain();

            if (type === "outgoing") {
                // North American ringback: 440Hz + 480Hz
                osc1.frequency.setValueAtTime(440, ctx.currentTime);
                osc2.frequency.setValueAtTime(480, ctx.currentTime);
            } else {
                // Incoming ring (UK style or generic double ring): 400Hz + 450Hz
                // Let's make an incoming be more distinct, like a softer rapid ring.
                osc1.frequency.setValueAtTime(400, ctx.currentTime);
                osc2.frequency.setValueAtTime(450, ctx.currentTime);
            }

            osc1.connect(gainNode);
            osc2.connect(gainNode);
            gainNode.connect(ctx.destination);

            // Envelope to avoid pop
            gainNode.gain.setValueAtTime(0, ctx.currentTime);
            gainNode.gain.linearRampToValueAtTime(0.15, ctx.currentTime + 0.05);

            const toneDuration = type === "outgoing" ? 2 : 1;

            gainNode.gain.setValueAtTime(0.15, ctx.currentTime + toneDuration - 0.05);
            gainNode.gain.linearRampToValueAtTime(0, ctx.currentTime + toneDuration);

            osc1.start(ctx.currentTime);
            osc2.start(ctx.currentTime);

            osc1.stop(ctx.currentTime + toneDuration + 0.1);
            osc2.stop(ctx.currentTime + toneDuration + 0.1);
        };

        // Try to play immediately
        playTone();
        // Repeat interval
        const intervalMs = type === "outgoing" ? 6000 : 3000;
        intervalRef.current = setInterval(playTone, intervalMs);

        return () => {
            if (intervalRef.current) clearInterval(intervalRef.current);
            if (contextRef.current) {
                contextRef.current.close().catch(() => { });
                contextRef.current = null;
            }
        };
    }, [playing, type]);
}
