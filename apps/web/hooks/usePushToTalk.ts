"use client";

import { useEffect, useRef } from "react";
import { useVoiceStore } from "@/stores/voice-store";

/**
 * Push-to-Talk hook for Tauri desktop.
 * Registers CmdOrCtrl+Alt+P global shortcut:
 *   - Press: unmute mic
 *   - Release: re-mute mic
 * Only active when connected to a voice channel.
 */
export function usePushToTalk() {
    const currentChannelId = useVoiceStore((s) => s.currentChannelId);
    const wasMutedRef = useRef(true);
    const registeredRef = useRef(false);

    useEffect(() => {
        // Only works in Tauri environment
        if (typeof window === "undefined" || !(window as any).__TAURI__) return;
        if (!currentChannelId) return;

        let cleanup: (() => void) | null = null;

        (async () => {
            try {
                const { register, unregister } =
                    await import("@tauri-apps/plugin-global-shortcut");

                const shortcut = "CmdOrCtrl+Alt+P";

                await register(shortcut, (event) => {
                    const state = useVoiceStore.getState();
                    if (!state.currentChannelId) return;

                    if (event.state === "Pressed") {
                        // Remember mute state, then unmute
                        wasMutedRef.current = state.isMuted;
                        if (state.isMuted) {
                            state.setLocalMuted(false);
                        }
                    } else if (event.state === "Released") {
                        // Re-mute if it was muted before
                        if (wasMutedRef.current && !useVoiceStore.getState().isMuted) {
                            useVoiceStore.getState().setLocalMuted(true);
                        }
                    }
                });

                registeredRef.current = true;

                cleanup = () => {
                    unregister(shortcut).catch(console.error);
                    registeredRef.current = false;
                };
            } catch (err) {
                console.error("Failed to register push-to-talk shortcut:", err);
            }
        })();

        return () => {
            cleanup?.();
        };
    }, [currentChannelId]);
}
