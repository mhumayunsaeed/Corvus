"use client";

import { RoutedAppShell } from "@/features/workspace/components/RoutedAppShell";
import { ToastViewport } from "@/shared/components/ui";

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
