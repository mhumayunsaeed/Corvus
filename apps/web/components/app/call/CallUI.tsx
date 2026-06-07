"use client";

/**
 * Shared building blocks for every call surface (DM calls, voice channels,
 * stage channels) so they all read with one consistent, professional design
 * language: the same speaking ring, control buttons, connection pill and
 * screen-share stage.
 */

import { memo, useCallback, useRef, useState, type ReactNode } from "react";
import { VideoTrack } from "@livekit/components-react";
import type { TrackReferenceOrPlaceholder } from "@livekit/components-react";
import type { Participant } from "livekit-client";
import { Maximize2, Minimize2, MonitorUp, PhoneOff, Wifi } from "lucide-react";
import { UserAvatar } from "../UserAvatar";

export function getAvatarFromMetadata(participant: Participant): string | null {
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

// ── Speaking avatar ─────────────────────────────────────────────────────

/**
 * An avatar (or live camera tile) wrapped in the animated "who is talking"
 * ring. The ring glows and pulses while `speaking` is true.
 */
export function SpeakingAvatar({
    avatarUrl,
    username,
    px,
    speaking,
    videoTrack,
    className = "",
}: {
    avatarUrl?: string | null;
    username: string;
    px: number;
    speaking: boolean;
    videoTrack?: TrackReferenceOrPlaceholder;
    className?: string;
}) {
    const hasVideo = !!(videoTrack?.publication && !videoTrack.publication.isMuted);

    return (
        <div
            className={`speaker-ring ${speaking ? "speaker-ring--active" : ""} ${className}`}
            style={{ width: px, height: px }}
        >
            <div
                className="speaker-ring__avatar w-full h-full overflow-hidden rounded-full bg-surface-raised ring-1 ring-border/60"
                style={{ fontSize: px }}
            >
                {hasVideo && videoTrack ? (
                    <VideoTrack trackRef={videoTrack} className="w-full h-full object-cover" />
                ) : (
                    <UserAvatar avatarUrl={avatarUrl} username={username} className="w-full h-full" />
                )}
            </div>
        </div>
    );
}

// ── Control button ──────────────────────────────────────────────────────

type CallButtonVariant = "idle" | "active" | "danger";

/** A round call-control button with a shared idle / active / danger look. */
export function CallButton({
    children,
    onClick,
    title,
    active = false,
    danger = false,
    size = "md",
    className = "",
    disabled = false,
}: {
    children: ReactNode;
    onClick?: () => void;
    title?: string;
    active?: boolean;
    danger?: boolean;
    size?: "sm" | "md" | "lg";
    className?: string;
    disabled?: boolean;
}) {
    const variant: CallButtonVariant = danger ? "danger" : active ? "active" : "idle";
    const dims =
        size === "sm" ? "w-9 h-9" : size === "lg" ? "w-14 h-12" : "w-11 h-11";
    const styles: Record<CallButtonVariant, string> = {
        idle: "bg-surface-raised text-text-secondary hover:bg-hover-row-strong hover:text-text-primary border border-border/50",
        active: "bg-live/15 text-live border border-live/30 shadow-glow-teal-sm",
        danger: "bg-danger/15 text-danger border border-danger/30 hover:bg-danger/25",
    };

    return (
        <button
            onClick={onClick}
            title={title}
            disabled={disabled}
            className={`${dims} rounded-full flex items-center justify-center transition-all duration-150 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed ${styles[variant]} ${className}`}
        >
            {children}
        </button>
    );
}

/** Solid red "leave / hang up" button, optionally with a label. */
export function HangupButton({
    onClick,
    disabled = false,
    title = "Disconnect",
    label,
}: {
    onClick?: () => void;
    disabled?: boolean;
    title?: string;
    label?: string;
}) {
    return (
        <button
            onClick={onClick}
            disabled={disabled}
            title={title}
            className={`${label ? "px-5 gap-2" : "w-14"} h-11 rounded-full bg-danger hover:bg-danger/85 text-white flex items-center justify-center font-medium text-[13px] transition-all duration-150 active:scale-95 disabled:opacity-50 shadow-[0_4px_14px_rgba(229,90,103,0.35)]`}
        >
            <PhoneOff className="w-5 h-5" />
            {label && <span>{label}</span>}
        </button>
    );
}

// ── Connection / latency pill ───────────────────────────────────────────

export function ConnectionPill({ latency }: { latency: number | null }) {
    if (latency === null) return null;
    const tone =
        latency < 80 ? "text-success" : latency < 150 ? "text-yellow-500" : "text-danger";
    return (
        <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-black/40 backdrop-blur-sm border border-white/5 ${tone}`}>
            <Wifi className="w-3.5 h-3.5" />
            <span className="text-[11px] font-semibold tabular-nums">{latency}ms</span>
        </div>
    );
}

// ── Screen-share stage ──────────────────────────────────────────────────

/** Full-bleed screen-share viewer with a hover gradient label and fullscreen. */
export const ScreenShareStage = memo(function ScreenShareStage({
    track,
    presenterName,
    embedded = false,
}: {
    track: TrackReferenceOrPlaceholder;
    presenterName: string;
    embedded?: boolean;
}) {
    const [isFullscreen, setIsFullscreen] = useState(false);
    const toggleFullscreen = useCallback(() => setIsFullscreen((v) => !v), []);
    const containerRef = useRef<HTMLDivElement>(null);

    if (!track.publication) return null;

    return (
        <div
            ref={containerRef}
            className={
                isFullscreen
                    ? "fixed inset-0 z-[9999] bg-black flex flex-col group overflow-hidden"
                    : `relative flex-1 min-h-0 w-full flex flex-col group overflow-hidden bg-black ${embedded ? "rounded-2xl ring-1 ring-border/60 shadow-e3" : ""}`
            }
        >
            <VideoTrack trackRef={track} className="w-full h-full object-contain bg-black" />

            {/* Presenter label */}
            <div className={`pointer-events-none absolute left-0 right-0 bottom-0 flex items-end justify-between gap-2 p-3 pt-14 bg-gradient-to-t from-black/85 via-black/40 to-transparent transition-opacity duration-300 ${isFullscreen ? "opacity-100" : "opacity-0 group-hover:opacity-100"}`}>
                <div className="pointer-events-auto flex items-center gap-2 rounded-full bg-black/55 backdrop-blur-sm px-3 py-1.5 border border-white/10">
                    <MonitorUp className="w-4 h-4 text-live" />
                    <span className="text-[13px] font-medium text-white">
                        {presenterName}&apos;s screen
                    </span>
                </div>
            </div>

            <button
                onClick={toggleFullscreen}
                className={`absolute top-3 right-3 z-10 w-9 h-9 rounded-lg bg-black/55 hover:bg-black/80 text-white flex items-center justify-center backdrop-blur-sm border border-white/10 transition-all duration-200 active:scale-95 ${isFullscreen ? "opacity-100" : "opacity-0 group-hover:opacity-100"}`}
                title={isFullscreen ? "Exit fullscreen" : "Fullscreen"}
            >
                {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>
        </div>
    );
});
