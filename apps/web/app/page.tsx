"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Nav,
  Hero,
  StatsBar,
  AudienceSection,
  Features,
  DeveloperSection,
  SelfHostSection,
  FinalCTA,
  Footer,
} from "@/components/landing";

export default function LandingPage() {
  const router = useRouter();

  // Redirect to login if running inside the Tauri desktop shell.
  useEffect(() => {
    if (
      typeof window !== "undefined" &&
      "__TAURI__" in window &&
      window.__TAURI__ !== undefined
    ) {
      router.replace("/login");
    }
  }, [router]);

  return (
    <div
      id="landing-scroll"
      className="h-full overflow-y-auto overflow-x-hidden bg-background"
    >
      <Nav />
      <main>
        <Hero />
        <StatsBar />
        <AudienceSection />
        <Features />
        <DeveloperSection />
        <SelfHostSection />
        <FinalCTA />
      </main>
      <Footer />
    </div>
  );
}
