"use client";

import { memo, useEffect, useMemo } from "react";
import {
    LiveKitRoom,
    RoomAudioRenderer,
    useParticipants,
    useTracks,
    VideoTrack,
    useRoomContext,
    useIsSpeaking,
} from "@livekit/components-react";
import { Track, RoomEvent } from "livekit-client";
import type { Participant } from "livekit-client";
import { SCREEN_SHARE_PRESETS } from "@/stores/voice-store";
import { Mic, MicOff, Video, VideoOff, MonitorUp, Wifi } from "lucide-react";
import { useVoiceStore } from "@/stores/voice-store";
import { createRoomOptions } from "@/lib/livekit-config";
import { useNoiseSuppression } from "@/hooks/useNoiseSuppression";
import { useLivekitLatency } from "@/hooks/useLivekitLatency";
import { UserAvatar } from "./UserAvatar";
import { getUsernameColor } from "@/lib/color-utils";

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

function getGridClass(count: number): string {
    if (count <= 1) return "grid-cols-1 max-w-[400px] mx-auto";
    if (count <= 2) return "grid-cols-2 max-w-[800px] mx-auto";
    if (count <= 4) return "grid-cols-2";
    if (count <= 9) return "grid-cols-3";
    return "grid-cols-4";
}

// ─── Participant Tile ────────────────────────────────────────────

function ParticipantTile({
    participant,
    trackRef,
}: {
    participant: Participant;
    trackRef: ReturnType<typeof useTracks>[number] | undefined;
}) {
    const isSpeaking = useIsSpeaking(participant);
    const hasVideo = !!(trackRef?.publication && !trackRef.publication.isMuted);
    const isMuted = participant.isMicrophoneEnabled === false;
    const displayName = participant.name || participant.identity;
    const username = participant.identity;
    const avatarUrl = getAvatarFromMetadata(participant);

    return (
        <div
            className={`relative bg-surface rounded-xl overflow-hidden flex flex-col items-center justify-center aspect-video transition-all duration-200 ${isSpeaking
                ? "ring-2 ring-accent-teal shadow-[0_0_16px_rgba(62,207,207,0.3)]"
                : "ring-1 ring-border"
                }`}
        >
            {hasVideo && trackRef ? (
                <VideoTrack
                    trackRef={trackRef}
                    className="w-full h-full object-cover"
                />
            ) : (
                <div className="flex flex-col items-center gap-3">
                    <UserAvatar
                        avatarUrl={avatarUrl}
                        username={username}
                        className={`w-16 h-16 transition-all duration-200 ${isSpeaking ? "ring-[3px] ring-accent-teal" : ""}`}
                    />
                </div>
            )}

            {/* Username + status */}
            <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between">
                <span
                    className="text-micro font-medium px-2 py-0.5 rounded-md truncate"
                    style={{ backgroundColor: "rgba(0,0,0,0.5)", color: getUsernameColor(username) }}
                >
                    {displayName}
                </span>
                <div className="flex items-center gap-1">
                    {isMuted && (
                        <div className="w-5 h-5 rounded-full bg-danger/80 flex items-center justify-center">
                            <MicOff className="w-3 h-3 text-white" />
                        </div>
                    )}
                    {participant.isCameraEnabled && (
                        <div className="w-5 h-5 rounded-full bg-accent-teal/80 flex items-center justify-center">
                            <Video className="w-3 h-3 text-white" />
                        </div>
                    )}
                    {participant.isScreenShareEnabled && (
                        <div className="w-5 h-5 rounded-full bg-accent-teal/80 flex items-center justify-center">
                            <MonitorUp className="w-3 h-3 text-white" />
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

const MemoizedParticipantTile = memo(ParticipantTile);

// ─── Screen Share View ──────────────────────────────────────────

function ScreenShareView() {
    const screenTracks = useTracks([Track.Source.ScreenShare]);

    if (screenTracks.length === 0) return null;

    const track = screenTracks[0];

    return (
        <div className="w-full rounded-xl overflow-hidden bg-surface ring-1 ring-border mb-4">
            <VideoTrack
                trackRef={track}
                className="w-full h-auto max-h-[60vh] object-contain"
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

// ─── Latency Display ─────────────────────────────────────────────

function LatencyIndicator() {
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

// ─── Room Content (syncs voice store ↔ LiveKit) ──────────────────

function RoomContent() {
    const participants = useParticipants();
    const cameraTracks = useTracks([Track.Source.Camera]);
    const room = useRoomContext();
    const updateParticipant = useVoiceStore((s) => s.updateParticipant);
    useNoiseSuppression();
    const isMuted = useVoiceStore((s) => s.isMuted);
    const isDeafened = useVoiceStore((s) => s.isDeafened);
    const hasVideo = useVoiceStore((s) => s.hasVideo);
    const isScreenSharing = useVoiceStore((s) => s.isScreenSharing);
    const screenShareQuality = useVoiceStore((s) => s.screenShareQuality);

    // Sync mute state from store to LiveKit
    useEffect(() => {
        const lp = room.localParticipant;
        if (!lp) return;
        lp.setMicrophoneEnabled(!isMuted).catch(console.error);
    }, [isMuted, room]);

    // Sync deafen state - mute all remote audio tracks
    useEffect(() => {
        for (const p of room.remoteParticipants.values()) {
            for (const pub of p.audioTrackPublications.values()) {
                if (pub.track && pub.track.mediaStreamTrack) {
                    pub.track.mediaStreamTrack.enabled = !isDeafened;
                }
            }
        }
    }, [isDeafened, room, participants]);

    // Sync video state
    useEffect(() => {
        const lp = room.localParticipant;
        if (!lp) return;
        lp.setCameraEnabled(hasVideo).catch(console.error);
    }, [hasVideo, room]);

    const setLocalScreenSharing = useVoiceStore((s) => s.setLocalScreenSharing);

    // Sync screen sharing state with quality options
    useEffect(() => {
        const lp = room.localParticipant;
        if (!lp) return;
        if (isScreenSharing) {
            const preset = SCREEN_SHARE_PRESETS[screenShareQuality];
            const opts = preset ? {
                resolution: { width: preset.width, height: preset.height, frameRate: preset.frameRate },
                contentHint: "detail" as const,
            } : undefined;
            lp.setScreenShareEnabled(true, opts).catch((err) => {
                console.error("Screen share failed:", err);
                setLocalScreenSharing(false);
            });
        } else {
            lp.setScreenShareEnabled(false).catch(console.error);
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

    // Sync speaking states to the store
    useEffect(() => {
        const handleSpeakersChanged = (speakers: Participant[]) => {
            const speakerIds = new Set(speakers.map((s) => s.identity));

            Array.from(room.remoteParticipants.values()).forEach((p: Participant) => {
                updateParticipant(p.identity, { isSpeaking: speakerIds.has(p.identity) });
            });
            if (room.localParticipant) {
                updateParticipant(room.localParticipant.identity, { isSpeaking: speakerIds.has(room.localParticipant.identity) });
            }
        };

        room.on(RoomEvent.ActiveSpeakersChanged, handleSpeakersChanged);
        return () => {
            room.off(RoomEvent.ActiveSpeakersChanged, handleSpeakersChanged);
        };
    }, [room, updateParticipant]);

    const gridClass = getGridClass(participants.length);
    const tracksByIdentity = useMemo(() => {
        const map = new Map<string, ReturnType<typeof useTracks>[number]>();
        for (const trackRef of cameraTracks) {
            map.set(trackRef.participant.identity, trackRef);
        }
        return map;
    }, [cameraTracks]);

    return (
        <div className="flex-1 flex flex-col p-6 overflow-y-auto">
            <ScreenShareView />

            <div className={`grid ${gridClass} gap-4 flex-1 content-center`}>
                {participants.map((participant) => (
                    <MemoizedParticipantTile
                        key={participant.identity}
                        participant={participant}
                        trackRef={tracksByIdentity.get(participant.identity)}
                    />
                ))}
            </div>

            <RoomAudioRenderer />
        </div>
    );
}

// ─── Main Component ─────────────────────────────────────────────

export function VoiceChannelView() {
    const livekitToken = useVoiceStore((s) => s.livekitToken);
    const livekitUrl = useVoiceStore((s) => s.livekitUrl);
    const channelName = useVoiceStore((s) => s.currentChannelName);

    const roomOptions = useMemo(() => createRoomOptions(), []);

    if (!livekitToken || !livekitUrl) {
        return (
            <div className="flex-1 flex items-center justify-center bg-background">
                <div className="text-center">
                    <div className="w-16 h-16 rounded-2xl bg-surface flex items-center justify-center mx-auto mb-4">
                        <Mic className="w-8 h-8 text-text-muted" />
                    </div>
                    <h2 className="text-heading font-bold text-text-primary mb-2">
                        Voice Channel
                    </h2>
                    <p className="text-body text-text-muted">
                        {livekitUrl
                            ? "Connecting..."
                            : "LiveKit server not configured. Set LIVEKIT_URL to enable voice."}
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="flex-1 flex flex-col bg-background min-w-0">
            {/* Header */}
            <div className="h-12 border-b border-border flex items-center px-4 gap-3 flex-shrink-0">
                <Mic className="w-5 h-5 text-accent-teal flex-shrink-0" />
                <span className="text-emphasis font-semibold text-text-primary">
                    {channelName}
                </span>
                <span className="text-body text-text-muted">Voice Channel</span>
            </div>

            <LiveKitRoom
                token={livekitToken}
                serverUrl={livekitUrl}
                connect={true}
                audio={true}
                video={false}
                options={roomOptions}
                className="flex-1 flex flex-col"
            >
                {/* Latency in top-right */}
                <div className="absolute top-14 right-4 z-10">
                    <LatencyIndicator />
                </div>
                <RoomContent />
            </LiveKitRoom>
        </div>
    );
}
