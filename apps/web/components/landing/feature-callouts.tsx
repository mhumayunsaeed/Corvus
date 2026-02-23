"use client";

import { useEffect, useRef } from "react";
import {
  MessageSquare,
  SmilePlus,
  Zap,
  Mic,
  Volume2,
  Radio,
  Shield,
  Lock,
  Eye,
} from "lucide-react";

interface CalloutProps {
  headline: string;
  description: string;
  bulletColor: string;
  bullets: { icon: React.ElementType; text: string }[];
  visual: React.ReactNode;
  reverse?: boolean;
}

function Callout({
  headline,
  description,
  bulletColor,
  bullets,
  visual,
  reverse,
}: CalloutProps) {
  const rowRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let ctx: { revert: () => void } | undefined;
    let disposed = false;

    async function animate() {
      const gsapModule = await import("gsap");
      const gsap = gsapModule.default;
      const { ScrollTrigger } = await import("gsap/ScrollTrigger");
      if (disposed) return;

      const rowEl = rowRef.current;
      if (!rowEl) return;

      const scrollerEl = document.getElementById("landing-scroll");
      gsap.registerPlugin(ScrollTrigger);

      const textEl = rowEl.querySelector("[data-callout-text]");
      const visEl = rowEl.querySelector("[data-callout-visual]");

      ctx = gsap.context(() => {
        if (textEl) {
          gsap.fromTo(
            textEl,
            { opacity: 0, x: reverse ? 40 : -40 },
            {
              opacity: 1,
              x: 0,
              duration: 0.7,
              ease: "power2.out",
              scrollTrigger: {
                trigger: rowEl,
                ...(scrollerEl ? { scroller: scrollerEl } : {}),
                start: "top 80%",
                toggleActions: "play none none none",
              },
            }
          );
        }
        if (visEl) {
          gsap.fromTo(
            visEl,
            { opacity: 0, x: reverse ? -40 : 40 },
            {
              opacity: 1,
              x: 0,
              duration: 0.7,
              ease: "power2.out",
              scrollTrigger: {
                trigger: rowEl,
                ...(scrollerEl ? { scroller: scrollerEl } : {}),
                start: "top 80%",
                toggleActions: "play none none none",
              },
            }
          );
        }
      }, rowEl);
    }

    void animate();
    return () => {
      disposed = true;
      ctx?.revert();
    };
  }, [reverse]);

  return (
    <div
      ref={rowRef}
      className={`grid md:grid-cols-2 gap-12 lg:gap-20 items-center ${reverse ? "md:[direction:rtl]" : ""}`}
    >
      <div data-callout-text className="opacity-0 md:[direction:ltr]">
        <h3 className="text-3xl lg:text-4xl font-bold text-text-primary leading-tight mb-4">
          {headline}
        </h3>
        <p className="text-emphasis text-text-muted leading-relaxed mb-6">
          {description}
        </p>
        <ul className="space-y-3">
          {bullets.map((b, i) => (
            <li key={i} className="flex items-center gap-3">
              <div
                className={`w-7 h-7 rounded-sm ${bulletColor} flex items-center justify-center shrink-0`}
              >
                <b.icon className="w-4 h-4 text-white" />
              </div>
              <span className="text-body text-text-muted">{b.text}</span>
            </li>
          ))}
        </ul>
      </div>

      <div data-callout-visual className="opacity-0 md:[direction:ltr]">
        {visual}
      </div>
    </div>
  );
}

/* ---- Visual illustrations for each callout ---- */

function MessagingVisual() {
  return (
    <div className="relative">
      <div className="absolute -inset-4 bg-accent-teal/6 rounded-2xl blur-[60px] pointer-events-none" />
      <div className="relative bg-surface rounded-xl border border-border p-5 space-y-4">
        {/* Message bubbles */}
        <div className="flex gap-3">
          <div className="w-8 h-8 rounded-full bg-indigo-500 flex items-center justify-center text-white text-micro font-medium shrink-0">
            K
          </div>
          <div>
            <div className="flex items-baseline gap-2">
              <span className="text-micro font-semibold text-indigo-400">
                Kai
              </span>
              <span className="text-[10px] text-text-muted">2:32 PM</span>
            </div>
            <p className="text-body text-text-primary mt-0.5">
              Just shipped the new dashboard! Check it out
            </p>
            <div className="mt-2 bg-surface-raised rounded-md border border-border p-3">
              <div className="flex items-center gap-2 mb-1">
                <div className="w-4 h-4 rounded bg-accent-violet/30" />
                <span className="text-micro text-text-muted">github.com</span>
              </div>
              <span className="text-micro font-semibold text-text-primary">
                feat: redesign analytics dashboard
              </span>
            </div>
          </div>
        </div>
        <div className="flex gap-3">
          <div className="w-8 h-8 rounded-full bg-emerald-500 flex items-center justify-center text-white text-micro font-medium shrink-0">
            L
          </div>
          <div>
            <div className="flex items-baseline gap-2">
              <span className="text-micro font-semibold text-emerald-400">
                Luna
              </span>
              <span className="text-[10px] text-text-muted">2:33 PM</span>
            </div>
            <p className="text-body text-text-primary mt-0.5">
              Looks amazing! The charts are so clean
            </p>
            <div className="flex gap-1.5 mt-2">
              <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-surface-raised border border-border rounded-full text-micro">
                🚀 4
              </span>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-surface-raised border border-border rounded-full text-micro">
                ✨ 2
              </span>
            </div>
          </div>
        </div>
        {/* Typing */}
        <div className="flex items-center gap-2 text-micro text-text-muted pl-11">
          <div className="flex gap-0.5">
            <span className="w-1.5 h-1.5 rounded-full bg-text-muted animate-bounce" />
            <span
              className="w-1.5 h-1.5 rounded-full bg-text-muted animate-bounce"
              style={{ animationDelay: "0.15s" }}
            />
            <span
              className="w-1.5 h-1.5 rounded-full bg-text-muted animate-bounce"
              style={{ animationDelay: "0.3s" }}
            />
          </div>
          Kai is typing...
        </div>
      </div>
    </div>
  );
}

function VoiceVisual() {
  return (
    <div className="relative">
      <div className="absolute -inset-4 bg-accent-violet/6 rounded-2xl blur-[60px] pointer-events-none" />
      <div className="relative bg-surface rounded-xl border border-border p-5">
        {/* Participant grid */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          {[
            { name: "Alex", color: "bg-indigo-500", speaking: true },
            { name: "Sarah", color: "bg-emerald-500", speaking: false },
            { name: "Marcus", color: "bg-rose-500", speaking: false },
            { name: "You", color: "bg-amber-500", speaking: true },
          ].map((p) => (
            <div
              key={p.name}
              className={`flex flex-col items-center justify-center py-6 rounded-md bg-surface-raised border ${
                p.speaking
                  ? "border-accent-teal/60 shadow-glow-teal"
                  : "border-border"
              } transition-shadow`}
            >
              <div
                className={`w-12 h-12 rounded-full ${p.color} flex items-center justify-center text-white font-semibold ${
                  p.speaking
                    ? "ring-2 ring-accent-teal animate-speaking-pulse"
                    : ""
                }`}
              >
                {p.name[0]}
              </div>
              <span className="text-micro text-text-primary mt-2">
                {p.name}
              </span>
            </div>
          ))}
        </div>
        {/* Control bar */}
        <div className="flex items-center justify-center gap-3 pt-3 border-t border-border">
          <div className="w-10 h-10 rounded-full bg-success/20 flex items-center justify-center">
            <Mic className="w-4 h-4 text-success" />
          </div>
          <div className="w-10 h-10 rounded-full bg-surface-raised border border-border flex items-center justify-center">
            <Volume2 className="w-4 h-4 text-text-muted" />
          </div>
          <div className="w-10 h-10 rounded-full bg-surface-raised border border-border flex items-center justify-center">
            <Radio className="w-4 h-4 text-text-muted" />
          </div>
          <div className="w-12 h-10 rounded-full bg-danger/20 flex items-center justify-center">
            <span className="text-micro text-danger font-medium">End</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function PrivacyVisual() {
  return (
    <div className="relative">
      <div className="absolute -inset-4 bg-success/6 rounded-2xl blur-[60px] pointer-events-none" />
      <div className="relative bg-surface rounded-xl border border-border p-5 space-y-4">
        {/* Encrypted DM header */}
        <div className="flex items-center gap-2 pb-3 border-b border-border">
          <Lock className="w-4 h-4 text-success" />
          <span className="text-micro font-semibold text-success">
            End-to-End Encrypted
          </span>
        </div>
        {/* Encrypted messages */}
        <div className="space-y-3">
          <div className="flex gap-3">
            <div className="w-8 h-8 rounded-full bg-cyan-500 flex items-center justify-center text-white text-micro font-medium shrink-0">
              N
            </div>
            <div className="bg-surface-raised rounded-md px-3 py-2 border border-border">
              <p className="text-body text-text-primary">
                Let&apos;s discuss the project details privately
              </p>
            </div>
          </div>
          <div className="flex gap-3 justify-end">
            <div className="bg-accent-violet/15 rounded-md px-3 py-2 border border-accent-violet/20">
              <p className="text-body text-text-primary">
                Sounds good, this channel is fully encrypted
              </p>
            </div>
            <div className="w-8 h-8 rounded-full bg-amber-500 flex items-center justify-center text-white text-micro font-medium shrink-0">
              Y
            </div>
          </div>
        </div>
        {/* Security badge */}
        <div className="flex items-center gap-3 p-3 bg-success/5 border border-success/20 rounded-md">
          <Shield className="w-5 h-5 text-success shrink-0" />
          <div>
            <p className="text-micro font-semibold text-text-primary">
              Messages are encrypted
            </p>
            <p className="text-[10px] text-text-muted">
              Only you and the recipient can read these messages
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export function FeatureCallouts() {
  return (
    <section id="features" className="py-24 lg:py-32 px-6">
      <div className="max-w-6xl mx-auto space-y-24 lg:space-y-32">
        <Callout
          headline="Messages that feel alive"
          description="Real-time typing indicators, rich embeds, reactions, and threaded replies. Every conversation feels instant and expressive."
          bulletColor="bg-accent-teal"
          bullets={[
            {
              icon: MessageSquare,
              text: "Rich text with markdown and syntax highlighting",
            },
            {
              icon: SmilePlus,
              text: "Reactions with standard and custom emojis",
            },
            { icon: Zap, text: "Sub-100ms message delivery and render" },
          ]}
          visual={<MessagingVisual />}
        />

        <Callout
          headline="Voice that just works"
          description="Crystal-clear voice channels powered by WebRTC. Sub-80ms latency, noise suppression, and effortless screen sharing for your community."
          bulletColor="bg-accent-violet"
          bullets={[
            { icon: Mic, text: "Noise suppression and echo cancellation" },
            { icon: Volume2, text: "Per-user volume control" },
            { icon: Radio, text: "Stage channels for events and talks" },
          ]}
          visual={<VoiceVisual />}
          reverse
        />

        <Callout
          headline="Privacy by default"
          description="Opt-in end-to-end encrypted DMs using the Signal Protocol. No forced phone verification. Your data stays yours."
          bulletColor="bg-success"
          bullets={[
            { icon: Lock, text: "End-to-end encrypted direct messages" },
            {
              icon: Shield,
              text: "No data mining or third-party tracking",
            },
            { icon: Eye, text: "Granular privacy controls per user" },
          ]}
          visual={<PrivacyVisual />}
        />
      </div>
    </section>
  );
}
