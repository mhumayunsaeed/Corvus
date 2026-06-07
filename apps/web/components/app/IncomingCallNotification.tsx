"use client";

import { useEffect, useState, useCallback } from "react";
import { Phone, PhoneOff } from "lucide-react";
import { joinDMCall, declineDMCall } from "@/lib/api";
import { useRingtone } from "@/hooks/useRingtone";
import { useAuthStore } from "@/stores/auth-store";
import { UserAvatar } from "./UserAvatar";
import { getUsernameColor } from "@/lib/color-utils";

interface IncomingCallData {
    conversationId: string;
    roomName: string;
    callerId: string;
    callerName: string;
    callerAvatar: string | null;
}

interface IncomingCallNotificationProps {
    onAccept: (data: { conversationId: string; token: string; url: string }) => void;
    onDecline: () => void;
}

export function IncomingCallNotification({ onAccept, onDecline }: IncomingCallNotificationProps) {
    const { user } = useAuthStore();
    const [callData, setCallData] = useState<IncomingCallData | null>(null);
    const [accepting, setAccepting] = useState(false);

    useRingtone(!!callData && !accepting, "incoming", 6000);

    useEffect(() => {
        const handleIncomingCall = (e: CustomEvent<IncomingCallData>) => {
            if (e.detail.callerId !== user?.id) {
                setCallData(e.detail);
            }
        };
        const handleCallEnded = () => setCallData(null);

        window.addEventListener("corvus:incoming_call", handleIncomingCall as EventListener);
        window.addEventListener("corvus:call_ended", handleCallEnded as EventListener);
        return () => {
            window.removeEventListener("corvus:incoming_call", handleIncomingCall as EventListener);
            window.removeEventListener("corvus:call_ended", handleCallEnded as EventListener);
        };
    }, [user?.id]);

    const handleAccept = useCallback(async () => {
        if (!callData || accepting) return;
        setAccepting(true);
        try {
            const result = await joinDMCall(callData.conversationId);
            onAccept({ conversationId: callData.conversationId, token: result.token, url: result.url });
            setCallData(null);
        } catch (err) {
            console.error("Failed to join call:", err);
        } finally {
            setAccepting(false);
        }
    }, [callData, accepting, onAccept]);

    const handleDecline = useCallback(() => {
        const conversationId = callData?.conversationId;
        setCallData(null);
        if (conversationId) {
            declineDMCall(conversationId).catch((err) => {
                console.error("Failed to decline call:", err);
            });
        }
        onDecline();
    }, [callData?.conversationId, onDecline]);

    if (!callData) return null;

    const nameColor = getUsernameColor(callData.callerName);

    return (
        <div className="fixed top-4 right-4 z-50 w-[330px] animate-in slide-in-from-right-4 fade-in duration-300">
            <div className="relative overflow-hidden rounded-2xl border border-border/70 bg-surface-overlay/95 backdrop-blur-xl shadow-modal">
                {/* Accent glow header */}
                <div className="absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-live/15 to-transparent pointer-events-none" />

                <div className="relative p-5 flex flex-col items-center text-center">
                    {/* Pulsing avatar */}
                    <div className="relative mb-3">
                        <span className="absolute -inset-2 rounded-full bg-live/20 animate-ping" />
                        <span className="absolute -inset-1 rounded-full ring-2 ring-live/40" />
                        <UserAvatar
                            avatarUrl={callData.callerAvatar}
                            username={callData.callerName}
                            className="relative w-16 h-16 ring-2 ring-live shadow-glow-teal"
                        />
                    </div>

                    <div className="text-[15px] font-semibold truncate max-w-full" style={{ color: nameColor }}>
                        {callData.callerName}
                    </div>
                    <div className="mt-0.5 flex items-center gap-1.5 text-micro text-text-muted">
                        <Phone className="w-3 h-3 text-live animate-pulse" />
                        Incoming voice call…
                    </div>

                    {/* Actions */}
                    <div className="mt-5 flex items-center justify-center gap-8">
                        <button
                            onClick={handleDecline}
                            className="flex flex-col items-center gap-1.5 group"
                            title="Decline"
                        >
                            <span className="w-12 h-12 rounded-full bg-danger flex items-center justify-center text-white shadow-[0_4px_14px_rgba(229,90,103,0.4)] group-hover:bg-danger/85 group-active:scale-95 transition-all">
                                <PhoneOff className="w-5 h-5" />
                            </span>
                            <span className="text-[11px] font-medium text-text-muted">Decline</span>
                        </button>
                        <button
                            onClick={handleAccept}
                            disabled={accepting}
                            className="flex flex-col items-center gap-1.5 group disabled:opacity-60"
                            title="Accept"
                        >
                            <span className="relative w-12 h-12 rounded-full bg-success flex items-center justify-center text-white shadow-[0_4px_14px_rgba(52,199,123,0.4)] group-hover:brightness-110 group-active:scale-95 transition-all">
                                <span className="absolute inset-0 rounded-full bg-success/40 animate-ping" />
                                <Phone className="relative w-5 h-5" />
                            </span>
                            <span className="text-[11px] font-medium text-text-muted">Accept</span>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
