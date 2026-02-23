"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import {
    LiveKitRoom,
    RoomAudioRenderer,
    useParticipants,
    useTracks,
    VideoTrack,
    useIsSpeaking,
    useRoomContext,
} from "@livekit/components-react";
import { Track, RoomEvent } from "livekit-client";
import type { Participant } from "livekit-client";
import {
    Mic,
    MicOff,
    Headphones,
    HeadphoneOff,
    Video,
    VideoOff,
    MonitorUp,
    PhoneOff,
    X,
    Wifi,
    ChevronUp,
    Check,
    AudioLines,
} from "lucide-react";
import { useRingtone } from "@/hooks/useRingtone";
import { useVoiceStore, SCREEN_SHARE_PRESETS, type ScreenShareQuality } from "@/stores/voice-store";
import type { DMParticipantData } from "@/lib/api";
import { createRoomOptions } from "@/lib/livekit-config";
import { useNoiseSuppression } from "@/hooks/useNoiseSuppression";

interface CallModalProps {
    onClose: () => void;
    token: string;
    url: string;
    callerName?: string;
    initialVideo?: boolean;
    participants?: DMParticipantData[];
    className?: string;
}

function getAvatarFromMetadata(participant: Participant): string | null {
    if (!participant.metadata) return null;
    try {
        const parsed = JSON.parse(participant.metadata) as { avatarUrl?: unknown };
        return typeof parsed.avatarUrl === "string" && parsed.avatarUrl.trim()
            ? parsed.avatarUrl
            : null;
    } catch {
        return null;
    }
}

function CallParticipantTile({
    participant,
    profile,
}: {
    participant: Participant;
    profile?: DMParticipantData;
}) {
    const isSpeaking = useIsSpeaking(participant);
    const tracks = useTracks([Track.Source.Camera]);
    const trackRef = tracks.find((t) => t.participant.identity === participant.identity);
    const hasVideo = !!(trackRef?.publication && !trackRef.publication.isMuted);
    const displayName = profile?.displayName || participant.name || participant.identity;
    const avatarUrl =
        profile?.avatarUrl ||
        getAvatarFromMetadata(participant) ||
        `https://api.dicebear.com/9.x/avataaars/svg?seed=${encodeURIComponent(profile?.username || participant.identity)}`;

    return (
        <div className="flex flex-col items-center justify-center gap-2 py-2">
            {hasVideo && trackRef ? (
                <div
                    className={`w-24 h-24 rounded-full overflow-hidden transition-all duration-200 ${isSpeaking ? "ring-[3px] ring-accent-teal shadow-[0_0_14px_rgba(62,207,207,0.35)]" : "ring-1 ring-border"
                        }`}
                >
                    <VideoTrack trackRef={trackRef} className="w-full h-full object-cover" />
                </div>
            ) : (
                <img
                    src={avatarUrl}
                    alt={displayName}
                    className={`w-24 h-24 rounded-full transition-all duration-200 ${isSpeaking ? "ring-[3px] ring-accent-teal shadow-[0_0_14px_rgba(62,207,207,0.35)]" : ""
                        }`}
                />
            )}
            <span className="text-micro font-medium text-text-primary px-1 text-center max-w-[12rem] truncate">
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
                // Fallback: estimate from connection quality
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
        const interval = setInterval(measure, 1000);
        return () => clearInterval(interval);
    }, [room]);

    if (latency === null) return null;
    const color = latency < 80 ? "text-success" : latency < 150 ? "text-yellow-500" : "text-danger";

    return (
        <div className={`flex items-center gap-1.5 px-2 py-1 rounded-md bg-surface-raised ${color}`}>
            <Wifi className="w-3.5 h-3.5" />
            <span className="text-micro font-medium">{latency}ms</span>
        </div>
    );
}

function CallScreenShareView() {
    const screenTracks = useTracks([Track.Source.ScreenShare]);

    if (screenTracks.length === 0) return null;

    const track = screenTracks[0];

    return (
        <div className="w-full rounded-xl overflow-hidden bg-surface ring-1 ring-border mb-3">
            <VideoTrack
                trackRef={track}
                className="w-full h-auto max-h-[50vh] object-contain bg-black"
            />
            <div className="px-3 py-1.5 flex items-center gap-2 bg-surface-raised">
                <MonitorUp className="w-4 h-4 text-accent-teal" />
                <span className="text-micro text-text-muted">
                    {track.participant.name || track.participant.identity}&apos;s screen
                </span>
            </div>
        </div>
    );
}

function CallContent({
    onClose,
    initialVideo = false,
    participants: participantProfiles = [],
}: {
    onClose: () => void;
    initialVideo?: boolean;
    participants?: DMParticipantData[];
}) {
    const roomParticipants = useParticipants();
    const room = useRoomContext();
    useNoiseSuppression();

    // Use voice store for shared state with sidebar/UserDock
    const isMuted = useVoiceStore((s) => s.isMuted);
    const isDeafened = useVoiceStore((s) => s.isDeafened);
    const hasVideo = useVoiceStore((s) => s.hasVideo);
    const isScreenSharing = useVoiceStore((s) => s.isScreenSharing);
    const screenShareQuality = useVoiceStore((s) => s.screenShareQuality);
    const noiseSuppression = useVoiceStore((s) => s.noiseSuppression);
    const setLocalMuted = useVoiceStore((s) => s.setLocalMuted);
    const setLocalDeafened = useVoiceStore((s) => s.setLocalDeafened);
    const setLocalVideo = useVoiceStore((s) => s.setLocalVideo);
    const setLocalScreenSharing = useVoiceStore((s) => s.setLocalScreenSharing);
    const setScreenShareQuality = useVoiceStore((s) => s.setScreenShareQuality);
    const setNoiseSuppression = useVoiceStore((s) => s.setNoiseSuppression);

    const [showQualityPicker, setShowQualityPicker] = useState(false);
    const qualityPickerRef = useRef<HTMLDivElement>(null);

    const ringing = roomParticipants.length <= 1;
    useRingtone(ringing, "outgoing");

    // Initialize video state from props on mount
    useEffect(() => {
        if (initialVideo) {
            setLocalVideo(true);
        }
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

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

    // Sync deafen state - mute all remote audio tracks
    useEffect(() => {
        for (const remoteParticipant of room.remoteParticipants.values()) {
            for (const pub of remoteParticipant.audioTrackPublications.values()) {
                if (pub.track?.mediaStreamTrack) {
                    pub.track.mediaStreamTrack.enabled = !isDeafened;
                }
            }
        }
    }, [isDeafened, room, roomParticipants]);

    // Sync screen share to LiveKit with quality options
    useEffect(() => {
        if (isScreenSharing) {
            const preset = SCREEN_SHARE_PRESETS[screenShareQuality];
            const opts = preset ? {
                resolution: { width: preset.width, height: preset.height, frameRate: preset.frameRate },
                contentHint: "detail" as const,
            } : undefined;
            room.localParticipant?.setScreenShareEnabled(true, opts).catch((err) => {
                // User cancelled the picker or an error occurred — sync state back
                console.error("Screen share failed:", err);
                setLocalScreenSharing(false);
            });
        } else {
            room.localParticipant?.setScreenShareEnabled(false).catch(console.error);
        }
    }, [isScreenSharing, screenShareQuality, room, setLocalScreenSharing]);

    // Listen for LiveKit screen share track ending (user clicks browser "stop sharing")
    useEffect(() => {
        const onTrackUnpublished = () => {
            const lp = room.localParticipant;
            if (lp && !lp.isScreenShareEnabled) {
                setLocalScreenSharing(false);
            }
        };
        room.on(RoomEvent.LocalTrackUnpublished, onTrackUnpublished);
        return () => { room.off(RoomEvent.LocalTrackUnpublished, onTrackUnpublished); };
    }, [room, setLocalScreenSharing]);

    const handleEndCall = useCallback(() => {
        onClose();
    }, [onClose]);

    const gridClass =
        roomParticipants.length <= 1
            ? "grid-cols-1 max-w-[320px] mx-auto"
            : roomParticipants.length <= 4
                ? "grid-cols-2 max-w-[720px] mx-auto"
                : "grid-cols-3 max-w-[980px] mx-auto";

    const profileById = new Map(participantProfiles.map((p) => [p.id, p]));

    return (
        <div className="flex-1 flex flex-col">
            {/* Participants */}
            <div className="flex-1 min-h-0 flex flex-col items-center justify-center p-4 relative overflow-y-auto">
                {/* Latency display */}
                <div className="absolute top-2 right-4 z-10">
                    <CallLatency />
                </div>

                <CallScreenShareView />

                <div className={`grid ${gridClass} gap-8 w-full justify-items-center`}>
                    {roomParticipants.map((p) => (
                        <CallParticipantTile
                            key={p.identity}
                            participant={p}
                            profile={profileById.get(p.identity)}
                        />
                    ))}
                </div>
            </div>

            <RoomAudioRenderer />

            {/* Controls */}
            <div className="h-16 bg-surface border-t border-border flex items-center justify-center gap-3">
                <button
                    onClick={() => setLocalMuted(!isMuted)}
                    className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${isMuted
                        ? "bg-danger/20 text-danger"
                        : "bg-surface-raised text-text-primary hover:bg-hover-row"
                        }`}
                    title={isMuted ? "Unmute" : "Mute"}
                >
                    {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
                </button>
                <button
                    onClick={() => {
                        const nextDeafened = !isDeafened;
                        setLocalDeafened(nextDeafened);
                        if (nextDeafened && !isMuted) {
                            setLocalMuted(true);
                        }
                    }}
                    className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${isDeafened
                        ? "bg-danger/20 text-danger hover:bg-danger/30"
                        : "bg-surface-raised text-text-primary hover:bg-hover-row"
                        }`}
                    title={isDeafened ? "Undeafen" : "Deafen"}
                >
                    {isDeafened ? <HeadphoneOff className="w-5 h-5" /> : <Headphones className="w-5 h-5" />}
                </button>
                <button
                    onClick={() => setLocalVideo(!hasVideo)}
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
                            onClick={() => setLocalScreenSharing(!isScreenSharing)}
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
                {/* Noise Suppression quick toggle */}
                <button
                    onClick={() => setNoiseSuppression(!noiseSuppression)}
                    className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${noiseSuppression
                        ? "bg-accent-teal/20 text-accent-teal"
                        : "bg-surface-raised text-text-primary hover:bg-hover-row"
                        }`}
                    title={noiseSuppression ? "Disable Noise Suppression" : "Enable Noise Suppression"}
                >
                    <AudioLines className="w-5 h-5" />
                </button>
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
    participants = [],
    className = "",
}: CallModalProps) {
    const roomOptions = useMemo(() => createRoomOptions(), []);
    const MIN_HEIGHT = 220;
    const DEFAULT_HEIGHT = 380;
    const MAX_HEIGHT_RATIO = 0.78;
    const [panelHeight, setPanelHeight] = useState(DEFAULT_HEIGHT);
    const dragStartRef = useRef<{ y: number; height: number } | null>(null);

    const clampHeight = useCallback((height: number) => {
        if (typeof window === "undefined") return Math.max(MIN_HEIGHT, height);
        const maxHeight = Math.floor(window.innerHeight * MAX_HEIGHT_RATIO);
        return Math.min(maxHeight, Math.max(MIN_HEIGHT, height));
    }, []);

    useEffect(() => {
        const handleResize = () => {
            setPanelHeight((current) => clampHeight(current));
        };
        handleResize();
        window.addEventListener("resize", handleResize);
        return () => window.removeEventListener("resize", handleResize);
    }, [clampHeight]);

    const handleDragStart = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
        dragStartRef.current = { y: e.clientY, height: panelHeight };
        e.currentTarget.setPointerCapture(e.pointerId);
    }, [panelHeight]);

    const handleDragMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
        if (!dragStartRef.current) return;
        const deltaY = e.clientY - dragStartRef.current.y;
        const nextHeight = clampHeight(dragStartRef.current.height + deltaY);
        setPanelHeight(nextHeight);
    }, [clampHeight]);

    const handleDragEnd = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
        dragStartRef.current = null;
        if (e.currentTarget.hasPointerCapture(e.pointerId)) {
            e.currentTarget.releasePointerCapture(e.pointerId);
        }
    }, []);

    return (
        <div
            className={`flex flex-col bg-background border-b border-border ${className}`}
            style={{ height: `${panelHeight}px` }}
        >
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
                options={roomOptions}
                className="flex-1 flex flex-col"
            >
                <CallContent
                    onClose={onClose}
                    initialVideo={initialVideo}
                    participants={participants}
                />
            </LiveKitRoom>

            <div
                onPointerDown={handleDragStart}
                onPointerMove={handleDragMove}
                onPointerUp={handleDragEnd}
                onPointerCancel={handleDragEnd}
                role="separator"
                aria-label="Resize call panel"
                aria-orientation="horizontal"
                className="h-3 cursor-row-resize flex items-center justify-center bg-background touch-none select-none"
                title="Drag to resize call panel"
            >
                <div className="w-12 h-1 rounded-full bg-border/80" />
            </div>
        </div>
    );
}
