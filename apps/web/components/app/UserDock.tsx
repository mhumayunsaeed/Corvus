"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
    AudioLines,
    Check,
    ChevronDown,
    ChevronRight,
    HeadphoneOff,
    Headphones,
    Mic,
    MicOff,
    MonitorUp,
    Settings,
    Video,
    VideoOff,
    Wifi,
} from "lucide-react";
import { useAuthStore } from "@/stores/auth-store";
import { useVoiceStore } from "@/stores/voice-store";
import { UserAvatar } from "./UserAvatar";
import { getUsernameColor } from "@/lib/color-utils";

interface UserDockProps {
    onOpenSettings: () => void;
}

const statusColors: Record<string, string> = {
    online: "#34D399",
    idle: "#F59E0B",
    dnd: "#F06370",
    invisible: "#6B7280",
    offline: "#6B7280",
};

const statusLabels: Record<string, string> = {
    online: "Online",
    idle: "Idle",
    dnd: "Do Not Disturb",
    invisible: "Invisible",
    offline: "Offline",
};

export function UserDock({ onOpenSettings }: UserDockProps) {
    const dockRef = useRef<HTMLDivElement>(null);
    const statusMenuRef = useRef<HTMLDivElement>(null);
    const inputMenuRef = useRef<HTMLDivElement>(null);
    const outputMenuRef = useRef<HTMLDivElement>(null);
    const [showStatusMenu, setShowStatusMenu] = useState(false);
    const [showInputMenu, setShowInputMenu] = useState(false);
    const [showOutputMenu, setShowOutputMenu] = useState(false);
    const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
    const [inputDeviceId, setInputDeviceId] = useState("default");
    const [outputDeviceId, setOutputDeviceId] = useState("default");
    const [inputVolume, setInputVolume] = useState(100);
    const [outputVolume, setOutputVolume] = useState(100);
    const user = useAuthStore((s) => s.user);
    const setStatus = useAuthStore((s) => s.setStatus);
    const isMuted = useVoiceStore((s) => s.isMuted);
    const isDeafened = useVoiceStore((s) => s.isDeafened);
    const noiseSuppression = useVoiceStore((s) => s.noiseSuppression);
    const hasVideo = useVoiceStore((s) => s.hasVideo);
    const isScreenSharing = useVoiceStore((s) => s.isScreenSharing);
    const currentChannelId = useVoiceStore((s) => s.currentChannelId);
    const currentChannelName = useVoiceStore((s) => s.currentChannelName);
    const currentServerName = useVoiceStore((s) => s.currentServerName);
    const liveLatencyMs = useVoiceStore((s) => s.liveLatencyMs);
    const setLocalMuted = useVoiceStore((s) => s.setLocalMuted);
    const setLocalDeafened = useVoiceStore((s) => s.setLocalDeafened);
    const setLocalVideo = useVoiceStore((s) => s.setLocalVideo);
    const setLocalScreenSharing = useVoiceStore((s) => s.setLocalScreenSharing);
    const setNoiseSuppression = useVoiceStore((s) => s.setNoiseSuppression);

    const userAvatar = user?.avatar;
    const userStatus = user?.status || "online";
    const userStatusColor = statusColors[userStatus] || statusColors.online;
    const userStatusLabel = statusLabels[userStatus] || statusLabels.online;
    const userStatusSubtitle = userStatus === "offline" ? "" : userStatusLabel;
    const primaryName = user?.displayName || user?.username || "User";
    const secondaryName = user?.username || "user";
    const statuses = ["online", "idle", "dnd", "invisible"] as const;
    const hasActiveVoiceSession =
        !!currentChannelId ||
        liveLatencyMs !== null ||
        hasVideo ||
        isScreenSharing;

    const audioInputs = useMemo(
        () => devices.filter((device) => device.kind === "audioinput"),
        [devices]
    );
    const audioOutputs = useMemo(
        () => devices.filter((device) => device.kind === "audiooutput"),
        [devices]
    );

    const resolveDeviceLabel = (device: MediaDeviceInfo, index: number, kind: "input" | "output") => {
        if (device.label && device.label.trim()) return device.label;
        return kind === "input" ? `Microphone ${index + 1}` : `Speaker ${index + 1}`;
    };

    const applyOutputVolume = useCallback((nextVolume: number) => {
        const ratio = Math.max(0, Math.min(100, nextVolume)) / 100;
        const mediaElements = Array.from(document.querySelectorAll<HTMLMediaElement>("audio, video"));
        for (const element of mediaElements) {
            element.volume = ratio;
        }
    }, []);

    const applyOutputDevice = useCallback(async (deviceId: string) => {
        const mediaElements = Array.from(document.querySelectorAll<HTMLMediaElement>("audio, video"));
        await Promise.all(
            mediaElements.map(async (element) => {
                const sinkCapable = element as HTMLMediaElement & {
                    setSinkId?: (sinkId: string) => Promise<void>;
                };
                if (!sinkCapable.setSinkId) return;
                try {
                    await sinkCapable.setSinkId(deviceId);
                } catch {
                    // Ignore unsupported sink changes per element.
                }
            })
        );
    }, []);

    const refreshDevices = useCallback(async () => {
        if (!navigator?.mediaDevices?.enumerateDevices) return;
        try {
            const list = await navigator.mediaDevices.enumerateDevices();
            setDevices(list);
        } catch {
            // Device labels can fail without permissions; keep graceful fallback.
        }
    }, []);

    useEffect(() => {
        if (typeof window === "undefined") return;
        const savedInput = window.localStorage.getItem("corvus-input-device-id");
        const savedOutput = window.localStorage.getItem("corvus-output-device-id");
        const savedInputVolume = window.localStorage.getItem("corvus-input-volume");
        const savedOutputVolume = window.localStorage.getItem("corvus-output-volume");

        if (savedInput) setInputDeviceId(savedInput);
        if (savedOutput) {
            setOutputDeviceId(savedOutput);
            applyOutputDevice(savedOutput);
        }
        if (savedInputVolume) {
            const parsed = Number(savedInputVolume);
            if (!Number.isNaN(parsed)) setInputVolume(Math.max(0, Math.min(100, parsed)));
        }
        if (savedOutputVolume) {
            const parsed = Number(savedOutputVolume);
            if (!Number.isNaN(parsed)) {
                const clamped = Math.max(0, Math.min(100, parsed));
                setOutputVolume(clamped);
                applyOutputVolume(clamped);
            }
        }
    }, [applyOutputVolume]);

    useEffect(() => {
        refreshDevices();
    }, [refreshDevices]);

    useEffect(() => {
        if (!navigator?.mediaDevices?.addEventListener) return;
        const onDeviceChange = () => {
            refreshDevices();
        };
        navigator.mediaDevices.addEventListener("devicechange", onDeviceChange);
        return () => navigator.mediaDevices.removeEventListener("devicechange", onDeviceChange);
    }, [refreshDevices]);

    useEffect(() => {
        if (showInputMenu || showOutputMenu) {
            refreshDevices();
        }
    }, [showInputMenu, showOutputMenu, refreshDevices]);

    useEffect(() => {
        if (!showStatusMenu && !showInputMenu && !showOutputMenu) return;
        const handleClickOutside = (event: MouseEvent) => {
            if (!dockRef.current?.contains(event.target as Node)) {
                setShowStatusMenu(false);
                setShowInputMenu(false);
                setShowOutputMenu(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [showStatusMenu, showInputMenu, showOutputMenu]);

    const handleMuteToggle = () => {
        setLocalMuted(!isMuted);
    };

    const handleDeafenToggle = () => {
        const nextDeafened = !isDeafened;
        setLocalDeafened(nextDeafened);
        if (nextDeafened && !isMuted) {
            setLocalMuted(true);
        }
    };

    const handleVideoToggle = () => {
        setLocalVideo(!hasVideo);
    };

    const handleScreenShareToggle = () => {
        setLocalScreenSharing(!isScreenSharing);
    };

    return (
        <div
            ref={dockRef}
            className="relative z-[70] px-2 pb-2 pt-2 border-t border-border-subtle bg-bg-deep flex-shrink-0 overflow-visible"
        >
            <div className="relative w-full rounded-xl border border-border bg-surface inner-shine overflow-visible lg:w-[420px] lg:max-w-[calc(100%+60px)] lg:ml-[-60px]">
                {hasActiveVoiceSession && (
                    <div className="px-3 py-2 border-b border-border">
                        <div className="flex items-center gap-2">
                            <div className="w-9 h-9 rounded-lg bg-success/10 border border-success/20 text-success flex items-center justify-center">
                                <AudioLines className="w-5 h-5" />
                            </div>
                            <div className="min-w-0">
                                <div className="text-[24px] leading-none font-semibold text-success">
                                    Voice Details
                                </div>
                                <div className="text-[12px] text-text-muted truncate">
                                    {currentChannelName
                                        ? `${currentChannelName}${currentServerName ? ` - ${currentServerName}` : ""}`
                                        : "Connected voice session"}
                                </div>
                            </div>
                            {liveLatencyMs !== null && (
                                <div
                                    className={`ml-auto h-9 px-2 rounded-lg border border-border flex items-center gap-1.5 text-[13px] font-semibold ${liveLatencyMs < 80
                                        ? "text-success"
                                        : liveLatencyMs < 150
                                            ? "text-warning"
                                            : "text-danger"
                                        }`}
                                    title="Live call latency"
                                >
                                    <Wifi className="w-4 h-4" />
                                    <span>{liveLatencyMs}ms</span>
                                </div>
                            )}
                        </div>
                        <div className="grid grid-cols-4 gap-2 mt-2">
                            <button
                                onClick={() => setNoiseSuppression(!noiseSuppression)}
                                className={`h-10 rounded-lg border border-border flex items-center justify-center transition-colors ${noiseSuppression
                                    ? "text-accent-teal bg-accent-teal/10 border-accent-teal/20"
                                    : "text-text-secondary hover:text-text-primary hover:bg-hover-row"
                                    }`}
                                title={noiseSuppression ? "Disable Noise Suppression" : "Enable Noise Suppression"}
                            >
                                <AudioLines className="w-5 h-5" />
                            </button>
                            <button
                                onClick={handleScreenShareToggle}
                                className={`h-10 rounded-lg border border-border flex items-center justify-center transition-colors ${isScreenSharing
                                    ? "text-accent-teal bg-accent-teal/10 border-accent-teal/20"
                                    : "text-text-secondary hover:text-text-primary hover:bg-hover-row"
                                    }`}
                                title={isScreenSharing ? "Stop Screen Share" : "Start Screen Share"}
                            >
                                <MonitorUp className="w-5 h-5" />
                            </button>
                            <button
                                onClick={handleVideoToggle}
                                className={`h-10 rounded-lg border border-border flex items-center justify-center transition-colors ${hasVideo
                                    ? "text-accent-teal bg-accent-teal/10 border-accent-teal/20"
                                    : "text-text-secondary hover:text-text-primary hover:bg-hover-row"
                                    }`}
                                title={hasVideo ? "Turn Off Camera" : "Turn On Camera"}
                            >
                                {hasVideo ? <Video className="w-5 h-5" /> : <VideoOff className="w-5 h-5" />}
                            </button>
                            <button
                                onClick={onOpenSettings}
                                className="h-10 rounded-lg border border-border flex items-center justify-center text-text-secondary hover:text-text-primary hover:bg-hover-row transition-colors"
                                title="Voice Settings"
                            >
                                <Settings className="w-5 h-5" />
                            </button>
                        </div>
                    </div>
                )}

                <div className="px-3 py-2 flex items-center gap-2">
                    <div className="relative min-w-0 flex-1" ref={statusMenuRef}>
                        <button
                            onClick={() => {
                                setShowStatusMenu((prev) => !prev);
                                setShowInputMenu(false);
                                setShowOutputMenu(false);
                            }}
                            className="flex w-full min-w-0 items-center gap-2 rounded-lg px-1.5 py-1 hover:bg-hover-row transition-colors"
                            aria-haspopup="menu"
                            aria-expanded={showStatusMenu}
                        >
                            <div className="relative">
                                <UserAvatar
                                    avatarUrl={userAvatar}
                                    username={user?.username || "user"}
                                    className="w-10 h-10"
                                />
                                <div
                                    className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-surface"
                                    style={{ backgroundColor: userStatusColor }}
                                />
                            </div>
                            <div className="min-w-0 text-left">
                                <div
                                    className="text-[18px] leading-tight font-semibold truncate"
                                    style={{ color: getUsernameColor(user?.username || "user") }}
                                >
                                    {primaryName}
                                </div>
                                {(userStatusSubtitle || secondaryName) && (
                                    <div className="text-[13px] text-text-muted leading-[1.1] truncate">
                                        {userStatusSubtitle || secondaryName}
                                    </div>
                                )}
                            </div>
                            <ChevronDown className="w-4 h-4 text-text-faint flex-shrink-0" />
                        </button>

                        {showStatusMenu && (
                            <div className="absolute left-0 bottom-full mb-2 w-56 rounded-xl border border-border-highlight bg-surface-overlay shadow-float z-50 p-1 animate-slide-up">
                                <div className="px-2 py-1 text-[11px] uppercase tracking-wide text-text-faint">
                                    Set status
                                </div>
                                {statuses.map((status) => {
                                    const isActive = userStatus === status;
                                    return (
                                        <button
                                            key={status}
                                            onClick={() => {
                                                setStatus(status);
                                                setShowStatusMenu(false);
                                            }}
                                            className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-[13px] transition-colors ${isActive
                                                ? "bg-active-row text-text-primary"
                                                : "text-text-secondary hover:bg-hover-row hover:text-text-primary"
                                                }`}
                                        >
                                            <span
                                                className="w-2 h-2 rounded-full flex-shrink-0"
                                                style={{ backgroundColor: statusColors[status] }}
                                            />
                                            <span className="flex-1 text-left">{statusLabels[status]}</span>
                                            {isActive && <Check className="w-3.5 h-3.5 text-text-muted" />}
                                        </button>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    <div className="flex items-center gap-1.5 flex-shrink-0">
                        <button
                            onClick={handleMuteToggle}
                            className={`w-9 h-9 rounded-lg flex items-center justify-center transition-colors ${isMuted
                                ? "text-danger hover:bg-danger/10"
                                : "text-text-secondary hover:text-text-primary hover:bg-hover-row"
                                }`}
                            title={isMuted ? "Unmute" : "Mute"}
                        >
                            {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
                        </button>
                        <div className="relative" ref={inputMenuRef}>
                            <button
                                onClick={() => {
                                    setShowInputMenu((prev) => !prev);
                                    setShowOutputMenu(false);
                                    setShowStatusMenu(false);
                                }}
                                className="w-5 h-9 rounded-md hover:bg-hover-row flex items-center justify-center text-text-faint hover:text-text-secondary transition-colors"
                                title="Microphone Options"
                                aria-haspopup="menu"
                                aria-expanded={showInputMenu}
                            >
                                <ChevronDown className="w-3.5 h-3.5" />
                            </button>
                            {showInputMenu && (
                                <div className="absolute right-0 bottom-full mb-2 w-[280px] rounded-xl border border-border-highlight bg-surface-overlay shadow-float z-50 p-3 animate-slide-up">
                                    <div className="text-[13px] font-semibold text-text-primary mb-1.5">Input Device</div>
                                    <div className="space-y-0.5">
                                        {(audioInputs.length > 0 ? audioInputs : [{ deviceId: "default", label: "Default Microphone" } as MediaDeviceInfo]).map((device, idx) => {
                                            const id = device.deviceId || "default";
                                            const selected = id === inputDeviceId;
                                            const label = resolveDeviceLabel(device, idx, "input");
                                            return (
                                                <button
                                                    key={`input-${id}-${idx}`}
                                                    onClick={() => {
                                                        setInputDeviceId(id);
                                                        if (typeof window !== "undefined") {
                                                            window.localStorage.setItem("corvus-input-device-id", id);
                                                        }
                                                    }}
                                                    className={`w-full text-left px-2 py-1.5 rounded-lg text-[13px] transition-colors ${selected
                                                        ? "bg-active-row text-text-primary"
                                                        : "text-text-secondary hover:bg-hover-row hover:text-text-primary"
                                                        }`}
                                                    title={label}
                                                >
                                                    <span className="block truncate">
                                                        {label}
                                                    </span>
                                                </button>
                                            );
                                        })}
                                    </div>

                                    <div className="h-px bg-border my-3" />
                                    <div className="text-[13px] font-semibold text-text-primary mb-2">Input Level</div>
                                    <input
                                        type="range"
                                        min={0}
                                        max={100}
                                        value={inputVolume}
                                        onChange={(e) => {
                                            const value = Number(e.target.value);
                                            setInputVolume(value);
                                            if (typeof window !== "undefined") {
                                                window.localStorage.setItem("corvus-input-volume", String(value));
                                            }
                                        }}
                                        className="w-full h-1.5 accent-accent-violet cursor-pointer"
                                    />

                                    <div className="h-px bg-border my-3" />
                                    <button
                                        onClick={() => {
                                            setShowInputMenu(false);
                                            onOpenSettings();
                                        }}
                                        className="w-full flex items-center justify-between px-1 py-1 text-[13px] text-text-secondary hover:text-text-primary transition-colors"
                                    >
                                        <span>Voice Settings</span>
                                        <Settings className="w-4 h-4 text-text-muted" />
                                    </button>
                                </div>
                            )}
                        </div>
                        <button
                            onClick={handleDeafenToggle}
                            className={`w-9 h-9 rounded-lg flex items-center justify-center transition-colors ${isDeafened
                                ? "text-danger hover:bg-danger/10"
                                : "text-text-secondary hover:text-text-primary hover:bg-hover-row"
                                }`}
                            title={isDeafened ? "Undeafen" : "Deafen"}
                        >
                            {isDeafened ? (
                                <HeadphoneOff className="w-5 h-5" />
                            ) : (
                                <Headphones className="w-5 h-5" />
                            )}
                        </button>
                        <div className="relative" ref={outputMenuRef}>
                            <button
                                onClick={() => {
                                    setShowOutputMenu((prev) => !prev);
                                    setShowInputMenu(false);
                                    setShowStatusMenu(false);
                                }}
                                className="w-5 h-9 rounded-md hover:bg-hover-row flex items-center justify-center text-text-faint hover:text-text-secondary transition-colors"
                                title="Sound Options"
                                aria-haspopup="menu"
                                aria-expanded={showOutputMenu}
                            >
                                <ChevronDown className="w-3.5 h-3.5" />
                            </button>
                            {showOutputMenu && (
                                <div className="absolute right-0 bottom-full mb-2 w-[280px] rounded-xl border border-border-highlight bg-surface-overlay shadow-float z-50 p-3 animate-slide-up">
                                    <div className="text-[13px] font-semibold text-text-primary mb-1.5">Output Device</div>
                                    <div className="space-y-0.5">
                                        {(audioOutputs.length > 0 ? audioOutputs : [{ deviceId: "default", label: "Default Output" } as MediaDeviceInfo]).map((device, idx) => {
                                            const id = device.deviceId || "default";
                                            const selected = id === outputDeviceId;
                                            const label = resolveDeviceLabel(device, idx, "output");
                                            return (
                                                <button
                                                    key={`output-${id}-${idx}`}
                                                    onClick={() => {
                                                        setOutputDeviceId(id);
                                                        if (typeof window !== "undefined") {
                                                            window.localStorage.setItem("corvus-output-device-id", id);
                                                        }
                                                        applyOutputDevice(id);
                                                    }}
                                                    className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-[13px] transition-colors ${selected
                                                        ? "bg-active-row text-text-primary"
                                                        : "text-text-secondary hover:bg-hover-row hover:text-text-primary"
                                                        }`}
                                                    title={label}
                                                >
                                                    <span className="flex-1 truncate text-left">{label}</span>
                                                    {selected && <ChevronRight className="w-3.5 h-3.5 text-text-muted flex-shrink-0" />}
                                                </button>
                                            );
                                        })}
                                    </div>

                                    <div className="h-px bg-border my-3" />
                                    <div className="text-[13px] font-semibold text-text-primary mb-2">Output Volume</div>
                                    <input
                                        type="range"
                                        min={0}
                                        max={100}
                                        value={outputVolume}
                                        onChange={(e) => {
                                            const value = Number(e.target.value);
                                            setOutputVolume(value);
                                            if (typeof window !== "undefined") {
                                                window.localStorage.setItem("corvus-output-volume", String(value));
                                            }
                                            applyOutputVolume(value);
                                        }}
                                        className="w-full h-1.5 accent-accent-violet cursor-pointer"
                                    />

                                    <div className="h-px bg-border my-3" />
                                    <button
                                        onClick={() => {
                                            setShowOutputMenu(false);
                                            onOpenSettings();
                                        }}
                                        className="w-full flex items-center justify-between px-1 py-1 text-[13px] text-text-secondary hover:text-text-primary transition-colors"
                                    >
                                        <span>Voice Settings</span>
                                        <Settings className="w-4 h-4 text-text-muted" />
                                    </button>
                                </div>
                            )}
                        </div>
                        <button
                            onClick={() => setNoiseSuppression(!noiseSuppression)}
                            className={`w-9 h-9 rounded-lg flex items-center justify-center transition-colors ${noiseSuppression
                                ? "text-accent-teal hover:bg-accent-teal/10"
                                : "text-text-secondary hover:text-text-primary hover:bg-hover-row"
                                }`}
                            title={noiseSuppression ? "Disable Noise Suppression" : "Enable Noise Suppression"}
                        >
                            <AudioLines className="w-5 h-5" />
                        </button>
                        <button
                            onClick={onOpenSettings}
                            className="w-9 h-9 rounded-lg hover:bg-hover-row flex items-center justify-center text-text-secondary hover:text-text-primary transition-colors"
                            title="Settings"
                        >
                            <Settings className="w-5 h-5" />
                        </button>
                    </div>
                </div>
            </div>
            <span className="sr-only">{userStatusLabel}</span>
        </div>
    );
}
