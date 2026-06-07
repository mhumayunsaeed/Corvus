"use client";

import { useCallback, useState, useRef, useEffect } from "react";
import {
    Mic,
    MicOff,
    Headphones,
    HeadphoneOff,
    MonitorUp,
    Video,
    VideoOff,
    PhoneOff,
    Maximize2,
    Settings,
    ChevronUp,
    Check,
    AudioLines,
    Volume2,
} from "lucide-react";
import { useVoiceStore } from "@/stores/voice-store";
import { SCREEN_SHARE_PRESETS, type ScreenShareQuality } from "@/stores/voice-store";
import { leaveVoiceChannel } from "@/lib/api";

interface VoiceControlBarProps {
    onToggleVoiceView?: () => void;
    onMuteToggle?: (muted: boolean) => void;
    onDeafenToggle?: (deafened: boolean) => void;
    onScreenShareToggle?: (sharing: boolean) => void;
    onVideoToggle?: (video: boolean) => void;
}

export function VoiceControlBar({
    onToggleVoiceView,
    onMuteToggle,
    onDeafenToggle,
    onScreenShareToggle,
    onVideoToggle,
}: VoiceControlBarProps) {
    const channelName = useVoiceStore((s) => s.currentChannelName);
    const serverName = useVoiceStore((s) => s.currentServerName);
    const channelId = useVoiceStore((s) => s.currentChannelId);
    const isMuted = useVoiceStore((s) => s.isMuted);
    const isDeafened = useVoiceStore((s) => s.isDeafened);
    const hasVideo = useVoiceStore((s) => s.hasVideo);
    const isScreenSharing = useVoiceStore((s) => s.isScreenSharing);
    const screenShareQuality = useVoiceStore((s) => s.screenShareQuality);
    const setLocalMuted = useVoiceStore((s) => s.setLocalMuted);
    const setLocalDeafened = useVoiceStore((s) => s.setLocalDeafened);
    const setLocalVideo = useVoiceStore((s) => s.setLocalVideo);
    const setLocalScreenSharing = useVoiceStore((s) => s.setLocalScreenSharing);
    const setScreenShareQuality = useVoiceStore((s) => s.setScreenShareQuality);
    const noiseSuppression = useVoiceStore((s) => s.noiseSuppression);
    const setNoiseSuppression = useVoiceStore((s) => s.setNoiseSuppression);
    const pttEnabled = useVoiceStore((s) => s.pttEnabled);
    const pttActive = useVoiceStore((s) => s.pttActive);
    const voiceLeave = useVoiceStore((s) => s.leaveChannel);
    const [showQualityPicker, setShowQualityPicker] = useState(false);
    const [isLeaving, setIsLeaving] = useState(false);
    const qualityPickerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (qualityPickerRef.current && !qualityPickerRef.current.contains(e.target as Node)) {
                setShowQualityPicker(false);
            }
        };
        if (showQualityPicker) {
            document.addEventListener("mousedown", handleClickOutside);
        }
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [showQualityPicker]);

    const handleMuteToggle = useCallback(() => {
        const newMuted = !isMuted;
        setLocalMuted(newMuted);
        onMuteToggle?.(newMuted);
    }, [isMuted, setLocalMuted, onMuteToggle]);

    const handleDeafenToggle = useCallback(() => {
        const newDeafened = !isDeafened;
        setLocalDeafened(newDeafened);
        onDeafenToggle?.(newDeafened);
        if (newDeafened) {
            if (!isMuted) { setLocalMuted(true); onMuteToggle?.(true); }
        } else {
            if (isMuted) { setLocalMuted(false); onMuteToggle?.(false); }
        }
    }, [isDeafened, isMuted, setLocalDeafened, setLocalMuted, onDeafenToggle, onMuteToggle]);

    const handleScreenShareToggle = useCallback(() => {
        const newSharing = !isScreenSharing;
        setLocalScreenSharing(newSharing);
        onScreenShareToggle?.(newSharing);
    }, [isScreenSharing, setLocalScreenSharing, onScreenShareToggle]);

    const handleVideoToggle = useCallback(() => {
        const newVideo = !hasVideo;
        setLocalVideo(newVideo);
        onVideoToggle?.(newVideo);
    }, [hasVideo, setLocalVideo, onVideoToggle]);

    const handleEndCall = useCallback(async () => {
        if (isLeaving) return;
        setIsLeaving(true);
        if (channelId) {
            try {
                await leaveVoiceChannel(channelId);
            } catch (err) {
                console.error("Failed to leave voice channel:", err);
            }
        }
        voiceLeave();
    }, [channelId, voiceLeave, isLeaving]);

    if (!channelId) return null;

    // Shared styles
    const ctrlBase = "h-9 px-3 rounded-xl flex items-center justify-center gap-1.5 font-medium text-[13px] transition-all duration-150";
    const ctrlIdle = "bg-surface-raised text-text-secondary hover:bg-hover-row-strong hover:text-text-primary";
    const ctrlActive = "bg-live/15 text-live border border-live/25";
    const ctrlDanger = "bg-danger/15 text-danger border border-danger/25";

    return (
        <div
            className="flex h-[54px] flex-shrink-0 items-center gap-3 border-t border-border-subtle px-4"
            style={{
                background:
                    "linear-gradient(to bottom, rgb(var(--c-channel-sidebar)), rgb(var(--c-background)))",
            }}
        >
            {/* Left: live status */}
            <button
                onClick={onToggleVoiceView}
                className="group flex min-w-0 max-w-[180px] items-center gap-2.5 transition-opacity hover:opacity-80"
            >
                <span className="relative flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg border border-live/25 bg-live/10">
                    <Volume2 className="h-3.5 w-3.5 text-live" />
                    <span className="absolute -right-0.5 -top-0.5 flex h-2.5 w-2.5">
                        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-live opacity-60" />
                        <span className="relative inline-flex h-2.5 w-2.5 rounded-full border-2 border-channel-sidebar bg-live" />
                    </span>
                </span>
                <div className="min-w-0 text-left">
                    <div className="flex items-center gap-1.5">
                        <span className="text-[10px] font-bold uppercase tracking-[0.1em] text-live">
                            Live
                        </span>
                        <span className="truncate text-[12px] font-semibold leading-tight text-text-primary">
                            {channelName}
                        </span>
                    </div>
                    {serverName && (
                        <div className="truncate text-[11px] leading-tight text-text-faint">
                            {serverName}
                        </div>
                    )}
                </div>
            </button>

            <div className="w-px h-6 bg-border flex-shrink-0" />

            {/* Center: controls */}
            <div className="flex-1 flex items-center justify-center gap-1.5">
                {/* Mute */}
                <div className="relative">
                    <button
                        onClick={handleMuteToggle}
                        className={`${ctrlBase} w-9 ${isMuted ? ctrlDanger : ctrlIdle}`}
                        title={isMuted ? "Unmute" : "Mute"}
                    >
                        {isMuted ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                    </button>
                    {pttEnabled && (
                        <span
                            className={`absolute -top-1.5 -right-1.5 px-1 py-px rounded text-[9px] font-bold uppercase leading-none transition-all ${
                                pttActive
                                    ? "bg-live text-white shadow-glow-teal-sm scale-110"
                                    : "bg-surface-raised text-text-faint border border-border text-[8px]"
                            }`}
                        >
                            {pttActive ? "LIVE" : "PTT"}
                        </span>
                    )}
                </div>

                {/* Deafen */}
                <button
                    onClick={handleDeafenToggle}
                    className={`${ctrlBase} w-9 ${isDeafened ? ctrlDanger : ctrlIdle}`}
                    title={isDeafened ? "Undeafen" : "Deafen"}
                >
                    {isDeafened ? <HeadphoneOff className="w-4 h-4" /> : <Headphones className="w-4 h-4" />}
                </button>

                {/* Screen Share + Quality */}
                <div className="relative flex items-center" ref={qualityPickerRef}>
                    <button
                        onClick={handleScreenShareToggle}
                        className={`${ctrlBase} rounded-r-none border-r border-border/30 w-9 ${isScreenSharing ? ctrlActive : ctrlIdle}`}
                        title={isScreenSharing ? "Stop Sharing" : "Share Screen"}
                    >
                        <MonitorUp className="w-4 h-4" />
                    </button>
                    <button
                        onClick={() => setShowQualityPicker(!showQualityPicker)}
                        className={`h-9 w-5 rounded-r-xl flex items-center justify-center transition-all ${
                            isScreenSharing ? ctrlActive : ctrlIdle
                        }`}
                        title="Quality"
                    >
                        <ChevronUp className={`w-3 h-3 transition-transform ${showQualityPicker ? "rotate-180" : ""}`} />
                    </button>
                    {showQualityPicker && (
                        <div className="absolute bottom-full left-0 mb-2 w-44 bg-surface-overlay border border-border-highlight rounded-xl shadow-float-lg py-1.5 z-50 animate-slide-up">
                            <div className="px-3 py-1 text-[10px] text-text-faint font-semibold uppercase tracking-[0.08em]">
                                Stream Quality
                            </div>
                            {(Object.entries(SCREEN_SHARE_PRESETS) as [ScreenShareQuality, typeof SCREEN_SHARE_PRESETS[ScreenShareQuality]][]).map(([key, preset]) => (
                                <button
                                    key={key}
                                    onClick={() => { setScreenShareQuality(key); setShowQualityPicker(false); }}
                                    className={`w-full px-3 py-1.5 text-left text-[13px] flex items-center justify-between hover:bg-hover-row transition-colors ${
                                        screenShareQuality === key ? "text-live" : "text-text-secondary"
                                    }`}
                                >
                                    <span>{preset ? preset.label : "Source"}</span>
                                    {screenShareQuality === key && <Check className="w-3.5 h-3.5" />}
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                {/* Camera */}
                <button
                    onClick={handleVideoToggle}
                    className={`${ctrlBase} w-9 ${hasVideo ? ctrlActive : ctrlIdle}`}
                    title={hasVideo ? "Turn Off Camera" : "Turn On Camera"}
                >
                    {hasVideo ? <Video className="w-4 h-4" /> : <VideoOff className="w-4 h-4" />}
                </button>

                {/* Noise Suppression */}
                <button
                    onClick={() => setNoiseSuppression(!noiseSuppression)}
                    className={`${ctrlBase} w-9 ${noiseSuppression ? ctrlActive : ctrlIdle}`}
                    title={noiseSuppression ? "Disable Noise Suppression" : "Enable Noise Suppression"}
                >
                    <AudioLines className="w-4 h-4" />
                </button>

                {/* End Call */}
                <button
                    onClick={handleEndCall}
                    disabled={isLeaving}
                    className={`${ctrlBase} px-3.5 bg-danger hover:bg-danger/85 text-white rounded-xl ${isLeaving ? "opacity-50 cursor-not-allowed" : ""}`}
                    title="Disconnect"
                >
                    <PhoneOff className="w-4 h-4" />
                </button>
            </div>

            {/* Right: expand + settings */}
            <div className="w-px h-6 bg-border flex-shrink-0" />
            <div className="flex items-center gap-1">
                <button
                    onClick={onToggleVoiceView}
                    className="w-8 h-8 rounded-lg hover:bg-hover-row flex items-center justify-center text-text-faint hover:text-text-secondary transition-colors"
                    title="Toggle Voice View"
                >
                    <Maximize2 className="w-3.5 h-3.5" />
                </button>
                <button className="w-8 h-8 rounded-lg hover:bg-hover-row flex items-center justify-center text-text-faint hover:text-text-secondary transition-colors">
                    <Settings className="w-3.5 h-3.5" />
                </button>
            </div>
        </div>
    );
}
