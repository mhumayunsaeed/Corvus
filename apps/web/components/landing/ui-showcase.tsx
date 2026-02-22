"use client";

import { useEffect, useRef } from "react";
import { AppMockup } from "./app-mockup";

export function UIShowcase() {
  const sectionRef = useRef<HTMLElement>(null);
  const mockupRef = useRef<HTMLDivElement>(null);
  const captionRef = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    let ctx: { revert: () => void } | undefined;

    async function animate() {
      const gsapModule = await import("gsap");
      const gsap = gsapModule.default;
      const { ScrollTrigger } = await import("gsap/ScrollTrigger");
      gsap.registerPlugin(ScrollTrigger);

      ctx = gsap.context(() => {
        gsap.fromTo(
          mockupRef.current,
          { opacity: 0, y: 60, scale: 0.96 },
          {
            opacity: 1,
            y: 0,
            scale: 1,
            duration: 0.8,
            ease: "power2.out",
            scrollTrigger: {
              trigger: sectionRef.current,
              scroller: "#landing-scroll",
              start: "top 80%",
              toggleActions: "play none none none",
            },
          }
        );
        gsap.fromTo(
          captionRef.current,
          { opacity: 0, y: 20 },
          {
            opacity: 1,
            y: 0,
            duration: 0.5,
            ease: "power2.out",
            scrollTrigger: {
              trigger: captionRef.current,
              scroller: "#landing-scroll",
              start: "top 90%",
              toggleActions: "play none none none",
            },
          }
        );
      }, sectionRef);
    }

    animate();
    return () => ctx?.revert();
  }, []);

  return (
    <section ref={sectionRef} className="py-24 lg:py-32 px-6 relative">
      {/* Radial violet glow */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="w-[700px] h-[500px] bg-accent-violet/8 blur-[160px] rounded-full" />
      </div>

      <div
        ref={mockupRef}
        className="relative z-10 max-w-[1100px] mx-auto rounded-xl border border-border overflow-hidden shadow-2xl shadow-accent-violet/5 opacity-0"
      >
        <AppMockup />
      </div>

      <p
        ref={captionRef}
        className="relative z-10 text-center mt-8 text-emphasis text-text-muted opacity-0"
      >
        Designed for focus. Built for communities.
      </p>
    </section>
  );
}
