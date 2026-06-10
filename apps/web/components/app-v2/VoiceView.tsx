"use client";

import { useState } from "react";
import { cn } from "@corvus/ui";
import { Mic, MicOff, Video, VideoOff, MonitorUp, PhoneOff } from "lucide-react";
import { Avatar, ChannelGlyph } from "@/components/ui";
import type { VoiceParticipant } from "./types";

/**
 * Voice channel view (brief §VoiceView). Square avatars, and a *calm green
 * border* for speaking — not a glowing ring.
 */
export function VoiceView({
  channelName,
  participants,
  onLeave,
}: {
  channelName: string;
  participants: VoiceParticipant[];
  onLeave?: () => void;
}) {
  const [muted, setMuted] = useState(false);
  const [camera, setCamera] = useState(false);
  const [sharing, setSharing] = useState(false);

  return (
    <section className="flex h-full min-w-0 flex-1 flex-col bg-background">
      <header className="flex h-12 shrink-0 items-center gap-3 border-b border-border px-4">
        <ChannelGlyph type="voice" size={14} />
        <h1 className="text-[15px] font-semibold text-text-primary">{channelName}</h1>
        <span className="font-mono text-[11px] text-text-muted">
          {participants.length} connected
        </span>
      </header>

      <div
        className="grid flex-1 content-start gap-2 overflow-y-auto p-4"
        style={{ gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))" }}
      >
        {participants.map((p) => (
          <div
            key={p.id}
            data-speaking={p.speaking}
            className={cn(
              "relative flex aspect-video flex-col items-center justify-center rounded-lg border bg-surface-raised transition-colors",
              p.speaking ? "border-status-online" : "border-border"
            )}
          >
            <Avatar src={p.avatar} name={p.name} size={56} radius={12} />
            <div className="mt-2.5 flex items-center gap-1.5">
              <span className="text-[13px] font-medium text-text-primary">{p.name}</span>
              {p.muted && <MicOff size={14} className="text-danger" />}
            </div>
          </div>
        ))}
      </div>

      <div className="flex h-16 shrink-0 items-center justify-center gap-2 border-t border-border bg-surface-raised px-4">
        <ControlButton active={!muted} label={muted ? "Unmute" : "Mute"} onClick={() => setMuted((v) => !v)}>
          {muted ? <MicOff size={18} /> : <Mic size={18} />}
        </ControlButton>
        <ControlButton active={camera} label="Camera" onClick={() => setCamera((v) => !v)}>
          {camera ? <Video size={18} /> : <VideoOff size={18} />}
        </ControlButton>
        <ControlButton active={sharing} label="Share screen" onClick={() => setSharing((v) => !v)}>
          <MonitorUp size={18} />
        </ControlButton>
        <button
          type="button"
          aria-label="Leave call"
          onClick={onLeave}
          className="flex h-11 w-11 items-center justify-center rounded-md border border-danger/30 bg-danger/15 text-danger transition-colors hover:bg-danger/25"
        >
          <PhoneOff size={18} />
        </button>
      </div>
    </section>
  );
}

function ControlButton({
  active,
  label,
  onClick,
  children,
}: {
  active?: boolean;
  label: string;
  onClick?: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        "flex h-11 w-11 items-center justify-center rounded-md border text-text-primary transition-colors",
        active ? "border-accent-muted bg-accent-soft" : "border-border bg-surface-overlay hover:bg-hover-row"
      )}
    >
      {children}
    </button>
  );
}
