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
        // When deafening, also mute
        if (newDeafened && !isMuted) {
            setLocalMuted(true);
            onMuteToggle?.(true);
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
        if (channelId) {
            try {
                await leaveVoiceChannel(channelId);
            } catch (err) {
                console.error("Failed to leave voice channel:", err);
            }
        }
        voiceLeave();
    }, [channelId, voiceLeave]);

    if (!channelId) return null;

    return (
        <div className="h-16 bg-surface border-t border-border flex items-center px-4 gap-4 flex-shrink-0">
            {/* Left zone: channel info */}
            <button
                onClick={onToggleVoiceView}
                className="flex flex-col min-w-0 hover:opacity-80 transition-opacity"
            >
                <span className="text-body font-medium text-accent-teal truncate leading-tight">
                    {channelName}
                </span>
                <span className="text-micro text-text-muted truncate leading-tight">
                    {serverName}
                </span>
            </button>

            {/* Center zone: controls */}
            <div className="flex-1 flex items-center justify-center gap-2">
                {/* Mute + PTT indicator */}
                <div className="relative">
                    <button
                        onClick={handleMuteToggle}
                        className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${
                            isMuted
                                ? "bg-danger/20 text-danger hover:bg-danger/30"
                                : "bg-surface-raised text-text-primary hover:bg-hover-row"
                        }`}
                        title={isMuted ? "Unmute" : "Mute"}
                    >
                        {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
                    </button>
                    {pttEnabled && (
                        <span
                            className={`absolute -top-1 -right-1 px-1 py-0.5 rounded text-[9px] font-bold uppercase leading-none transition-colors ${
                                pttActive
                                    ? "bg-accent-teal text-white animate-pulse"
                                    : "bg-surface-raised text-text-muted border border-border"
                            }`}
                        >
                            PTT
                        </span>
                    )}
                </div>

                {/* Deafen */}
                <button
                    onClick={handleDeafenToggle}
                    className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${
                        isDeafened
                            ? "bg-danger/20 text-danger hover:bg-danger/30"
                            : "bg-surface-raised text-text-primary hover:bg-hover-row"
                    }`}
                    title={isDeafened ? "Undeafen" : "Deafen"}
                >
                    {isDeafened ? (
                        <HeadphoneOff className="w-5 h-5" />
                    ) : (
                        <Headphones className="w-5 h-5" />
                    )}
                </button>

                {/* Screen Share with Quality Picker */}
                <div className="relative" ref={qualityPickerRef}>
                    <div className="flex items-center">
                        <button
                            onClick={handleScreenShareToggle}
                            className={`w-10 h-10 rounded-l-full flex items-center justify-center transition-all ${
                                isScreenSharing
                                    ? "bg-accent-teal/20 text-accent-teal hover:bg-accent-teal/30"
                                    : "bg-surface-raised text-text-primary hover:bg-hover-row"
                            }`}
                            title={isScreenSharing ? "Stop Sharing" : "Share Screen"}
                        >
                            <MonitorUp className="w-5 h-5" />
                        </button>
                        <button
                            onClick={() => setShowQualityPicker(!showQualityPicker)}
                            className={`w-5 h-10 rounded-r-full flex items-center justify-center transition-all border-l border-border/50 ${
                                isScreenSharing
                                    ? "bg-accent-teal/20 text-accent-teal hover:bg-accent-teal/30"
                                    : "bg-surface-raised text-text-primary hover:bg-hover-row"
                            }`}
                            title="Screen Share Quality"
                        >
                            <ChevronUp className="w-3 h-3" />
                        </button>
                    </div>
                    {showQualityPicker && (
                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 bg-surface-raised border border-border rounded-lg shadow-xl py-1 z-50">
                            <div className="px-3 py-1.5 text-micro text-text-muted font-medium uppercase tracking-wider">
                                Stream Quality
                            </div>
                            {(Object.entries(SCREEN_SHARE_PRESETS) as [ScreenShareQuality, typeof SCREEN_SHARE_PRESETS[ScreenShareQuality]][]).map(([key, preset]) => (
                                <button
                                    key={key}
                                    onClick={() => {
                                        setScreenShareQuality(key);
                                        setShowQualityPicker(false);
                                    }}
                                    className={`w-full px-3 py-1.5 text-left text-body flex items-center justify-between hover:bg-hover-row transition-colors ${
                                        screenShareQuality === key ? "text-accent-teal" : "text-text-primary"
                                    }`}
                                >
                                    <span>{preset ? preset.label : "Source Quality"}</span>
                                    {screenShareQuality === key && <Check className="w-4 h-4" />}
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                {/* Camera */}
                <button
                    onClick={handleVideoToggle}
                    className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${
                        hasVideo
                            ? "bg-accent-teal/20 text-accent-teal hover:bg-accent-teal/30"
                            : "bg-surface-raised text-text-primary hover:bg-hover-row"
                    }`}
                    title={hasVideo ? "Turn Off Camera" : "Turn On Camera"}
                >
                    {hasVideo ? <Video className="w-5 h-5" /> : <VideoOff className="w-5 h-5" />}
                </button>

                {/* Noise Suppression */}
                <button
                    onClick={() => setNoiseSuppression(!noiseSuppression)}
                    className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${
                        noiseSuppression
                            ? "bg-accent-teal/20 text-accent-teal hover:bg-accent-teal/30"
                            : "bg-surface-raised text-text-primary hover:bg-hover-row"
                    }`}
                    title={noiseSuppression ? "Disable Noise Suppression" : "Enable Noise Suppression"}
                >
                    <AudioLines className="w-5 h-5" />
                </button>

                {/* End Call */}
                <button
                    onClick={handleEndCall}
                    className="w-12 h-10 rounded-full bg-danger hover:bg-danger/80 flex items-center justify-center text-white transition-all"
                    title="Disconnect"
                >
                    <PhoneOff className="w-5 h-5" />
                </button>
            </div>

            {/* Right zone */}
            <div className="flex items-center gap-1">
                <button
                    onClick={onToggleVoiceView}
                    className="w-8 h-8 rounded-md hover:bg-hover-row flex items-center justify-center text-text-muted hover:text-text-primary transition-colors"
                    title="Toggle Voice View"
                >
                    <Maximize2 className="w-4 h-4" />
                </button>
                <button className="w-8 h-8 rounded-md hover:bg-hover-row flex items-center justify-center text-text-muted hover:text-text-primary transition-colors">
                    <Settings className="w-4 h-4" />
                </button>
            </div>
        </div>
    );
}
