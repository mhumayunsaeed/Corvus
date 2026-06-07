"use client";

import { useState, useEffect, useRef } from "react";
import { X, LogOut, Pencil, Upload, Bell, MessageSquare, AtSign, AppWindow, Volume2, Sparkles, Monitor, Play, PhoneIncoming, PhoneOutgoing } from "lucide-react";
import { useTheme, type ThemePreference } from "@corvus/ui";
import { setFeatureFlag, useNewShell } from "@/lib/flags";
import { notifyError, notifyInfo, notifySuccess } from "@/lib/notify";
import { updateEmail } from "@/lib/auth";
import { useAuthStore } from "@/stores/auth-store";
import { useNotificationStore } from "@/stores/notification-store";
import { useVoiceStore } from "@/stores/voice-store";
import { playNotificationTone } from "@/lib/notifications";
import {
    NOTIFICATION_SOUNDS,
    INCOMING_RINGTONES,
    OUTGOING_RINGTONES,
    previewRingtone,
} from "@/lib/sounds";
import { uploadImage } from "@/lib/api";
import { UserAvatar } from "./UserAvatar";

interface UserSettingsModalProps {
    open: boolean;
    onClose: () => void;
}

type Tab = "My Account" | "Profiles" | "Appearance" | "Notifications" | "Voice & Video";

function NoiseSuppressionSection() {
    const noiseSuppression = useVoiceStore((s) => s.noiseSuppression);
    const setNoiseSuppression = useVoiceStore((s) => s.setNoiseSuppression);

    return (
        <div className="pt-6 border-t border-border">
            <h3 className="text-xs font-bold text-text-muted uppercase tracking-wider mb-4">Audio Processing</h3>
            <label className="flex items-center gap-3 cursor-pointer" onClick={() => setNoiseSuppression(!noiseSuppression)}>
                <div
                    role="switch"
                    aria-checked={noiseSuppression}
                    className={`relative w-11 h-6 rounded-full transition-colors flex-shrink-0 ${noiseSuppression ? "bg-accent-violet" : "bg-surface-raised"}`}
                >
                    <div className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white transition-transform ${noiseSuppression ? "translate-x-5" : "translate-x-0"}`} />
                </div>
                <div>
                    <span className="text-body text-text-primary block">Noise Suppression</span>
                    <span className="text-xs text-text-muted">Reduces background noise using RNNoise</span>
                </div>
            </label>
        </div>
    );
}

/** Labelled sound chooser: a styled select plus a preview button. */
function SoundPicker({
    label,
    icon,
    value,
    options,
    onChange,
    onPreview,
}: {
    label: string;
    icon: React.ReactNode;
    value: string;
    options: { id: string; label: string }[];
    onChange: (id: string) => void;
    onPreview: () => void;
}) {
    return (
        <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-0">
                <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-surface-raised text-text-muted">
                    {icon}
                </span>
                <span className="text-body text-text-primary truncate">{label}</span>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
                <div className="relative">
                    <select
                        value={value}
                        onChange={(e) => onChange(e.target.value)}
                        className="h-9 pl-3 pr-8 bg-surface-raised border border-border rounded-lg text-micro text-text-primary outline-none focus:border-accent-violet cursor-pointer appearance-none"
                    >
                        {options.map((opt) => (
                            <option key={opt.id} value={opt.id}>{opt.label}</option>
                        ))}
                    </select>
                    <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-text-muted text-[10px]">▾</span>
                </div>
                <button
                    onClick={onPreview}
                    className="h-9 w-9 flex items-center justify-center rounded-lg bg-surface-raised border border-border text-text-secondary hover:text-accent-violet hover:border-accent-violet/40 transition-colors"
                    title={`Preview ${label}`}
                >
                    <Play className="w-3.5 h-3.5" />
                </button>
            </div>
        </div>
    );
}

export function UserSettingsModal({ open, onClose }: UserSettingsModalProps) {
    const { user, logout, updateUser, changeUsername } = useAuthStore();
    const [activeTab, setActiveTab] = useState<Tab>("My Account");
    const { theme, resolvedTheme, setTheme } = useTheme();
    const newShell = useNewShell();

    // Form states
    const [displayName, setDisplayName] = useState("");
    const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
    const [audioInputId, setAudioInputId] = useState("default");
    const [audioOutputId, setAudioOutputId] = useState("default");
    const pttEnabled = useVoiceStore((s) => s.pttEnabled);
    const setPttEnabled = useVoiceStore((s) => s.setPttEnabled);
    const pttShortcut = useVoiceStore((s) => s.pttShortcut);
    const setPttShortcut = useVoiceStore((s) => s.setPttShortcut);
    const pttMode = useVoiceStore((s) => s.pttMode);
    const setPttMode = useVoiceStore((s) => s.setPttMode);
    const [recordingShortcut, setRecordingShortcut] = useState(false);
    const notificationPrefs = useNotificationStore((s) => s.preferences);
    const setNotificationPreference = useNotificationStore((s) => s.setPreference);

    const [isHoveringAvatar, setIsHoveringAvatar] = useState(false);
    const [usernameDraft, setUsernameDraft] = useState<string | null>(null);
    const [savingUsername, setSavingUsername] = useState(false);
    const [emailDraft, setEmailDraft] = useState<string | null>(null);
    const [savingEmail, setSavingEmail] = useState(false);

    const handleSaveUsername = async () => {
        if (usernameDraft === null) return;
        setSavingUsername(true);
        try {
            await changeUsername(usernameDraft);
            notifySuccess("Username updated.");
            setUsernameDraft(null);
        } catch (err) {
            notifyError(err instanceof Error ? err.message : "Couldn't update username.");
        } finally {
            setSavingUsername(false);
        }
    };

    const handleSaveEmail = async () => {
        if (emailDraft === null) return;
        setSavingEmail(true);
        try {
            await updateEmail(emailDraft);
            notifyInfo("Check your new inbox to confirm the email change.");
            setEmailDraft(null);
        } catch (err) {
            notifyError(err instanceof Error ? err.message : "Couldn't update email.");
        } finally {
            setSavingEmail(false);
        }
    };
    const avatarInputRef = useRef<HTMLInputElement>(null);

    // Initial load
    useEffect(() => {
        if (open) {
            setDisplayName(user?.displayName || "");

            // Sync media devices
            if (navigator?.mediaDevices?.enumerateDevices) {
                navigator.mediaDevices.enumerateDevices().then(setDevices).catch(console.error);
            }
        }
    }, [open, user?.displayName]);

    if (!open) return null;

    const avatarUrl = user?.avatar;

    const handleLogout = () => {
        onClose();
        logout();
        window.location.href = "/login";
    };

    const handleUpdateProfile = () => {
        if (displayName && displayName !== user?.displayName) {
            updateUser({ displayName });
        }
    };

    const handleChangeAvatar = () => {
        avatarInputRef.current?.click();
    };

    const handleAvatarFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Validate file type and size
        if (!file.type.startsWith("image/")) {
            notifyError("Please select an image file.");
            return;
        }
        if (file.size > 5 * 1024 * 1024) {
            notifyError("Image must be under 5MB.");
            return;
        }

        // Resize and compress the image
        const reader = new FileReader();
        reader.onload = (event) => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement("canvas");
                const maxSize = 256;
                let w = img.width;
                let h = img.height;

                if (w > maxSize || h > maxSize) {
                    if (w > h) {
                        h = Math.round((h * maxSize) / w);
                        w = maxSize;
                    } else {
                        w = Math.round((w * maxSize) / h);
                        h = maxSize;
                    }
                }

                canvas.width = w;
                canvas.height = h;
                const ctx = canvas.getContext("2d")!;
                ctx.drawImage(img, 0, 0, w, h);

                // Upload the resized image to Supabase Storage and store its URL.
                canvas.toBlob(
                    async (blob) => {
                        if (!blob) return;
                        try {
                            const url = await uploadImage(blob, "avatar");
                            updateUser({ avatar: url });
                        } catch (err) {
                            notifyError(err instanceof Error ? err.message : "Failed to upload avatar.");
                        }
                    },
                    "image/webp",
                    0.85
                );
            };
            img.src = event.target?.result as string;
        };
        reader.readAsDataURL(file);

        // Reset input so same file can be selected again
        e.target.value = "";
    };

    const handleRemoveAvatar = () => {
        if (window.confirm("Are you sure you want to remove your avatar?")) {
            updateUser({ avatar: null });
        }
    };

    const handleThemeChange = (newTheme: ThemePreference) => {
        setTheme(newTheme);
    };

    const audioInputs = devices.filter(d => d.kind === "audioinput");
    const audioOutputs = devices.filter(d => d.kind === "audiooutput");

    const playPreviewTone = (kind: "message" | "mention" | "other") => {
        const name =
            kind === "message" ? notificationPrefs.messageSound
                : kind === "mention" ? notificationPrefs.mentionSound
                    : notificationPrefs.otherSound;
        playNotificationTone(kind, notificationPrefs.soundVolume, name).catch(() => {
            // Ignore playback errors from restricted autoplay contexts.
        });
    };

    const requestDesktopNotificationPermission = async () => {
        if (typeof window === "undefined") return;

        if ("__TAURI_INTERNALS__" in window) {
            try {
                const { isPermissionGranted, requestPermission } = await import("@tauri-apps/plugin-notification");
                const granted = await isPermissionGranted();
                if (!granted) {
                    await requestPermission();
                }
            } catch (err) {
                console.error("Failed to request desktop notification permission:", err);
            }
            return;
        }

        if ("Notification" in window && Notification.permission === "default") {
            await Notification.requestPermission().catch(() => {
                // Ignore browser permission prompt failures.
            });
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex bg-background">
            {/* Hidden file input for avatar */}
            <input
                ref={avatarInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleAvatarFileChange}
            />

            {/* Sidebar */}
            <div className="w-[30%] max-w-[280px] min-w-[218px] bg-surface flex justify-end">
                <div className="w-full max-w-[218px] py-14 pr-4 pl-4 space-y-5">
                    <div>
                        <div className="px-2 pb-1.5 text-xs font-bold text-text-muted uppercase tracking-wider">
                            User Settings
                        </div>
                        <button
                            onClick={() => setActiveTab("My Account")}
                            className={`w-full text-left px-3 py-2 rounded-md transition-colors text-body ${activeTab === "My Account"
                                ? "bg-surface-raised text-text-primary font-medium"
                                : "text-text-muted hover:bg-hover-row hover:text-text-primary"
                                }`}
                        >
                            My Account
                        </button>
                        <button
                            onClick={() => setActiveTab("Profiles")}
                            className={`w-full text-left px-3 py-2 rounded-md transition-colors text-body ${activeTab === "Profiles"
                                ? "bg-surface-raised text-text-primary font-medium"
                                : "text-text-muted hover:bg-hover-row hover:text-text-primary"
                                }`}
                        >
                            Profiles
                        </button>
                    </div>

                    <div className="w-full h-[1px] bg-border px-2" />

                    <div>
                        <div className="px-2 pb-1.5 text-xs font-bold text-text-muted uppercase tracking-wider">
                            App Settings
                        </div>
                        <button
                            onClick={() => setActiveTab("Appearance")}
                            className={`w-full text-left px-3 py-2 rounded-md transition-colors text-body ${activeTab === "Appearance"
                                ? "bg-surface-raised text-text-primary font-medium"
                                : "text-text-muted hover:bg-hover-row hover:text-text-primary"
                                }`}
                        >
                            Appearance
                        </button>
                        <button
                            onClick={() => setActiveTab("Notifications")}
                            className={`w-full text-left px-3 py-2 rounded-md transition-colors text-body ${activeTab === "Notifications"
                                ? "bg-surface-raised text-text-primary font-medium"
                                : "text-text-muted hover:bg-hover-row hover:text-text-primary"
                                }`}
                        >
                            Notifications
                        </button>
                        <button
                            onClick={() => setActiveTab("Voice & Video")}
                            className={`w-full text-left px-3 py-2 rounded-md transition-colors text-body ${activeTab === "Voice & Video"
                                ? "bg-surface-raised text-text-primary font-medium"
                                : "text-text-muted hover:bg-hover-row hover:text-text-primary"
                                }`}
                        >
                            Voice & Video
                        </button>
                    </div>

                    <div className="w-full h-[1px] bg-border px-2" />

                    <div>
                        <button
                            onClick={handleLogout}
                            className="w-full flex items-center justify-between text-left px-3 py-2 rounded-md transition-colors text-body text-danger hover:bg-danger/10"
                        >
                            Log Out
                            <LogOut className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            </div>

            {/* Content area */}
            <div className="flex-1 bg-background relative overflow-y-auto pt-14 px-10 pb-20">
                <div className="max-w-[740px]">
                    {activeTab === "My Account" && (
                        <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                            <h2 className="text-xl font-bold text-text-primary mb-6">My Account</h2>

                            {/* Profile Banner / Card */}
                            <div className="bg-surface border border-border rounded-xl mt-6 overflow-hidden">
                                <div className="h-24 bg-accent-violet/30" />
                                <div className="px-5 pb-6">
                                    <div className="flex justify-between items-start -mt-10 mb-4">
                                        <div
                                            className="relative rounded-full border-[6px] border-surface cursor-pointer ring-0"
                                            onMouseEnter={() => setIsHoveringAvatar(true)}
                                            onMouseLeave={() => setIsHoveringAvatar(false)}
                                            onClick={handleChangeAvatar}
                                        >
                                            <UserAvatar
                                                avatarUrl={avatarUrl}
                                                username={user?.username || "user"}
                                                className="w-20 h-20"
                                            />
                                            {isHoveringAvatar && (
                                                <div className="absolute inset-0 bg-black/60 rounded-full flex flex-col items-center justify-center animate-in fade-in duration-100">
                                                    <Pencil className="w-5 h-5 text-white mb-1" />
                                                    <span className="text-[10px] font-bold text-white uppercase tracking-wider">Change</span>
                                                </div>
                                            )}
                                            <div className="absolute bottom-0 right-0 w-5 h-5 bg-success rounded-full border-4 border-surface" />
                                        </div>
                                        <div className="mt-12">
                                            <button onClick={() => setActiveTab("Profiles")} className="px-4 py-1.5 bg-accent-violet text-white text-sm font-medium rounded-md hover:bg-accent-violet/90 transition-colors">
                                                Edit User Profile
                                            </button>
                                        </div>
                                    </div>

                                    <div className="bg-surface-raised rounded-lg p-4 space-y-4 border border-border mt-2">
                                        <div className="flex justify-between items-center">
                                            <div>
                                                <p className="text-micro font-bold text-text-muted uppercase tracking-wider mb-1">Display Name</p>
                                                <p className="text-body text-text-primary">{user?.displayName}</p>
                                            </div>
                                            <button onClick={() => setActiveTab("Profiles")} className="px-4 py-1.5 bg-surface border border-border hover:bg-hover-row text-text-primary text-sm font-medium rounded-md transition-colors">
                                                Edit
                                            </button>
                                        </div>
                                        <div className="flex justify-between items-center gap-3">
                                            <div className="min-w-0 flex-1">
                                                <p className="text-micro font-bold text-text-muted uppercase tracking-wider mb-1">Username</p>
                                                {usernameDraft === null ? (
                                                    <p className="text-body text-text-primary">@{user?.username}</p>
                                                ) : (
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-text-muted">@</span>
                                                        <input
                                                            autoFocus
                                                            value={usernameDraft}
                                                            onChange={(e) => setUsernameDraft(e.target.value)}
                                                            onKeyDown={(e) => {
                                                                if (e.key === "Enter") handleSaveUsername();
                                                                if (e.key === "Escape") setUsernameDraft(null);
                                                            }}
                                                            className="flex-1 px-2.5 py-1.5 bg-surface border border-border rounded-md text-text-primary text-sm outline-none focus:border-accent-violet"
                                                            placeholder="new_username"
                                                        />
                                                    </div>
                                                )}
                                            </div>
                                            {usernameDraft === null ? (
                                                <button onClick={() => setUsernameDraft(user?.username || "")} className="px-4 py-1.5 bg-surface border border-border hover:bg-hover-row text-text-primary text-sm font-medium rounded-md transition-colors flex-shrink-0">
                                                    Edit
                                                </button>
                                            ) : (
                                                <div className="flex items-center gap-1.5 flex-shrink-0">
                                                    <button onClick={handleSaveUsername} disabled={savingUsername} className="px-4 py-1.5 bg-accent-violet text-white text-sm font-medium rounded-md hover:bg-accent-violet/90 transition-colors disabled:opacity-50">
                                                        {savingUsername ? "Saving…" : "Save"}
                                                    </button>
                                                    <button onClick={() => setUsernameDraft(null)} className="px-3 py-1.5 text-text-muted hover:text-text-primary text-sm rounded-md transition-colors">
                                                        Cancel
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                        <div className="flex justify-between items-center gap-3">
                                            <div className="min-w-0 flex-1">
                                                <p className="text-micro font-bold text-text-muted uppercase tracking-wider mb-1">Email</p>
                                                {emailDraft === null ? (
                                                    <p className="text-body text-text-primary truncate">{user?.email}</p>
                                                ) : (
                                                    <input
                                                        autoFocus
                                                        type="email"
                                                        value={emailDraft}
                                                        onChange={(e) => setEmailDraft(e.target.value)}
                                                        onKeyDown={(e) => {
                                                            if (e.key === "Enter") handleSaveEmail();
                                                            if (e.key === "Escape") setEmailDraft(null);
                                                        }}
                                                        className="w-full px-2.5 py-1.5 bg-surface border border-border rounded-md text-text-primary text-sm outline-none focus:border-accent-violet"
                                                        placeholder="you@example.com"
                                                    />
                                                )}
                                            </div>
                                            {emailDraft === null ? (
                                                <button onClick={() => setEmailDraft(user?.email || "")} className="px-4 py-1.5 bg-surface border border-border hover:bg-hover-row text-text-primary text-sm font-medium rounded-md transition-colors flex-shrink-0">
                                                    Edit
                                                </button>
                                            ) : (
                                                <div className="flex items-center gap-1.5 flex-shrink-0">
                                                    <button onClick={handleSaveEmail} disabled={savingEmail} className="px-4 py-1.5 bg-accent-violet text-white text-sm font-medium rounded-md hover:bg-accent-violet/90 transition-colors disabled:opacity-50">
                                                        {savingEmail ? "Saving…" : "Save"}
                                                    </button>
                                                    <button onClick={() => setEmailDraft(null)} className="px-3 py-1.5 text-text-muted hover:text-text-primary text-sm rounded-md transition-colors">
                                                        Cancel
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === "Profiles" && (
                        <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                            <h2 className="text-xl font-bold text-text-primary mb-6">Profiles</h2>
                            <div className="flex gap-10">
                                <div className="flex-1 space-y-6">
                                    <div className="space-y-2">
                                        <label className="text-xs font-bold text-text-muted uppercase tracking-wider">Display Name</label>
                                        <input
                                            type="text"
                                            value={displayName}
                                            onChange={(e) => setDisplayName(e.target.value)}
                                            onBlur={handleUpdateProfile}
                                            className="w-full h-10 px-3 bg-surface border border-border rounded-md text-text-primary outline-none focus:border-accent-violet"
                                        />
                                    </div>
                                    <div className="space-y-2 border-t border-border pt-6">
                                        <label className="text-xs font-bold text-text-muted uppercase tracking-wider">Avatar</label>
                                        <div className="flex items-center gap-4">
                                            <div className="relative group cursor-pointer" onClick={handleChangeAvatar}>
                                                <UserAvatar
                                                    avatarUrl={avatarUrl}
                                                    username={user?.username || "user"}
                                                    className="w-20 h-20 object-cover"
                                                />
                                                <div className="absolute inset-0 bg-black/60 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <Upload className="w-6 h-6 text-white" />
                                                </div>
                                            </div>
                                            <div className="flex flex-col gap-2">
                                                <button onClick={handleChangeAvatar} className="px-4 py-2 bg-accent-violet text-white text-sm font-medium rounded-md hover:bg-accent-violet/90 transition-colors">
                                                    Upload Image
                                                </button>
                                                <button onClick={handleRemoveAvatar} className="px-4 py-2 font-medium text-sm text-text-muted hover:text-danger transition-colors">
                                                    Remove Avatar
                                                </button>
                                            </div>
                                        </div>
                                        <p className="text-micro text-text-muted">Recommended: 256x256px. Max 5MB.</p>
                                    </div>
                                </div>

                                <div className="w-[300px]">
                                    <div className="text-xs font-bold text-text-muted uppercase tracking-wider mb-2">Preview</div>
                                    <div className="bg-surface rounded-xl overflow-hidden border border-border shadow-lg">
                                        <div className="h-20 bg-accent-violet/30" />
                                        <div className="px-4 pb-4">
                                            <UserAvatar
                                                avatarUrl={avatarUrl}
                                                username={user?.username || "user"}
                                                className="w-16 h-16 border-4 border-surface -mt-8 relative z-10 object-cover"
                                            />
                                            <div className="mt-2 bg-surface-raised p-2 rounded-lg border border-border">
                                                <div className="font-bold text-text-primary">{displayName || user?.displayName}</div>
                                                <div className="text-xs text-text-muted">@{user?.username}</div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === "Appearance" && (
                        <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                            <h2 className="text-xl font-bold text-text-primary mb-6">Appearance</h2>
                            <div className="space-y-6">
                                <div>
                                    <h3 className="text-sm font-bold text-text-muted uppercase tracking-wider mb-4">Theme</h3>
                                    <div className="grid grid-cols-3 gap-4">
                                        {([
                                            {
                                                value: "light" as const,
                                                label: "Light",
                                                top: "#E9EBF1",
                                                bar: "#FFFFFF",
                                                base: "#F4F5F9",
                                                text: "#14151F",
                                            },
                                            {
                                                value: "dark" as const,
                                                label: "Dark",
                                                top: "#171821",
                                                bar: "#111219",
                                                base: "#0A0B11",
                                                text: "#ECEDF5",
                                            },
                                        ]).map((opt) => {
                                            const selected = theme === opt.value;
                                            return (
                                                <label
                                                    key={opt.value}
                                                    className={`group relative border-2 cursor-pointer rounded-lg overflow-hidden transition-colors ${selected ? "border-accent-violet" : "border-border hover:border-text-muted"}`}
                                                    onClick={() => handleThemeChange(opt.value)}
                                                >
                                                    <div className="h-24 p-3 text-left" style={{ background: opt.top }}>
                                                        <div className="w-2/3 h-2 rounded-full mb-2" style={{ background: opt.bar }} />
                                                        <div className="w-1/2 h-2 rounded-full" style={{ background: opt.bar }} />
                                                    </div>
                                                    <div className="p-3 flex items-center justify-between" style={{ background: opt.base }}>
                                                        <span className="text-sm font-medium" style={{ color: opt.text }}>{opt.label}</span>
                                                        <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${selected ? "border-[4px] border-accent-violet bg-white" : "border-border-active"}`} />
                                                    </div>
                                                </label>
                                            );
                                        })}

                                        <label
                                            className={`group relative border-2 cursor-pointer rounded-lg overflow-hidden transition-colors ${theme === "system" ? "border-accent-violet" : "border-border hover:border-text-muted"}`}
                                            onClick={() => handleThemeChange("system")}
                                        >
                                            <div className="h-24 flex">
                                                <div className="w-1/2 p-3" style={{ background: "#F4F5F9" }}>
                                                    <div className="w-2/3 h-2 rounded-full" style={{ background: "#FFFFFF" }} />
                                                </div>
                                                <div className="w-1/2 p-3" style={{ background: "#0A0B11" }}>
                                                    <div className="w-2/3 h-2 rounded-full ml-auto" style={{ background: "#171821" }} />
                                                </div>
                                            </div>
                                            <div className="p-3 bg-surface flex items-center justify-between">
                                                <span className="text-sm font-medium text-text-primary flex items-center gap-1.5">
                                                    <Monitor className="w-3.5 h-3.5" /> System
                                                </span>
                                                <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${theme === "system" ? "border-[4px] border-accent-violet bg-white" : "border-border-active"}`} />
                                            </div>
                                        </label>
                                    </div>
                                    <p className="text-xs text-text-muted mt-3">
                                        Currently showing the <span className="text-text-secondary font-medium">{resolvedTheme}</span> theme.
                                    </p>
                                </div>

                                <div>
                                    <h3 className="text-sm font-bold text-text-muted uppercase tracking-wider mb-4">Layout</h3>
                                    <button
                                        type="button"
                                        onClick={() => setFeatureFlag("newShell", !newShell)}
                                        className="w-full flex items-center gap-4 rounded-xl border border-border bg-surface p-4 text-left transition-colors hover:border-border-highlight"
                                    >
                                        <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-accent/15 text-accent">
                                            <Sparkles className="h-5 w-5" />
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <div className="text-sm font-semibold text-text-primary">New layout (beta)</div>
                                            <div className="text-xs text-text-muted">
                                                Unified sidebar, activity hub, and a ⌘K command palette. Toggle anytime.
                                            </div>
                                        </div>
                                        <div className={`relative h-6 w-11 flex-shrink-0 rounded-full transition-colors ${newShell ? "bg-accent" : "bg-surface-raised border border-border-highlight"}`}>
                                            <div className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${newShell ? "translate-x-[22px]" : "translate-x-0.5"}`} />
                                        </div>
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === "Notifications" && (
                        <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                            <h2 className="text-xl font-bold text-text-primary mb-6">Notifications</h2>
                            <div className="space-y-6">
                                <div className="bg-surface border border-border rounded-xl p-5 space-y-4">
                                    <div className="flex items-center gap-2">
                                        <Bell className="w-4 h-4 text-accent-violet" />
                                        <h3 className="text-sm font-bold text-text-primary">Desktop Alerts</h3>
                                    </div>

                                    <div className="flex items-center justify-between gap-4">
                                        <div>
                                            <p className="text-body text-text-primary">Enable desktop notifications</p>
                                            <p className="text-micro text-text-muted">
                                                Show native notification popups for new activity.
                                            </p>
                                        </div>
                                        <button
                                            onClick={() =>
                                                setNotificationPreference(
                                                    "enableDesktopNotifications",
                                                    !notificationPrefs.enableDesktopNotifications
                                                )
                                            }
                                            className={`w-11 h-6 rounded-full transition-colors p-0.5 ${notificationPrefs.enableDesktopNotifications ? "bg-accent-violet" : "bg-surface-raised border border-border"}`}
                                        >
                                            <span
                                                className={`block w-5 h-5 rounded-full bg-white transition-transform ${notificationPrefs.enableDesktopNotifications ? "translate-x-5" : "translate-x-0"}`}
                                            />
                                        </button>
                                    </div>

                                    <div className="flex items-center justify-between gap-4">
                                        <div>
                                            <p className="text-body text-text-primary">Show alerts while app is focused</p>
                                            <p className="text-micro text-text-muted">
                                                Keep popups on even when you are already looking at Corvus.
                                            </p>
                                        </div>
                                        <button
                                            onClick={() =>
                                                setNotificationPreference(
                                                    "showDesktopWhenFocused",
                                                    !notificationPrefs.showDesktopWhenFocused
                                                )
                                            }
                                            className={`w-11 h-6 rounded-full transition-colors p-0.5 ${notificationPrefs.showDesktopWhenFocused ? "bg-accent-violet" : "bg-surface-raised border border-border"}`}
                                        >
                                            <span
                                                className={`block w-5 h-5 rounded-full bg-white transition-transform ${notificationPrefs.showDesktopWhenFocused ? "translate-x-5" : "translate-x-0"}`}
                                            />
                                        </button>
                                    </div>

                                    <button
                                        onClick={requestDesktopNotificationPermission}
                                        className="px-3 py-2 bg-surface-raised border border-border rounded-md text-sm text-text-primary hover:bg-hover-row transition-colors"
                                    >
                                        Request Notification Permission
                                    </button>
                                </div>

                                <div className="bg-surface border border-border rounded-xl p-5 space-y-4">
                                    <div className="flex items-center gap-2">
                                        <MessageSquare className="w-4 h-4 text-accent-violet" />
                                        <h3 className="text-sm font-bold text-text-primary">Event Types</h3>
                                    </div>

                                    <div className="flex items-center justify-between gap-4">
                                        <div>
                                            <p className="text-body text-text-primary">Messages received</p>
                                            <p className="text-micro text-text-muted">
                                                Notify for channel and DM messages from other people.
                                            </p>
                                        </div>
                                        <button
                                            onClick={() =>
                                                setNotificationPreference(
                                                    "enableMessageNotifications",
                                                    !notificationPrefs.enableMessageNotifications
                                                )
                                            }
                                            className={`w-11 h-6 rounded-full transition-colors p-0.5 ${notificationPrefs.enableMessageNotifications ? "bg-accent-violet" : "bg-surface-raised border border-border"}`}
                                        >
                                            <span
                                                className={`block w-5 h-5 rounded-full bg-white transition-transform ${notificationPrefs.enableMessageNotifications ? "translate-x-5" : "translate-x-0"}`}
                                            />
                                        </button>
                                    </div>

                                    <div className="flex items-center justify-between gap-4">
                                        <div>
                                            <p className="text-body text-text-primary">Mentions and tags</p>
                                            <p className="text-micro text-text-muted">
                                                Highlight @username, @everyone, and @here mentions.
                                            </p>
                                        </div>
                                        <button
                                            onClick={() =>
                                                setNotificationPreference(
                                                    "enableMentionNotifications",
                                                    !notificationPrefs.enableMentionNotifications
                                                )
                                            }
                                            className={`w-11 h-6 rounded-full transition-colors p-0.5 ${notificationPrefs.enableMentionNotifications ? "bg-accent-violet" : "bg-surface-raised border border-border"}`}
                                        >
                                            <span
                                                className={`block w-5 h-5 rounded-full bg-white transition-transform ${notificationPrefs.enableMentionNotifications ? "translate-x-5" : "translate-x-0"}`}
                                            />
                                        </button>
                                    </div>

                                    <div className="flex items-center justify-between gap-4">
                                        <div>
                                            <p className="text-body text-text-primary">Other activity</p>
                                            <p className="text-micro text-text-muted">
                                                Incoming call alerts and other non-message events.
                                            </p>
                                        </div>
                                        <button
                                            onClick={() =>
                                                setNotificationPreference(
                                                    "enableOtherNotifications",
                                                    !notificationPrefs.enableOtherNotifications
                                                )
                                            }
                                            className={`w-11 h-6 rounded-full transition-colors p-0.5 ${notificationPrefs.enableOtherNotifications ? "bg-accent-violet" : "bg-surface-raised border border-border"}`}
                                        >
                                            <span
                                                className={`block w-5 h-5 rounded-full bg-white transition-transform ${notificationPrefs.enableOtherNotifications ? "translate-x-5" : "translate-x-0"}`}
                                            />
                                        </button>
                                    </div>
                                </div>

                                <div className="bg-surface border border-border rounded-xl p-5 space-y-4">
                                    <div className="flex items-center gap-2">
                                        <Volume2 className="w-4 h-4 text-accent-violet" />
                                        <h3 className="text-sm font-bold text-text-primary">Sound</h3>
                                    </div>

                                    <div className="flex items-center justify-between gap-4">
                                        <div>
                                            <p className="text-body text-text-primary">Enable calming sound cues</p>
                                            <p className="text-micro text-text-muted">
                                                Play subtle sounds for messages, mentions, and call alerts.
                                            </p>
                                        </div>
                                        <button
                                            onClick={() =>
                                                setNotificationPreference(
                                                    "enableSound",
                                                    !notificationPrefs.enableSound
                                                )
                                            }
                                            className={`w-11 h-6 rounded-full transition-colors p-0.5 ${notificationPrefs.enableSound ? "bg-accent-violet" : "bg-surface-raised border border-border"}`}
                                        >
                                            <span
                                                className={`block w-5 h-5 rounded-full bg-white transition-transform ${notificationPrefs.enableSound ? "translate-x-5" : "translate-x-0"}`}
                                            />
                                        </button>
                                    </div>

                                    <div className="flex items-center justify-between gap-4">
                                        <div>
                                            <p className="text-body text-text-primary">Play sounds while focused</p>
                                            <p className="text-micro text-text-muted">
                                                Keep sound cues enabled while Corvus is the active window.
                                            </p>
                                        </div>
                                        <button
                                            onClick={() =>
                                                setNotificationPreference(
                                                    "playSoundWhenFocused",
                                                    !notificationPrefs.playSoundWhenFocused
                                                )
                                            }
                                            className={`w-11 h-6 rounded-full transition-colors p-0.5 ${notificationPrefs.playSoundWhenFocused ? "bg-accent-violet" : "bg-surface-raised border border-border"}`}
                                        >
                                            <span
                                                className={`block w-5 h-5 rounded-full bg-white transition-transform ${notificationPrefs.playSoundWhenFocused ? "translate-x-5" : "translate-x-0"}`}
                                            />
                                        </button>
                                    </div>

                                    <div className="space-y-2">
                                        <div className="flex items-center justify-between">
                                            <label className="text-body text-text-primary">Volume</label>
                                            <span className="text-micro text-text-muted">{notificationPrefs.soundVolume}%</span>
                                        </div>
                                        <input
                                            type="range"
                                            min={0}
                                            max={100}
                                            value={notificationPrefs.soundVolume}
                                            onChange={(e) =>
                                                setNotificationPreference("soundVolume", Number(e.target.value))
                                            }
                                            className="w-full accent-accent-violet"
                                        />
                                    </div>

                                    <div className="pt-1 space-y-3 border-t border-border/60">
                                        <p className="text-micro text-text-muted pt-3">
                                            Choose a tone for each kind of alert, then preview it.
                                        </p>
                                        <SoundPicker
                                            label="Message"
                                            icon={<MessageSquare className="w-4 h-4" />}
                                            value={notificationPrefs.messageSound}
                                            options={NOTIFICATION_SOUNDS.message}
                                            onChange={(id) => setNotificationPreference("messageSound", id)}
                                            onPreview={() => playPreviewTone("message")}
                                        />
                                        <SoundPicker
                                            label="Mention"
                                            icon={<AtSign className="w-4 h-4" />}
                                            value={notificationPrefs.mentionSound}
                                            options={NOTIFICATION_SOUNDS.mention}
                                            onChange={(id) => setNotificationPreference("mentionSound", id)}
                                            onPreview={() => playPreviewTone("mention")}
                                        />
                                        <SoundPicker
                                            label="Other"
                                            icon={<Sparkles className="w-4 h-4" />}
                                            value={notificationPrefs.otherSound}
                                            options={NOTIFICATION_SOUNDS.other}
                                            onChange={(id) => setNotificationPreference("otherSound", id)}
                                            onPreview={() => playPreviewTone("other")}
                                        />
                                    </div>
                                </div>

                                <div className="bg-surface border border-border rounded-xl p-5 space-y-4">
                                    <div className="flex items-center gap-2">
                                        <PhoneIncoming className="w-4 h-4 text-accent-violet" />
                                        <h3 className="text-sm font-bold text-text-primary">Call Ringtones</h3>
                                    </div>
                                    <p className="text-micro text-text-muted -mt-1">
                                        Tunes played while a call is connecting or coming in.
                                    </p>

                                    <SoundPicker
                                        label="Incoming call"
                                        icon={<PhoneIncoming className="w-4 h-4" />}
                                        value={notificationPrefs.incomingRingtone}
                                        options={INCOMING_RINGTONES}
                                        onChange={(id) => setNotificationPreference("incomingRingtone", id)}
                                        onPreview={() => previewRingtone("incoming", notificationPrefs.incomingRingtone, notificationPrefs.callVolume)}
                                    />
                                    <SoundPicker
                                        label="Outgoing call"
                                        icon={<PhoneOutgoing className="w-4 h-4" />}
                                        value={notificationPrefs.outgoingRingtone}
                                        options={OUTGOING_RINGTONES}
                                        onChange={(id) => setNotificationPreference("outgoingRingtone", id)}
                                        onPreview={() => previewRingtone("outgoing", notificationPrefs.outgoingRingtone, notificationPrefs.callVolume)}
                                    />

                                    <div className="space-y-2 pt-1">
                                        <div className="flex items-center justify-between">
                                            <label className="text-body text-text-primary">Ringtone volume</label>
                                            <span className="text-micro text-text-muted">{notificationPrefs.callVolume}%</span>
                                        </div>
                                        <input
                                            type="range"
                                            min={0}
                                            max={100}
                                            value={notificationPrefs.callVolume}
                                            onChange={(e) =>
                                                setNotificationPreference("callVolume", Number(e.target.value))
                                            }
                                            className="w-full accent-accent-violet"
                                        />
                                    </div>
                                </div>

                                <div className="bg-surface border border-border rounded-xl p-5 space-y-4">
                                    <div className="flex items-center gap-2">
                                        <AppWindow className="w-4 h-4 text-accent-violet" />
                                        <h3 className="text-sm font-bold text-text-primary">Taskbar Badge</h3>
                                    </div>

                                    <div className="flex items-center justify-between gap-4">
                                        <div>
                                            <p className="text-body text-text-primary">Show unread count on app icon</p>
                                            <p className="text-micro text-text-muted">
                                                Mirrors unread activity on your taskbar icon similar to Discord.
                                            </p>
                                        </div>
                                        <button
                                            onClick={() =>
                                                setNotificationPreference(
                                                    "enableTaskbarBadge",
                                                    !notificationPrefs.enableTaskbarBadge
                                                )
                                            }
                                            className={`w-11 h-6 rounded-full transition-colors p-0.5 ${notificationPrefs.enableTaskbarBadge ? "bg-accent-violet" : "bg-surface-raised border border-border"}`}
                                        >
                                            <span
                                                className={`block w-5 h-5 rounded-full bg-white transition-transform ${notificationPrefs.enableTaskbarBadge ? "translate-x-5" : "translate-x-0"}`}
                                            />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === "Voice & Video" && (
                        <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                            <h2 className="text-xl font-bold text-text-primary mb-6">Voice & Video</h2>
                            <div className="space-y-6">
                                <div className="grid grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <label className="text-xs font-bold text-text-muted uppercase tracking-wider">Input Device</label>
                                        <select
                                            value={audioInputId}
                                            onChange={(e) => setAudioInputId(e.target.value)}
                                            className="w-full h-10 px-3 bg-surface border border-border rounded-md text-text-primary outline-none focus:border-accent-violet cursor-pointer appearance-none"
                                        >
                                            {audioInputs.length === 0 && <option value="default">Default System Device</option>}
                                            {audioInputs.map(d => (
                                                <option key={d.deviceId} value={d.deviceId}>{d.label || 'Unknown Microphone'}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-xs font-bold text-text-muted uppercase tracking-wider">Output Device</label>
                                        <select
                                            value={audioOutputId}
                                            onChange={(e) => setAudioOutputId(e.target.value)}
                                            className="w-full h-10 px-3 bg-surface border border-border rounded-md text-text-primary outline-none focus:border-accent-violet cursor-pointer appearance-none"
                                        >
                                            {audioOutputs.length === 0 && <option value="default">Default System Device</option>}
                                            {audioOutputs.map(d => (
                                                <option key={d.deviceId} value={d.deviceId}>{d.label || 'Unknown Speaker'}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>

                                <div className="pt-6 border-t border-border">
                                    <h3 className="text-xs font-bold text-text-muted uppercase tracking-wider mb-4">Input Mode</h3>
                                    <div className="space-y-3">
                                        <label className="flex items-center gap-3 cursor-pointer" onClick={() => setPttEnabled(false)}>
                                            <div className={`w-5 h-5 rounded-full border ${!pttEnabled ? "border-[5px] border-accent-violet bg-white" : "border-border bg-surface"}`} />
                                            <span className="text-body text-text-primary">Voice Activity</span>
                                        </label>
                                        <label className="flex items-center gap-3 cursor-pointer" onClick={() => setPttEnabled(true)}>
                                            <div className={`w-5 h-5 rounded-full border ${pttEnabled ? "border-[5px] border-accent-violet bg-white" : "border-border bg-surface"}`} />
                                            <span className="text-body text-text-primary">Push to Talk</span>
                                        </label>
                                    </div>

                                    {pttEnabled && (
                                        <div className="mt-4 space-y-4 pl-8">
                                            {/* Shortcut recorder */}
                                            <div>
                                                <label className="text-xs font-semibold text-text-muted uppercase tracking-wider block mb-2">Shortcut</label>
                                                <button
                                                    onClick={() => {
                                                        setRecordingShortcut(true);
                                                        const handler = (e: KeyboardEvent) => {
                                                            e.preventDefault();
                                                            e.stopPropagation();
                                                            const parts: string[] = [];
                                                            if (e.ctrlKey || e.metaKey) parts.push("CmdOrCtrl");
                                                            if (e.altKey) parts.push("Alt");
                                                            if (e.shiftKey) parts.push("Shift");
                                                            const key = e.key;
                                                            if (key && !["Control", "Alt", "Shift", "Meta"].includes(key)) {
                                                                parts.push(key.length === 1 ? key.toUpperCase() : key);
                                                            }
                                                            if (parts.length >= 2) {
                                                                setPttShortcut(parts.join("+"));
                                                                setRecordingShortcut(false);
                                                                window.removeEventListener("keydown", handler);
                                                            }
                                                        };
                                                        window.addEventListener("keydown", handler);
                                                        setTimeout(() => {
                                                            window.removeEventListener("keydown", handler);
                                                            setRecordingShortcut(false);
                                                        }, 5000);
                                                    }}
                                                    className={`px-4 py-2 rounded-lg text-body font-mono transition-colors ${
                                                        recordingShortcut
                                                            ? "bg-accent-violet/20 border border-accent-violet text-accent-violet animate-pulse"
                                                            : "bg-surface-raised border border-border text-text-primary hover:bg-hover-row"
                                                    }`}
                                                >
                                                    {recordingShortcut ? "Press a key combo..." : pttShortcut}
                                                </button>
                                                {!(typeof window !== "undefined" && (window as any).__TAURI__) && (
                                                    <p className="text-xs text-yellow-500 mt-1">Push to Talk shortcuts only work in the desktop app.</p>
                                                )}
                                            </div>

                                            {/* PTT Mode */}
                                            <div>
                                                <label className="text-xs font-semibold text-text-muted uppercase tracking-wider block mb-2">Mode</label>
                                                <div className="space-y-2">
                                                    <label className="flex items-center gap-3 cursor-pointer" onClick={() => setPttMode("push-to-talk")}>
                                                        <div className={`w-4 h-4 rounded-full border ${pttMode === "push-to-talk" ? "border-[4px] border-accent-violet bg-white" : "border-border bg-surface"}`} />
                                                        <div>
                                                            <span className="text-body text-text-primary block">Hold to Speak</span>
                                                            <span className="text-xs text-text-muted">Mic is active while key is held</span>
                                                        </div>
                                                    </label>
                                                    <label className="flex items-center gap-3 cursor-pointer" onClick={() => setPttMode("toggle")}>
                                                        <div className={`w-4 h-4 rounded-full border ${pttMode === "toggle" ? "border-[4px] border-accent-violet bg-white" : "border-border bg-surface"}`} />
                                                        <div>
                                                            <span className="text-body text-text-primary block">Toggle Mute</span>
                                                            <span className="text-xs text-text-muted">Press to toggle mic on/off</span>
                                                        </div>
                                                    </label>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                <NoiseSuppressionSection />
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Close button */}
            <div className="absolute top-14 right-10">
                <button
                    onClick={onClose}
                    className="w-9 h-9 flex flex-col items-center justify-center text-text-muted hover:text-text-primary transition-colors group"
                >
                    <div className="w-9 h-9 rounded-full border-2 border-text-muted group-hover:border-text-primary group-hover:bg-surface-raised flex items-center justify-center mb-1 transition-all">
                        <X className="w-5 h-5" />
                    </div>
                    <span className="text-[11px] font-bold uppercase">ESC</span>
                </button>
            </div>
        </div>
    );
}
