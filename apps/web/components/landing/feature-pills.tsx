"use client";

import {
  MessageSquare,
  Mic,
  Video,
  Lock,
  SearchCode,
  Radio,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

interface FeaturePill {
  icon: LucideIcon;
  label: string;
}

const pills: FeaturePill[] = [
  { icon: MessageSquare, label: "Real-time Messaging" },
  { icon: Mic, label: "Crystal-Clear Voice" },
  { icon: Video, label: "HD Video" },
  { icon: Lock, label: "Encrypted DMs" },
  { icon: SearchCode, label: "Smart Search" },
  { icon: Radio, label: "Stage Channels" },
];

export function FeaturePills() {
  // Double the array for seamless infinite marquee
  const doubled = [...pills, ...pills];

  return (
    <section className="py-10 overflow-hidden border-t border-b border-border bg-surface/40">
      <div className="relative">
        {/* Left/right fade masks */}
        <div className="absolute left-0 top-0 bottom-0 w-24 bg-gradient-to-r from-background to-transparent z-10 pointer-events-none" />
        <div className="absolute right-0 top-0 bottom-0 w-24 bg-gradient-to-l from-background to-transparent z-10 pointer-events-none" />

        <div className="flex animate-marquee gap-6">
          {doubled.map((pill, i) => (
            <div
              key={i}
              className="flex items-center gap-3 px-5 py-3 bg-surface rounded-md border border-border shrink-0 hover:border-accent-violet/40 transition-colors cursor-default"
            >
              <pill.icon className="w-5 h-5 text-accent-violet shrink-0" />
              <span className="text-body text-text-muted whitespace-nowrap font-medium">
                {pill.label}
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
