"use client";

import { useToastStore, type ToastVariant } from "@/shared/stores/toast-store";
import { playNotificationTone, showSystemNotification } from "@/shared/lib/notifications";
import { startRingtone, type NotificationKind, type RingtoneHandle } from "@/shared/lib/sounds";

/**
 * Central event notifier — every in-app event (message, mention, call, system)
 * funnels through here so toasts, tones, and ringtones all honor the user's
 * Settings → Notifications preferences from one place.
 */

function pref<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw !== null ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

const soundsOn = () => pref("corvus-notif-sounds", true);
const volume = () => pref("corvus-notif-volume", 55);

const SOUND_PREF: Record<NotificationKind, [key: string, fallback: string]> = {
  message: ["corvus-notif-sound-message", "chime"],
  mention: ["corvus-notif-sound-mention", "sparkle"],
  other: ["corvus-notif-sound-other", "soft"],
};

export function notifyEvent({
  kind,
  title,
  body,
  variant = "notification",
  system = false,
}: {
  kind: NotificationKind;
  title: string;
  body: string;
  variant?: ToastVariant;
  /** Also raise an OS-level notification when permission is granted. */
  system?: boolean;
}) {
  useToastStore.getState().addToast({ title, body, variant });
  if (soundsOn()) {
    const [key, fallback] = SOUND_PREF[kind];
    void playNotificationTone(kind, volume(), pref(key, fallback));
  }
  if (system && typeof Notification !== "undefined" && Notification.permission === "granted") {
    void showSystemNotification(title, body);
  }
}

/** Looping incoming ring — stops via the returned handle (accept/decline). */
export function ringIncoming(): RingtoneHandle {
  if (!soundsOn()) return { stop: () => {} };
  return startRingtone({
    direction: "incoming",
    name: pref("corvus-ringtone-incoming", "aurora"),
    volumePercent: pref("corvus-ring-volume", 70),
    maxDurationMs: 45_000,
  });
}

/** Looping outgoing ringback while the call is ringing. */
export function ringOutgoing(): RingtoneHandle {
  if (!soundsOn()) return { stop: () => {} };
  return startRingtone({
    direction: "outgoing",
    name: pref("corvus-ringtone-outgoing", "smooth"),
    volumePercent: pref("corvus-ring-volume", 70),
    maxDurationMs: 45_000,
  });
}
