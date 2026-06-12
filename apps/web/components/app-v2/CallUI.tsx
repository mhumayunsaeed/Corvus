"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { cn } from "@corvus/ui";
import { Phone, Minus, Mic, MicOff, Maximize2, PhoneOff } from "lucide-react";
import { Avatar } from "@/components/ui";
import { ringOutgoing } from "@/lib/notify";
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

export interface ActiveCall {
  /** DM conversation this call belongs to. */
  conversationId: string;
  peers: CallPeer[];
  video?: boolean;
  name?: string;
}

/**
 * One live call session (brief §Voice). The session component stays mounted
 * for the call's whole life — when you're viewing the conversation it portals
 * an inline panel above the messages (no popup); anywhere else it collapses
 * to a floating pill. Timer, mic, camera, and screenshare survive navigation.
 */
export function CallSession({
  call,
  me,
  inlineHost,
  initialMuted,
  initialDeafened,
  onJump,
  onEnd,
}: {
  call: ActiveCall;
  me: CallPeer;
  /** Mount point above the conversation's messages — null when not in view. */
  inlineHost: HTMLElement | null;
  initialMuted?: boolean;
  initialDeafened?: boolean;
  /** Navigate back to the call's conversation (pill click). */
  onJump?: () => void;
  /** Called with the connected duration in seconds (0 = never connected). */
  onEnd: (elapsedSeconds: number) => void;
}) {
  const [seconds, setSeconds] = useState(-3); // negative = ringing
  const { state, toggle, camStream, screenStream } = useCallControls({
    camera: Boolean(call.video),
    muted: initialMuted,
    deafened: initialDeafened,
  });

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
    ...call.peers.map((p, i) => ({
      id: p.id,
      name: p.name,
      avatar: p.avatar,
      speaking: !ringing && i === 0,
    })),
    { id: me.id, name: me.name, avatar: me.avatar, muted: state.muted, deafened: state.deafened },
  ];

  // In view → inline panel above the messages. Capped so the conversation
  // below always keeps room. With a stage (screenshare or whiteboard) the
  // panel becomes stage + participant rail; otherwise a centered tile grid.
  if (inlineHost) {
    const stageActive = state.sharing || state.whiteboard;
    return createPortal(
      <div className="flex max-h-[55vh] flex-col border-b border-border bg-surface-raised">
        <div
          className={cn(
            "mx-auto flex min-h-0 w-full flex-col gap-3 px-4 py-4",
            stageActive ? "max-w-[1100px]" : "max-w-[860px]"
          )}
        >
          {/* Status row */}
          <div className="flex shrink-0 items-center gap-3">
            <span className="min-w-0 truncate text-[14px] font-medium text-text-primary">
              {call.name ?? call.peers[0]?.name}
            </span>
            {call.peers.length > 1 && (
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
            </div>
          </div>

          {stageActive ? (
            <div className="flex h-[clamp(220px,34vh,420px)] min-h-0 gap-2.5">
              {/* Stage — the whiteboard takes it when open; else the share. */}
              {state.whiteboard ? (
                <div className="relative min-w-0 flex-1 overflow-hidden rounded-lg border border-border">
                  <WhiteboardLayer
                    storageKey={`call-${call.conversationId}`}
                    onClose={() => toggle("whiteboard")}
                  />
                </div>
              ) : (
                <ScreenShareStage
                  className="aspect-auto h-full min-w-0 flex-1"
                  presenterName="you"
                  self
                  stream={screenStream}
                  onStop={() => toggle("sharing")}
                />
              )}

              {/* Participant rail */}
              <div className="flex w-[168px] shrink-0 flex-col gap-2 overflow-y-auto">
                {state.whiteboard && state.sharing && (
                  <ScreenShareStage
                    className="shrink-0"
                    presenterName="you"
                    self
                    stream={screenStream}
                    onStop={() => toggle("sharing")}
                  />
                )}
                {tiles.map((p) => (
                  <ParticipantTile
                    key={p.id}
                    participant={p}
                    size={26}
                    className="shrink-0"
                    stream={p.id === me.id && state.camera ? camStream : undefined}
                  />
                ))}
              </div>
            </div>
          ) : (
            <div
              className={cn(
                "grid min-h-0 gap-2.5 overflow-y-auto",
                tiles.length <= 3
                  ? "grid-cols-[repeat(auto-fit,minmax(180px,220px))] justify-center"
                  : "grid-cols-3"
              )}
            >
              {tiles.map((p) => (
                <ParticipantTile
                  key={p.id}
                  participant={p}
                  size={48}
                  stream={p.id === me.id && state.camera ? camStream : undefined}
                />
              ))}
            </div>
          )}

          {/* Controls */}
          <div className="flex shrink-0 items-center justify-center gap-2 pt-1">
            <CallControls
              state={state}
              onToggle={toggle}
              onLeave={() => onEnd(Math.max(seconds, 0))}
              compact
            />
          </div>
        </div>
      </div>,
      inlineHost
    );
  }

  // Elsewhere in the app → a quiet floating pill; the call keeps running.
  return (
    <div
      className="fixed right-5 top-5 z-[160] flex items-center gap-2.5 rounded-[10px] border border-border bg-surface-overlay py-2 pl-3.5 pr-2"
      style={{ boxShadow: "0 8px 24px rgba(0,0,0,0.4)" }}
    >
      <span
        className={cn("h-1.5 w-1.5 rounded-full", ringing ? "bg-status-idle" : "bg-status-online")}
      />
      <button type="button" onClick={onJump} className="min-w-0 text-left">
        <span className="block max-w-[140px] truncate text-[13px] font-medium text-text-primary">
          {call.name ?? call.peers[0]?.name}
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
        aria-label="Back to call"
        title="Back to the conversation"
        onClick={onJump}
        className="flex h-8 w-8 items-center justify-center rounded-md border border-border bg-surface-raised text-text-secondary transition-colors hover:bg-hover-row hover:text-text-primary"
      >
        <Maximize2 size={13} />
      </button>
      <button
        type="button"
        aria-label="End call"
        onClick={() => onEnd(Math.max(seconds, 0))}
        className="flex h-8 w-8 items-center justify-center rounded-md border border-danger/30 bg-danger/15 text-danger transition-colors hover:bg-danger/25"
      >
        <PhoneOff size={14} />
      </button>
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
