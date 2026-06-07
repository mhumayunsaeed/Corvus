"use client";

import { useEffect, useMemo, useState } from "react";
import {
    LiveKitRoom,
    RoomAudioRenderer,
    useParticipants,
    useTracks,
    VideoTrack,
    useRoomContext,
    useIsSpeaking,
} from "@livekit/components-react";
import { Track } from "livekit-client";
import type { Participant } from "livekit-client";
import { Radio, Hand, Mic, MicOff, UserCheck, UserMinus, Users, Wifi } from "lucide-react";
import { useVoiceStore } from "@/stores/voice-store";
import { useAuthStore } from "@/stores/auth-store";
import { createRoomOptions } from "@/lib/livekit-config";
import { useNoiseSuppression } from "@/hooks/useNoiseSuppression";
import { useLivekitLatency } from "@/hooks/useLivekitLatency";
import { fetchStageState, requestStageSpeak, grantStageSpeak, revokeStageSpeak } from "@/lib/api";
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

// ─── Speaker Tile ────────────────────────────────────────────────

function SpeakerTile({ participant }: { participant: Participant }) {
    const isSpeaking = useIsSpeaking(participant);
    const isMuted = participant.isMicrophoneEnabled === false;
    const displayName = participant.name || participant.identity;
    const username = participant.identity;
    const avatarUrl = getAvatarFromMetadata(participant);

    return (
        <div
            className={`relative bg-surface rounded-xl overflow-hidden flex flex-col items-center justify-center p-6 transition-all duration-200 ${
                isSpeaking
                    ? "ring-2 ring-live shadow-[0_0_16px_rgba(34,224,214,0.3)]"
                    : "ring-1 ring-border"
            }`}
        >
            <UserAvatar
                avatarUrl={avatarUrl}
                username={username}
                className={`w-20 h-20 mb-3 transition-all duration-200 ${
                    isSpeaking ? "ring-[3px] ring-live" : ""
                }`}
            />
            <span
                className="text-body font-semibold truncate max-w-[120px]"
                style={{ color: getUsernameColor(username) }}
            >
                {displayName}
            </span>
            <div className="flex items-center gap-1 mt-1">
                {isMuted ? (
                    <MicOff className="w-3.5 h-3.5 text-danger" />
                ) : (
                    <Mic className={`w-3.5 h-3.5 ${isSpeaking ? "text-live" : "text-text-muted"}`} />
                )}
            </div>
        </div>
    );
}

// ─── Audience Row ────────────────────────────────────────────────

function AudienceRow({
    participant,
    hasRaisedHand,
    isModerator,
    onGrant,
}: {
    participant: Participant;
    hasRaisedHand: boolean;
    isModerator: boolean;
    onGrant: () => void;
}) {
    const displayName = participant.name || participant.identity;
    const username = participant.identity;
    const avatarUrl = getAvatarFromMetadata(participant);

    return (
        <div className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-hover-row transition-colors">
            <UserAvatar avatarUrl={avatarUrl} username={username} className="w-8 h-8" />
            <span
                className="text-body font-medium truncate flex-1"
                style={{ color: getUsernameColor(username) }}
            >
                {displayName}
            </span>
            {hasRaisedHand && (
                <span className="flex items-center gap-1 text-yellow-500 text-xs font-medium">
                    <Hand className="w-3.5 h-3.5" />
                    Raised
                </span>
            )}
            {isModerator && hasRaisedHand && (
                <button
                    onClick={onGrant}
                    className="px-2 py-1 rounded-md bg-live/20 text-live text-xs font-medium hover:bg-live/30 transition-colors"
                >
                    <UserCheck className="w-3.5 h-3.5 inline mr-1" />
                    Approve
                </button>
            )}
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

// ─── Room Content (Stage Layout) ─────────────────────────────────

interface StageRoomContentProps {
    isModerator: boolean;
}

function StageRoomContent({ isModerator }: StageRoomContentProps) {
    const participants = useParticipants();
    const room = useRoomContext();
    useNoiseSuppression();

    const userId = useAuthStore((s) => s.user?.id);
    const channelId = useVoiceStore((s) => s.currentChannelId);
    const stageSpeakers = useVoiceStore((s) => s.stageSpeakers);
    const stageRaisedHands = useVoiceStore((s) => s.stageRaisedHands);
    const isMuted = useVoiceStore((s) => s.isMuted);

    const [requesting, setRequesting] = useState(false);

    // Sync mute state to LiveKit
    useEffect(() => {
        const lp = room.localParticipant;
        if (!lp) return;
        lp.setMicrophoneEnabled(!isMuted).catch(console.error);
    }, [isMuted, room]);

    const speakerSet = useMemo(() => new Set(stageSpeakers), [stageSpeakers]);
    const raisedSet = useMemo(() => new Set(stageRaisedHands), [stageRaisedHands]);

    const speakers = participants.filter((p) => speakerSet.has(p.identity) || isModerator && p.identity === room.localParticipant?.identity && speakerSet.has(p.identity));
    const audience = participants.filter((p) => !speakerSet.has(p.identity));

    // Owners/admins are always speakers
    const allSpeakers = isModerator
        ? participants.filter((p) => speakerSet.has(p.identity) || p.identity === userId)
        : speakers;
    const allAudience = participants.filter((p) => !allSpeakers.some((s) => s.identity === p.identity));

    const isSpeaker = userId ? (speakerSet.has(userId) || isModerator) : false;
    const hasRaisedHand = userId ? raisedSet.has(userId) : false;

    const handleRaiseHand = async () => {
        if (!channelId || requesting) return;
        setRequesting(true);
        try {
            await requestStageSpeak(channelId);
        } catch (err) {
            console.error("Failed to raise hand:", err);
        } finally {
            setRequesting(false);
        }
    };

    const handleGrantSpeak = async (targetUserId: string) => {
        if (!channelId) return;
        try {
            await grantStageSpeak(channelId, targetUserId);
        } catch (err) {
            console.error("Failed to grant speak:", err);
        }
    };

    const handleRevokeSpeak = async (targetUserId: string) => {
        if (!channelId) return;
        try {
            await revokeStageSpeak(channelId, targetUserId);
        } catch (err) {
            console.error("Failed to revoke speak:", err);
        }
    };

    return (
        <div className="flex-1 flex flex-col overflow-y-auto">
            {/* Speakers Section */}
            <div className="p-6 pb-2">
                <div className="flex items-center gap-2 mb-4">
                    <Mic className="w-4 h-4 text-live" />
                    <h3 className="text-xs font-bold text-text-muted uppercase tracking-wider">
                        Speakers ({allSpeakers.length})
                    </h3>
                </div>
                {allSpeakers.length > 0 ? (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                        {allSpeakers.map((p) => (
                            <div key={p.identity} className="relative group">
                                <SpeakerTile participant={p} />
                                {isModerator && p.identity !== userId && speakerSet.has(p.identity) && (
                                    <button
                                        onClick={() => handleRevokeSpeak(p.identity)}
                                        className="absolute top-2 right-2 w-6 h-6 rounded-full bg-danger/80 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                                        title="Move to audience"
                                    >
                                        <UserMinus className="w-3.5 h-3.5" />
                                    </button>
                                )}
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-8 text-text-muted text-body">
                        No speakers yet. Waiting for the host to begin.
                    </div>
                )}
            </div>

            {/* Divider */}
            <div className="mx-6 border-t border-border my-2" />

            {/* Audience Section */}
            <div className="p-6 pt-2 flex-1">
                <div className="flex items-center gap-2 mb-4">
                    <Users className="w-4 h-4 text-text-muted" />
                    <h3 className="text-xs font-bold text-text-muted uppercase tracking-wider">
                        Audience ({allAudience.length})
                    </h3>
                </div>
                {allAudience.length > 0 ? (
                    <div className="space-y-1">
                        {allAudience.map((p) => (
                            <AudienceRow
                                key={p.identity}
                                participant={p}
                                hasRaisedHand={raisedSet.has(p.identity)}
                                isModerator={isModerator}
                                onGrant={() => handleGrantSpeak(p.identity)}
                            />
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-4 text-text-muted text-body">
                        No audience members yet.
                    </div>
                )}
            </div>

            {/* Bottom Action Bar */}
            {!isSpeaker && (
                <div className="sticky bottom-0 p-4 bg-background/80 backdrop-blur-sm border-t border-border">
                    <button
                        onClick={handleRaiseHand}
                        disabled={requesting || hasRaisedHand}
                        className={`w-full py-3 rounded-lg font-medium text-body transition-all flex items-center justify-center gap-2 ${
                            hasRaisedHand
                                ? "bg-yellow-500/20 text-yellow-500 cursor-default"
                                : "bg-accent-violet hover:bg-accent-violet/80 text-white"
                        }`}
                    >
                        <Hand className="w-4 h-4" />
                        {hasRaisedHand ? "Hand Raised — Waiting for approval" : "Raise Hand to Speak"}
                    </button>
                </div>
            )}

            <RoomAudioRenderer />
        </div>
    );
}

// ─── Main StageChannelView Component ─────────────────────────────

interface StageChannelViewProps {
    serverRole?: string;
    serverOwnerId?: string;
}

export function StageChannelView({ serverRole, serverOwnerId }: StageChannelViewProps) {
    const livekitToken = useVoiceStore((s) => s.livekitToken);
    const livekitUrl = useVoiceStore((s) => s.livekitUrl);
    const channelName = useVoiceStore((s) => s.currentChannelName);
    const channelId = useVoiceStore((s) => s.currentChannelId);
    const setStageSpeakers = useVoiceStore((s) => s.setStageSpeakers);
    const setStageRaisedHands = useVoiceStore((s) => s.setStageRaisedHands);
    const userId = useAuthStore((s) => s.user?.id);

    const isModerator = serverRole === "owner" || serverRole === "admin" || userId === serverOwnerId;

    const roomOptions = useMemo(() => createRoomOptions(), []);

    // Fetch stage state on mount
    useEffect(() => {
        if (!channelId) return;
        fetchStageState(channelId)
            .then((state) => {
                setStageSpeakers(state.speakers);
                setStageRaisedHands(state.raisedHands);
            })
            .catch(console.error);
    }, [channelId, setStageSpeakers, setStageRaisedHands]);

    if (!livekitToken || !livekitUrl) {
        return (
            <div className="flex-1 flex items-center justify-center bg-background">
                <div className="text-center">
                    <div className="w-16 h-16 rounded-2xl bg-surface flex items-center justify-center mx-auto mb-4">
                        <Radio className="w-8 h-8 text-text-muted" />
                    </div>
                    <h2 className="text-heading font-bold text-text-primary mb-2">Stage Channel</h2>
                    <p className="text-body text-text-muted">
                        {livekitUrl
                            ? "Connecting..."
                            : "LiveKit server not configured. Set LIVEKIT_URL to enable stage channels."}
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="flex-1 flex flex-col bg-background min-w-0">
            {/* Header */}
            <div className="h-12 border-b border-border flex items-center px-4 gap-3 flex-shrink-0">
                <Radio className="w-5 h-5 text-live flex-shrink-0" />
                <span className="text-emphasis font-semibold text-text-primary">{channelName}</span>
                <span className="text-body text-text-muted">Stage Channel</span>
            </div>

            <LiveKitRoom
                token={livekitToken}
                serverUrl={livekitUrl}
                connect={true}
                audio={isModerator}
                video={false}
                options={roomOptions}
                className="flex-1 flex flex-col"
            >
                {/* Latency in top-right */}
                <div className="absolute top-14 right-4 z-10">
                    <LatencyIndicator />
                </div>
                <StageRoomContent isModerator={isModerator} />
            </LiveKitRoom>
        </div>
    );
}
