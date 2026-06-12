"use client";

import { useEffect, useState } from "react";
import { cn } from "@corvus/ui";
import { Phone, Minus, Mic, MicOff, Maximize2, Minimize2, PhoneOff } from "lucide-react";
import { ringOutgoing } from "@/lib/notify";
import { Avatar } from "@/components/ui";
import type { VoiceParticipant } from "./types";
import {
  CallControls,
  ConnectionPill,
  ParticipantTile,
  ScreenShareStage,
  WhiteboardLayer,
  useCallControls,
} from "./CallSurface";

export interface CallPeer {
  id: string;
  name: string;
  avatar?: string | null;
}

/**
 * DM call surfaces (brief §Voice) — 1:1 and group calls share the exact tile,
 * control, stage, and whiteboard system as voice channels. A quiet modal card
 * on the overlay surface; no gradients, no glowing rings.
 */
export function CallModal({
  peers,
  me,
  name,
  video,
  minimized,
  onMinimize,
  onRestore,
  onClose,
}: {
  peers: CallPeer[];
  me: CallPeer;
  /** Conversation name — group calls show it in the header. */
  name?: string;
  video?: boolean;
  /** Collapsed to a floating pill — the call (timer, media) stays live. */
  minimized?: boolean;
  onMinimize?: () => void;
  onRestore?: () => void;
  onClose: () => void;
}) {
  const [seconds, setSeconds] = useState(-3); // negative = ringing
  const { state, toggle, camStream, screenStream } = useCallControls({ camera: Boolean(video) });

  useEffect(() => {
    const t = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, []);

  const ringing = seconds < 0;

  // Outgoing ringback while the call is ringing.
  useEffect(() => {
    if (!ringing) return;
    const ring = ringOutgoing();
    return () => ring.stop();
  }, [ringing]);

  const mm = String(Math.floor(Math.max(seconds, 0) / 60)).padStart(2, "0");
  const ss = String(Math.max(seconds, 0) % 60).padStart(2, "0");
  const timer = ringing ? "ringing…" : `${mm}:${ss}`;

  const tiles: VoiceParticipant[] = [
    ...peers.map((p, i) => ({
      id: p.id,
      name: p.name,
      avatar: p.avatar,
      speaking: !ringing && i === 0,
    })),
    { id: me.id, name: me.name, avatar: me.avatar, muted: state.muted, deafened: state.deafened },
  ];

  const wide = tiles.length > 2 || state.sharing || state.whiteboard;

  // Minimized — a quiet floating pill; everything stays mounted and live.
  if (minimized) {
    return (
      <div
        className="fixed right-5 top-5 z-[160] flex items-center gap-2.5 rounded-[10px] border border-border bg-surface-overlay py-2 pl-3.5 pr-2"
        style={{ boxShadow: "0 8px 24px rgba(0,0,0,0.4)" }}
      >
        <span className={cn("h-1.5 w-1.5 rounded-full", ringing ? "bg-status-idle" : "bg-status-online")} />
        <button type="button" onClick={onRestore} className="min-w-0 text-left">
          <span className="block max-w-[140px] truncate text-[13px] font-medium text-text-primary">
            {name ?? peers[0]?.name}
          </span>
          <span className="font-mono text-[10px] text-text-muted">{timer}</span>
        </button>
        <button
          type="button"
          aria-label={state.muted ? "Unmute" : "Mute"}
          onClick={() => toggle("muted")}
          className={cn(
            "flex h-8 w-8 items-center justify-center rounded-md border transition-colors",
            state.muted
              ? "border-danger/40 bg-danger/10 text-danger"
              : "border-border bg-surface-raised text-text-primary hover:bg-hover-row"
          )}
        >
          {state.muted ? <MicOff size={14} /> : <Mic size={14} />}
        </button>
        <button
          type="button"
          aria-label="Restore call"
          onClick={onRestore}
          className="flex h-8 w-8 items-center justify-center rounded-md border border-border bg-surface-raised text-text-secondary transition-colors hover:bg-hover-row hover:text-text-primary"
        >
          <Maximize2 size={13} />
        </button>
        <button
          type="button"
          aria-label="End call"
          onClick={onClose}
          className="flex h-8 w-8 items-center justify-center rounded-md border border-danger/30 bg-danger/15 text-danger transition-colors hover:bg-danger/25"
        >
          <PhoneOff size={14} />
        </button>
      </div>
    );
  }

  return (
    <div className="absolute inset-0 z-[150] flex items-center justify-center bg-black/50 p-6">
      <div
        className={cn(
          "flex w-full flex-col overflow-hidden rounded-[10px] border border-border bg-surface-overlay",
          wide ? "max-w-[720px]" : "max-w-[440px]"
        )}
        style={{ boxShadow: "0 16px 48px rgba(0,0,0,0.5)" }}
      >
        {/* Status row */}
        <div className="flex h-11 shrink-0 items-center gap-3 border-b border-border px-4">
          <span className="min-w-0 truncate text-[14px] font-medium text-text-primary">
            {name ?? peers[0]?.name}
          </span>
          {peers.length > 1 && (
            <span className="font-mono text-[11px] text-text-muted">{tiles.length} in call</span>
          )}
          <div className="ml-auto flex items-center gap-2">
            {!ringing && <ConnectionPill />}
            <span
              className={cn(
                "font-mono text-[12px]",
                ringing ? "text-text-muted" : "text-status-online"
              )}
            >
              {timer}
            </span>
            <button
              type="button"
              aria-label="Minimize call"
              title="Minimize — keep the call while you browse"
              onClick={onMinimize}
              className="flex h-7 w-7 items-center justify-center rounded-sm text-text-faint transition-colors hover:bg-hover-row hover:text-text-primary"
            >
              <Minimize2 size={14} />
            </button>
          </div>
        </div>

        {/* Body — tiles, optional stage, optional whiteboard layer */}
        <div className="relative min-h-0">
          <div className="flex max-h-[60vh] flex-col gap-2.5 overflow-y-auto p-5">
            {state.sharing && (
              <ScreenShareStage
                presenterName="you"
                self
                stream={screenStream}
                onStop={() => toggle("sharing")}
              />
            )}
            <div
              className={cn(
                "grid gap-2.5",
                state.sharing
                  ? "grid-cols-4"
                  : tiles.length <= 2
                    ? "grid-cols-2"
                    : tiles.length <= 4
                      ? "grid-cols-2"
                      : "grid-cols-3"
              )}
            >
              {tiles.map((p) => (
                <ParticipantTile
                  key={p.id}
                  participant={p}
                  size={state.sharing ? 32 : 56}
                  stream={p.id === me.id && state.camera ? camStream : undefined}
                />
              ))}
            </div>
          </div>

          {state.whiteboard && (
            <div className="relative h-[48vh]">
              <WhiteboardLayer onClose={() => toggle("whiteboard")} />
            </div>
          )}
        </div>

        {/* Controls */}
        <div className="flex h-16 shrink-0 items-center justify-center gap-2 border-t border-border px-4">
          <CallControls state={state} onToggle={toggle} onLeave={onClose} compact />
        </div>
      </div>
    </div>
  );
}

/** Incoming call — a quiet corner card, not a takeover. */
export function IncomingCallCard({
  caller,
  video,
  onAccept,
  onDecline,
}: {
  caller: CallPeer;
  video?: boolean;
  onAccept: () => void;
  onDecline: () => void;
}) {
  return (
    <div
      className="fixed right-5 top-5 z-[160] flex w-[320px] items-center gap-3 rounded-[10px] border border-border bg-surface-overlay p-3.5"
      style={{ boxShadow: "0 8px 24px rgba(0,0,0,0.4)" }}
    >
      <Avatar src={caller.avatar} name={caller.name} size={40} radius={10} />
      <div className="min-w-0 flex-1 leading-tight">
        <p className="truncate text-[14px] font-medium text-text-primary">{caller.name}</p>
        <p className="font-mono text-[11px] text-text-muted">
          incoming {video ? "video" : "voice"} call
        </p>
      </div>
      <button
        type="button"
        aria-label="Decline"
        onClick={onDecline}
        className="flex h-9 w-9 items-center justify-center rounded-md border border-danger/30 bg-danger/15 text-danger transition-colors hover:bg-danger/25"
      >
        <Minus size={16} />
      </button>
      <button
        type="button"
        aria-label="Accept"
        onClick={onAccept}
        className="flex h-9 w-9 items-center justify-center rounded-md border border-success/30 bg-success/15 text-success transition-colors hover:bg-success/25"
      >
        <Phone size={16} />
      </button>
    </div>
  );
}
