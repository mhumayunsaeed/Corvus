"use client";

import { RoutedAppShell } from "@/components/app-v2/RoutedAppShell";
import { ToastViewport } from "@/components/ui";

/**
 * Routed shell (brief Part 2). URLs use name slugs (raw ids also resolve):
 *   /spaces · /spaces/home     → Home
 *   /spaces/dm                 → Direct messages
 *   /spaces/dm/:conversation   → that conversation   (e.g. /spaces/dm/maya)
 *   /spaces/:space             → that space          (e.g. /spaces/corvus)
 *   /spaces/:space/:channel    → that channel        (e.g. /spaces/corvus/general)
 *
 * Lives alongside the production /app SPA. Reflects the signed-in user's real
 * spaces/channels/messages when available; otherwise shows the design sample.
 */
export default function SpacesRoute() {
  return (
    <>
      <RoutedAppShell />
      <ToastViewport />
    </>
  );
}
