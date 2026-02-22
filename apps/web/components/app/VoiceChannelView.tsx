"use client";

import { useEffect, useCallback } from "react";
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
import { Mic, MicOff, Video, VideoOff, MonitorUp } from "lucide-react";
import { useVoiceStore } from "@/stores/voice-store";

function getGridClass(count: number): string {
    if (count <= 1) return "grid-cols-1 max-w-[400px] mx-auto";
    if (count <= 2) return "grid-cols-2 max-w-[800px] mx-auto";
    if (count <= 4) return "grid-cols-2";
    if (count <= 9) return "grid-cols-3";
    return "grid-cols-4";
}

// ─── Participant Tile ────────────────────────────────────────────

function ParticipantTile({ participant }: { participant: Participant }) {
    const isSpeaking = useIsSpeaking(participant);
    const videoTracks = useTracks(
        [Track.Source.Camera],
        { participant }
    );
    const hasVideo = videoTracks.length > 0 && !videoTracks[0].publication?.isMuted;
    const isMuted = participant.isMicrophoneEnabled === false;
    const displayName = participant.name || participant.identity;
    const avatarUrl = `https://api.dicebear.com/9.x/avataaars/svg?seed=${participant.identity}`;

    return (
        <div
            className={`relative bg-surface rounded-xl overflow-hidden flex flex-col items-center justify-center aspect-video transition-all duration-200 ${
                isSpeaking
                    ? "ring-2 ring-accent-teal shadow-[0_0_16px_rgba(62,207,207,0.3)]"
                    : "ring-1 ring-border"
            }`}
        >
            {hasVideo ? (
                <VideoTrack
                    trackRef={videoTracks[0]}
                    className="w-full h-full object-cover"
                />
            ) : (
                <div className="flex flex-col items-center gap-3">
                    <img
                        src={avatarUrl}
                        alt={displayName}
                        className={`w-16 h-16 rounded-full transition-all duration-200 ${
                            isSpeaking ? "ring-[3px] ring-accent-teal" : ""
                        }`}
                    />
                </div>
            )}

            {/* Username + status */}
            <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between">
                <span className="text-micro font-medium text-text-primary bg-black/50 px-2 py-0.5 rounded-md truncate">
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

// ─── Room Content ────────────────────────────────────────────────

function RoomContent() {
    const participants = useParticipants();
    const room = useRoomContext();
    const updateParticipant = useVoiceStore((s) => s.updateParticipant);

    // Sync speaking states to the store
    useEffect(() => {
        const handleSpeaking = (speaking: boolean, participant: Participant) => {
            updateParticipant(participant.identity, { isSpeaking: speaking });
        };

        room.on(RoomEvent.IsSpeakingChanged, handleSpeaking);
        return () => {
            room.off(RoomEvent.IsSpeakingChanged, handleSpeaking);
        };
    }, [room, updateParticipant]);

    const gridClass = getGridClass(participants.length);

    return (
        <div className="flex-1 flex flex-col p-6 overflow-y-auto">
            <ScreenShareView />

            <div className={`grid ${gridClass} gap-4 flex-1 content-center`}>
                {participants.map((participant) => (
                    <ParticipantTile
                        key={participant.identity}
                        participant={participant}
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
                className="flex-1 flex flex-col"
            >
                <RoomContent />
            </LiveKitRoom>
        </div>
    );
}
