"use client";

import { useEffect } from "react";
import { useAuthStore } from "@/stores/auth-store";

export function useDesktop() {
    useEffect(() => {
        if (typeof window === "undefined" || !("__TAURI_INTERNALS__" in window)) {
            return;
        }

        const setupDesktop = async () => {
            try {
                // 1. Native Notifications Permission
                const { isPermissionGranted, requestPermission } = await import("@tauri-apps/plugin-notification");
                let permissionGranted = await isPermissionGranted();
                if (!permissionGranted) {
                    const permission = await requestPermission();
                    permissionGranted = permission === "granted";
                }

                // 2. Auto-Updater
                const { check } = await import("@tauri-apps/plugin-updater");
                const { ask, message } = await import("@tauri-apps/plugin-dialog");
                const update = await check();
                if (update) {
                    const yes = await ask(`Update to ${update.version} is available!\n\nRelease notes: ${update.body}`, {
                        title: 'Update Available',
                        kind: 'info',
                    });
                    if (yes) {
                        await update.downloadAndInstall();
                        await message("Update installed! Veyra will now restart.", { title: "Complete", kind: "info" });
                        const { relaunch } = await import("@tauri-apps/plugin-process");
                        await relaunch();
                    }
                }

                // 3. Deep Links
                const { onOpenUrl } = await import("@tauri-apps/plugin-deep-link");
                await onOpenUrl((urls) => {
                    console.log("Deep link received:", urls);
                    // Handle deep links like veyra://invite/xyz
                });

                // 4. File Drag and Drop logic is built-in with web, but we can prevent default redirect
                window.addEventListener("dragover", (e) => e.preventDefault());
                window.addEventListener("drop", (e) => {
                    e.preventDefault();
                    // Optional: open file upload modal or handle files directly
                    if (e.dataTransfer?.files.length) {
                        console.log("Files dropped:", e.dataTransfer.files);
                    }
                });

            } catch (err) {
                console.error("Failed to setup desktop features:", err);
            }
        };

        setupDesktop();
    }, []);
}
