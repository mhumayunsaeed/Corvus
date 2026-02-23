import { parseAttachmentContent } from "@/lib/attachments";

export type NotificationSoundKind = "message" | "mention" | "other";

const APP_TITLE = "Veyra";
const overlayIconCache = new Map<string, Promise<any | null>>();
let sharedAudioContext: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
    if (typeof window === "undefined") return null;
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return null;

    if (!sharedAudioContext || sharedAudioContext.state === "closed") {
        sharedAudioContext = new AudioContextClass();
    }

    if (sharedAudioContext.state === "suspended") {
        sharedAudioContext.resume().catch(() => {
            // Ignore blocked autoplay resume.
        });
    }

    return sharedAudioContext;
}

function scheduleSoftTone(
    ctx: AudioContext,
    options: {
        startOffset: number;
        duration: number;
        frequency: number;
        harmonicFrequency?: number;
        volume: number;
    }
) {
    const startAt = ctx.currentTime + options.startOffset;
    const stopAt = startAt + options.duration;

    const primary = ctx.createOscillator();
    const harmonic = ctx.createOscillator();
    const gainNode = ctx.createGain();

    primary.type = "sine";
    harmonic.type = "triangle";
    primary.frequency.setValueAtTime(options.frequency, startAt);
    harmonic.frequency.setValueAtTime(options.harmonicFrequency ?? options.frequency * 1.5, startAt);

    primary.connect(gainNode);
    harmonic.connect(gainNode);
    gainNode.connect(ctx.destination);

    gainNode.gain.setValueAtTime(0, startAt);
    gainNode.gain.linearRampToValueAtTime(options.volume, startAt + 0.02);
    gainNode.gain.setValueAtTime(options.volume, Math.max(startAt + 0.02, stopAt - 0.04));
    gainNode.gain.linearRampToValueAtTime(0, stopAt);

    primary.start(startAt);
    harmonic.start(startAt);
    primary.stop(stopAt + 0.03);
    harmonic.stop(stopAt + 0.03);
}

export async function playNotificationTone(kind: NotificationSoundKind, volumePercent = 55) {
    const ctx = getAudioContext();
    if (!ctx) return;

    const masterVolume = Math.max(0, Math.min(100, volumePercent)) / 100;
    const base = 0.04 + masterVolume * 0.18;

    if (kind === "mention") {
        scheduleSoftTone(ctx, { startOffset: 0, duration: 0.18, frequency: 740, volume: base });
        scheduleSoftTone(ctx, { startOffset: 0.2, duration: 0.2, frequency: 932, volume: base });
        scheduleSoftTone(ctx, { startOffset: 0.44, duration: 0.24, frequency: 1175, volume: base });
        return;
    }

    if (kind === "other") {
        scheduleSoftTone(ctx, { startOffset: 0, duration: 0.28, frequency: 610, volume: base * 0.95 });
        scheduleSoftTone(ctx, { startOffset: 0.32, duration: 0.22, frequency: 525, volume: base * 0.9 });
        return;
    }

    scheduleSoftTone(ctx, { startOffset: 0, duration: 0.15, frequency: 600, volume: base * 0.85 });
    scheduleSoftTone(ctx, { startOffset: 0.19, duration: 0.19, frequency: 710, volume: base * 0.9 });
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
