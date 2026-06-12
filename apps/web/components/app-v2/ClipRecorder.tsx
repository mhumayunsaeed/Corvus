"use client";

import { useEffect, useState } from "react";
import { cn } from "@corvus/ui";
import { Video, Mic, Monitor, Square, X, Play } from "lucide-react";

/**
 * Async video clips (brief §Clips) — a Loom-style floating control bar,
 * bottom-centered. Stop produces a clip message in the current channel.
 */
export function ClipRecorder({
  onStop,
  onCancel,
}: {
  onStop: (duration: string) => void;
  onCancel: () => void;
}) {
  const [seconds, setSeconds] = useState(0);
  const [camera, setCamera] = useState(true);
  const [mic, setMic] = useState(true);
  const [screen, setScreen] = useState(false);

  useEffect(() => {
    const t = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, []);

  const mm = String(Math.floor(seconds / 60)).padStart(2, "0");
  const ss = String(seconds % 60).padStart(2, "0");
  const duration = `${mm}:${ss}`;

  return (
    <div
      className="fixed bottom-6 left-1/2 z-[200] flex -translate-x-1/2 items-center gap-3 rounded-2xl border border-border bg-surface-overlay px-4 py-2"
      style={{ boxShadow: "0 8px 24px rgba(0,0,0,0.4)" }}
    >
      <span className="flex items-center gap-1.5 font-mono text-[13px] text-danger">
        <span aria-hidden>⏺</span> {duration}
      </span>

      <span className="h-5 w-px bg-border" />

      <RecorderToggle label="Camera" active={camera} onClick={() => setCamera((v) => !v)}>
        <Video size={16} />
      </RecorderToggle>
      <RecorderToggle label="Microphone" active={mic} onClick={() => setMic((v) => !v)}>
        <Mic size={16} />
      </RecorderToggle>
      <RecorderToggle label="Screen" active={screen} onClick={() => setScreen((v) => !v)}>
        <Monitor size={16} />
      </RecorderToggle>

      <span className="h-5 w-px bg-border" />

      <button
        type="button"
        onClick={() => onStop(duration)}
        className="flex h-9 items-center gap-2 rounded-md bg-accent px-3 text-[13px] font-medium text-on-accent transition-opacity hover:opacity-85"
      >
        <Square size={12} fill="currentColor" /> Stop
      </button>
      <button
        type="button"
        aria-label="Cancel recording"
        onClick={onCancel}
        className="flex h-9 w-9 items-center justify-center rounded-md bg-surface-raised text-text-secondary transition-colors hover:bg-hover-row hover:text-text-primary"
      >
        <X size={16} />
      </button>
    </div>
  );
}

function RecorderToggle({
  label,
  active,
  onClick,
  children,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
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
        "flex h-9 w-9 items-center justify-center rounded-md transition-colors",
        active
          ? "bg-surface-raised text-text-primary"
          : "bg-surface-raised text-text-faint hover:text-text-secondary"
      )}
    >
      {children}
    </button>
  );
}

/** Inline clip playback embed inside a message. */
export function ClipEmbed({ duration, size }: { duration: string; size?: string }) {
  return (
    <div className="mt-2 max-w-[480px] overflow-hidden rounded-[10px] border border-border bg-surface-raised">
      <button
        type="button"
        aria-label="Play clip"
        className="relative flex aspect-video w-full cursor-pointer items-center justify-center bg-surface-overlay"
      >
        <span className="flex h-11 w-11 items-center justify-center rounded-full bg-black/60 text-white">
          <Play size={18} fill="currentColor" />
        </span>
      </button>
      <div className="flex justify-between px-3 py-2 font-mono text-[12px] text-text-muted">
        <span>clip · {duration}</span>
        {size && <span>{size}</span>}
      </div>
    </div>
  );
}
