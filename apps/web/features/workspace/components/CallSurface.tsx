"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@corvus/ui";
import { useToastStore } from "@/shared/stores/toast-store";
import {
  Mic,
  MicOff,
  Video,
  VideoOff,
  MonitorUp,
  PhoneOff,
  Headphones,
  VolumeX,
  PenLine,
  Maximize2,
  X,
  AudioLines,
  Check,
} from "lucide-react";
import { Avatar } from "@/shared/components/ui";
import { CanvasView } from "./CanvasView";
import {
  NOISE_SUPPRESSION_LEVELS,
  acquireMic,
  getNoiseSuppressionLevel,
  onNoiseSuppressionChange,
  setNoiseSuppressionLevel,
  type MicSession,
  type NoiseSuppressionLevel,
} from "@/shared/lib/noise-suppression";
import type { VoiceParticipant } from "./types";

/**
 * Shared call primitives (brief §Voice) — ONE visual system for every live
 * surface: 1:1 calls, group calls, voice channels, and stages. Square avatars,
 * a calm green border for speaking, flat square controls, mono status. The
 * whiteboard is a first-class call layer, not a separate app.
 */

/* ── Local call state ───────────────────────────────────────────────── */

export interface CallControlsState {
  muted: boolean;
  deafened: boolean;
  camera: boolean;
  sharing: boolean;
  whiteboard: boolean;
}

function mediaToast(title: string, body: string) {
  useToastStore.getState().addToast({ title, body, variant: "error" });
}

/**
 * Real local-media call controls. The microphone is acquired on join; mute
 * disables its tracks, camera and screenshare own real getUserMedia /
 * getDisplayMedia streams that the tiles and stage render live. Everything is
 * released when the surface unmounts.
 */
export function useCallControls(initial?: Partial<CallControlsState>) {
  const [state, setState] = useState<CallControlsState>(() => {
    const s = {
      muted: false,
      deafened: false,
      camera: false,
      sharing: false,
      whiteboard: false,
      ...initial,
    };
    if (s.deafened) s.muted = true;
    return s;
  });
  const [camStream, setCamStream] = useState<MediaStream | null>(null);
  const [screenStream, setScreenStream] = useState<MediaStream | null>(null);
  const micRef = useRef<MicSession | null>(null);
  const mutedRef = useRef(Boolean(initial?.muted || initial?.deafened));
  const [nsLevel, setNsLevel] = useState<NoiseSuppressionLevel>("standard");

  // Follow the user's noise-suppression choice — including mid-call changes.
  useEffect(() => {
    setNsLevel(getNoiseSuppressionLevel());
    return onNoiseSuppressionChange(setNsLevel);
  }, []);

  // Join (and re-join on suppression change): acquire the microphone through
  // the noise-suppression engine. Best effort — UI still works without it.
  useEffect(() => {
    let cancelled = false;
    acquireMic(nsLevel)
      .then((session) => {
        if (cancelled) {
          session.dispose();
          return;
        }
        // Joining muted/deafened (e.g. from the dock) keeps the mic dark.
        session.setEnabled(!mutedRef.current);
        micRef.current = session;
      })
      .catch(() => mediaToast("Microphone unavailable", "Check browser permissions to talk."));
    return () => {
      cancelled = true;
      micRef.current?.dispose();
      micRef.current = null;
    };
  }, [nsLevel]);

  // If the camera turns on at join (video call), acquire immediately.
  const wantsInitialCamera = useRef(Boolean(initial?.camera));
  useEffect(() => {
    if (!wantsInitialCamera.current) return;
    wantsInitialCamera.current = false;
    navigator.mediaDevices
      ?.getUserMedia({ video: true })
      .then(setCamStream)
      .catch(() => {
        setState((s) => ({ ...s, camera: false }));
        mediaToast("Camera unavailable", "Check browser permissions to share video.");
      });
  }, []);

  // Release replaced/abandoned streams (also covers unmount).
  useEffect(() => () => camStream?.getTracks().forEach((t) => t.stop()), [camStream]);
  useEffect(() => () => screenStream?.getTracks().forEach((t) => t.stop()), [screenStream]);

  const toggle = (key: keyof CallControlsState) => {
    if (key === "camera") {
      if (state.camera) {
        setCamStream(null);
        setState((s) => ({ ...s, camera: false }));
      } else {
        navigator.mediaDevices
          ?.getUserMedia({ video: true })
          .then((s) => {
            setCamStream(s);
            setState((st) => ({ ...st, camera: true }));
          })
          .catch(() => mediaToast("Camera unavailable", "Check browser permissions to share video."));
      }
      return;
    }

    if (key === "sharing") {
      if (state.sharing) {
        setScreenStream(null);
        setState((s) => ({ ...s, sharing: false }));
      } else {
        navigator.mediaDevices
          ?.getDisplayMedia({ video: true })
          .then((s) => {
            // Browser "stop sharing" bar ends the track — mirror it in state.
            s.getVideoTracks()[0]?.addEventListener("ended", () => {
              setScreenStream(null);
              setState((st) => ({ ...st, sharing: false }));
            });
            setScreenStream(s);
            setState((st) => ({ ...st, sharing: true }));
          })
          .catch(() => {
            /* user cancelled the picker — nothing to do */
          });
      }
      return;
    }

    setState((s) => {
      const next = { ...s, [key]: !s[key] };
      // Deafening implies muting — undeafening leaves mute as-is (familiar semantics).
      if (key === "deafened" && next.deafened) next.muted = true;
      // Apply mic state to the live session (survives re-acquisition).
      mutedRef.current = next.muted;
      micRef.current?.setEnabled(!next.muted);
      return next;
    });
  };

  return { state, toggle, camStream, screenStream };
}

/** Bind a MediaStream to a <video> element. */
function VideoSurface({
  stream,
  mirror,
  fit = "cover",
}: {
  stream: MediaStream;
  mirror?: boolean;
  /** cover crops (camera tiles); contain letterboxes (screen shares). */
  fit?: "cover" | "contain";
}) {
  const ref = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    if (ref.current) ref.current.srcObject = stream;
  }, [stream]);
  return (
    <video
      ref={ref}
      autoPlay
      playsInline
      muted
      className={cn(
        "absolute inset-0 h-full w-full",
        fit === "contain" ? "object-contain" : "object-cover",
        mirror && "scale-x-[-1]"
      )}
    />
  );
}

/* ── Participant tile ───────────────────────────────────────────────── */

export function ParticipantTile({
  participant: p,
  size = 56,
  stream,
  className,
}: {
  participant: VoiceParticipant;
  size?: number;
  /** Live camera stream — replaces the avatar with real video. */
  stream?: MediaStream | null;
  className?: string;
}) {
  return (
    <div
      data-speaking={p.speaking}
      className={cn(
        "relative flex aspect-video flex-col items-center justify-center overflow-hidden rounded-lg border bg-surface-raised transition-colors",
        p.speaking && !p.muted ? "border-status-online" : "border-border",
        className
      )}
    >
      {stream ? (
        <>
          <VideoSurface stream={stream} mirror />
          <span className="absolute bottom-2 left-2 flex items-center gap-1.5 rounded-[4px] bg-black/55 px-2 py-0.5 text-[12px] font-medium text-white">
            {p.name}
            {p.deafened ? (
              <VolumeX size={12} className="text-danger" />
            ) : p.muted ? (
              <MicOff size={12} className="text-danger" />
            ) : null}
          </span>
        </>
      ) : (
        <>
          <Avatar src={p.avatar} name={p.name} size={size} radius={Math.round(size / 4.5)} />
          <div className="mt-2.5 flex items-center gap-1.5">
            <span className="text-[13px] font-medium text-text-primary">{p.name}</span>
            {p.deafened ? (
              <VolumeX size={14} className="text-danger" />
            ) : p.muted ? (
              <MicOff size={14} className="text-danger" />
            ) : null}
          </div>
        </>
      )}
      {p.sharing && (
        <span className="absolute left-2 top-2 rounded-[3px] border border-border bg-surface-overlay/90 px-1.5 py-px font-mono text-[10px] tracking-[0.06em] text-text-secondary">
          presenting
        </span>
      )}
    </div>
  );
}

/* ── Connection pill ────────────────────────────────────────────────── */

export function ConnectionPill() {
  const [ms, setMs] = useState(23);
  useEffect(() => {
    const t = setInterval(() => setMs(18 + Math.round(Math.random() * 14)), 3000);
    return () => clearInterval(t);
  }, []);
  return (
    <span className="flex items-center gap-1.5 rounded-[4px] border border-border px-2 py-0.5 font-mono text-[11px] text-text-muted">
      <span className="h-1.5 w-1.5 rounded-full bg-status-online" />
      {ms}ms
    </span>
  );
}

/* ── Screen-share stage ─────────────────────────────────────────────── */

export function ScreenShareStage({
  presenterName,
  self,
  stream,
  onStop,
  className,
}: {
  presenterName: string;
  /** True when the local user is the presenter. */
  self?: boolean;
  /** Live display-capture stream — rendered in the stage. */
  stream?: MediaStream | null;
  onStop?: () => void;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "group/stage relative flex aspect-video w-full items-center justify-center overflow-hidden rounded-lg border border-border bg-bg-deep",
        className
      )}
    >
      {stream ? (
        <VideoSurface stream={stream} fit="contain" />
      ) : (
        <div className="flex flex-col items-center gap-2">
          <MonitorUp size={22} className="text-text-faint" />
          <span className="font-mono text-[12px] text-text-muted">
            {self ? "You're presenting your screen" : `${presenterName} is presenting`}
          </span>
        </div>
      )}
      {self && onStop && (
        <button
          type="button"
          onClick={onStop}
          className="absolute bottom-3 left-1/2 h-7 -translate-x-1/2 rounded-md border border-danger/40 bg-surface-overlay/90 px-3 text-[12px] font-medium text-danger opacity-0 transition-opacity hover:bg-danger/10 group-hover/stage:opacity-100"
        >
          Stop sharing
        </button>
      )}
      <span className="absolute left-3 top-3 rounded-[3px] border border-border bg-surface-overlay/90 px-2 py-0.5 font-mono text-[10px] tracking-[0.06em] text-text-secondary opacity-0 transition-opacity group-hover/stage:opacity-100">
        {presenterName}
      </span>
      <button
        type="button"
        aria-label="Fullscreen"
        className="absolute right-3 top-3 flex h-7 w-7 items-center justify-center rounded-sm border border-border bg-surface-overlay/90 text-text-secondary opacity-0 transition-opacity hover:text-text-primary group-hover/stage:opacity-100"
      >
        <Maximize2 size={13} />
      </button>
    </div>
  );
}

/* ── Whiteboard layer ───────────────────────────────────────────────── */

export function WhiteboardLayer({
  onClose,
  storageKey,
}: {
  onClose: () => void;
  /** Persist drawings under this key (e.g. the call's conversation id). */
  storageKey?: string;
}) {
  return (
    <div className="absolute inset-0 z-20 flex flex-col bg-background">
      <div className="flex h-9 shrink-0 items-center justify-between border-b border-border px-3">
        <span className="font-mono text-[11px] uppercase tracking-[0.08em] text-text-muted">
          Whiteboard — visible to everyone in the call
        </span>
        <button
          type="button"
          aria-label="Close whiteboard"
          onClick={onClose}
          className="flex h-6 w-6 items-center justify-center rounded-sm text-text-faint transition-colors hover:bg-hover-row hover:text-text-primary"
        >
          <X size={14} />
        </button>
      </div>
      <div className="min-h-0 flex-1">
        <CanvasView channelName="whiteboard" bare storageKey={storageKey} />
      </div>
    </div>
  );
}

/* ── Control bar — the one set of call controls everywhere ──────────── */

export function CallControls({
  state,
  onToggle,
  onLeave,
  compact,
}: {
  state: CallControlsState;
  onToggle: (key: keyof CallControlsState) => void;
  onLeave?: () => void;
  /** Slightly smaller buttons for the modal footer. */
  compact?: boolean;
}) {
  const size = compact ? "h-10 w-10" : "h-11 w-11";
  return (
    <>
      <ControlButton
        size={size}
        active={!state.muted}
        danger={state.muted}
        label={state.muted ? "Unmute" : "Mute"}
        onClick={() => onToggle("muted")}
      >
        {state.muted ? <MicOff size={18} /> : <Mic size={18} />}
      </ControlButton>
      <ControlButton
        size={size}
        active={!state.deafened}
        danger={state.deafened}
        label={state.deafened ? "Undeafen" : "Deafen"}
        onClick={() => onToggle("deafened")}
      >
        {state.deafened ? <VolumeX size={18} /> : <Headphones size={18} />}
      </ControlButton>
      <ControlButton
        size={size}
        active={state.camera}
        label={state.camera ? "Turn camera off" : "Turn camera on"}
        onClick={() => onToggle("camera")}
      >
        {state.camera ? <Video size={18} /> : <VideoOff size={18} />}
      </ControlButton>
      <ControlButton
        size={size}
        active={state.sharing}
        label={state.sharing ? "Stop sharing" : "Share screen"}
        onClick={() => onToggle("sharing")}
      >
        <MonitorUp size={18} />
      </ControlButton>
      <ControlButton
        size={size}
        active={state.whiteboard}
        label={state.whiteboard ? "Close whiteboard" : "Open whiteboard"}
        onClick={() => onToggle("whiteboard")}
      >
        <PenLine size={18} />
      </ControlButton>
      <NoiseSuppressionMenu size={size} />
      <button
        type="button"
        aria-label="Leave call"
        onClick={onLeave}
        className={cn(
          size,
          "flex items-center justify-center rounded-md border border-danger/30 bg-danger/15 text-danger transition-colors hover:bg-danger/25"
        )}
      >
        <PhoneOff size={18} />
      </button>
    </>
  );
}

/** In-call noise-suppression picker — same engine the dock controls. */
export function NoiseSuppressionMenu({ size = "h-10 w-10" }: { size?: string }) {
  const [open, setOpen] = useState(false);
  const [level, setLevel] = useState<NoiseSuppressionLevel>("standard");

  useEffect(() => {
    setLevel(getNoiseSuppressionLevel());
    return onNoiseSuppressionChange(setLevel);
  }, []);

  return (
    <div className="relative">
      <ControlButton
        size={size}
        active={level !== "off"}
        label={`Noise suppression — ${level}`}
        onClick={() => setOpen((v) => !v)}
      >
        <AudioLines size={18} />
      </ControlButton>
      {open && (
        <div
          className="absolute bottom-full left-1/2 z-40 mb-2 w-[230px] -translate-x-1/2 rounded-[10px] border border-border bg-surface-overlay p-1"
          style={{ boxShadow: "0 8px 24px rgba(0,0,0,0.4)" }}
        >
          <p className="px-2.5 pb-1 pt-1.5 font-mono text-[10px] uppercase tracking-[0.08em] text-text-muted">
            Noise suppression
          </p>
          {NOISE_SUPPRESSION_LEVELS.map((l) => (
            <button
              key={l.id}
              type="button"
              onClick={() => {
                setNoiseSuppressionLevel(l.id);
                setOpen(false);
              }}
              className={cn(
                "flex w-full items-start gap-2.5 rounded-sm px-2.5 py-1.5 text-left transition-colors hover:bg-hover-row"
              )}
            >
              <span className="w-3.5 pt-0.5">
                {level === l.id && <Check size={13} className="text-accent" />}
              </span>
              <span className="min-w-0 leading-tight">
                <span className="block text-[13px] text-text-primary">{l.label}</span>
                <span className="block text-[11px] text-text-muted">{l.description}</span>
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function ControlButton({
  size,
  active,
  danger,
  label,
  onClick,
  children,
}: {
  size: string;
  active?: boolean;
  danger?: boolean;
  label: string;
  onClick?: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={active}
      title={label}
      onClick={onClick}
      className={cn(
        size,
        "flex items-center justify-center rounded-md border transition-colors",
        danger
          ? "border-danger/40 bg-danger/10 text-danger hover:bg-danger/20"
          : active
            ? "border-accent-muted bg-accent-soft text-text-primary"
            : "border-border bg-surface-overlay text-text-primary hover:bg-hover-row"
      )}
    >
      {children}
    </button>
  );
}
