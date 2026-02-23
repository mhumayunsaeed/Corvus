"use client";

import { useCallback, useEffect, useState } from "react";
import { cn } from "../lib/utils";

function MinimizeIcon() {
  return (
    <svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor">
      <rect x="1" y="4.5" width="8" height="1" rx="0.5" />
    </svg>
  );
}

function MaximizeIcon() {
  return (
    <svg
      width="10"
      height="10"
      viewBox="0 0 10 10"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.2"
    >
      <rect x="1.5" y="1.5" width="7" height="7" rx="1" />
    </svg>
  );
}

function RestoreIcon() {
  return (
    <svg
      width="10"
      height="10"
      viewBox="0 0 10 10"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.2"
    >
      <rect x="1.5" y="2.5" width="5.5" height="5.5" rx="0.5" />
      <path d="M3.5 2.5V1.5C3.5 1.22 3.72 1 4 1H8.5C8.78 1 9 1.22 9 1.5V6C9 6.28 8.78 6.5 8.5 6.5H7.5" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor">
      <path d="M2.4 1.4a.7.7 0 00-1 1L4 5 1.4 7.6a.7.7 0 001 1L5 6l2.6 2.6a.7.7 0 001-1L6 5l2.6-2.6a.7.7 0 00-1-1L5 4 2.4 1.4z" />
    </svg>
  );
}

// Helper to call Tauri window APIs via dynamic import (only works in Tauri runtime)
async function getTauriWindow() {
  try {
    const mod = await import("@tauri-apps/api/window");
    return mod.getCurrentWindow();
  } catch {
    return null;
  }
}

export interface TitlebarProps {
  className?: string;
}

export function Titlebar({ className }: TitlebarProps) {
  const [isMaximized, setIsMaximized] = useState(false);
  const [isTauri, setIsTauri] = useState(false);

  useEffect(() => {
    const w = window as unknown as Record<string, unknown>;
    const detected =
      typeof window !== "undefined" &&
      (("__TAURI__" in window && w.__TAURI__ !== undefined) ||
        ("__TAURI_INTERNALS__" in window && w.__TAURI_INTERNALS__ !== undefined));
    setIsTauri(detected);

    // Sync maximized state on mount
    if (detected) {
      (async () => {
        const win = await getTauriWindow();
        if (win) {
          const maximized = await win.isMaximized();
          setIsMaximized(maximized);
        }
      })();
    }
  }, []);

  const handleMinimize = useCallback(async () => {
    const win = await getTauriWindow();
    await win?.minimize();
  }, []);

  const handleMaximize = useCallback(async () => {
    const win = await getTauriWindow();
    if (!win) return;
    const maximized = await win.isMaximized();
    if (maximized) {
      await win.unmaximize();
      setIsMaximized(false);
    } else {
      await win.maximize();
      setIsMaximized(true);
    }
  }, []);

  const handleClose = useCallback(async () => {
    const win = await getTauriWindow();
    await win?.close();
  }, []);

  if (!isTauri) return null;

  return (
    <div
      className={cn(
        "flex h-titlebar items-center justify-between select-none relative z-50",
        "bg-titlebar-bg border-b border-border/40",
        className
      )}
      data-tauri-drag-region
    >
      {/* Left: Logo + Wordmark */}
      <div className="flex items-center gap-2 pl-3 pointer-events-none" data-tauri-drag-region>
        <img src="/corvus-logo.png" alt="Corvus" className="h-4 w-4 rounded-full" />
        <span className="text-micro text-text-muted font-semibold tracking-wide">
          Corvus
        </span>
      </div>

      {/* Center: drag region */}
      <div className="flex-1" data-tauri-drag-region />

      {/* Right: Window controls */}
      <div className="flex h-full items-center">
        {/* Minimize */}
        <button
          onClick={handleMinimize}
          className={cn(
            "flex h-full w-[46px] items-center justify-center",
            "text-text-muted/70 hover:text-text-primary hover:bg-white/[0.06]",
            "transition-all duration-150 active:scale-90"
          )}
          aria-label="Minimize"
        >
          <MinimizeIcon />
        </button>

        {/* Maximize / Restore */}
        <button
          onClick={handleMaximize}
          className={cn(
            "flex h-full w-[46px] items-center justify-center",
            "text-text-muted/70 hover:text-text-primary hover:bg-white/[0.06]",
            "transition-all duration-150 active:scale-90"
          )}
          aria-label={isMaximized ? "Restore" : "Maximize"}
        >
          {isMaximized ? <RestoreIcon /> : <MaximizeIcon />}
        </button>

        {/* Close */}
        <button
          onClick={handleClose}
          className={cn(
            "flex h-full w-[46px] items-center justify-center",
            "text-text-muted/70 hover:text-white hover:bg-danger/90",
            "transition-all duration-150 active:scale-90",
            "rounded-none"
          )}
          aria-label="Close"
        >
          <CloseIcon />
        </button>
      </div>
    </div>
  );
}
