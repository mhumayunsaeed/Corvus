"use client";

import { useEffect, useState, useCallback } from "react";
import { Phone, PhoneOff } from "lucide-react";
import { joinDMCall } from "@/lib/api";
import { useRingtone } from "@/hooks/useRingtone";
import { useAuthStore } from "@/stores/auth-store";

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

    useRingtone(!!callData && !accepting, "incoming");

    useEffect(() => {
        const handleIncomingCall = (e: CustomEvent<IncomingCallData>) => {
            if (e.detail.callerId !== user?.id) {
                setCallData(e.detail);
            }
        };

        const handleCallEnded = () => {
            setCallData(null);
        };

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
            onAccept({
                conversationId: callData.conversationId,
                token: result.token,
                url: result.url,
            });
            setCallData(null);
        } catch (err) {
            console.error("Failed to join call:", err);
        } finally {
            setAccepting(false);
        }
    }, [callData, accepting, onAccept]);

    const handleDecline = useCallback(() => {
        setCallData(null);
        onDecline();
    }, [onDecline]);

    if (!callData) return null;

    const avatarUrl =
        callData.callerAvatar ||
        `https://api.dicebear.com/9.x/avataaars/svg?seed=${callData.callerId}`;

    return (
        <div className="fixed top-4 right-4 z-50 w-[320px] bg-surface border border-border rounded-xl shadow-2xl overflow-hidden animate-in slide-in-from-right">
            <div className="p-4 flex items-center gap-3">
                <img
                    src={avatarUrl}
                    alt={callData.callerName}
                    className="w-12 h-12 rounded-full ring-2 ring-accent-teal animate-pulse"
                />
                <div className="flex-1 min-w-0">
                    <div className="text-body font-semibold text-text-primary truncate">
                        {callData.callerName}
                    </div>
                    <div className="text-micro text-text-muted">Incoming call...</div>
                </div>
            </div>

            <div className="flex border-t border-border">
                <button
                    onClick={handleDecline}
                    className="flex-1 flex items-center justify-center gap-2 py-3 text-danger hover:bg-danger/10 transition-colors"
                >
                    <PhoneOff className="w-4 h-4" />
                    <span className="text-body font-medium">Decline</span>
                </button>
                <div className="w-px bg-border" />
                <button
                    onClick={handleAccept}
                    disabled={accepting}
                    className="flex-1 flex items-center justify-center gap-2 py-3 text-success hover:bg-success/10 transition-colors disabled:opacity-50"
                >
                    <Phone className="w-4 h-4" />
                    <span className="text-body font-medium">Accept</span>
                </button>
            </div>
        </div>
    );
}
