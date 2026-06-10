"use client";

import { RoutedAppShell } from "@/components/app-v2/RoutedAppShell";
import { ToastViewport } from "@/components/ui";

/**
 * Routed shell (brief Part 2). URLs:
 *   /spaces                      → first space, first text channel
 *   /spaces/:spaceId             → that space
 *   /spaces/:spaceId/:channelId  → that channel
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
