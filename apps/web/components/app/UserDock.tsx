"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
    AudioLines,
    Check,
    ChevronDown,
    ChevronRight,
    ChevronUp,
    HeadphoneOff,
    Headphones,
    Mic,
    MicOff,
    MonitorUp,
    Settings,
    Video,
    VideoOff,
    Wifi,
    Circle,
} from "lucide-react";
import { useAuthStore } from "@/stores/auth-store";
import { useVoiceStore } from "@/stores/voice-store";
import { UserAvatar } from "./UserAvatar";
import { getUsernameColor } from "@/lib/color-utils";

interface UserDockProps {
    onOpenSettings: () => void;
}

const statusColors: Record<string, string> = {
    online: "#22C55E",
    idle: "#F59E0B",
    dnd: "#EF4444",
    invisible: "#4B5563",
    offline: "#4B5563",
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

    useEffect(() => { refreshDevices(); }, [refreshDevices]);

    useEffect(() => {
        if (!navigator?.mediaDevices?.addEventListener) return;
        const onDeviceChange = () => refreshDevices();
        navigator.mediaDevices.addEventListener("devicechange", onDeviceChange);
        return () => navigator.mediaDevices.removeEventListener("devicechange", onDeviceChange);
    }, [refreshDevices]);

    useEffect(() => {
        if (showInputMenu || showOutputMenu) refreshDevices();
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

    const handleMuteToggle = () => setLocalMuted(!isMuted);
    const handleDeafenToggle = () => {
        const nextDeafened = !isDeafened;
        setLocalDeafened(nextDeafened);
        if (nextDeafened && !isMuted) setLocalMuted(true);
    };
    const handleVideoToggle = () => setLocalVideo(!hasVideo);
    const handleScreenShareToggle = () => setLocalScreenSharing(!isScreenSharing);

    const CtrlBtn = ({
        active,
        activeColor = "text-accent-teal bg-accent-teal/10",
        onClick,
        title,
        children,
    }: {
        active?: boolean;
        activeColor?: string;
        onClick: () => void;
        title: string;
        children: React.ReactNode;
    }) => (
        <button
            onClick={onClick}
            title={title}
            className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-150 ${
                active
                    ? activeColor
                    : "text-text-muted hover:text-text-secondary hover:bg-hover-row-strong"
            }`}
        >
            {children}
        </button>
    );

    return (
        <div
            ref={dockRef}
            className="relative z-[70] flex-shrink-0 overflow-visible"
        >
            {/* Voice session card */}
            {hasActiveVoiceSession && (
                <div className="mx-2 mb-1 px-3 py-2 rounded-xl bg-surface border border-border-highlight inner-shine-strong">
                    <div className="flex items-center gap-2 mb-2">
                        <div className="w-6 h-6 rounded-md bg-success/10 border border-success/20 flex items-center justify-center">
                            <AudioLines className="w-3.5 h-3.5 text-success" />
                        </div>
                        <div className="min-w-0 flex-1">
                            <div className="text-[12px] font-semibold text-success leading-tight truncate">
                                {currentChannelName || "Voice Connected"}
                            </div>
                            {currentServerName && (
                                <div className="text-[11px] text-text-faint truncate">{currentServerName}</div>
                            )}
                        </div>
                        {liveLatencyMs !== null && (
                            <div
                                className={`flex items-center gap-1 text-[11px] font-semibold ${
                                    liveLatencyMs < 80
                                        ? "text-success"
                                        : liveLatencyMs < 150
                                            ? "text-warning"
                                            : "text-danger"
                                }`}
                                title="Live latency"
                            >
                                <Wifi className="w-3 h-3" />
                                <span>{liveLatencyMs}ms</span>
                            </div>
                        )}
                    </div>
                    <div className="flex items-center gap-1">
                        <CtrlBtn
                            active={noiseSuppression}
                            onClick={() => setNoiseSuppression(!noiseSuppression)}
                            title={noiseSuppression ? "Disable Noise Suppression" : "Enable Noise Suppression"}
                        >
                            <AudioLines className="w-4 h-4" />
                        </CtrlBtn>
                        <CtrlBtn
                            active={isScreenSharing}
                            onClick={handleScreenShareToggle}
                            title={isScreenSharing ? "Stop Screen Share" : "Share Screen"}
                        >
                            <MonitorUp className="w-4 h-4" />
                        </CtrlBtn>
                        <CtrlBtn
                            active={hasVideo}
                            onClick={handleVideoToggle}
                            title={hasVideo ? "Turn Off Camera" : "Turn On Camera"}
                        >
                            {hasVideo ? <Video className="w-4 h-4" /> : <VideoOff className="w-4 h-4" />}
                        </CtrlBtn>
                        <button
                            onClick={onOpenSettings}
                            className="w-8 h-8 rounded-lg flex items-center justify-center text-text-muted hover:text-text-secondary hover:bg-hover-row-strong transition-all ml-auto"
                            title="Voice Settings"
                        >
                            <Settings className="w-3.5 h-3.5" />
                        </button>
                    </div>
                </div>
            )}

            {/* User identity row */}
            <div className="px-2 pb-2">
                <div className="flex items-center gap-1 px-1 py-1 rounded-xl hover:bg-hover-row transition-colors">
                    {/* Avatar + status indicator (clickable status menu) */}
                    <div className="relative" ref={statusMenuRef}>
                        <button
                            onClick={() => {
                                setShowStatusMenu((prev) => !prev);
                                setShowInputMenu(false);
                                setShowOutputMenu(false);
                            }}
                            className="flex items-center gap-2 rounded-lg px-1.5 py-1 hover:bg-hover-row-strong transition-colors flex-1 min-w-0"
                            aria-haspopup="menu"
                            aria-expanded={showStatusMenu}
                        >
                            <div className="relative flex-shrink-0">
                                <UserAvatar
                                    avatarUrl={userAvatar}
                                    username={user?.username || "user"}
                                    className="w-8 h-8"
                                />
                                <div
                                    className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-channel-sidebar"
                                    style={{ backgroundColor: userStatusColor }}
                                />
                            </div>
                            <div className="min-w-0 text-left">
                                <div
                                    className="text-[13px] leading-tight font-semibold truncate"
                                    style={{ color: getUsernameColor(user?.username || "user") }}
                                >
                                    {primaryName}
                                </div>
                                <div className="text-[11px] text-text-faint leading-tight truncate">
                                    {userStatusSubtitle || secondaryName}
                                </div>
                            </div>
                        </button>

                        {/* Status menu */}
                        {showStatusMenu && (
                            <div className="absolute left-0 bottom-full mb-2 w-52 rounded-xl border border-border-highlight bg-surface-overlay shadow-float-lg z-50 p-1.5 animate-slide-up">
                                <div className="px-2 py-1 text-[10px] uppercase tracking-[0.08em] text-text-faint font-semibold mb-0.5">
                                    Set Status
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
                                            className={`w-full flex items-center gap-2.5 px-2 py-1.5 rounded-lg text-[13px] transition-colors ${
                                                isActive
                                                    ? "bg-active-row text-text-primary"
                                                    : "text-text-secondary hover:bg-hover-row hover:text-text-primary"
                                            }`}
                                        >
                                            <span
                                                className="w-2 h-2 rounded-full flex-shrink-0"
                                                style={{ backgroundColor: statusColors[status] }}
                                            />
                                            <span className="flex-1 text-left">{statusLabels[status]}</span>
                                            {isActive && <Check className="w-3.5 h-3.5 text-text-muted flex-shrink-0" />}
                                        </button>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    {/* Quick controls */}
                    <div className="flex items-center gap-0.5 flex-shrink-0 ml-auto">
                        {/* Mic */}
                        <button
                            onClick={handleMuteToggle}
                            className={`w-7 h-7 rounded-md flex items-center justify-center transition-all ${
                                isMuted
                                    ? "text-danger hover:bg-danger/10"
                                    : "text-text-muted hover:text-text-secondary hover:bg-hover-row-strong"
                            }`}
                            title={isMuted ? "Unmute" : "Mute"}
                        >
                            {isMuted ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                        </button>

                        {/* Mic options */}
                        <div className="relative" ref={inputMenuRef}>
                            <button
                                onClick={() => {
                                    setShowInputMenu((prev) => !prev);
                                    setShowOutputMenu(false);
                                    setShowStatusMenu(false);
                                }}
                                className="w-4 h-7 rounded flex items-center justify-center text-text-faint hover:text-text-secondary transition-colors"
                                title="Microphone Options"
                                aria-haspopup="menu"
                                aria-expanded={showInputMenu}
                            >
                                <ChevronUp className="w-3 h-3" />
                            </button>
                            {showInputMenu && (
                                <div className="absolute right-0 bottom-full mb-2 w-[260px] rounded-xl border border-border-highlight bg-surface-overlay shadow-float-lg z-50 p-3 animate-slide-up">
                                    <div className="text-[12px] font-semibold text-text-primary mb-1.5">Input Device</div>
                                    <div className="space-y-0.5 max-h-[120px] overflow-y-auto">
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
                                                    className={`w-full flex items-center gap-2 text-left px-2 py-1.5 rounded-lg text-[12px] transition-colors ${
                                                        selected ? "bg-active-row text-text-primary" : "text-text-secondary hover:bg-hover-row hover:text-text-primary"
                                                    }`}
                                                >
                                                    <span className="flex-1 truncate">{label}</span>
                                                    {selected && <Check className="w-3.5 h-3.5 text-accent-violet flex-shrink-0" />}
                                                </button>
                                            );
                                        })}
                                    </div>
                                    <div className="h-px bg-border my-2.5" />
                                    <div className="text-[12px] font-semibold text-text-primary mb-2">Input Level</div>
                                    <input
                                        type="range" min={0} max={100} value={inputVolume}
                                        onChange={(e) => {
                                            const value = Number(e.target.value);
                                            setInputVolume(value);
                                            if (typeof window !== "undefined") {
                                                window.localStorage.setItem("corvus-input-volume", String(value));
                                            }
                                        }}
                                        className="w-full cursor-pointer"
                                    />
                                    <div className="h-px bg-border my-2.5" />
                                    <button
                                        onClick={() => { setShowInputMenu(false); onOpenSettings(); }}
                                        className="w-full flex items-center justify-between px-1 py-1 text-[12px] text-text-muted hover:text-text-secondary transition-colors rounded"
                                    >
                                        <span>Voice Settings</span>
                                        <Settings className="w-3.5 h-3.5" />
                                    </button>
                                </div>
                            )}
                        </div>

                        {/* Deafen */}
                        <button
                            onClick={handleDeafenToggle}
                            className={`w-7 h-7 rounded-md flex items-center justify-center transition-all ${
                                isDeafened
                                    ? "text-danger hover:bg-danger/10"
                                    : "text-text-muted hover:text-text-secondary hover:bg-hover-row-strong"
                            }`}
                            title={isDeafened ? "Undeafen" : "Deafen"}
                        >
                            {isDeafened ? <HeadphoneOff className="w-4 h-4" /> : <Headphones className="w-4 h-4" />}
                        </button>

                        {/* Output options */}
                        <div className="relative" ref={outputMenuRef}>
                            <button
                                onClick={() => {
                                    setShowOutputMenu((prev) => !prev);
                                    setShowInputMenu(false);
                                    setShowStatusMenu(false);
                                }}
                                className="w-4 h-7 rounded flex items-center justify-center text-text-faint hover:text-text-secondary transition-colors"
                                title="Sound Options"
                                aria-haspopup="menu"
                                aria-expanded={showOutputMenu}
                            >
                                <ChevronUp className="w-3 h-3" />
                            </button>
                            {showOutputMenu && (
                                <div className="absolute right-0 bottom-full mb-2 w-[260px] rounded-xl border border-border-highlight bg-surface-overlay shadow-float-lg z-50 p-3 animate-slide-up">
                                    <div className="text-[12px] font-semibold text-text-primary mb-1.5">Output Device</div>
                                    <div className="space-y-0.5 max-h-[120px] overflow-y-auto">
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
                                                    className={`w-full flex items-center gap-2 text-left px-2 py-1.5 rounded-lg text-[12px] transition-colors ${
                                                        selected ? "bg-active-row text-text-primary" : "text-text-secondary hover:bg-hover-row hover:text-text-primary"
                                                    }`}
                                                >
                                                    <span className="flex-1 truncate">{label}</span>
                                                    {selected && <Check className="w-3.5 h-3.5 text-accent-violet flex-shrink-0" />}
                                                </button>
                                            );
                                        })}
                                    </div>
                                    <div className="h-px bg-border my-2.5" />
                                    <div className="text-[12px] font-semibold text-text-primary mb-2">Output Volume</div>
                                    <input
                                        type="range" min={0} max={100} value={outputVolume}
                                        onChange={(e) => {
                                            const value = Number(e.target.value);
                                            setOutputVolume(value);
                                            if (typeof window !== "undefined") {
                                                window.localStorage.setItem("corvus-output-volume", String(value));
                                            }
                                            applyOutputVolume(value);
                                        }}
                                        className="w-full cursor-pointer"
                                    />
                                    <div className="h-px bg-border my-2.5" />
                                    <button
                                        onClick={() => { setShowOutputMenu(false); onOpenSettings(); }}
                                        className="w-full flex items-center justify-between px-1 py-1 text-[12px] text-text-muted hover:text-text-secondary transition-colors rounded"
                                    >
                                        <span>Voice Settings</span>
                                        <Settings className="w-3.5 h-3.5" />
                                    </button>
                                </div>
                            )}
                        </div>

                        {/* Settings */}
                        <button
                            onClick={onOpenSettings}
                            className="w-7 h-7 rounded-md flex items-center justify-center text-text-muted hover:text-text-secondary hover:bg-hover-row-strong transition-all"
                            title="Settings"
                        >
                            <Settings className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            </div>
            <span className="sr-only">{userStatusLabel}</span>
        </div>
    );
}
