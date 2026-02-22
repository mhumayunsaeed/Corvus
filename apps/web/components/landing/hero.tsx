"use client";

import { useEffect, useRef, useState } from "react";
import { Monitor, Apple, Globe, Download } from "lucide-react";
import { AppMockup } from "./app-mockup";

type OSType = "windows" | "mac" | "linux" | "unknown";

const osConfig: Record<OSType, { icon: React.ElementType; label: string }> = {
  windows: { icon: Monitor, label: "Download for Windows" },
  mac: { icon: Apple, label: "Download for macOS" },
  linux: { icon: Download, label: "Download for Linux" },
  unknown: { icon: Download, label: "Download Veyra" },
};

function detectOS(): OSType {
  const ua = navigator.userAgent;
  if (ua.includes("Win")) return "windows";
  if (ua.includes("Mac")) return "mac";
  if (ua.includes("Linux")) return "linux";
  return "unknown";
}

export function Hero() {
  const sectionRef = useRef<HTMLElement>(null);
  const headlineRef = useRef<HTMLHeadingElement>(null);
  const subRef = useRef<HTMLParagraphElement>(null);
  const ctasRef = useRef<HTMLDivElement>(null);
  const mockupRef = useRef<HTMLDivElement>(null);

  // Detect OS on client only to avoid hydration mismatch
  const [os, setOS] = useState<OSType>("unknown");
  useEffect(() => {
    setOS(detectOS());
  }, []);

  // GSAP animations — imported dynamically to avoid SSR issues
  useEffect(() => {
    let ctx: { revert: () => void } | undefined;

    async function animate() {
      const gsapModule = await import("gsap");
      const gsap = gsapModule.default;

      ctx = gsap.context(() => {
        const tl = gsap.timeline({ defaults: { ease: "power2.out" } });

        tl.fromTo(
          headlineRef.current,
          { opacity: 0, y: 30 },
          { opacity: 1, y: 0, duration: 0.7 }
        )
          .fromTo(
            subRef.current,
            { opacity: 0, y: 20 },
            { opacity: 1, y: 0, duration: 0.6 },
            "-=0.4"
          )
          .fromTo(
            ctasRef.current,
            { opacity: 0, y: 20 },
            { opacity: 1, y: 0, duration: 0.5 },
            "-=0.3"
          )
          .fromTo(
            mockupRef.current,
            { opacity: 0, y: 50, scale: 0.97 },
            { opacity: 1, y: 0, scale: 1, duration: 0.8 },
            "-=0.3"
          );
      }, sectionRef);
    }

    animate();
    return () => ctx?.revert();
  }, []);

  const OSIcon = osConfig[os].icon;
  const osLabel = osConfig[os].label;

  return (
    <section
      ref={sectionRef}
      className="relative min-h-screen flex flex-col items-center justify-center pt-24 pb-16 px-6 overflow-hidden"
    >
      {/* Atmospheric gradient mesh */}
      <div className="absolute inset-0 pointer-events-none" aria-hidden>
        <div className="absolute top-1/4 left-1/3 w-[500px] h-[500px] bg-accent-violet/8 rounded-full blur-[160px]" />
        <div className="absolute bottom-1/3 right-1/4 w-[400px] h-[400px] bg-accent-teal/6 rounded-full blur-[140px]" />
      </div>

      {/* Headline */}
      <h1
        ref={headlineRef}
        className="relative z-10 text-5xl sm:text-6xl lg:text-[72px] font-bold text-text-primary text-center leading-[1.1] tracking-tight max-w-4xl opacity-0"
      >
        A new era of connection.
      </h1>

      {/* Subheadline */}
      <p
        ref={subRef}
        className="relative z-10 mt-6 text-lg sm:text-xl text-text-muted text-center max-w-2xl leading-relaxed opacity-0"
      >
        Veyra brings together everything your community needs — voice, video,
        and real-time chat — in a faster, cleaner, and more private space.
      </p>

      {/* CTAs */}
      <div
        ref={ctasRef}
        className="relative z-10 mt-10 flex flex-col sm:flex-row items-center gap-4 opacity-0"
      >
        <a href={`/api/download?os=${os}`} className="flex items-center gap-2.5 px-7 py-3.5 bg-accent-violet text-white font-medium rounded-md shadow-glow hover:shadow-[0_0_40px_rgba(124,106,247,0.35)] hover:bg-accent-violet/90 transition-all duration-150 active:scale-[0.97]">
          <OSIcon className="w-5 h-5" />
          {osLabel}
        </a>
        <a
          href="/app"
          className="flex items-center gap-2.5 px-7 py-3.5 border border-border text-text-primary font-medium rounded-md hover:bg-surface-raised/60 transition-all duration-150 active:scale-[0.97]"
        >
          <Globe className="w-5 h-5 text-text-muted" />
          Open in Browser
        </a>
      </div>

      {/* App Mockup */}
      <div
        ref={mockupRef}
        className="relative z-10 mt-16 w-full max-w-[1100px] opacity-0"
      >
        {/* Violet glow behind mockup */}
        <div className="absolute -inset-8 bg-accent-violet/10 rounded-[32px] blur-[80px] pointer-events-none" />
        <div className="relative rounded-xl border border-border overflow-hidden shadow-2xl shadow-accent-violet/5">
          <AppMockup />
        </div>
      </div>
    </section>
  );
}
