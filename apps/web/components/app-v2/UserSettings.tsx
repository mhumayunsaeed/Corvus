"use client";

import { useEffect, useRef, useState } from "react";
import { cn, useTheme, type ThemePreference } from "@corvus/ui";
import { Avatar, Input, Toggle } from "@/components/ui";
import { useAuthStore, type User } from "@/stores/auth-store";
import { requestPasswordReset, updateEmail } from "@/lib/auth";
import { playNotificationTone, showSystemNotification } from "@/lib/notifications";
import { NOTIFICATION_SOUNDS, type NotificationKind } from "@/lib/sounds";
import { API_URL } from "@/lib/endpoints";
import { fetchUserSettings, saveUserSettings } from "@/lib/api";

/**
 * User/app settings sections (brief §Settings) — every control here reads and
 * writes real state: the Supabase-backed auth store, the theme provider, the
 * sound engine, media devices, or persisted local preferences.
 */

/* ── Shared bits ────────────────────────────────────────────────────── */

const LABEL = "font-mono text-[12px] uppercase tracking-[0.08em] text-text-secondary";

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <p className={cn(LABEL, "mb-1.5")}>{label}</p>
      {children}
      {hint && <p className="mt-1.5 text-[12px] text-text-muted">{hint}</p>}
    </div>
  );
}

function ToggleRow({
  label,
  hint,
  checked,
  onChange,
}: {
  label: string;
  hint?: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between border-b border-border py-4">
      <div className="pr-6">
        <div className="text-[14px] text-text-primary">{label}</div>
        {hint && <div className="mt-0.5 text-[12px] text-text-muted">{hint}</div>}
      </div>
      <Toggle checked={checked} onChange={onChange} aria-label={label} />
    </div>
  );
}

function SaveButton({
  onClick,
  busy,
  done,
  children = "Save",
}: {
  onClick: () => void;
  busy?: boolean;
  done?: boolean;
  children?: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={busy}
      className={cn(
        "h-9 shrink-0 rounded-md px-4 text-[13px] font-medium transition-colors",
        done
          ? "border border-success/40 text-success"
          : "bg-accent text-on-accent hover:bg-accent-violet-bright",
        busy && "opacity-60"
      )}
    >
      {done ? "Saved" : busy ? "Saving…" : children}
    </button>
  );
}

/** A local preference persisted to localStorage, read once on mount. */
type Widen<T> = T extends boolean ? boolean : T extends number ? number : T extends string ? string : T;

function useLocalPref<T extends string | number | boolean>(key: string, fallback: T) {
  const [value, setValue] = useState<Widen<T>>(fallback as Widen<T>);
  const signedIn = useAuthStore((s) => !!s.user);
  useEffect(() => {
    try {
      const raw = localStorage.getItem(key);
      if (raw !== null) setValue(JSON.parse(raw) as Widen<T>);
    } catch {
      /* unreadable pref — keep fallback */
    }
    if (!signedIn) return;
    fetchUserSettings()
      .then(({ settings }) => {
        const remote = settings[key];
        if (typeof remote === typeof fallback) {
          setValue(remote as Widen<T>);
          localStorage.setItem(key, JSON.stringify(remote));
        }
      })
      .catch(() => {});
  }, [fallback, key, signedIn]);
  const update = (next: Widen<T>) => {
    setValue(next);
    try {
      localStorage.setItem(key, JSON.stringify(next));
    } catch {
      /* storage full/blocked — state still applies for the session */
    }
    if (signedIn) {
      void fetchUserSettings()
        .then(({ settings }) => saveUserSettings({ ...settings, [key]: next }))
        .catch(() => {});
    }
  };
  return [value, update] as const;
}

function SignedOutNote() {
  return (
    <p className="mt-6 rounded-md border border-border bg-surface-raised px-4 py-3 text-[13px] leading-[1.6] text-text-secondary">
      You&apos;re viewing the design preview. Sign in to load and edit your real account.
    </p>
  );
}

/* ── My Account — identity, sign-in & security ──────────────────────── */

const STATUS_OPTIONS: { id: User["status"]; label: string; dot: string }[] = [
  { id: "online", label: "Online", dot: "bg-status-online" },
  { id: "idle", label: "Idle", dot: "bg-status-idle" },
  { id: "dnd", label: "Do not disturb", dot: "bg-status-dnd" },
  { id: "invisible", label: "Invisible", dot: "bg-text-faint" },
];

export function MyAccountSettings() {
  const user = useAuthStore((s) => s.user);
  const setStatus = useAuthStore((s) => s.setStatus);
  const changeUsername = useAuthStore((s) => s.changeUsername);
  const checkUsername = useAuthStore((s) => s.checkUsername);
  const logout = useAuthStore((s) => s.logout);

  const [username, setUsername] = useState(user?.username ?? "");
  const [availability, setAvailability] = useState<null | "checking" | "available" | "taken" | "invalid">(null);
  const [usernameState, setUsernameState] = useState<"idle" | "busy" | "done" | "error">("idle");
  const [usernameError, setUsernameError] = useState("");

  const [email, setEmail] = useState(user?.email ?? "");
  const [emailState, setEmailState] = useState<"idle" | "busy" | "sent" | "error">("idle");

  const [resetState, setResetState] = useState<"idle" | "busy" | "sent">("idle");
  const checkTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (user) {
      setUsername(user.username);
      setEmail(user.email);
    }
  }, [user]);

  if (!user) return <SignedOutNote />;

  // Debounced availability check against the API (mono, inline — no icons).
  const onUsernameInput = (next: string) => {
    setUsername(next);
    setUsernameState("idle");
    setUsernameError("");
    if (checkTimer.current) clearTimeout(checkTimer.current);
    const normalized = next.trim().toLowerCase();
    if (normalized === user.username) {
      setAvailability(null);
      return;
    }
    if (!/^[a-zA-Z0-9_]{3,30}$/.test(normalized)) {
      setAvailability("invalid");
      return;
    }
    setAvailability("checking");
    checkTimer.current = setTimeout(async () => {
      const free = await checkUsername(normalized);
      setAvailability(free === null ? null : free ? "available" : "taken");
    }, 350);
  };

  const saveUsername = async () => {
    setUsernameState("busy");
    try {
      await changeUsername(username);
      setUsernameState("done");
      setAvailability(null);
    } catch (err) {
      setUsernameState("error");
      setUsernameError(err instanceof Error ? err.message : "Could not change username.");
    }
  };

  const saveEmail = async () => {
    setEmailState("busy");
    try {
      await updateEmail(email.trim());
      setEmailState("sent");
    } catch {
      setEmailState("error");
    }
  };

  const sendReset = async () => {
    setResetState("busy");
    try {
      await requestPasswordReset(user.email);
      setResetState("sent");
    } catch {
      setResetState("idle");
    }
  };

  return (
    <div className="mt-6 flex flex-col gap-7">
      {/* Status */}
      <div>
        <p className={cn(LABEL, "mb-2")}>Status</p>
        <div className="flex flex-wrap gap-1.5">
          {STATUS_OPTIONS.map((s) => (
            <button
              key={s.id}
              type="button"
              data-active={user.status === s.id}
              onClick={() => setStatus(s.id)}
              className={cn(
                "flex h-7 items-center gap-2 rounded px-3 font-mono text-[11px] tracking-[0.04em] transition-colors",
                user.status === s.id
                  ? "border border-accent-muted bg-accent-soft text-accent"
                  : "border border-border text-text-secondary hover:border-border-active"
              )}
            >
              <span className={cn("h-1.5 w-1.5 rounded-full", s.dot)} />
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {/* Username */}
      <div>
        <p className={cn(LABEL, "mb-1.5")}>Username</p>
        <div className="flex gap-2">
          <Input value={username} onChange={(e) => onUsernameInput(e.target.value)} />
          {username.trim().toLowerCase() !== user.username && availability === "available" && (
            <SaveButton onClick={saveUsername} busy={usernameState === "busy"} done={usernameState === "done"} />
          )}
        </div>
        <p
          className={cn(
            "mt-1.5 h-4 font-mono text-[11px]",
            availability === "available"
              ? "text-success"
              : availability === "taken" || availability === "invalid" || usernameState === "error"
                ? "text-danger"
                : "text-text-muted"
          )}
        >
          {usernameState === "error"
            ? usernameError
            : availability === "checking"
              ? "checking…"
              : availability === "available"
                ? `@${username.trim().toLowerCase()} is available`
                : availability === "taken"
                  ? `@${username.trim().toLowerCase()} is taken`
                  : availability === "invalid"
                    ? "3–30 characters · letters, numbers, underscores"
                    : `@${user.username}`}
        </p>
      </div>

      {/* Email */}
      <div>
        <p className={cn(LABEL, "mb-1.5")}>Email</p>
        <div className="flex gap-2">
          <Input value={email} type="email" onChange={(e) => { setEmail(e.target.value); setEmailState("idle"); }} />
          {email.trim() !== user.email && (
            <SaveButton onClick={saveEmail} busy={emailState === "busy"} done={emailState === "sent"}>
              Update
            </SaveButton>
          )}
        </div>
        <p className={cn("mt-1.5 h-4 font-mono text-[11px]", emailState === "error" ? "text-danger" : "text-text-muted")}>
          {emailState === "sent"
            ? "verification sent — check both inboxes"
            : emailState === "error"
              ? "could not update email"
              : "used for sign-in and recovery"}
        </p>
      </div>

      {/* Password */}
      <div className="flex items-center justify-between border-y border-border py-4">
        <div className="pr-6">
          <div className="text-[14px] text-text-primary">Password</div>
          <div className="mt-0.5 text-[12px] text-text-muted">
            We&apos;ll email {user.email} a secure reset link.
          </div>
        </div>
        <button
          type="button"
          onClick={sendReset}
          disabled={resetState !== "idle"}
          className={cn(
            "h-8 shrink-0 rounded-md border px-3 text-[13px] transition-colors",
            resetState === "sent"
              ? "border-success/40 text-success"
              : "border-border text-text-secondary hover:border-border-active hover:text-text-primary"
          )}
        >
          {resetState === "sent" ? "Email sent" : resetState === "busy" ? "Sending…" : "Send reset email"}
        </button>
      </div>

      {/* Session */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={logout}
          className="h-9 rounded-md border border-border px-4 text-[13px] text-text-secondary transition-colors hover:border-border-active hover:text-text-primary"
        >
          Sign out
        </button>
        <span className="text-[12px] text-text-muted">
          Account deletion is handled by your instance admin.
        </span>
      </div>
    </div>
  );
}

/* ── Profile — public identity ──────────────────────────────────────── */

export function ProfileSettings() {
  const user = useAuthStore((s) => s.user);
  const updateUser = useAuthStore((s) => s.updateUser);

  const [displayName, setDisplayName] = useState(user?.displayName ?? "");
  const [bio, setBio] = useState(user?.bio ?? "");
  const [avatar, setAvatar] = useState(user?.avatar ?? "");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (user) {
      setDisplayName(user.displayName);
      setBio(user.bio ?? "");
      setAvatar(user.avatar ?? "");
    }
  }, [user]);

  if (!user) return <SignedOutNote />;

  const dirty =
    displayName !== user.displayName || bio !== (user.bio ?? "") || avatar !== (user.avatar ?? "");

  const save = () => {
    updateUser({
      displayName: displayName.trim() || user.displayName,
      bio: bio.trim() || null,
      avatar: avatar.trim() || null,
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  };

  return (
    <div className="mt-6 flex flex-col gap-7">
      {/* Live preview — how others see you */}
      <div>
        <p className={cn(LABEL, "mb-2")}>Preview</p>
        <div className="flex items-start gap-3.5 rounded-[10px] border border-border bg-surface-raised p-4">
          <Avatar src={avatar || null} name={displayName || user.username} size={48} radius={12} />
          <div className="min-w-0 leading-tight">
            <p className="truncate text-[15px] font-semibold text-text-primary">
              {displayName || user.username}
            </p>
            <p className="font-mono text-[11px] text-text-muted">@{user.username}</p>
            {bio && <p className="mt-1.5 text-[13px] leading-[1.5] text-text-secondary">{bio}</p>}
          </div>
        </div>
      </div>

      <Field label="Display name" hint="Shown next to your messages — your username stays the handle.">
        <Input value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
      </Field>

      <Field label="Avatar URL" hint="Square images work best. Leave empty for the letter mark.">
        <Input value={avatar} placeholder="https://…" onChange={(e) => setAvatar(e.target.value)} />
      </Field>

      <Field label="Bio" hint="Up to 190 characters, shown on your profile card.">
        <textarea
          value={bio}
          maxLength={190}
          rows={3}
          onChange={(e) => setBio(e.target.value)}
          className="w-full resize-none rounded-md border border-border bg-surface-input px-3 py-2.5 text-[14px] leading-[1.5] text-text-primary outline-none transition-colors placeholder:text-text-faint focus:border-border-active"
        />
      </Field>

      {dirty && <SaveButton onClick={save} done={saved} />}
    </div>
  );
}

/* ── Privacy ────────────────────────────────────────────────────────── */

export function PrivacySettings() {
  const [readReceipts, setReadReceipts] = useLocalPref("corvus-privacy-read-receipts", true);
  const [typing, setTyping] = useLocalPref("corvus-privacy-typing", true);
  const [presence, setPresence] = useLocalPref("corvus-privacy-presence", true);
  const [dmsFromSpaces, setDmsFromSpaces] = useLocalPref("corvus-privacy-dms", true);

  return (
    <div className="mt-6 flex flex-col">
      <ToggleRow
        label="Send read receipts"
        hint="Let others see when you've read their messages."
        checked={readReceipts}
        onChange={setReadReceipts}
      />
      <ToggleRow
        label="Show typing indicator"
        hint="Others see “typing…” while you compose."
        checked={typing}
        onChange={setTyping}
      />
      <ToggleRow
        label="Share presence"
        hint="Show your online/idle status to friends and space members."
        checked={presence}
        onChange={setPresence}
      />
      <ToggleRow
        label="Allow DMs from space members"
        hint="People who share a space with you can message you directly."
        checked={dmsFromSpaces}
        onChange={setDmsFromSpaces}
      />
    </div>
  );
}

/* ── Notifications ──────────────────────────────────────────────────── */

const KIND_LABEL: Record<NotificationKind, { label: string; hint: string }> = {
  message: { label: "Messages", hint: "New messages in unmuted channels and DMs." },
  mention: { label: "Mentions", hint: "When someone @mentions you." },
  other: { label: "Everything else", hint: "Friend requests, invites, system events." },
};

export function NotificationsSettings() {
  const [permission, setPermission] = useState<NotificationPermission | "unsupported">("default");
  const [soundsOn, setSoundsOn] = useLocalPref("corvus-notif-sounds", true);
  const [volume, setVolume] = useLocalPref("corvus-notif-volume", 55);
  const [messageSound, setMessageSound] = useLocalPref("corvus-notif-sound-message", "chime");
  const [mentionSound, setMentionSound] = useLocalPref("corvus-notif-sound-mention", "sparkle");
  const [otherSound, setOtherSound] = useLocalPref("corvus-notif-sound-other", "soft");

  useEffect(() => {
    setPermission(typeof Notification === "undefined" ? "unsupported" : Notification.permission);
  }, []);

  const soundFor: Record<NotificationKind, [string, (v: string) => void]> = {
    message: [messageSound, setMessageSound],
    mention: [mentionSound, setMentionSound],
    other: [otherSound, setOtherSound],
  };

  return (
    <div className="mt-6 flex flex-col gap-7">
      {/* Desktop notifications */}
      <div className="flex items-center justify-between border-b border-border pb-4">
        <div className="pr-6">
          <div className="text-[14px] text-text-primary">Desktop notifications</div>
          <div className="mt-0.5 font-mono text-[11px] text-text-muted">
            permission: {permission}
          </div>
        </div>
        {permission === "granted" ? (
          <button
            type="button"
            onClick={() => void showSystemNotification("Corvus", "Notifications are working.")}
            className="h-8 rounded-md border border-border px-3 text-[13px] text-text-secondary transition-colors hover:border-border-active hover:text-text-primary"
          >
            Send test
          </button>
        ) : permission === "default" ? (
          <button
            type="button"
            onClick={() => void Notification.requestPermission().then(setPermission)}
            className="h-8 rounded-md bg-accent px-3 text-[13px] font-medium text-on-accent transition-colors hover:bg-accent-violet-bright"
          >
            Enable
          </button>
        ) : (
          <span className="text-[12px] text-text-muted">
            {permission === "denied" ? "Blocked in browser settings" : "Not supported here"}
          </span>
        )}
      </div>

      <ToggleRow
        label="Notification sounds"
        hint="Play a tone with each notification."
        checked={soundsOn}
        onChange={setSoundsOn}
      />

      {soundsOn && (
        <>
          <div>
            <p className={cn(LABEL, "mb-2")}>Volume — {volume}%</p>
            <input
              type="range"
              min={0}
              max={100}
              value={volume}
              onChange={(e) => setVolume(Number(e.target.value))}
              className="w-full max-w-[320px]"
            />
          </div>

          <div>
            <p className={cn(LABEL, "mb-1")}>Tones</p>
            {(Object.keys(KIND_LABEL) as NotificationKind[]).map((kind) => {
              const [value, set] = soundFor[kind];
              return (
                <div key={kind} className="flex items-center justify-between border-b border-border py-3.5">
                  <div className="pr-6">
                    <div className="text-[14px] text-text-primary">{KIND_LABEL[kind].label}</div>
                    <div className="mt-0.5 text-[12px] text-text-muted">{KIND_LABEL[kind].hint}</div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <select
                      value={value}
                      onChange={(e) => set(e.target.value)}
                      className="h-8 rounded-md border border-border bg-surface-input px-2 text-[13px] text-text-primary outline-none transition-colors focus:border-border-active"
                    >
                      {NOTIFICATION_SOUNDS[kind].map((opt) => (
                        <option key={opt.id} value={opt.id}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      aria-label={`Preview ${KIND_LABEL[kind].label} tone`}
                      onClick={() => void playNotificationTone(kind, volume, value)}
                      className="flex h-8 w-8 items-center justify-center rounded-md border border-border font-mono text-[11px] text-text-secondary transition-colors hover:border-border-active hover:text-text-primary"
                    >
                      ▶
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

/* ── Appearance ─────────────────────────────────────────────────────── */

const THEMES: { id: ThemePreference; label: string; hint: string }[] = [
  { id: "system", label: "System", hint: "Follow the OS" },
  { id: "dark", label: "Dark", hint: "Obsidian" },
  { id: "light", label: "Light", hint: "Cool paper" },
];

export function AppearanceSettings() {
  const { theme, setTheme } = useTheme();
  const [compact, setCompact] = useLocalPref("corvus-appearance-compact", false);
  const [reduceMotion, setReduceMotion] = useLocalPref("corvus-appearance-reduce-motion", false);

  return (
    <div className="mt-6 flex flex-col gap-7">
      <div>
        <p className={cn(LABEL, "mb-2")}>Theme</p>
        <div className="grid max-w-[420px] grid-cols-3 gap-2">
          {THEMES.map((t) => (
            <button
              key={t.id}
              type="button"
              data-active={theme === t.id}
              onClick={() => setTheme(t.id)}
              className={cn(
                "rounded-[10px] border px-3 py-3 text-left transition-colors",
                theme === t.id
                  ? "border-accent-muted bg-accent-soft"
                  : "border-border bg-surface-raised hover:border-border-active"
              )}
            >
              <p className={cn("text-[13px] font-medium", theme === t.id ? "text-accent" : "text-text-primary")}>
                {t.label}
              </p>
              <p className="mt-0.5 font-mono text-[10px] text-text-muted">{t.hint}</p>
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-col">
        <ToggleRow
          label="Compact message layout"
          hint="Tighter spacing between messages."
          checked={compact}
          onChange={setCompact}
        />
        <ToggleRow
          label="Reduce motion"
          hint="Minimise non-essential animations (also honors your OS setting)."
          checked={reduceMotion}
          onChange={setReduceMotion}
        />
      </div>
    </div>
  );
}

/* ── Keybindings — the shortcuts that actually exist ─────────────────── */

const BINDINGS: { keys: string; action: string }[] = [
  { keys: "Ctrl F", action: "Search the current space" },
  { keys: "Ctrl Shift R", action: "Record an async clip" },
  { keys: "Enter", action: "Send message" },
  { keys: "Shift Enter", action: "New line in the composer" },
  { keys: "@", action: "Mention a member" },
  { keys: "/", action: "Insert a block (docs editor)" },
  { keys: "Esc", action: "Close panel / dialog" },
];

export function KeybindingsSettings() {
  return (
    <div className="mt-6">
      <p className="text-[13px] text-text-secondary">
        Built-in shortcuts. Custom bindings are on the roadmap.
      </p>
      <div className="mt-4 flex flex-col">
        {BINDINGS.map((b) => (
          <div key={b.action} className="flex h-11 items-center justify-between border-b border-border px-1">
            <span className="text-[13px] text-text-primary">{b.action}</span>
            <span className="flex gap-1">
              {b.keys.split(" ").map((k) => (
                <kbd
                  key={k}
                  className="rounded-[4px] border border-border bg-surface-raised px-1.5 py-0.5 font-mono text-[11px] text-text-secondary"
                >
                  {k}
                </kbd>
              ))}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Devices — real media-device enumeration ────────────────────────── */

export function DevicesSettings() {
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [needsPermission, setNeedsPermission] = useState(false);
  const [mic, setMic] = useLocalPref("corvus-device-mic", "default");
  const [speaker, setSpeaker] = useLocalPref("corvus-device-speaker", "default");
  const [camera, setCamera] = useLocalPref("corvus-device-camera", "default");

  const refresh = async () => {
    if (!navigator.mediaDevices?.enumerateDevices) return;
    const list = await navigator.mediaDevices.enumerateDevices();
    setDevices(list);
    // Without permission, labels come back empty.
    setNeedsPermission(list.some((d) => d.kind === "audioinput") && list.every((d) => !d.label));
  };

  useEffect(() => {
    void refresh();
  }, []);

  const requestAccess = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: true });
      stream.getTracks().forEach((t) => t.stop());
    } catch {
      /* declined — keep generic labels */
    }
    void refresh();
  };

  const pick = (kind: MediaDeviceKind, value: string, set: (v: string) => void) => {
    const options = devices.filter((d) => d.kind === kind);
    return (
      <select
        value={value}
        onChange={(e) => set(e.target.value)}
        className="h-9 w-full max-w-[360px] rounded-md border border-border bg-surface-input px-2 text-[13px] text-text-primary outline-none transition-colors focus:border-border-active"
      >
        <option value="default">System default</option>
        {options.map((d, i) => (
          <option key={d.deviceId || i} value={d.deviceId}>
            {d.label || `${d.kind} ${i + 1}`}
          </option>
        ))}
      </select>
    );
  };

  return (
    <div className="mt-6 flex flex-col gap-6">
      {needsPermission && (
        <div className="flex items-center justify-between rounded-md border border-border bg-surface-raised px-4 py-3">
          <span className="text-[13px] text-text-secondary">
            Allow microphone/camera access to see device names.
          </span>
          <button
            type="button"
            onClick={() => void requestAccess()}
            className="h-8 shrink-0 rounded-md bg-accent px-3 text-[13px] font-medium text-on-accent transition-colors hover:bg-accent-violet-bright"
          >
            Allow
          </button>
        </div>
      )}
      <Field label="Microphone">{pick("audioinput", mic, setMic)}</Field>
      <Field label="Speakers">{pick("audiooutput", speaker, setSpeaker)}</Field>
      <Field label="Camera">{pick("videoinput", camera, setCamera)}</Field>
      <p className="text-[12px] text-text-muted">
        Selections apply to new calls and voice channels.
      </p>
    </div>
  );
}

/* ── Advanced ───────────────────────────────────────────────────────── */

export function AdvancedSettings() {
  const [copied, setCopied] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);

  const diagnostics = () =>
    [
      `corvus web`,
      `api: ${API_URL || "(not configured)"}`,
      `ua: ${navigator.userAgent}`,
      `theme: ${document.documentElement.getAttribute("data-theme")}`,
      `viewport: ${window.innerWidth}×${window.innerHeight}`,
    ].join("\n");

  return (
    <div className="mt-6 flex flex-col gap-6">
      <Field label="API endpoint" hint="Set via NEXT_PUBLIC_API_URL at build time.">
        <code className="block truncate rounded-md border border-border bg-surface-raised px-3 py-2.5 font-mono text-[12px] text-text-secondary">
          {API_URL || "not configured"}
        </code>
      </Field>

      <div className="flex items-center justify-between border-y border-border py-4">
        <div className="pr-6">
          <div className="text-[14px] text-text-primary">Diagnostics</div>
          <div className="mt-0.5 text-[12px] text-text-muted">
            Environment details for bug reports — no message content included.
          </div>
        </div>
        <button
          type="button"
          onClick={() => {
            void navigator.clipboard?.writeText(diagnostics());
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
          }}
          className={cn(
            "h-8 shrink-0 rounded-md border px-3 text-[13px] transition-colors",
            copied
              ? "border-success/40 text-success"
              : "border-border text-text-secondary hover:border-border-active hover:text-text-primary"
          )}
        >
          {copied ? "Copied" : "Copy"}
        </button>
      </div>

      <div className="flex items-center justify-between pb-2">
        <div className="pr-6">
          <div className="text-[14px] text-text-primary">Clear local data</div>
          <div className="mt-0.5 text-[12px] text-text-muted">
            Resets cached preferences and signs you out on this device. Server data is untouched.
          </div>
        </div>
        {confirmClear ? (
          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              onClick={() => {
                localStorage.clear();
                location.reload();
              }}
              className="h-8 rounded-md border border-danger/40 px-3 text-[13px] font-medium text-danger transition-colors hover:bg-danger/10"
            >
              Confirm
            </button>
            <button
              type="button"
              onClick={() => setConfirmClear(false)}
              className="h-8 rounded-md border border-border px-3 text-[13px] text-text-secondary transition-colors hover:text-text-primary"
            >
              Cancel
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setConfirmClear(true)}
            className="h-8 shrink-0 rounded-md border border-danger/40 px-3 text-[13px] text-danger transition-colors hover:bg-danger/10"
          >
            Clear…
          </button>
        )}
      </div>
    </div>
  );
}
