"use client";

import { memo, useState, useEffect, useCallback, useRef, useMemo } from "react";
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
import type { Participant, TrackPublication } from "livekit-client";
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
    Maximize2,
    Minimize2,
} from "lucide-react";
import { useRingtone } from "@/hooks/useRingtone";
import { useVoiceStore, SCREEN_SHARE_PRESETS, type ScreenShareQuality } from "@/stores/voice-store";
import type { DMParticipantData } from "@/lib/api";
import { createRoomOptions } from "@/lib/livekit-config";
import { useNoiseSuppression } from "@/hooks/useNoiseSuppression";
import { useLivekitLatency } from "@/hooks/useLivekitLatency";
import { UserAvatar } from "./UserAvatar";
import { getUsernameColor } from "@/lib/color-utils";

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
    trackRef,
    isSmall = false,
}: {
    participant: Participant;
    profile?: DMParticipantData;
    trackRef: ReturnType<typeof useTracks>[number] | undefined;
    isSmall?: boolean;
}) {
    const isSpeaking = useIsSpeaking(participant);
    const hasVideo = !!(trackRef?.publication && !trackRef.publication.isMuted);
    const displayName = profile?.displayName || participant.name || participant.identity;
    const username = profile?.username || participant.identity;
    const avatarUrl = profile?.avatarUrl || getAvatarFromMetadata(participant);
    const userColor = getUsernameColor(username);

    if (isSmall) {
        return (
            <div className={`flex items-center gap-3 p-2 rounded-lg w-full transition-colors ${isSpeaking ? 'bg-live/10' : 'bg-surface hover:bg-surface-raised'} border ${isSpeaking ? 'border-live/30' : 'border-border/30'}`}>
                <div className="relative shrink-0">
                    {hasVideo && trackRef ? (
                        <div className={`w-10 h-10 rounded-full overflow-hidden transition-all duration-200 ${isSpeaking ? "ring-2 ring-live shadow-[0_0_10px_rgba(34,224,214,0.3)]" : "ring-1 ring-border/50"}`}>
                            <VideoTrack trackRef={trackRef} className="w-full h-full object-cover" />
                        </div>
                    ) : (
                        <UserAvatar
                            avatarUrl={avatarUrl}
                            username={username}
                            className={`w-10 h-10 transition-all duration-200 ${isSpeaking ? "ring-2 ring-live shadow-[0_0_10px_rgba(34,224,214,0.3)]" : "ring-1 ring-border/50"}`}
                        />
                    )}
                </div>
                <div className="flex flex-col min-w-0">
                    <span
                        className="text-sm font-medium truncate"
                        style={{ color: userColor }}
                    >
                        {displayName}
                    </span>
                    {isSpeaking && <span className="text-[10px] text-live uppercase font-bold tracking-wider leading-none mt-0.5">Speaking</span>}
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col items-center justify-center gap-2 py-2">
            {hasVideo && trackRef ? (
                <div
                    className={`w-24 h-24 ring-[3px] rounded-full overflow-hidden transition-all duration-200 ${isSpeaking ? "ring-live shadow-[0_0_14px_rgba(34,224,214,0.35)]" : "ring-border"
                        }`}
                >
                    <VideoTrack trackRef={trackRef} className="w-full h-full object-cover" />
                </div>
            ) : (
                <UserAvatar
                    avatarUrl={avatarUrl}
                    username={username}
                    className={`w-24 h-24 transition-all duration-200 ${isSpeaking ? "ring-[3px] ring-live shadow-[0_0_14px_rgba(34,224,214,0.35)]" : ""}`}
                />
            )}
            <span
                className="text-micro font-medium px-1 text-center truncate max-w-[12rem]"
                style={{ color: userColor }}
            >
                {displayName}
            </span>
        </div>
    );
}

const MemoizedCallParticipantTile = memo(CallParticipantTile);

function CallLatency() {
    const latency = useLivekitLatency();
    const setLiveLatency = useVoiceStore((s) => s.setLiveLatency);

    useEffect(() => {
        setLiveLatency(latency);
    }, [latency, setLiveLatency]);

    useEffect(() => {
        return () => {
            setLiveLatency(null);
        };
    }, [setLiveLatency]);

    if (latency === null) return null;
    const color = latency < 80 ? "text-success" : latency < 150 ? "text-yellow-500" : "text-danger";

    return (
        <div className={`flex items-center gap-1.5 px-2 py-1 rounded-md bg-surface-raised ${color}`}>
            <Wifi className="w-3.5 h-3.5" />
            <span className="text-micro font-medium">{latency}ms</span>
        </div>
    );
}

function CallScreenShareView({
    track,
}: {
    track: ReturnType<typeof useTracks>[number] | undefined;
}) {
    const [isFullscreen, setIsFullscreen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    const toggleFullscreen = useCallback(() => {
        setIsFullscreen(prev => !prev);
    }, []);

    if (!track?.publication) return null;

    const screenTrack = track as ReturnType<typeof useTracks>[number] & {
        publication: TrackPublication;
    };

    return (
        <div
            ref={containerRef}
            className={isFullscreen
                ? "fixed inset-0 z-[9999] bg-black flex flex-col group overflow-hidden"
                : "w-full h-full flex-1 bg-black flex flex-col relative group overflow-hidden rounded-xl shadow-[0_0_20px_rgba(0,0,0,0.5)] border border-border/50"
            }
        >
            <VideoTrack
                trackRef={screenTrack}
                className="w-full h-full object-contain bg-black"
            />

            <div className={`absolute bottom-0 left-0 right-0 p-3 pt-12 bg-gradient-to-t from-black/90 to-transparent flex items-end justify-between transition-opacity duration-300 pointer-events-none ${isFullscreen ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
                <div className="flex items-center gap-2 pointer-events-auto">
                    <MonitorUp className="w-5 h-5 text-live drop-shadow-md" />
                    <span className="text-sm font-medium text-white drop-shadow-md cursor-default">
                        {screenTrack.participant.name || screenTrack.participant.identity}&apos;s screen
                    </span>
                </div>
            </div>

            <button
                onClick={toggleFullscreen}
                className={`absolute top-4 right-4 w-9 h-9 rounded-lg bg-black/60 text-white flex flex-col items-center justify-center hover:bg-black/90 hover:scale-105 active:scale-95 backdrop-blur-sm transition-all duration-300 z-10 shadow-lg border border-white/10 ${isFullscreen ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}
                title={isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
            >
                {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>
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
    const cameraTracks = useTracks([Track.Source.Camera]);
    const screenTracks = useTracks([Track.Source.ScreenShare]);
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
    const [ringWindowOpen, setRingWindowOpen] = useState(true);
    const qualityPickerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const timeoutId = window.setTimeout(() => {
            setRingWindowOpen(false);
        }, 6000);
        return () => {
            window.clearTimeout(timeoutId);
        };
    }, []);

    const ringing = ringWindowOpen && roomParticipants.length <= 1;
    useRingtone(ringing, "outgoing", 6000);

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

    const activeScreenTrack = screenTracks[0];
    const hasScreenShare = !!activeScreenTrack;

    const gridClass =
        hasScreenShare
            ? roomParticipants.length <= 3
                ? "grid-cols-2 max-w-[560px] mx-auto"
                : "grid-cols-3 max-w-[780px] mx-auto"
            : roomParticipants.length <= 1
                ? "grid-cols-1 max-w-[320px] mx-auto"
                : roomParticipants.length <= 4
                    ? "grid-cols-2 max-w-[720px] mx-auto"
                    : "grid-cols-3 max-w-[980px] mx-auto";

    const profileById = new Map(participantProfiles.map((p) => [p.id, p]));
    const cameraTracksByIdentity = useMemo(() => {
        const map = new Map<string, ReturnType<typeof useTracks>[number]>();
        for (const trackRef of cameraTracks) {
            map.set(trackRef.participant.identity, trackRef);
        }
        return map;
    }, [cameraTracks]);

    return (
        <div className="flex-1 min-h-0 flex flex-col">
            {/* Participants */}
            <div className="flex-1 min-h-0 flex flex-col p-3 sm:p-4 relative overflow-hidden">
                {/* Latency display */}
                <div className="absolute top-2 right-4 z-20">
                    <CallLatency />
                </div>

                <div className={`flex-1 min-h-0 flex ${hasScreenShare ? "flex-row" : "flex-col"} gap-3 ${hasScreenShare ? "pt-1" : ""}`}>
                    {hasScreenShare && (
                        <div className="flex-1 min-w-0 min-h-0 flex flex-col">
                            <CallScreenShareView track={activeScreenTrack} />
                        </div>
                    )}

                    <div
                        className={hasScreenShare
                            ? "w-48 sm:w-60 shrink-0 overflow-y-auto overflow-x-hidden pr-2 pl-2 pt-2 flex flex-col bg-surface-raised/20 rounded-xl border border-border/40 gap-2"
                            : "w-full flex-1 min-h-0 flex flex-col justify-center overflow-y-auto"
                        }
                    >
                        <div
                            className={hasScreenShare
                                ? "flex flex-col w-full gap-2 pb-2"
                                : `grid ${gridClass} w-full justify-items-center gap-8 pb-2`
                            }
                        >
                            {roomParticipants.map((p) => (
                                <MemoizedCallParticipantTile
                                    key={p.identity}
                                    participant={p}
                                    profile={profileById.get(p.identity)}
                                    trackRef={cameraTracksByIdentity.get(p.identity)}
                                    isSmall={hasScreenShare}
                                />
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            <RoomAudioRenderer />

            {/* Controls */}
            <div className="min-h-16 shrink-0 bg-surface border-t border-border flex items-center justify-center gap-2 sm:gap-3 px-3 py-2 flex-wrap">
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
                        } else if (!nextDeafened && isMuted) {
                            setLocalMuted(false);
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
                        ? "bg-live/20 text-live"
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
                                ? "bg-live/20 text-live"
                                : "bg-surface-raised text-text-primary hover:bg-hover-row"
                                }`}
                            title={isScreenSharing ? "Stop sharing" : "Share screen"}
                        >
                            <MonitorUp className="w-5 h-5" />
                        </button>
                        <button
                            onClick={() => setShowQualityPicker(!showQualityPicker)}
                            className={`w-5 h-10 rounded-r-full flex items-center justify-center transition-all border-l border-border/50 ${isScreenSharing
                                ? "bg-live/20 text-live"
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
                                    className={`w-full px-3 py-1.5 text-left text-body flex items-center justify-between hover:bg-hover-row transition-colors ${screenShareQuality === key ? "text-live" : "text-text-primary"
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
                        ? "bg-live/20 text-live"
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
    const MIN_HEIGHT = 190;
    const DEFAULT_HEIGHT = 260;
    const MAX_HEIGHT_RATIO = 0.62;
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
                className="flex-1 flex flex-col min-h-0"
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
