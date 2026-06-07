"use client";

import { useEffect, useState } from "react";
import { Pin, X, Loader2, PinOff } from "lucide-react";
import {
    fetchChannelPins,
    unpinChannelMessage,
    type ChannelPinnedMessage,
} from "@/lib/api";
import { notifyError } from "@/lib/notify";
import { UserAvatar } from "./UserAvatar";
import { getUsernameColor } from "@/lib/color-utils";

interface PinnedMessagesPanelProps {
    channelId: string;
    onClose: () => void;
}

function formatWhen(iso: string) {
    return new Date(iso).toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
    });
}

export function PinnedMessagesPanel({ channelId, onClose }: PinnedMessagesPanelProps) {
    const [pins, setPins] = useState<ChannelPinnedMessage[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let cancelled = false;
        setLoading(true);
        fetchChannelPins(channelId)
            .then((res) => {
                if (!cancelled) setPins(res.pins);
            })
            .catch(() => {
                if (!cancelled) setPins([]);
            })
            .finally(() => {
                if (!cancelled) setLoading(false);
            });
        return () => {
            cancelled = true;
        };
    }, [channelId]);

    const handleUnpin = (messageId: string) => {
        setPins((prev) => prev.filter((p) => p.message.id !== messageId));
        unpinChannelMessage(channelId, messageId).catch((err) => {
            notifyError(err instanceof Error ? err.message : "Couldn't unpin message.");
        });
    };

    return (
        <div className="absolute right-3 top-[52px] z-50 w-[380px] max-w-[calc(100vw-2rem)] overflow-hidden rounded-2xl border border-border-highlight bg-surface-overlay shadow-e3 animate-scale-in">
            <div className="flex items-center justify-between border-b border-border-subtle px-3.5 py-2.5">
                <span className="flex items-center gap-2 text-[13px] font-semibold text-text-primary">
                    <Pin className="h-4 w-4 text-text-muted" />
                    Pinned Messages
                </span>
                <button
                    onClick={onClose}
                    aria-label="Close pinned messages"
                    className="flex h-6 w-6 items-center justify-center rounded-md text-text-muted transition-colors hover:bg-hover-row-strong hover:text-text-primary"
                >
                    <X className="h-3.5 w-3.5" />
                </button>
            </div>

            <div className="max-h-[50vh] overflow-y-auto p-1.5 scrollbar-none">
                {loading ? (
                    <div className="flex justify-center py-10">
                        <Loader2 className="h-5 w-5 animate-spin text-text-muted" />
                    </div>
                ) : pins.length === 0 ? (
                    <div className="px-3 py-10 text-center">
                        <Pin className="mx-auto mb-2 h-6 w-6 text-text-faint" />
                        <p className="text-[12px] text-text-muted">
                            No pinned messages yet. Hover a message and hit the pin icon.
                        </p>
                    </div>
                ) : (
                    pins.map((p) => (
                        <div
                            key={p.id}
                            className="group flex items-start gap-2.5 rounded-lg px-2.5 py-2 transition-colors hover:bg-hover-row"
                        >
                            <UserAvatar
                                avatarUrl={p.message.author.avatarUrl}
                                username={p.message.author.username}
                                className="mt-0.5 h-7 w-7 flex-shrink-0"
                            />
                            <div className="min-w-0 flex-1">
                                <div className="flex items-baseline gap-2">
                                    <span
                                        className="text-[13px] font-semibold"
                                        style={{ color: getUsernameColor(p.message.author.username) }}
                                    >
                                        {p.message.author.displayName}
                                    </span>
                                    <span className="text-[10px] text-text-faint">
                                        {formatWhen(p.message.createdAt)}
                                    </span>
                                </div>
                                <p className="mt-0.5 line-clamp-3 text-[13px] text-text-secondary">
                                    {p.message.content}
                                </p>
                            </div>
                            <button
                                onClick={() => handleUnpin(p.message.id)}
                                title="Unpin"
                                aria-label="Unpin message"
                                className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-md text-text-faint opacity-0 transition-all hover:bg-hover-row-strong hover:text-danger group-hover:opacity-100"
                            >
                                <PinOff className="h-3.5 w-3.5" />
                            </button>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
