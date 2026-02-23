"use client";

import { useEffect, useRef } from "react";
import { Check, Sparkles } from "lucide-react";

const freeTierFeatures = [
  "Unlimited text messaging",
  "Voice & video channels",
  "10 MB file uploads",
  "Join up to 100 servers",
  "Custom emojis per server",
  "2 server boosts",
];

const sparkFeatures = [
  "Everything in Free, plus:",
  "500 MB file uploads",
  "4K HD video streaming",
  "Custom profile badge & banner",
  "Animated avatar support",
  "Priority support",
  "Extended message history search",
  "Server insights & analytics",
];

export function Pricing() {
  const sectionRef = useRef<HTMLElement>(null);

  useEffect(() => {
    let ctx: { revert: () => void } | undefined;
    let disposed = false;

    async function animate() {
      const gsapModule = await import("gsap");
      const gsap = gsapModule.default;
      const { ScrollTrigger } = await import("gsap/ScrollTrigger");
      if (disposed) return;

      const sectionEl = sectionRef.current;
      if (!sectionEl) return;

      const scrollerEl = document.getElementById("landing-scroll");
      gsap.registerPlugin(ScrollTrigger);

      ctx = gsap.context(() => {
        gsap.utils
          .toArray<HTMLElement>("[data-pricing-card]")
          .forEach((card, i) => {
            gsap.fromTo(
              card,
              { opacity: 0, y: 30 },
              {
                opacity: 1,
                y: 0,
                duration: 0.6,
                delay: i * 0.12,
                ease: "power2.out",
                scrollTrigger: {
                  trigger: sectionEl,
                  ...(scrollerEl ? { scroller: scrollerEl } : {}),
                  start: "top 75%",
                  toggleActions: "play none none none",
                },
              }
            );
          });
      }, sectionEl);
    }

    void animate();
    return () => {
      disposed = true;
      ctx?.revert();
    };
  }, []);

  return (
    <section
      ref={sectionRef}
      id="pricing"
      className="py-24 lg:py-32 px-6 border-t border-border"
    >
      <div className="max-w-5xl mx-auto">
        {/* Section header */}
        <div className="text-center mb-16">
          <h2 className="text-3xl lg:text-4xl font-bold text-text-primary mb-3">
            Simple, transparent pricing
          </h2>
          <p className="text-emphasis text-text-muted">
            Start free, upgrade when you need more power.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
          {/* Free tier */}
          <div
            data-pricing-card
            className="bg-surface border border-border rounded-xl p-8 flex flex-col opacity-0"
          >
            <h3 className="text-heading font-bold text-text-primary mb-1">
              Free
            </h3>
            <p className="text-body text-text-muted mb-6">
              Everything you need to get started
            </p>
            <div className="mb-8">
              <span className="text-4xl font-bold text-text-primary">$0</span>
              <span className="text-emphasis text-text-muted ml-1">
                / month
              </span>
            </div>

            <ul className="space-y-3 mb-8 flex-1">
              {freeTierFeatures.map((f) => (
                <li key={f} className="flex items-start gap-3">
                  <div className="w-5 h-5 rounded-full bg-surface-raised border border-border flex items-center justify-center shrink-0 mt-0.5">
                    <Check className="w-3 h-3 text-accent-teal" />
                  </div>
                  <span className="text-body text-text-muted">{f}</span>
                </li>
              ))}
            </ul>

            <button className="w-full py-3 bg-surface-raised text-text-primary font-medium rounded-md border border-border hover:bg-hover-row transition-colors duration-150 active:scale-[0.98]">
              Get Started
            </button>
          </div>

          {/* Corvus Spark */}
          <div
            data-pricing-card
            className="relative bg-surface rounded-xl p-8 flex flex-col opacity-0 border-2 border-accent-violet shadow-[0_0_40px_rgba(124,106,247,0.12)]"
          >
            {/* Badge */}
            <div className="absolute -top-3 left-6 flex items-center gap-1.5 px-3 py-1 bg-accent-violet rounded-full">
              <Sparkles className="w-3.5 h-3.5 text-white" />
              <span className="text-micro text-white font-semibold">
                POPULAR
              </span>
            </div>

            <h3 className="text-heading font-bold text-text-primary mb-1 mt-1">
              Corvus Spark
            </h3>
            <p className="text-body text-text-muted mb-6">
              For power users and thriving communities
            </p>
            <div className="mb-8">
              <span className="text-4xl font-bold text-text-primary">
                $4.99
              </span>
              <span className="text-emphasis text-text-muted ml-1">
                / month
              </span>
            </div>

            <ul className="space-y-3 mb-8 flex-1">
              {sparkFeatures.map((f, i) => (
                <li key={f} className="flex items-start gap-3">
                  <div
                    className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${
                      i === 0
                        ? "bg-accent-violet"
                        : "bg-surface-raised border border-accent-violet/30"
                    }`}
                  >
                    <Check
                      className={`w-3 h-3 ${i === 0 ? "text-white" : "text-accent-violet"}`}
                    />
                  </div>
                  <span
                    className={`text-body ${i === 0 ? "text-text-primary font-medium" : "text-text-muted"}`}
                  >
                    {f}
                  </span>
                </li>
              ))}
            </ul>

            <button className="w-full py-3 bg-accent-violet text-white font-medium rounded-md shadow-glow hover:bg-accent-violet/90 hover:shadow-[0_0_30px_rgba(124,106,247,0.35)] transition-all duration-150 active:scale-[0.98]">
              Subscribe
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
