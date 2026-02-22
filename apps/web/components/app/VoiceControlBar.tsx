"use client";

import { useCallback } from "react";
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
} from "lucide-react";
import { useVoiceStore } from "@/stores/voice-store";
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
    const setLocalMuted = useVoiceStore((s) => s.setLocalMuted);
    const setLocalDeafened = useVoiceStore((s) => s.setLocalDeafened);
    const setLocalVideo = useVoiceStore((s) => s.setLocalVideo);
    const setLocalScreenSharing = useVoiceStore((s) => s.setLocalScreenSharing);
    const voiceLeave = useVoiceStore((s) => s.leaveChannel);

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
                {/* Mute */}
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

                {/* Screen Share */}
                <button
                    onClick={handleScreenShareToggle}
                    className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${
                        isScreenSharing
                            ? "bg-accent-teal/20 text-accent-teal hover:bg-accent-teal/30"
                            : "bg-surface-raised text-text-primary hover:bg-hover-row"
                    }`}
                    title={isScreenSharing ? "Stop Sharing" : "Share Screen"}
                >
                    <MonitorUp className="w-5 h-5" />
                </button>

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
