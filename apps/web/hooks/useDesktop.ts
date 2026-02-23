"use client";

import { useEffect } from "react";
import { useAuthStore } from "@/stores/auth-store";

export function useDesktop() {
    useEffect(() => {
        if (typeof window === "undefined" || !("__TAURI_INTERNALS__" in window)) {
            return;
        }

        const isExpectedUpdaterError = (err: unknown) => {
            const text = err instanceof Error ? err.message : String(err);
            return text.includes("Could not fetch a valid release JSON from the remote");
        };

        const setupDesktop = async () => {
            const removeListeners: Array<() => void> = [];

            try {
                try {
                    // 1. Native Notifications Permission
                    const { isPermissionGranted, requestPermission } = await import("@tauri-apps/plugin-notification");
                    let permissionGranted = await isPermissionGranted();
                    if (!permissionGranted) {
                        const permission = await requestPermission();
                        permissionGranted = permission === "granted";
                    }
                } catch (err) {
                    console.error("Failed to setup desktop notifications:", err);
                }

                try {
                    // 2. Auto-Updater
                    const { check } = await import("@tauri-apps/plugin-updater");
                    const { ask, message } = await import("@tauri-apps/plugin-dialog");
                    const update = await check();
                    if (update) {
                        const yes = await ask(`Update to ${update.version} is available!\n\nRelease notes: ${update.body}`, {
                            title: "Update Available",
                            kind: "info",
                        });
                        if (yes) {
                            await update.downloadAndInstall();
                            await message("Update installed! Veyra will now restart.", { title: "Complete", kind: "info" });
                            const { relaunch } = await import("@tauri-apps/plugin-process");
                            await relaunch();
                        }
                    }
                } catch (err) {
                    if (!isExpectedUpdaterError(err)) {
                        console.error("Failed to setup desktop updater:", err);
                    }
                }

                try {
                    // 3. Deep Links
                    const { onOpenUrl } = await import("@tauri-apps/plugin-deep-link");
                    const unlisten = await onOpenUrl((urls) => {
                        console.log("Deep link received:", urls);
                        // Handle deep links like veyra://invite/xyz
                    });
                    removeListeners.push(unlisten);
                } catch (err) {
                    console.error("Failed to setup deep links:", err);
                }

                // 4. Show window once web content is ready (window starts hidden to prevent white flash)
                try {
                    const { getCurrentWindow } = await import("@tauri-apps/api/window");
                    const appWindow = getCurrentWindow();
                    await appWindow.show();
                    await appWindow.setFocus();
                } catch (err) {
                    console.error("Failed to show window:", err);
                }

                // 5. File Drag and Drop logic is built-in with web, but we can prevent default redirect
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
