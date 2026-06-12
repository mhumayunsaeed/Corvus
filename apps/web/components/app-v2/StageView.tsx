"use client";

import { useState } from "react";
import { cn } from "@corvus/ui";
import { Hand, PhoneOff } from "lucide-react";
import { Avatar, ChannelGlyph } from "@/components/ui";
import type { VoiceParticipant } from "./types";
import { ConnectionPill, ParticipantTile } from "./CallSurface";

/**
 * Stage channel (brief §Voice) — moderated rooms: speakers on stage with the
 * shared call tiles, the audience as a quiet grid below a 1px rule. Listeners
 * raise a hand; moderators promote. Same visual system as every call surface.
 */
export function StageView({
  channelName,
  participants,
  onLeave,
}: {
  channelName: string;
  participants: VoiceParticipant[];
  onLeave?: () => void;
}) {
  const [handRaised, setHandRaised] = useState(false);

  const speakers = participants.filter((p) => p.role !== "listener");
  const listeners = participants.filter((p) => p.role === "listener");

  return (
    <section className="flex h-full min-w-0 flex-1 flex-col bg-background">
      <header className="flex h-12 shrink-0 items-center gap-3 border-b border-border px-4">
        <ChannelGlyph type="stage" size={14} />
        <h1 className="text-[15px] font-semibold text-text-primary">{channelName}</h1>
        <span className="flex items-center gap-1.5 rounded-[3px] border border-live/40 px-2 py-px font-mono text-[10px] uppercase tracking-[0.08em] text-live">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-live" />
          live
        </span>
        <span className="font-mono text-[11px] text-text-muted">
          {speakers.length} speaking · {listeners.length} listening
        </span>
        <div className="ml-auto">
          <ConnectionPill />
        </div>
      </header>

      <div className="flex-1 overflow-y-auto p-4">
        {/* Stage — speakers */}
        <p className="pb-2 font-mono text-[11px] uppercase tracking-[0.08em] text-text-muted">
          On stage
        </p>
        <div
          className="grid gap-2"
          style={{ gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))" }}
        >
          {speakers.map((p) => (
            <ParticipantTile key={p.id} participant={p} />
          ))}
        </div>

        {/* Audience */}
        <p className="border-t border-border pb-2 pt-6 font-mono text-[11px] uppercase tracking-[0.08em] text-text-muted">
          Audience — {listeners.length}
        </p>
        <div className="flex flex-wrap gap-3">
          {listeners.map((p) => (
            <div key={p.id} className="relative flex w-14 flex-col items-center gap-1">
              <Avatar src={p.avatar} name={p.name} size={40} radius={10} />
              {p.raisedHand && (
                <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full border border-border bg-surface-overlay text-accent">
                  <Hand size={11} />
                </span>
              )}
              <span className="w-full truncate text-center font-mono text-[10px] text-text-muted">
                {p.name}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Listener controls — request the mic, leave quietly */}
      <div className="flex h-16 shrink-0 items-center justify-center gap-2 border-t border-border bg-surface-raised px-4">
        <button
          type="button"
          aria-pressed={handRaised}
          onClick={() => setHandRaised((v) => !v)}
          className={cn(
            "flex h-11 items-center gap-2 rounded-md border px-4 text-[13px] font-medium transition-colors",
            handRaised
              ? "border-accent-muted bg-accent-soft text-accent"
              : "border-border bg-surface-overlay text-text-primary hover:bg-hover-row"
          )}
        >
          <Hand size={16} />
          {handRaised ? "Hand raised" : "Raise hand"}
        </button>
        <button
          type="button"
          aria-label="Leave stage"
          onClick={onLeave}
          className="flex h-11 w-11 items-center justify-center rounded-md border border-danger/30 bg-danger/15 text-danger transition-colors hover:bg-danger/25"
        >
          <PhoneOff size={18} />
        </button>
      </div>
    </section>
  );
}
