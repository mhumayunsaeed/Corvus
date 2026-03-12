"use client";

import { useEffect, useRef, useCallback } from "react";
import { useVoiceStore } from "@/stores/voice-store";

// ─── PTT audio feedback ─────────────────────────────────────────
// Short click sounds so the user knows when their mic is hot/cold.

let sharedAudioCtx: AudioContext | null = null;

function getAudioCtx(): AudioContext | null {
    if (typeof window === "undefined") return null;
    const Ctor = window.AudioContext || (window as any).webkitAudioContext;
    if (!Ctor) return null;
    if (!sharedAudioCtx || sharedAudioCtx.state === "closed") {
        sharedAudioCtx = new Ctor();
    }
    if (sharedAudioCtx.state === "suspended") {
        sharedAudioCtx.resume().catch(() => {});
    }
    return sharedAudioCtx;
}

function playPttSound(activate: boolean) {
    const ctx = getAudioCtx();
    if (!ctx) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = "sine";
    // Higher pitch = mic hot, lower pitch = mic cold
    osc.frequency.setValueAtTime(activate ? 880 : 440, now);

    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.15, now + 0.005);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.1);
}

// ─── Web PTT key ────────────────────────────────────────────────
// On web (non-Tauri), backtick ` is the default PTT key.
const WEB_PTT_KEY = "`";

/**
 * Push-to-Talk hook.
 *
 * - Desktop (Tauri): Global shortcuts via @tauri-apps/plugin-global-shortcut
 *   so PTT works even when the app window is not focused.
 * - Web: Keyboard events using the backtick (`) key.
 *
 * Plays a short audio click on activation/deactivation so the user
 * always knows whether their mic is live.
 */
export function usePushToTalk() {
    const currentChannelId = useVoiceStore((s) => s.currentChannelId);
    const pttEnabled = useVoiceStore((s) => s.pttEnabled);
    const pttShortcut = useVoiceStore((s) => s.pttShortcut);
    const pttMode = useVoiceStore((s) => s.pttMode);
    const wasMutedRef = useRef(true);
    const registeredShortcutRef = useRef<string | null>(null);
    const pttKeyHeldRef = useRef(false);

    // ── Shared press / release handlers ──

    const handlePttPress = useCallback(() => {
        const state = useVoiceStore.getState();
        if (!state.currentChannelId) return;

        if (state.pttMode === "push-to-talk") {
            wasMutedRef.current = state.isMuted;
            if (state.isMuted) {
                state.setLocalMuted(false);
            }
            state.setPttActive(true);
            playPttSound(true);
        } else {
            // Toggle mode
            const newMuted = !state.isMuted;
            state.setLocalMuted(newMuted);
            state.setPttActive(!newMuted);
            playPttSound(!newMuted);
        }
    }, []);

    const handlePttRelease = useCallback(() => {
        const state = useVoiceStore.getState();
        if (!state.currentChannelId) return;

        if (state.pttMode === "push-to-talk") {
            if (wasMutedRef.current && !state.isMuted) {
                state.setLocalMuted(true);
            }
            state.setPttActive(false);
            playPttSound(false);
        }
        // Toggle mode: no-op on release
    }, []);

    // ── Auto-mute when joining a channel with PTT enabled ──
    useEffect(() => {
        if (!currentChannelId || !pttEnabled) return;
        // When PTT is on, user should start muted (mic is cold until key is held)
        const state = useVoiceStore.getState();
        if (!state.isMuted) {
            state.setLocalMuted(true);
        }
    }, [currentChannelId, pttEnabled]);

    // ── Tauri global shortcut ──
    useEffect(() => {
        if (typeof window === "undefined" || !("__TAURI_INTERNALS__" in window)) return;
        if (!currentChannelId || !pttEnabled) return;

        let disposed = false;
        let unregisterFn: ((shortcut: string) => Promise<void>) | null = null;
        let registeredKey: string | null = null;

        (async () => {
            try {
                const { register, unregister } =
                    await import("@tauri-apps/plugin-global-shortcut");

                if (disposed) {
                    // Component unmounted while we were importing — bail out
                    return;
                }

                unregisterFn = unregister;

                if (registeredShortcutRef.current && registeredShortcutRef.current !== pttShortcut) {
                    try { await unregister(registeredShortcutRef.current); } catch { /* ignore */ }
                    registeredShortcutRef.current = null;
                }

                if (disposed) return;

                await register(pttShortcut, (event) => {
                    if (event.state === "Pressed") {
                        handlePttPress();
                    } else if (event.state === "Released") {
                        handlePttRelease();
                    }
                });

                if (disposed) {
                    // Registered but already disposed — immediately unregister
                    unregister(pttShortcut).catch(console.error);
                    registeredShortcutRef.current = null;
                    return;
                }

                registeredShortcutRef.current = pttShortcut;
                registeredKey = pttShortcut;
            } catch (err) {
                console.error("Failed to register push-to-talk shortcut:", err);
            }
        })();

        return () => {
            disposed = true;
            if (registeredKey && unregisterFn) {
                unregisterFn(registeredKey).catch(console.error);
                registeredShortcutRef.current = null;
            }
            useVoiceStore.getState().setPttActive(false);
        };
    }, [currentChannelId, pttEnabled, pttShortcut, pttMode, handlePttPress, handlePttRelease]);

    // ── Web keyboard fallback ──
    useEffect(() => {
        // Skip on Tauri — global shortcuts handle it there
        if (typeof window === "undefined" || "__TAURI_INTERNALS__" in window) return;
        if (!currentChannelId || !pttEnabled) return;

        const onKeyDown = (e: KeyboardEvent) => {
            if (e.key !== WEB_PTT_KEY) return;
            // Don't intercept when typing in inputs
            const tag = (e.target as HTMLElement)?.tagName;
            if (tag === "INPUT" || tag === "TEXTAREA" || (e.target as HTMLElement)?.isContentEditable) return;
            if (pttKeyHeldRef.current) return; // ignore key repeat
            pttKeyHeldRef.current = true;
            e.preventDefault();
            handlePttPress();
        };

        const onKeyUp = (e: KeyboardEvent) => {
            if (e.key !== WEB_PTT_KEY) return;
            if (!pttKeyHeldRef.current) return;
            pttKeyHeldRef.current = false;
            e.preventDefault();
            handlePttRelease();
        };

        // Release if window loses focus while key is held
        const onBlur = () => {
            if (pttKeyHeldRef.current) {
                pttKeyHeldRef.current = false;
                handlePttRelease();
            }
        };

        window.addEventListener("keydown", onKeyDown);
        window.addEventListener("keyup", onKeyUp);
        window.addEventListener("blur", onBlur);

        return () => {
            window.removeEventListener("keydown", onKeyDown);
            window.removeEventListener("keyup", onKeyUp);
            window.removeEventListener("blur", onBlur);
            if (pttKeyHeldRef.current) {
                pttKeyHeldRef.current = false;
                useVoiceStore.getState().setPttActive(false);
            }
        };
    }, [currentChannelId, pttEnabled, handlePttPress, handlePttRelease]);
}
