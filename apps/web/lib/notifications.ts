import { parseAttachmentContent } from "@/lib/attachments";
import { playNotification, type NotificationKind } from "@/lib/sounds";

export type NotificationSoundKind = NotificationKind;

const APP_TITLE = "Corvus";
const overlayIconCache = new Map<string, ReturnType<typeof createOverlayIcon>>();

/**
 * Play a notification cue. `soundName` selects the voicing (see
 * NOTIFICATION_SOUNDS in lib/sounds); omitting it uses the kind's default.
 */
export async function playNotificationTone(
    kind: NotificationSoundKind,
    volumePercent = 55,
    soundName?: string
) {
    const defaults: Record<NotificationKind, string> = {
        message: "chime",
        mention: "sparkle",
        other: "soft",
    };
    playNotification(kind, soundName ?? defaults[kind], volumePercent);
}

export function summarizeNotificationBody(content: string): string {
    const trimmed = content.trim();
    if (!trimmed) return "(No text)";

    if (trimmed.startsWith("sticker:")) {
        return "[Sticker]";
    }

    const attachment = parseAttachmentContent(trimmed);
    if (attachment) {
        return `[Attachment] ${attachment.name}`;
    }

    return trimmed.length > 140 ? `${trimmed.slice(0, 137)}...` : trimmed;
}

function formatBadgeCount(count: number): string {
    if (count <= 0) return "";
    return count > 99 ? "99+" : `${count}`;
}

async function createOverlayIcon(label: string) {
    if (typeof document === "undefined") return null;

    const size = 64;
    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;

    const ctx = canvas.getContext("2d");
    if (!ctx) return null;

    ctx.clearRect(0, 0, size, size);

    ctx.fillStyle = "#E65A67";
    ctx.beginPath();
    ctx.arc(46, 18, 17, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#FFFFFF";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = label.length > 2 ? "bold 17px 'Segoe UI', sans-serif" : "bold 21px 'Segoe UI', sans-serif";
    ctx.fillText(label, 46, 18);

    const rgba = ctx.getImageData(0, 0, size, size).data;
    const { Image } = await import("@tauri-apps/api/image");
    return Image.new(new Uint8Array(rgba), size, size);
}

async function getOverlayIcon(label: string) {
    if (!overlayIconCache.has(label)) {
        overlayIconCache.set(label, createOverlayIcon(label));
    }
    return overlayIconCache.get(label)!;
}

export async function syncNotificationBadge(totalUnread: number, enabled: boolean) {
    if (typeof document !== "undefined") {
        const visibleCount = enabled ? Math.max(0, totalUnread) : 0;
        document.title = visibleCount > 0
            ? `(${formatBadgeCount(visibleCount)}) ${APP_TITLE}`
            : APP_TITLE;
    }

    if (typeof window === "undefined" || !("__TAURI_INTERNALS__" in window)) {
        return;
    }

    const badgeCount = enabled ? Math.max(0, totalUnread) : 0;

    try {
        const { getCurrentWindow } = await import("@tauri-apps/api/window");
        const appWindow = getCurrentWindow();

        await appWindow.setBadgeCount(badgeCount > 0 ? badgeCount : undefined).catch(() => {
            // Windows does not currently support setBadgeCount.
        });

        if (badgeCount > 0) {
            const label = formatBadgeCount(badgeCount);
            const overlayIcon = await getOverlayIcon(label);
            if (overlayIcon) {
                await appWindow.setOverlayIcon(overlayIcon);
            }
        } else {
            await appWindow.setOverlayIcon(undefined);
        }
    } catch (err) {
        console.error("Failed to update taskbar badge:", err);
    }
}

export async function showSystemNotification(title: string, body: string) {
    if (typeof window === "undefined") return;

    if ("__TAURI_INTERNALS__" in window) {
        try {
            const { isPermissionGranted, sendNotification } = await import("@tauri-apps/plugin-notification");
            const granted = await isPermissionGranted();
            if (granted) {
                await sendNotification({ title, body });
            }
        } catch (err) {
            console.error("Failed to send native desktop notification:", err);
        }
        return;
    }

    if (!("Notification" in window) || Notification.permission !== "granted") {
        return;
    }

    try {
        new Notification(title, {
            body,
            silent: true,
        });
    } catch {
        // Ignore notification API errors.
    }
}
