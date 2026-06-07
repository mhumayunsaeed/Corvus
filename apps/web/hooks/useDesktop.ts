"use client";

import { useEffect } from "react";
import {
    isRuntimeThrottled,
    setRuntimeFocused,
    setRuntimeWindowVisible,
} from "@/lib/runtime-state";
import {
    checkForDesktopUpdate,
    isExpectedDesktopUpdaterError,
    useDesktopUpdaterStore,
} from "@/stores/desktop-updater-store";

const UPDATER_LAST_CHECK_KEY = "corvus.updater.lastCheckAt";
const UPDATER_FAILURE_COUNT_KEY = "corvus.updater.failureCount";
const UPDATER_INITIAL_DELAY_MS = 20_000;
const UPDATER_REGULAR_INTERVAL_MS = 6 * 60 * 60 * 1000;
const UPDATER_RETRY_BASE_MS = 10 * 60 * 1000;
const UPDATER_RETRY_MAX_MS = 24 * 60 * 60 * 1000;
const BACKGROUND_RETRY_MS = 5 * 60 * 1000;

function readNumberFromStorage(key: string) {
    if (typeof localStorage === "undefined") return 0;
    const raw = localStorage.getItem(key);
    if (!raw) return 0;
    const value = Number(raw);
    return Number.isFinite(value) ? value : 0;
}

function writeNumberToStorage(key: string, value: number) {
    if (typeof localStorage === "undefined") return;
    localStorage.setItem(key, String(value));
}

function getRetryDelayMs(failureCount: number) {
    if (failureCount <= 0) return UPDATER_REGULAR_INTERVAL_MS;
    const exponential = UPDATER_RETRY_BASE_MS * Math.pow(2, failureCount - 1);
    return Math.min(exponential, UPDATER_RETRY_MAX_MS);
}

function getInitialUpdateDelayMs() {
    const lastCheckAt = readNumberFromStorage(UPDATER_LAST_CHECK_KEY);
    const failureCount = readNumberFromStorage(UPDATER_FAILURE_COUNT_KEY);
    if (!lastCheckAt) return UPDATER_INITIAL_DELAY_MS;

    const interval = failureCount > 0 ? getRetryDelayMs(failureCount) : UPDATER_REGULAR_INTERVAL_MS;
    const elapsed = Date.now() - lastCheckAt;

    if (elapsed >= interval) {
        return 10_000;
    }

    return interval - elapsed;
}

export function useDesktop() {
    useEffect(() => {
        if (typeof window === "undefined" || !("__TAURI_INTERNALS__" in window)) {
            return;
        }

        useDesktopUpdaterStore.getState().setDesktop(true);

        const setupDesktop = async () => {
            const removeListeners: Array<() => void> = [];

            try {
                try {
                    // 1. Native Notifications Permission
                    const { isPermissionGranted, requestPermission } =
                        await import("@tauri-apps/plugin-notification");
                    let permissionGranted = await isPermissionGranted();
                    if (!permissionGranted) {
                        const permission = await requestPermission();
                        permissionGranted = permission === "granted";
                    }
                } catch (err) {
                    console.error("Failed to setup desktop notifications:", err);
                }

                try {
                    // 2. Runtime visibility + focus state (used for background throttling)
                    const { getCurrentWindow } = await import("@tauri-apps/api/window");
                    const appWindow = getCurrentWindow();

                    const [visible, focused] = await Promise.all([
                        appWindow.isVisible().catch(() => true),
                        appWindow.isFocused().catch(() => true),
                    ]);
                    setRuntimeWindowVisible(visible);
                    setRuntimeFocused(focused);

                    const unlistenFocus = await appWindow.onFocusChanged(({ payload }) => {
                        setRuntimeFocused(Boolean(payload));
                    });
                    const unlistenVisibility = await appWindow.listen<boolean>(
                        "corvus:window_visibility",
                        ({ payload }) => {
                            setRuntimeWindowVisible(Boolean(payload));
                        },
                    );

                    removeListeners.push(unlistenFocus);
                    removeListeners.push(unlistenVisibility);
                } catch (err) {
                    console.error("Failed to setup runtime visibility listeners:", err);
                }

                try {
                    // 3. Scheduled updater with backoff
                    let disposed = false;
                    let running = false;
                    let timer: ReturnType<typeof setTimeout> | null = null;

                    const schedule = (delayMs: number) => {
                        if (disposed) return;
                        if (timer) {
                            clearTimeout(timer);
                        }
                        timer = setTimeout(
                            () => {
                                void runUpdateCheck();
                            },
                            Math.max(5_000, delayMs),
                        );
                    };

                    const runUpdateCheck = async () => {
                        if (disposed || running) return;

                        if (isRuntimeThrottled()) {
                            schedule(BACKGROUND_RETRY_MS);
                            return;
                        }

                        running = true;
                        try {
                            await checkForDesktopUpdate({ silent: true });
                            writeNumberToStorage(UPDATER_LAST_CHECK_KEY, Date.now());
                            writeNumberToStorage(UPDATER_FAILURE_COUNT_KEY, 0);
                        } catch (err) {
                            const failures = readNumberFromStorage(UPDATER_FAILURE_COUNT_KEY) + 1;
                            writeNumberToStorage(UPDATER_LAST_CHECK_KEY, Date.now());
                            if (isExpectedDesktopUpdaterError(err)) {
                                writeNumberToStorage(UPDATER_FAILURE_COUNT_KEY, 0);
                            } else {
                                writeNumberToStorage(UPDATER_FAILURE_COUNT_KEY, failures);
                                console.error("Failed to setup desktop updater:", err);
                            }
                        } finally {
                            running = false;
                            const failures = readNumberFromStorage(UPDATER_FAILURE_COUNT_KEY);
                            schedule(
                                failures > 0
                                    ? getRetryDelayMs(failures)
                                    : UPDATER_REGULAR_INTERVAL_MS,
                            );
                        }
                    };

                    schedule(getInitialUpdateDelayMs());
                    removeListeners.push(() => {
                        disposed = true;
                        if (timer) {
                            clearTimeout(timer);
                        }
                    });
                } catch (err) {
                    console.error("Failed to setup desktop updater:", err);
                }

                try {
                    // 4. Deep Links
                    const { onOpenUrl } = await import("@tauri-apps/plugin-deep-link");
                    const unlisten = await onOpenUrl((urls) => {
                        console.log("Deep link received:", urls);
                        // Handle deep links like corvus://invite/xyz
                    });
                    removeListeners.push(unlisten);
                } catch (err) {
                    console.error("Failed to setup deep links:", err);
                }

                // 5. Show window once web content is ready (window starts hidden to prevent white flash)
                try {
                    const { getCurrentWindow } = await import("@tauri-apps/api/window");
                    const appWindow = getCurrentWindow();
                    await appWindow.show();
                    await appWindow.setFocus();
                    setRuntimeWindowVisible(true);
                    setRuntimeFocused(true);
                } catch (err) {
                    console.error("Failed to show window:", err);
                }

                // 6. File Drag and Drop logic is built-in with web, but we can prevent default redirect
                const onDragOver = (e: DragEvent) => e.preventDefault();
                const onDrop = (e: DragEvent) => {
                    e.preventDefault();
                    // Optional: open file upload modal or handle files directly
                    if (e.dataTransfer?.files.length) {
                        console.log("Files dropped:", e.dataTransfer.files);
                    }
                };
                window.addEventListener("dragover", onDragOver);
                window.addEventListener("drop", onDrop);
                removeListeners.push(() => {
                    window.removeEventListener("dragover", onDragOver);
                    window.removeEventListener("drop", onDrop);
                });
            } catch (err) {
                console.error("Failed to setup desktop features:", err);
            }

            return () => {
                for (const remove of removeListeners) {
                    remove();
                }
            };
        };

        let cleanup: (() => void) | undefined;
        setupDesktop().then((result) => {
            cleanup = result;
        });

        return () => {
            cleanup?.();
        };
    }, []);
}
