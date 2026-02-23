"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
    LiveKitRoom,
    RoomAudioRenderer,
    useParticipants,
    useTracks,
    VideoTrack,
    useIsSpeaking,
    useRoomContext,
} from "@livekit/components-react";
import { Track } from "livekit-client";
import type { Participant } from "livekit-client";
import {
    Mic,
    MicOff,
    Video,
    VideoOff,
    MonitorUp,
    PhoneOff,
    X,
    Wifi,
    ChevronUp,
    Check,
} from "lucide-react";
import { useRingtone } from "@/hooks/useRingtone";
import { SCREEN_SHARE_PRESETS, type ScreenShareQuality } from "@/stores/voice-store";

interface CallModalProps {
    onClose: () => void;
    token: string;
    url: string;
    callerName?: string;
    initialVideo?: boolean;
    className?: string;
}

function CallParticipantTile({ participant }: { participant: Participant }) {
    const isSpeaking = useIsSpeaking(participant);
    const tracks = useTracks([Track.Source.Camera]);
    const trackRef = tracks.find((t) => t.participant.identity === participant.identity);
    const hasVideo = !!(trackRef?.publication && !trackRef.publication.isMuted);
    const displayName = participant.name || participant.identity;
    const avatarUrl = `https://api.dicebear.com/9.x/avataaars/svg?seed=${participant.identity}`;

    return (
        <div
            className={`relative bg-surface rounded-xl overflow-hidden flex flex-col items-center justify-center aspect-video transition-all duration-200 ${isSpeaking
                ? "ring-2 ring-accent-teal shadow-[0_0_16px_rgba(62,207,207,0.3)]"
                : "ring-1 ring-border"
                }`}
        >
            {hasVideo && trackRef ? (
                <VideoTrack trackRef={trackRef} className="w-full h-full object-cover" />
            ) : (
                <img
                    src={avatarUrl}
                    alt={displayName}
                    className={`w-20 h-20 rounded-full ${isSpeaking ? "ring-[3px] ring-accent-teal" : ""
                        }`}
                />
            )}
            <span className="absolute bottom-2 left-2 text-micro font-medium text-text-primary bg-black/50 px-2 py-0.5 rounded-md">
                {displayName}
            </span>
        </div>
    );
}

function CallLatency() {
    const room = useRoomContext();
    const [latency, setLatency] = useState<number | null>(null);

    useEffect(() => {
        const measure = () => {
            try {
                const engine = room.engine as any;
                const rtt = engine?.latency;
                if (typeof rtt === "number" && rtt > 0) {
                    setLatency(Math.round(rtt * 1000));
                    return;
                }
                const lp = room.localParticipant;
                if (lp) {
                    const q = lp.connectionQuality;
                    if (q === "excellent") setLatency(25);
                    else if (q === "good") setLatency(75);
                    else if (q === "poor") setLatency(200);
                    else setLatency(null);
                }
            } catch { /* ignore */ }
        };
        measure();
        const interval = setInterval(measure, 3000);
        return () => clearInterval(interval);
    }, [room]);

    if (latency === null) return null;
    const color = latency < 80 ? "text-success" : latency < 150 ? "text-yellow-500" : "text-danger";

    return (
        <div className={`flex items-center gap-1.5 ${color}`}>
            <Wifi className="w-3.5 h-3.5" />
            <span className="text-micro font-medium">{latency}ms</span>
        </div>
    );
}

function CallContent({
    onClose,
    initialVideo = false,
}: {
    onClose: () => void;
    initialVideo?: boolean;
}) {
    const participants = useParticipants();
    const room = useRoomContext();
    const [isMuted, setIsMuted] = useState(false);
    const [hasVideo, setHasVideo] = useState(initialVideo);
    const [isScreenSharing, setIsScreenSharing] = useState(false);
    const [screenShareQuality, setScreenShareQuality] = useState<ScreenShareQuality>("1080p30");
    const [showQualityPicker, setShowQualityPicker] = useState(false);
    const qualityPickerRef = useRef<HTMLDivElement>(null);

    const ringing = participants.length <= 1;
    useRingtone(ringing, "outgoing");

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

    // Sync mute to LiveKit
    useEffect(() => {
        room.localParticipant?.setMicrophoneEnabled(!isMuted).catch(console.error);
    }, [isMuted, room]);

    // Sync video to LiveKit
    useEffect(() => {
        room.localParticipant?.setCameraEnabled(hasVideo).catch(console.error);
    }, [hasVideo, room]);

    // Sync screen share to LiveKit with quality options
    useEffect(() => {
        if (isScreenSharing) {
            const preset = SCREEN_SHARE_PRESETS[screenShareQuality];
            const opts = preset ? {
                resolution: { width: preset.width, height: preset.height, frameRate: preset.frameRate },
                contentHint: "detail" as const,
            } : undefined;
            room.localParticipant?.setScreenShareEnabled(true, opts).catch(console.error);
        } else {
            room.localParticipant?.setScreenShareEnabled(false).catch(console.error);
        }
    }, [isScreenSharing, screenShareQuality, room]);

    const handleEndCall = useCallback(() => {
        onClose();
    }, [onClose]);

    const gridClass =
        participants.length <= 1
            ? "grid-cols-1 max-w-[320px] mx-auto"
            : participants.length <= 4
                ? "grid-cols-2 max-w-[720px] mx-auto"
                : "grid-cols-3 max-w-[980px] mx-auto";

    return (
        <div className="flex-1 flex flex-col">
            {/* Participants */}
            <div className="flex-1 min-h-0 flex items-center justify-center p-4 relative overflow-y-auto">
                {/* Latency display */}
                <div className="absolute top-2 right-4">
                    <CallLatency />
                </div>

                <div className={`grid ${gridClass} gap-3 w-full`}>
                    {participants.map((p) => (
                        <CallParticipantTile key={p.identity} participant={p} />
                    ))}
                </div>
            </div>

            <RoomAudioRenderer />

            {/* Controls */}
            <div className="h-16 bg-surface border-t border-border flex items-center justify-center gap-3">
                <button
                    onClick={() => setIsMuted(!isMuted)}
                    className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${isMuted
                        ? "bg-danger/20 text-danger"
                        : "bg-surface-raised text-text-primary hover:bg-hover-row"
                        }`}
                    title={isMuted ? "Unmute" : "Mute"}
                >
                    {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
                </button>
                <button
                    onClick={() => setHasVideo(!hasVideo)}
                    className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${hasVideo
                        ? "bg-accent-teal/20 text-accent-teal"
                        : "bg-surface-raised text-text-primary hover:bg-hover-row"
                        }`}
                    title={hasVideo ? "Turn off camera" : "Turn on camera"}
                >
                    {hasVideo ? <Video className="w-5 h-5" /> : <VideoOff className="w-5 h-5" />}
                </button>
                <div className="relative" ref={qualityPickerRef}>
                    <div className="flex items-center">
                        <button
                            onClick={() => setIsScreenSharing(!isScreenSharing)}
                            className={`w-10 h-10 rounded-l-full flex items-center justify-center transition-all ${isScreenSharing
                                ? "bg-accent-teal/20 text-accent-teal"
                                : "bg-surface-raised text-text-primary hover:bg-hover-row"
                                }`}
                            title={isScreenSharing ? "Stop sharing" : "Share screen"}
                        >
                            <MonitorUp className="w-5 h-5" />
                        </button>
                        <button
                            onClick={() => setShowQualityPicker(!showQualityPicker)}
                            className={`w-5 h-10 rounded-r-full flex items-center justify-center transition-all border-l border-border/50 ${isScreenSharing
                                ? "bg-accent-teal/20 text-accent-teal"
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
                                    className={`w-full px-3 py-1.5 text-left text-body flex items-center justify-between hover:bg-hover-row transition-colors ${screenShareQuality === key ? "text-accent-teal" : "text-text-primary"
                                        }`}
                                >
                                    <span>{preset ? preset.label : "Source Quality"}</span>
                                    {screenShareQuality === key && <Check className="w-4 h-4" />}
                                </button>
                            ))}
                        </div>
                    )}
                </div>
                <button
                    onClick={handleEndCall}
                    className="w-12 h-10 rounded-full bg-danger hover:bg-danger/80 flex items-center justify-center text-white transition-all"
                    title="End call"
                >
                    <PhoneOff className="w-5 h-5" />
                </button>
            </div>
        </div>
    );
}

export function CallModal({
    onClose,
    token,
    url,
    initialVideo = false,
    className = "",
}: CallModalProps) {
    return (
        <div className={`h-[52vh] min-h-[360px] max-h-[700px] flex flex-col bg-background border-b border-border ${className}`}>
            {/* Header */}
            <div className="h-12 flex items-center justify-between px-4 border-b border-border">
                <span className="text-emphasis font-semibold text-text-primary">Call</span>
                <button
                    onClick={onClose}
                    className="w-8 h-8 rounded-md hover:bg-hover-row flex items-center justify-center text-text-muted hover:text-text-primary transition-colors"
                >
                    <X className="w-5 h-5" />
                </button>
            </div>

            <LiveKitRoom
                token={token}
                serverUrl={url}
                connect={true}
                audio={true}
                video={initialVideo}
                className="flex-1 flex flex-col"
            >
                <CallContent
                    onClose={onClose}
                    initialVideo={initialVideo}
                />
            </LiveKitRoom>
        </div>
    );
}
