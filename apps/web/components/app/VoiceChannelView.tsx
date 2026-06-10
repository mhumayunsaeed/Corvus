"use client";

import { memo, useEffect, useMemo, useState } from "react";
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
import { Mic, MicOff, Video, MonitorUp } from "lucide-react";
import { useVoiceStore } from "@/stores/voice-store";
import { createRoomOptions } from "@/lib/livekit-config";
import { useNoiseSuppression } from "@/hooks/useNoiseSuppression";
import { useLivekitLatency } from "@/hooks/useLivekitLatency";
import { getUsernameColor } from "@/lib/color-utils";
import { SpeakingAvatar, ConnectionPill, ScreenShareStage, getAvatarFromMetadata } from "./call/CallUI";
import { MeetingNotesButton, MeetingNotesPanel } from "./MeetingNotesPanel";

function getGridClass(count: number): string {
    if (count <= 1) return "grid-cols-1 max-w-[460px] mx-auto";
    if (count <= 2) return "grid-cols-2 max-w-[900px] mx-auto";
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
            className={`relative bg-surface rounded-2xl overflow-hidden flex flex-col items-center justify-center aspect-video transition-all duration-200 ${isSpeaking
                ? "ring-2 ring-live shadow-glow-teal"
                : "ring-1 ring-border"
                }`}
        >
            {hasVideo && trackRef ? (
                <VideoTrack trackRef={trackRef} className="w-full h-full object-cover" />
            ) : (
                <SpeakingAvatar avatarUrl={avatarUrl} username={username} px={72} speaking={isSpeaking} />
            )}

            {/* Username + status overlay */}
            <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between gap-2">
                <span
                    className="text-[12px] font-medium px-2 py-0.5 rounded-md truncate backdrop-blur-sm"
                    style={{ backgroundColor: "rgba(0,0,0,0.55)", color: getUsernameColor(username) }}
                >
                    {displayName}
                </span>
                <div className="flex items-center gap-1">
                    {isMuted && (
                        <div className="w-5 h-5 rounded-full bg-danger/90 flex items-center justify-center">
                            <MicOff className="w-3 h-3 text-white" />
                        </div>
                    )}
                    {participant.isScreenShareEnabled && (
                        <div className="w-5 h-5 rounded-full bg-live/90 flex items-center justify-center">
                            <MonitorUp className="w-3 h-3 text-white" />
                        </div>
                    )}
                    {participant.isCameraEnabled && (
                        <div className="w-5 h-5 rounded-full bg-live/90 flex items-center justify-center">
                            <Video className="w-3 h-3 text-white" />
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

const MemoizedParticipantTile = memo(ParticipantTile);

// ─── Latency Display ─────────────────────────────────────────────

function LatencyIndicator() {
    const latency = useLivekitLatency();
    const setLiveLatency = useVoiceStore((s) => s.setLiveLatency);

    useEffect(() => {
        setLiveLatency(latency);
    }, [latency, setLiveLatency]);
    useEffect(() => () => setLiveLatency(null), [setLiveLatency]);

    return <ConnectionPill latency={latency} />;
}

// ─── Room Content (syncs voice store ↔ LiveKit) ──────────────────

function RoomContent() {
    const participants = useParticipants();
    const cameraTracks = useTracks([Track.Source.Camera]);
    const screenTracks = useTracks([Track.Source.ScreenShare]);
    const room = useRoomContext();
    const updateParticipant = useVoiceStore((s) => s.updateParticipant);
    useNoiseSuppression();
    const isMuted = useVoiceStore((s) => s.isMuted);
    const isDeafened = useVoiceStore((s) => s.isDeafened);
    const hasVideo = useVoiceStore((s) => s.hasVideo);
    const isScreenSharing = useVoiceStore((s) => s.isScreenSharing);
    const screenShareQuality = useVoiceStore((s) => s.screenShareQuality);

    useEffect(() => {
        const lp = room.localParticipant;
        if (!lp) return;
        lp.setMicrophoneEnabled(!isMuted).catch(console.error);
    }, [isMuted, room]);

    useEffect(() => {
        for (const p of room.remoteParticipants.values()) {
            for (const pub of p.audioTrackPublications.values()) {
                if (pub.track && pub.track.mediaStreamTrack) {
                    pub.track.mediaStreamTrack.enabled = !isDeafened;
                }
            }
        }
    }, [isDeafened, room, participants]);

    useEffect(() => {
        const lp = room.localParticipant;
        if (!lp) return;
        lp.setCameraEnabled(hasVideo).catch(console.error);
    }, [hasVideo, room]);

    const setLocalScreenSharing = useVoiceStore((s) => s.setLocalScreenSharing);

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

    useEffect(() => {
        const onTrackUnpublished = () => {
            const lp = room.localParticipant;
            if (lp && !lp.isScreenShareEnabled) setLocalScreenSharing(false);
        };
        room.on(RoomEvent.LocalTrackUnpublished, onTrackUnpublished);
        return () => { room.off(RoomEvent.LocalTrackUnpublished, onTrackUnpublished); };
    }, [room, setLocalScreenSharing]);

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
        return () => { room.off(RoomEvent.ActiveSpeakersChanged, handleSpeakersChanged); };
    }, [room, updateParticipant]);

    const activeScreenTrack = screenTracks[0];
    const hasScreenShare = !!activeScreenTrack;
    const gridClass = getGridClass(participants.length);
    const tracksByIdentity = useMemo(() => {
        const map = new Map<string, ReturnType<typeof useTracks>[number]>();
        for (const trackRef of cameraTracks) map.set(trackRef.participant.identity, trackRef);
        return map;
    }, [cameraTracks]);

    if (hasScreenShare) {
        return (
            <div className="flex-1 min-h-0 flex flex-col lg:flex-row gap-3 p-4 overflow-hidden">
                <div className="flex-1 min-w-0 min-h-0 flex">
                    <ScreenShareStage
                        track={activeScreenTrack}
                        presenterName={activeScreenTrack.participant.name || activeScreenTrack.participant.identity}
                        embedded
                    />
                </div>
                <div className="w-full lg:w-56 shrink-0 overflow-y-auto rounded-2xl bg-surface/40 ring-1 ring-border/40 p-2 flex flex-row lg:flex-col gap-2">
                    {participants.map((participant) => (
                        <div key={participant.identity} className="w-40 lg:w-full shrink-0">
                            <MemoizedParticipantTile
                                participant={participant}
                                trackRef={tracksByIdentity.get(participant.identity)}
                            />
                        </div>
                    ))}
                </div>
                <RoomAudioRenderer />
            </div>
        );
    }

    return (
        <div className="flex-1 flex flex-col p-6 overflow-y-auto">
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
    const channelId = useVoiceStore((s) => s.currentChannelId);
    const serverName = useVoiceStore((s) => s.currentServerName);
    const [showMeetingNotes, setShowMeetingNotes] = useState(false);

    const roomOptions = useMemo(() => createRoomOptions(), []);
    const notesContext = useMemo(
        () => ({
            contextId: `voice:${channelId || "pending"}`,
            title: channelName ? `#${channelName}` : "Voice Channel",
            subtitle: serverName || "Voice channel",
        }),
        [channelId, channelName, serverName]
    );

    if (!livekitToken || !livekitUrl) {
        return (
            <div className="flex-1 flex items-center justify-center bg-background">
                <div className="text-center">
                    <div className="w-16 h-16 rounded-2xl bg-surface flex items-center justify-center mx-auto mb-4 ring-1 ring-border">
                        <Mic className="w-8 h-8 text-text-muted" />
                    </div>
                    <h2 className="text-heading font-bold text-text-primary mb-2">Voice Channel</h2>
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
        <div className="flex-1 flex flex-col bg-gradient-to-b from-channel-sidebar to-background min-w-0">
            {/* Header */}
            <div className="h-12 border-b border-border flex items-center px-4 gap-2.5 flex-shrink-0">
                <span className="flex h-6 w-6 items-center justify-center rounded-md border border-live/25 bg-live/10">
                    <Mic className="w-3.5 h-3.5 text-live" />
                </span>
                <span className="text-emphasis font-semibold text-text-primary">{channelName}</span>
                <span className="flex items-center gap-1.5 rounded-full bg-live/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.1em] text-live">
                    <span className="relative flex h-1.5 w-1.5">
                        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-live opacity-70" />
                        <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-live" />
                    </span>
                    Live
                </span>
                <div className="ml-auto">
                    <MeetingNotesButton
                        context={notesContext}
                        open={showMeetingNotes}
                        onClick={() => setShowMeetingNotes((open) => !open)}
                    />
                </div>
            </div>

            <div className="relative flex min-h-0 flex-1">
                <LiveKitRoom
                    token={livekitToken}
                    serverUrl={livekitUrl}
                    connect={true}
                    audio={true}
                    video={false}
                    options={roomOptions}
                    className="flex-1 flex flex-col relative"
                >
                    <div className={`absolute top-3 z-10 ${showMeetingNotes ? "right-3" : "right-4"}`}>
                        <LatencyIndicator />
                    </div>
                    <RoomContent />
                </LiveKitRoom>
                {showMeetingNotes && (
                    <MeetingNotesPanel
                        context={notesContext}
                        onClose={() => setShowMeetingNotes(false)}
                        className="absolute inset-y-0 right-0 z-30 max-w-full md:static md:max-w-none"
                    />
                )}
            </div>
        </div>
    );
}
