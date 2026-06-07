"use client";

import { memo, useState, useEffect, useCallback, useRef, useMemo } from "react";
import {
    LiveKitRoom,
    RoomAudioRenderer,
    useParticipants,
    useTracks,
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
    X,
    ChevronUp,
    Check,
    AudioLines,
} from "lucide-react";
import { useRingtone } from "@/hooks/useRingtone";
import { useVoiceStore, SCREEN_SHARE_PRESETS, type ScreenShareQuality } from "@/stores/voice-store";
import type { DMParticipantData } from "@/lib/api";
import { createRoomOptions } from "@/lib/livekit-config";
import { useNoiseSuppression } from "@/hooks/useNoiseSuppression";
import { useLivekitLatency } from "@/hooks/useLivekitLatency";
import { getUsernameColor } from "@/lib/color-utils";
import {
    SpeakingAvatar,
    CallButton,
    HangupButton,
    ConnectionPill,
    ScreenShareStage,
    getAvatarFromMetadata,
} from "./call/CallUI";

interface CallModalProps {
    onClose: () => void;
    token: string;
    url: string;
    callerName?: string;
    initialVideo?: boolean;
    participants?: DMParticipantData[];
    className?: string;
}

function formatDuration(totalSeconds: number): string {
    const m = Math.floor(totalSeconds / 60);
    const s = totalSeconds % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
}

// ── Participant tile ────────────────────────────────────────────────────

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
    const isMuted = participant.isMicrophoneEnabled === false;
    const displayName = profile?.displayName || participant.name || participant.identity;
    const username = profile?.username || participant.identity;
    const avatarUrl = profile?.avatarUrl || getAvatarFromMetadata(participant);
    const userColor = getUsernameColor(username);

    if (isSmall) {
        return (
            <div className={`flex items-center gap-2.5 p-2 rounded-xl w-full transition-colors ${isSpeaking ? "bg-live/10 ring-1 ring-live/30" : "bg-surface/60 ring-1 ring-border/30 hover:bg-surface-raised"}`}>
                <SpeakingAvatar avatarUrl={avatarUrl} username={username} px={36} speaking={isSpeaking} videoTrack={trackRef} />
                <div className="flex flex-col min-w-0 flex-1">
                    <span className="text-[13px] font-medium truncate" style={{ color: userColor }}>
                        {displayName}
                    </span>
                    {isSpeaking ? (
                        <span className="text-[10px] text-live uppercase font-bold tracking-wider leading-none mt-0.5">Speaking</span>
                    ) : isMuted ? (
                        <span className="text-[10px] text-text-faint flex items-center gap-1 leading-none mt-0.5"><MicOff className="w-2.5 h-2.5" /> Muted</span>
                    ) : null}
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col items-center justify-center gap-2.5">
            <div className="relative">
                <SpeakingAvatar avatarUrl={avatarUrl} username={username} px={104} speaking={isSpeaking} videoTrack={trackRef} />
                {isMuted && (
                    <span className="absolute bottom-0 right-0 z-10 w-7 h-7 rounded-full bg-danger flex items-center justify-center ring-2 ring-background">
                        <MicOff className="w-3.5 h-3.5 text-white" />
                    </span>
                )}
            </div>
            <span className="text-[13px] font-medium text-center truncate max-w-[12rem]" style={{ color: userColor }}>
                {displayName}
            </span>
        </div>
    );
}

const MemoizedCallParticipantTile = memo(CallParticipantTile);

// ── Latency wiring ──────────────────────────────────────────────────────

function CallLatency() {
    const latency = useLivekitLatency();
    const setLiveLatency = useVoiceStore((s) => s.setLiveLatency);

    useEffect(() => {
        setLiveLatency(latency);
    }, [latency, setLiveLatency]);
    useEffect(() => () => setLiveLatency(null), [setLiveLatency]);

    return <ConnectionPill latency={latency} />;
}

// ── Call content ────────────────────────────────────────────────────────

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
    const [elapsed, setElapsed] = useState(0);
    const qualityPickerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const timeoutId = window.setTimeout(() => setRingWindowOpen(false), 6000);
        return () => window.clearTimeout(timeoutId);
    }, []);

    const connected = roomParticipants.length > 1;
    const ringing = ringWindowOpen && !connected;
    useRingtone(ringing, "outgoing", 6000);

    // Call duration ticks once another participant is present.
    useEffect(() => {
        if (!connected) {
            setElapsed(0);
            return;
        }
        const id = window.setInterval(() => setElapsed((s) => s + 1), 1000);
        return () => window.clearInterval(id);
    }, [connected]);

    useEffect(() => {
        if (initialVideo) setLocalVideo(true);
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (qualityPickerRef.current && !qualityPickerRef.current.contains(e.target as Node)) {
                setShowQualityPicker(false);
            }
        };
        if (showQualityPicker) document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [showQualityPicker]);

    useEffect(() => {
        room.localParticipant?.setMicrophoneEnabled(!isMuted).catch(console.error);
    }, [isMuted, room]);

    useEffect(() => {
        room.localParticipant?.setCameraEnabled(hasVideo).catch(console.error);
    }, [hasVideo, room]);

    useEffect(() => {
        for (const remoteParticipant of room.remoteParticipants.values()) {
            for (const pub of remoteParticipant.audioTrackPublications.values()) {
                if (pub.track?.mediaStreamTrack) {
                    pub.track.mediaStreamTrack.enabled = !isDeafened;
                }
            }
        }
    }, [isDeafened, room, roomParticipants]);

    useEffect(() => {
        if (isScreenSharing) {
            const preset = SCREEN_SHARE_PRESETS[screenShareQuality];
            const opts = preset
                ? { resolution: { width: preset.width, height: preset.height, frameRate: preset.frameRate }, contentHint: "detail" as const }
                : undefined;
            room.localParticipant?.setScreenShareEnabled(true, opts).catch((err) => {
                console.error("Screen share failed:", err);
                setLocalScreenSharing(false);
            });
        } else {
            room.localParticipant?.setScreenShareEnabled(false).catch(console.error);
        }
    }, [isScreenSharing, screenShareQuality, room, setLocalScreenSharing]);

    useEffect(() => {
        const onTrackUnpublished = () => {
            const lp = room.localParticipant;
            if (lp && !lp.isScreenShareEnabled) setLocalScreenSharing(false);
        };
        room.on(RoomEvent.LocalTrackUnpublished, onTrackUnpublished);
        return () => { room.off(RoomEvent.LocalTrackUnpublished, onTrackUnpublished); };
    }, [room, setLocalScreenSharing]);

    const handleEndCall = useCallback(() => onClose(), [onClose]);

    const activeScreenTrack = screenTracks[0];
    const hasScreenShare = !!activeScreenTrack;

    const gridClass = roomParticipants.length <= 1
        ? "grid-cols-1 max-w-[280px]"
        : roomParticipants.length <= 4
            ? "grid-cols-2 max-w-[560px]"
            : "grid-cols-3 max-w-[820px]";

    const profileById = new Map(participantProfiles.map((p) => [p.id, p]));
    const cameraTracksByIdentity = useMemo(() => {
        const map = new Map<string, ReturnType<typeof useTracks>[number]>();
        for (const trackRef of cameraTracks) map.set(trackRef.participant.identity, trackRef);
        return map;
    }, [cameraTracks]);

    const statusLabel = ringing ? "Ringing…" : connected ? formatDuration(elapsed) : "Connecting…";

    return (
        <div className="flex-1 min-h-0 flex flex-col bg-gradient-to-b from-channel-sidebar to-background">
            {/* Status bar */}
            <div className="flex items-center justify-between px-4 py-2 shrink-0">
                <div className="flex items-center gap-2">
                    <span className="relative flex h-2 w-2">
                        <span className={`absolute inline-flex h-full w-full rounded-full ${connected ? "bg-live" : "bg-warning"} ${!connected ? "animate-ping opacity-75" : ""}`} />
                        <span className={`relative inline-flex h-2 w-2 rounded-full ${connected ? "bg-live" : "bg-warning"}`} />
                    </span>
                    <span className="text-[12px] font-semibold tabular-nums text-text-secondary">{statusLabel}</span>
                </div>
                <CallLatency />
            </div>

            {/* Stage */}
            <div className="flex-1 min-h-0 flex px-3 pb-2 overflow-hidden">
                <div className={`flex-1 min-h-0 flex ${hasScreenShare ? "flex-row gap-3" : "flex-col"} w-full`}>
                    {hasScreenShare && (
                        <div className="flex-1 min-w-0 min-h-0 flex flex-col">
                            <ScreenShareStage
                                track={activeScreenTrack}
                                presenterName={activeScreenTrack.participant.name || activeScreenTrack.participant.identity}
                                embedded
                            />
                        </div>
                    )}

                    <div
                        className={hasScreenShare
                            ? "w-48 sm:w-56 shrink-0 overflow-y-auto rounded-2xl bg-black/15 ring-1 ring-border/40 p-2 flex flex-col gap-1.5"
                            : "w-full flex-1 min-h-0 flex items-center justify-center overflow-y-auto"
                        }
                    >
                        <div
                            className={hasScreenShare
                                ? "flex flex-col w-full gap-1.5"
                                : `grid ${gridClass} w-full justify-items-center gap-x-8 gap-y-6 mx-auto`
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
            <div className="shrink-0 flex items-center justify-center gap-2 px-3 py-3">
                <CallButton onClick={() => setLocalMuted(!isMuted)} active={false} danger={isMuted} title={isMuted ? "Unmute" : "Mute"}>
                    {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
                </CallButton>
                <CallButton
                    onClick={() => {
                        const nextDeafened = !isDeafened;
                        setLocalDeafened(nextDeafened);
                        if (nextDeafened && !isMuted) setLocalMuted(true);
                        else if (!nextDeafened && isMuted) setLocalMuted(false);
                    }}
                    danger={isDeafened}
                    title={isDeafened ? "Undeafen" : "Deafen"}
                >
                    {isDeafened ? <HeadphoneOff className="w-5 h-5" /> : <Headphones className="w-5 h-5" />}
                </CallButton>
                <CallButton onClick={() => setLocalVideo(!hasVideo)} active={hasVideo} title={hasVideo ? "Turn off camera" : "Turn on camera"}>
                    {hasVideo ? <Video className="w-5 h-5" /> : <VideoOff className="w-5 h-5" />}
                </CallButton>

                {/* Screen share + quality */}
                <div className="relative flex items-center" ref={qualityPickerRef}>
                    <button
                        onClick={() => setLocalScreenSharing(!isScreenSharing)}
                        className={`w-11 h-11 rounded-l-full flex items-center justify-center transition-all duration-150 active:scale-95 border ${isScreenSharing ? "bg-live/15 text-live border-live/30 shadow-glow-teal-sm" : "bg-surface-raised text-text-secondary hover:text-text-primary border-border/50"}`}
                        title={isScreenSharing ? "Stop sharing" : "Share screen"}
                    >
                        <MonitorUp className="w-5 h-5" />
                    </button>
                    <button
                        onClick={() => setShowQualityPicker(!showQualityPicker)}
                        className={`w-5 h-11 rounded-r-full flex items-center justify-center transition-all border-y border-r ${isScreenSharing ? "bg-live/15 text-live border-live/30" : "bg-surface-raised text-text-secondary hover:text-text-primary border-border/50"}`}
                        title="Screen share quality"
                    >
                        <ChevronUp className={`w-3 h-3 transition-transform ${showQualityPicker ? "rotate-180" : ""}`} />
                    </button>
                    {showQualityPicker && (
                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 bg-surface-overlay border border-border-highlight rounded-xl shadow-float-lg py-1.5 z-50 animate-slide-up">
                            <div className="px-3 py-1 text-[10px] text-text-faint font-semibold uppercase tracking-[0.08em]">Stream Quality</div>
                            {(Object.entries(SCREEN_SHARE_PRESETS) as [ScreenShareQuality, typeof SCREEN_SHARE_PRESETS[ScreenShareQuality]][]).map(([key, preset]) => (
                                <button
                                    key={key}
                                    onClick={() => { setScreenShareQuality(key); setShowQualityPicker(false); }}
                                    className={`w-full px-3 py-1.5 text-left text-[13px] flex items-center justify-between hover:bg-hover-row transition-colors ${screenShareQuality === key ? "text-live" : "text-text-secondary"}`}
                                >
                                    <span>{preset ? preset.label : "Source Quality"}</span>
                                    {screenShareQuality === key && <Check className="w-4 h-4" />}
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                <CallButton onClick={() => setNoiseSuppression(!noiseSuppression)} active={noiseSuppression} title={noiseSuppression ? "Disable noise suppression" : "Enable noise suppression"}>
                    <AudioLines className="w-5 h-5" />
                </CallButton>

                <div className="w-px h-7 bg-border/60 mx-1" />

                <HangupButton onClick={handleEndCall} title="End call" />
            </div>
        </div>
    );
}

// ── Resizable shell ─────────────────────────────────────────────────────

export function CallModal({
    onClose,
    token,
    url,
    initialVideo = false,
    participants = [],
    className = "",
}: CallModalProps) {
    const roomOptions = useMemo(() => createRoomOptions(), []);
    const MIN_HEIGHT = 200;
    const DEFAULT_HEIGHT = 280;
    const MAX_HEIGHT_RATIO = 0.62;
    const [panelHeight, setPanelHeight] = useState(DEFAULT_HEIGHT);
    const dragStartRef = useRef<{ y: number; height: number } | null>(null);

    const clampHeight = useCallback((height: number) => {
        if (typeof window === "undefined") return Math.max(MIN_HEIGHT, height);
        const maxHeight = Math.floor(window.innerHeight * MAX_HEIGHT_RATIO);
        return Math.min(maxHeight, Math.max(MIN_HEIGHT, height));
    }, []);

    useEffect(() => {
        const handleResize = () => setPanelHeight((current) => clampHeight(current));
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
        setPanelHeight(clampHeight(dragStartRef.current.height + deltaY));
    }, [clampHeight]);

    const handleDragEnd = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
        dragStartRef.current = null;
        if (e.currentTarget.hasPointerCapture(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId);
    }, []);

    return (
        <div
            className={`flex flex-col bg-background border-b border-border ${className}`}
            style={{ height: `${panelHeight}px` }}
        >
            {/* Header */}
            <div className="h-11 flex items-center justify-between px-4 border-b border-border/70 bg-channel-sidebar/60">
                <div className="flex items-center gap-2">
                    <span className="flex h-6 w-6 items-center justify-center rounded-lg border border-live/25 bg-live/10">
                        <Video className="w-3.5 h-3.5 text-live" />
                    </span>
                    <span className="text-[13px] font-semibold text-text-primary">Call</span>
                </div>
                <button
                    onClick={onClose}
                    className="w-8 h-8 rounded-lg hover:bg-hover-row flex items-center justify-center text-text-muted hover:text-text-primary transition-colors"
                    title="Close call panel"
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
                <CallContent onClose={onClose} initialVideo={initialVideo} participants={participants} />
            </LiveKitRoom>

            <div
                onPointerDown={handleDragStart}
                onPointerMove={handleDragMove}
                onPointerUp={handleDragEnd}
                onPointerCancel={handleDragEnd}
                role="separator"
                aria-label="Resize call panel"
                aria-orientation="horizontal"
                className="h-3 cursor-row-resize flex items-center justify-center bg-background touch-none select-none group"
                title="Drag to resize call panel"
            >
                <div className="w-12 h-1 rounded-full bg-border/80 group-hover:bg-text-faint transition-colors" />
            </div>
        </div>
    );
}
