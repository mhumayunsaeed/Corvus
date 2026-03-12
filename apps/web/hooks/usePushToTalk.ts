"use client";

import { useEffect, useRef } from "react";
import { useVoiceStore } from "@/stores/voice-store";

/**
 * Push-to-Talk hook for Tauri desktop.
 * Reads PTT settings from voice store (enabled, shortcut, mode).
 *
 * Modes:
 *   - "push-to-talk": Press = unmute, Release = re-mute
 *   - "toggle": Press = toggle mute state, Release = no-op
 *
 * Only active when connected to a voice channel and PTT is enabled.
 */
export function usePushToTalk() {
    const currentChannelId = useVoiceStore((s) => s.currentChannelId);
    const pttEnabled = useVoiceStore((s) => s.pttEnabled);
    const pttShortcut = useVoiceStore((s) => s.pttShortcut);
    const pttMode = useVoiceStore((s) => s.pttMode);
    const wasMutedRef = useRef(true);
    const registeredShortcutRef = useRef<string | null>(null);

    useEffect(() => {
        // Only works in Tauri environment
        if (typeof window === "undefined" || !(window as any).__TAURI__) return;
        if (!currentChannelId || !pttEnabled) return;

        let cleanup: (() => void) | null = null;

        (async () => {
            try {
                const { register, unregister } =
                    await import("@tauri-apps/plugin-global-shortcut");

                // Unregister previous shortcut if it changed
                if (registeredShortcutRef.current && registeredShortcutRef.current !== pttShortcut) {
                    try { await unregister(registeredShortcutRef.current); } catch { /* ignore */ }
                    registeredShortcutRef.current = null;
                }

                await register(pttShortcut, (event) => {
                    const state = useVoiceStore.getState();
                    if (!state.currentChannelId) return;

                    if (state.pttMode === "push-to-talk") {
                        if (event.state === "Pressed") {
                            wasMutedRef.current = state.isMuted;
                            if (state.isMuted) {
                                state.setLocalMuted(false);
                            }
                            state.setPttActive(true);
                        } else if (event.state === "Released") {
                            if (wasMutedRef.current && !useVoiceStore.getState().isMuted) {
                                useVoiceStore.getState().setLocalMuted(true);
                            }
                            useVoiceStore.getState().setPttActive(false);
                        }
                    } else {
                        // Toggle mode: toggle on press, ignore release
                        if (event.state === "Pressed") {
                            const isMuted = useVoiceStore.getState().isMuted;
                            useVoiceStore.getState().setLocalMuted(!isMuted);
                            useVoiceStore.getState().setPttActive(!isMuted === false);
                        }
                    }
                });

                registeredShortcutRef.current = pttShortcut;

                cleanup = () => {
                    unregister(pttShortcut).catch(console.error);
                    registeredShortcutRef.current = null;
                    useVoiceStore.getState().setPttActive(false);
                };
            } catch (err) {
                console.error("Failed to register push-to-talk shortcut:", err);
            }
        })();

        return () => {
            cleanup?.();
        };
    }, [currentChannelId, pttEnabled, pttShortcut, pttMode]);
}
