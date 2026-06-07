"use client";

import { useEffect, useSyncExternalStore } from "react";

/**
 * Lightweight client feature-flag store backed by localStorage, so experimental
 * surfaces (the reimagined shell) can ship dark and be toggled per-user without
 * a backend. Flags are also reflected on `<html data-flag-*>` for CSS hooks.
 */

export type FeatureFlag = "newShell";

const STORAGE_PREFIX = "corvus-flag-";

const DEFAULTS: Record<FeatureFlag, boolean> = {
  newShell: false,
};

type Listener = () => void;
const listeners = new Set<Listener>();

function storageKey(flag: FeatureFlag) {
  return `${STORAGE_PREFIX}${flag}`;
}

function readFlag(flag: FeatureFlag): boolean {
  if (typeof localStorage === "undefined") return DEFAULTS[flag];
  const raw = localStorage.getItem(storageKey(flag));
  if (raw === null) return DEFAULTS[flag];
  return raw === "true";
}

function emit() {
  for (const l of listeners) l();
}

export function setFeatureFlag(flag: FeatureFlag, value: boolean) {
  if (typeof localStorage !== "undefined") {
    localStorage.setItem(storageKey(flag), String(value));
  }
  if (typeof document !== "undefined") {
    document.documentElement.setAttribute(`data-flag-${flag}`, String(value));
  }
  emit();
}

export function getFeatureFlag(flag: FeatureFlag): boolean {
  return readFlag(flag);
}

function subscribe(listener: Listener) {
  listeners.add(listener);
  if (typeof window !== "undefined") {
    window.addEventListener("storage", listener);
  }
  return () => {
    listeners.delete(listener);
    if (typeof window !== "undefined") {
      window.removeEventListener("storage", listener);
    }
  };
}

/** Reactive hook — re-renders when the flag changes (incl. from other tabs). */
export function useFeatureFlag(flag: FeatureFlag): boolean {
  const value = useSyncExternalStore(
    subscribe,
    () => readFlag(flag),
    () => DEFAULTS[flag]
  );

  // Keep the data attribute in sync once mounted (for CSS / debugging).
  useEffect(() => {
    if (typeof document !== "undefined") {
      document.documentElement.setAttribute(`data-flag-${flag}`, String(value));
    }
  }, [flag, value]);

  return value;
}

export function useNewShell(): boolean {
  return useFeatureFlag("newShell");
}
