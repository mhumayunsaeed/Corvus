"use client";

import { useState, useEffect, useCallback } from "react";
import {
    LiveKitRoom,
    RoomAudioRenderer,
    useParticipants,
    useTracks,
    VideoTrack,
    useIsSpeaking,
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
} from "lucide-react";
import { useRingtone } from "@/hooks/useRingtone";

interface CallModalProps {
    open: boolean;
    onClose: () => void;
    token: string;
    url: string;
    callerName?: string;
    initialVideo?: boolean;
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

function CallContent({
    onClose,
    initialVideo = false,
}: {
    onClose: () => void;
    initialVideo?: boolean;
}) {
    const participants = useParticipants();
    const [isMuted, setIsMuted] = useState(false);
    const [hasVideo, setHasVideo] = useState(initialVideo);
    const [isScreenSharing, setIsScreenSharing] = useState(false);

    const ringing = participants.length <= 1;
    useRingtone(ringing, "outgoing");

    const handleEndCall = useCallback(() => {
        onClose();
    }, [onClose]);

    const gridClass =
        participants.length <= 1
            ? "grid-cols-1 max-w-[400px] mx-auto"
            : participants.length <= 4
                ? "grid-cols-2 max-w-[800px] mx-auto"
                : "grid-cols-3";

    return (
        <div className="flex-1 flex flex-col">
            {/* Participants */}
            <div className="flex-1 flex items-center justify-center p-6">
                <div className={`grid ${gridClass} gap-4 w-full`}>
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
                >
                    {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
                </button>
                <button
                    onClick={() => setHasVideo(!hasVideo)}
                    className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${hasVideo
                        ? "bg-accent-teal/20 text-accent-teal"
                        : "bg-surface-raised text-text-primary hover:bg-hover-row"
                        }`}
                >
                    {hasVideo ? <Video className="w-5 h-5" /> : <VideoOff className="w-5 h-5" />}
                </button>
                <button
                    onClick={() => setIsScreenSharing(!isScreenSharing)}
                    className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${isScreenSharing
                        ? "bg-accent-teal/20 text-accent-teal"
                        : "bg-surface-raised text-text-primary hover:bg-hover-row"
                        }`}
                >
                    <MonitorUp className="w-5 h-5" />
                </button>
                <button
                    onClick={handleEndCall}
                    className="w-12 h-10 rounded-full bg-danger hover:bg-danger/80 flex items-center justify-center text-white transition-all"
                >
                    <PhoneOff className="w-5 h-5" />
                </button>
            </div>
        </div>
    );
}

export function CallModal({
    open,
    onClose,
    token,
    url,
    initialVideo = false,
}: CallModalProps) {
    if (!open) return null;

    return (
        <div className="fixed inset-0 z-50 bg-background/95 backdrop-blur-sm flex flex-col">
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
