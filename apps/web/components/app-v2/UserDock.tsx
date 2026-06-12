"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@corvus/ui";
import { Mic, MicOff, Headphones, VolumeX, Settings, AudioLines, Check, X } from "lucide-react";
import { Avatar } from "@/components/ui";
import {
  NOISE_SUPPRESSION_LEVELS,
  getNoiseSuppressionLevel,
  onNoiseSuppressionChange,
  setNoiseSuppressionLevel,
  type NoiseSuppressionLevel,
} from "@/lib/noise-suppression";
import type { MemberRef, Presence } from "./types";

const PRESENCE_DOT: Record<Presence, string> = {
  online: "bg-status-online",
  idle: "bg-status-idle",
  dnd: "bg-status-dnd",
  offline: "bg-text-faint",
};

const PRESENCE_OPTIONS: { id: Presence; label: string; hint?: string }[] = [
  { id: "online", label: "Online" },
  { id: "idle", label: "Idle" },
  { id: "dnd", label: "Do not disturb", hint: "mutes notifications" },
  { id: "offline", label: "Invisible", hint: "appear offline" },
];

/**
 * The personal dock (brief §SpacePanel footer) — shared by the space sidebar
 * and the DM panel. Clicking your profile opens the status card: presence,
 * custom status, and call noise suppression. Mute/deafen carry into calls.
 */
export function UserDock({
  me,
  muted,
  deafened,
  onToggleMute,
  onToggleDeafen,
  onOpenSettings,
  onSetStatus,
}: {
  me: MemberRef & { statusText?: string };
  muted?: boolean;
  deafened?: boolean;
  onToggleMute?: () => void;
  onToggleDeafen?: () => void;
  onOpenSettings?: () => void;
  /** Presence + custom status — applied across the whole app, live. */
  onSetStatus?: (presence: Presence, text?: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(me.statusText && me.statusText !== me.presence ? me.statusText : "");
  const [nsLevel, setNsLevel] = useState<NoiseSuppressionLevel>("standard");
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setNsLevel(getNoiseSuppressionLevel());
    return onNoiseSuppressionChange(setNsLevel);
  }, []);

  // Click-outside closes the status card.
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    window.addEventListener("mousedown", onDown);
    return () => window.removeEventListener("mousedown", onDown);
  }, [open]);

  const presence = me.presence ?? "online";
  const saveStatusText = (text: string) => onSetStatus?.(presence, text || undefined);

  return (
    <div ref={ref} className="relative shrink-0 border-t border-border bg-surface-raised">
      {/* Status card */}
      {open && (
        <div
          className="absolute bottom-full left-2 right-2 z-50 mb-2 rounded-[12px] border border-border bg-surface-overlay p-3"
          style={{ boxShadow: "0 12px 32px rgba(0,0,0,0.45)" }}
        >
          <div className="flex items-center gap-3 border-b border-border pb-3">
            <Avatar src={me.avatar} name={me.name} size={36} shape="circle" />
            <div className="min-w-0 flex-1 leading-tight">
              <p className="truncate text-[14px] font-semibold text-text-primary">{me.name}</p>
              <p className="truncate font-mono text-[11px] text-text-muted">
                {me.statusText ?? presence}
              </p>
            </div>
          </div>

          {/* Presence */}
          <p className="pb-1 pt-3 font-mono text-[10px] uppercase tracking-[0.08em] text-text-muted">
            Status
          </p>
          <div className="flex flex-col">
            {PRESENCE_OPTIONS.map((p) => (
              <button
                key={p.id}
                type="button"
                aria-pressed={presence === p.id}
                onClick={() => onSetStatus?.(p.id, draft || undefined)}
                className={cn(
                  "flex h-8 items-center gap-2.5 rounded-sm px-2 text-left transition-colors",
                  presence === p.id ? "bg-surface-raised" : "hover:bg-hover-row"
                )}
              >
                <span className={cn("h-2.5 w-2.5 rounded-full", PRESENCE_DOT[p.id])} />
                <span className="flex-1 text-[13px] text-text-primary">{p.label}</span>
                {p.hint && <span className="font-mono text-[10px] text-text-faint">{p.hint}</span>}
                {presence === p.id && <Check size={13} className="text-text-secondary" />}
              </button>
            ))}
          </div>

          {/* Custom status */}
          <p className="pb-1 pt-3 font-mono text-[10px] uppercase tracking-[0.08em] text-text-muted">
            Custom status
          </p>
          <div className="flex h-8 items-center gap-1.5 rounded-md border border-border bg-surface-input px-2">
            <input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") saveStatusText(draft.trim());
              }}
              onBlur={() => saveStatusText(draft.trim())}
              placeholder="What's happening?"
              className="w-full bg-transparent text-[13px] text-text-primary outline-none placeholder:text-text-faint"
            />
            {draft && (
              <button
                type="button"
                aria-label="Clear status"
                onClick={() => {
                  setDraft("");
                  saveStatusText("");
                }}
                className="text-text-faint transition-colors hover:text-text-primary"
              >
                <X size={13} />
              </button>
            )}
          </div>

          {/* Noise suppression */}
          <p className="flex items-center gap-1.5 pb-1 pt-3 font-mono text-[10px] uppercase tracking-[0.08em] text-text-muted">
            <AudioLines size={11} /> Noise suppression
          </p>
          <div className="flex gap-1">
            {NOISE_SUPPRESSION_LEVELS.map((l) => (
              <button
                key={l.id}
                type="button"
                aria-pressed={nsLevel === l.id}
                onClick={() => setNoiseSuppressionLevel(l.id)}
                className={cn(
                  "h-7 flex-1 rounded-md border text-[12px] transition-colors",
                  nsLevel === l.id
                    ? "border-accent bg-accent-soft text-text-primary"
                    : "border-border text-text-secondary hover:border-border-active"
                )}
              >
                {l.label}
              </button>
            ))}
          </div>
          <p className="mt-1.5 text-[11px] leading-snug text-text-faint">
            {NOISE_SUPPRESSION_LEVELS.find((l) => l.id === nsLevel)?.description}
          </p>
        </div>
      )}

      {/* Dock row */}
      <div className="flex h-[64px] items-center gap-2 px-2.5">
        <button
          type="button"
          aria-label="Set status"
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
          className="flex min-w-0 flex-1 items-center gap-3 rounded-md px-1.5 py-1.5 text-left transition-colors hover:bg-hover-row"
        >
          <div className="relative shrink-0">
            <Avatar src={me.avatar} name={me.name} size={34} shape="circle" />
            <span
              className={cn(
                "absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full border-2 border-surface-raised",
                PRESENCE_DOT[presence]
              )}
            />
          </div>
          <div className="min-w-0 flex-1 leading-tight">
            <div className="truncate text-[14px] font-medium text-text-primary">{me.name}</div>
            <div className="truncate font-mono text-[11px] text-text-muted">
              {me.statusText ?? presence}
            </div>
          </div>
        </button>
        <div className="flex items-center gap-0.5 text-text-faint">
          <DockIcon label={muted ? "Unmute" : "Mute"} active={muted} onClick={onToggleMute}>
            {muted ? <MicOff size={17} /> : <Mic size={17} />}
          </DockIcon>
          <DockIcon label={deafened ? "Undeafen" : "Deafen"} active={deafened} onClick={onToggleDeafen}>
            {deafened ? <VolumeX size={17} /> : <Headphones size={17} />}
          </DockIcon>
          <DockIcon label="User settings" onClick={onOpenSettings}>
            <Settings size={17} />
          </DockIcon>
        </div>
      </div>
    </div>
  );
}

function DockIcon({
  label,
  active,
  onClick,
  children,
}: {
  label: string;
  active?: boolean;
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
        "flex h-8 w-8 items-center justify-center rounded-sm transition-colors",
        active
          ? "bg-danger/10 text-danger hover:bg-danger/20"
          : "hover:bg-hover-row hover:text-text-primary"
      )}
    >
      {children}
    </button>
  );
}
