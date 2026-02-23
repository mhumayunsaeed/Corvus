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
    Settings,
} from "lucide-react";
import { useAuthStore } from "@/stores/auth-store";
import { useVoiceStore } from "@/stores/voice-store";

interface UserDockProps {
    onOpenSettings: () => void;
}

const statusColors: Record<string, string> = {
    online: "#3ECF8E",
    idle: "#F59E0B",
    dnd: "#F75F6E",
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
    const setLocalMuted = useVoiceStore((s) => s.setLocalMuted);
    const setLocalDeafened = useVoiceStore((s) => s.setLocalDeafened);
    const setNoiseSuppression = useVoiceStore((s) => s.setNoiseSuppression);

    const userAvatar =
        user?.avatar || `https://api.dicebear.com/9.x/avataaars/svg?seed=${user?.username || "user"}`;
    const userStatus = user?.status || "online";
    const userStatusColor = statusColors[userStatus] || statusColors.online;
    const userStatusLabel = statusLabels[userStatus] || statusLabels.online;
    const primaryName = user?.displayName || user?.username || "User";
    const secondaryName = user?.username || "user";
    const statuses = ["online", "idle", "dnd", "invisible", "offline"] as const;

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
        const savedInput = window.localStorage.getItem("veyra-input-device-id");
        const savedOutput = window.localStorage.getItem("veyra-output-device-id");
        const savedInputVolume = window.localStorage.getItem("veyra-input-volume");
        const savedOutputVolume = window.localStorage.getItem("veyra-output-volume");

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

    return (
        <div ref={dockRef} className="px-2 pb-2 pt-2 border-t border-[#1F2330] bg-[#0E1016] flex-shrink-0">
            <div className="h-[52px] px-2 rounded-xl border border-[#2A2F3F] bg-[#11141D] flex items-center">
                <div className="relative flex min-w-0 flex-1" ref={statusMenuRef}>
                    <button
                        onClick={() => {
                            setShowStatusMenu((prev) => !prev);
                            setShowInputMenu(false);
                            setShowOutputMenu(false);
                        }}
                        className="flex min-w-0 flex-1 items-center gap-2 rounded-md px-1 py-1 hover:bg-[#202432] transition-colors"
                        aria-haspopup="menu"
                        aria-expanded={showStatusMenu}
                    >
                        <div className="relative">
                            <img
                                src={userAvatar}
                                alt={user?.displayName || "You"}
                                className="w-8 h-8 rounded-full bg-[#222633]"
                            />
                            <div
                                className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-[#11141D]"
                                style={{ backgroundColor: userStatusColor }}
                            />
                        </div>
                        <div className="min-w-0 text-left">
                            <div className="text-[14px] font-semibold text-[#E8EAF1] truncate leading-[1.1]">
                                {primaryName}
                            </div>
                            <div className="text-[12px] text-[#9CA3B6] leading-[1.1] truncate">
                                {secondaryName}
                            </div>
                        </div>
                        <ChevronDown className="w-3.5 h-3.5 text-[#8E95A8] flex-shrink-0" />
                    </button>

                    {showStatusMenu && (
                        <div className="absolute left-0 bottom-full mb-2 w-56 rounded-xl border border-[#2A2F3F] bg-[#11141D] shadow-xl z-50 p-1">
                            <div className="px-2 py-1 text-[11px] uppercase tracking-wide text-[#8E95A8]">
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
                                        className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-[13px] transition-colors ${
                                            isActive
                                                ? "bg-[#202432] text-[#E8EAF1]"
                                                : "text-[#C8CEDB] hover:bg-[#202432] hover:text-[#E8EAF1]"
                                        }`}
                                    >
                                        <span
                                            className="w-2 h-2 rounded-full flex-shrink-0"
                                            style={{ backgroundColor: statusColors[status] }}
                                        />
                                        <span className="flex-1 text-left">{statusLabels[status]}</span>
                                        {isActive && <Check className="w-3.5 h-3.5 text-[#AAB1C0]" />}
                                    </button>
                                );
                            })}
                        </div>
                    )}
                </div>

                <div className="ml-1 flex items-center gap-0.5 flex-shrink-0">
                    <button
                        onClick={handleMuteToggle}
                        className={`w-7 h-7 rounded-md flex items-center justify-center transition-colors ${
                            isMuted
                                ? "text-danger hover:bg-danger/15"
                                : "text-[#B3B9C7] hover:text-[#E8EAF1] hover:bg-[#202432]"
                        }`}
                        title={isMuted ? "Unmute" : "Mute"}
                    >
                        {isMuted ? <MicOff className="w-[15px] h-[15px]" /> : <Mic className="w-[15px] h-[15px]" />}
                    </button>
                    <div className="relative" ref={inputMenuRef}>
                        <button
                            onClick={() => {
                                setShowInputMenu((prev) => !prev);
                                setShowOutputMenu(false);
                                setShowStatusMenu(false);
                            }}
                            className="w-4.5 h-7 rounded-md hover:bg-[#202432] flex items-center justify-center text-[#8E95A8] hover:text-[#E8EAF1] transition-colors"
                            title="Microphone Options"
                            aria-haspopup="menu"
                            aria-expanded={showInputMenu}
                        >
                            <ChevronDown className="w-3 h-3" />
                        </button>
                        {showInputMenu && (
                            <div className="absolute right-0 bottom-full mb-2 w-[280px] rounded-xl border border-[#2A2F3F] bg-[#11141D] shadow-xl z-50 p-3">
                                <div className="text-[13px] font-semibold text-[#E8EAF1] mb-1.5">Input Device</div>
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
                                                        window.localStorage.setItem("veyra-input-device-id", id);
                                                    }
                                                }}
                                                className={`w-full text-left px-2 py-1.5 rounded-md text-[13px] transition-colors ${
                                                    selected
                                                        ? "bg-[#202432] text-[#E8EAF1]"
                                                        : "text-[#C8CEDB] hover:bg-[#202432] hover:text-[#E8EAF1]"
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

                                <div className="h-px bg-[#2A2F3F] my-3" />
                                <div className="text-[13px] font-semibold text-[#E8EAF1] mb-2">Input Level</div>
                                <input
                                    type="range"
                                    min={0}
                                    max={100}
                                    value={inputVolume}
                                    onChange={(e) => {
                                        const value = Number(e.target.value);
                                        setInputVolume(value);
                                        if (typeof window !== "undefined") {
                                            window.localStorage.setItem("veyra-input-volume", String(value));
                                        }
                                    }}
                                    className="w-full h-1.5 accent-[#5865F2] cursor-pointer"
                                />

                                <div className="h-px bg-[#2A2F3F] my-3" />
                                <button
                                    onClick={() => {
                                        setShowInputMenu(false);
                                        onOpenSettings();
                                    }}
                                    className="w-full flex items-center justify-between px-1 py-1 text-[13px] text-[#E8EAF1] hover:text-white"
                                >
                                    <span>Voice Settings</span>
                                    <Settings className="w-4 h-4 text-[#AAB1C0]" />
                                </button>
                            </div>
                        )}
                    </div>
                    <button
                        onClick={handleDeafenToggle}
                        className={`w-7 h-7 rounded-md flex items-center justify-center transition-colors ${
                            isDeafened
                                ? "text-danger hover:bg-danger/15"
                                : "text-[#B3B9C7] hover:text-[#E8EAF1] hover:bg-[#202432]"
                        }`}
                        title={isDeafened ? "Undeafen" : "Deafen"}
                    >
                        {isDeafened ? (
                            <HeadphoneOff className="w-[15px] h-[15px]" />
                        ) : (
                            <Headphones className="w-[15px] h-[15px]" />
                        )}
                    </button>
                    <div className="relative" ref={outputMenuRef}>
                        <button
                            onClick={() => {
                                setShowOutputMenu((prev) => !prev);
                                setShowInputMenu(false);
                                setShowStatusMenu(false);
                            }}
                            className="w-4.5 h-7 rounded-md hover:bg-[#202432] flex items-center justify-center text-[#8E95A8] hover:text-[#E8EAF1] transition-colors"
                            title="Sound Options"
                            aria-haspopup="menu"
                            aria-expanded={showOutputMenu}
                        >
                            <ChevronDown className="w-3 h-3" />
                        </button>
                        {showOutputMenu && (
                            <div className="absolute right-0 bottom-full mb-2 w-[280px] rounded-xl border border-[#2A2F3F] bg-[#11141D] shadow-xl z-50 p-3">
                                <div className="text-[13px] font-semibold text-[#E8EAF1] mb-1.5">Output Device</div>
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
                                                        window.localStorage.setItem("veyra-output-device-id", id);
                                                    }
                                                    applyOutputDevice(id);
                                                }}
                                                className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-[13px] transition-colors ${
                                                    selected
                                                        ? "bg-[#202432] text-[#E8EAF1]"
                                                        : "text-[#C8CEDB] hover:bg-[#202432] hover:text-[#E8EAF1]"
                                                }`}
                                                title={label}
                                            >
                                                <span className="flex-1 truncate text-left">{label}</span>
                                                {selected && <ChevronRight className="w-3.5 h-3.5 text-[#AAB1C0] flex-shrink-0" />}
                                            </button>
                                        );
                                    })}
                                </div>

                                <div className="h-px bg-[#2A2F3F] my-3" />
                                <div className="text-[13px] font-semibold text-[#E8EAF1] mb-2">Output Volume</div>
                                <input
                                    type="range"
                                    min={0}
                                    max={100}
                                    value={outputVolume}
                                    onChange={(e) => {
                                        const value = Number(e.target.value);
                                        setOutputVolume(value);
                                        if (typeof window !== "undefined") {
                                            window.localStorage.setItem("veyra-output-volume", String(value));
                                        }
                                        applyOutputVolume(value);
                                    }}
                                    className="w-full h-1.5 accent-[#5865F2] cursor-pointer"
                                />

                                <div className="h-px bg-[#2A2F3F] my-3" />
                                <button
                                    onClick={() => {
                                        setShowOutputMenu(false);
                                        onOpenSettings();
                                    }}
                                    className="w-full flex items-center justify-between px-1 py-1 text-[13px] text-[#E8EAF1] hover:text-white"
                                >
                                    <span>Voice Settings</span>
                                    <Settings className="w-4 h-4 text-[#AAB1C0]" />
                                </button>
                            </div>
                        )}
                    </div>
                    <button
                        onClick={() => setNoiseSuppression(!noiseSuppression)}
                        className={`w-7 h-7 rounded-md flex items-center justify-center transition-colors ${
                            noiseSuppression
                                ? "text-accent-teal hover:bg-accent-teal/15"
                                : "text-[#B3B9C7] hover:text-[#E8EAF1] hover:bg-[#202432]"
                        }`}
                        title={noiseSuppression ? "Disable Noise Suppression" : "Enable Noise Suppression"}
                    >
                        <AudioLines className="w-[15px] h-[15px]" />
                    </button>
                    <button
                        onClick={onOpenSettings}
                        className="w-7 h-7 rounded-md hover:bg-[#202432] flex items-center justify-center text-[#B3B9C7] hover:text-[#E8EAF1] transition-colors"
                        title="Settings"
                    >
                        <Settings className="w-[15px] h-[15px]" />
                    </button>
                </div>
            </div>
            <span className="sr-only">{userStatusLabel}</span>
        </div>
    );
}
