"use client";

import { RoutedAppShell } from "@/components/app-v2/RoutedAppShell";
import { ToastViewport } from "@/components/ui";

/**
 * Interactive Demo Route (brief Part 2).
 * Shows the sample data workspace and plays standard demo events.
 */
export default function SpacesDemoRoute() {
  return (
    <>
      <RoutedAppShell isDemo={true} />
      <ToastViewport />
    </>
  );
}
