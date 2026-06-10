"use client";

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { API_URL } from "@/lib/endpoints";

/**
 * Shared auth scaffold (brief §Auth Pages). A quiet centered column on the base
 * background — not a split screen, not a floating modal. Carries the landing
 * page's single ambient glow so auth feels like the same product. Also restores
 * the desktop-shell window (it starts hidden) and warms the API.
 */
export function AuthShell({
  tagline,
  children,
}: {
  tagline: string;
  children: ReactNode;
}) {
  const [isTauri, setIsTauri] = useState(false);

  useEffect(() => {
    const w = window as unknown as Record<string, unknown>;
    const detected =
      typeof window !== "undefined" &&
      (("__TAURI__" in window && w.__TAURI__ !== undefined) ||
        ("__TAURI_INTERNALS__" in window && w.__TAURI_INTERNALS__ !== undefined));
    setIsTauri(detected);

    if (detected) {
      import("@tauri-apps/api/window")
        .then(({ getCurrentWindow }) => {
          const appWindow = getCurrentWindow();
          appWindow.show().catch(() => {});
          appWindow.setFocus().catch(() => {});
        })
        .catch(() => {});
    }
  }, []);

  // Best-effort warmup for cold backend starts.
  useEffect(() => {
    if (!API_URL) return;
    const controller = new AbortController();
    fetch(`${API_URL}/healthz`, { method: "GET", cache: "no-store", signal: controller.signal }).catch(
      () => {}
    );
    return () => controller.abort();
  }, []);

  return (
    <div className="relative h-full overflow-y-auto overflow-x-hidden bg-background">
      {/* The same single ambient glow as the landing page. */}
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-[36%] -z-0 h-[620px] w-[620px] max-w-[100vw] -translate-x-1/2 -translate-y-1/2"
        style={{
          background:
            "radial-gradient(circle at center, rgb(var(--c-accent-violet) / 0.10) 0%, rgb(var(--c-accent-violet) / 0.04) 34%, transparent 64%)",
        }}
      />

      <div className="relative z-10 flex min-h-full flex-col items-center justify-center px-6 py-16">
        <div className="w-full max-w-[400px]">
          {/* Wordmark + positioning line */}
          <div className="mb-8 text-center">
            <div className="inline-flex items-center gap-2">
              <span className="text-accent text-[18px] leading-none">◈</span>
              <span className="text-[20px] font-semibold tracking-[-0.02em] text-text-primary">
                Corvus
              </span>
            </div>
            <p className="mt-1 text-[14px] text-text-muted">{tagline}</p>
          </div>

          {/* Form — borderless on the background at >=sm, subtle card on mobile */}
          <div className="rounded-xl border border-border bg-surface/60 p-6 backdrop-blur-sm sm:border-0 sm:bg-transparent sm:p-0 sm:backdrop-blur-none">
            {children}
          </div>

          {!isTauri && (
            <div className="mt-8 text-center">
              <Link
                href="/"
                className="group inline-flex items-center gap-1.5 text-[13px] text-text-muted transition-colors hover:text-text-primary"
              >
                <ArrowLeft className="h-3.5 w-3.5 transition-transform group-hover:-translate-x-0.5" />
                Back to home
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
