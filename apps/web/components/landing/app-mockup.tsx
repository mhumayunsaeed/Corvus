"use client";

import {
  Hash,
  Volume2,
  ChevronDown,
  ChevronRight,
  Home,
  Search,
  Plus,
  Settings,
  Mic,
  Headphones,
  Users,
  Pin,
  Smile,
  Plus as PlusIcon,
  ArrowUp,
  Sparkles,
} from "lucide-react";

/** Mock of Corvus's redesigned shell (unified sidebar + ⌘K + live) — hero visual. */
export function AppMockup() {
  return (
    <div className="flex h-[520px] sm:h-[560px] lg:h-[620px] bg-background text-text-primary text-body select-none overflow-hidden">
      {/* ─── Unified sidebar ─── */}
      <div className="hidden md:flex w-[248px] shrink-0 flex-col bg-channel-sidebar">
        {/* Brand + command palette */}
        <div className="px-3 pt-3 pb-2">
          <div className="flex h-9 w-full items-center gap-2.5 rounded-lg border border-border-subtle bg-surface-raised px-2.5 text-text-muted">
            <Search className="w-3.5 h-3.5" />
            <span className="flex-1 text-left text-[13px]">Jump to…</span>
            <kbd className="rounded border border-border-highlight bg-surface px-1.5 py-0.5 text-[10px] font-medium">
              ⌘K
            </kbd>
          </div>
        </div>

        <div className="flex-1 overflow-hidden px-2 space-y-4">
          {/* Home */}
          <button className="flex w-full items-center gap-2.5 rounded-lg bg-accent-soft px-2.5 py-2 text-[14px] font-medium text-accent">
            <Home className="w-4 h-4" />
            Home
          </button>

          {/* Direct messages */}
          <div>
            <div className="px-2.5 pb-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-text-faint">
              Direct Messages
            </div>
            {[
              { initial: "S", name: "Sarah", color: "bg-emerald-500" },
              { initial: "M", name: "Marcus", color: "bg-rose-500" },
            ].map((dm) => (
              <div
                key={dm.name}
                className="flex items-center gap-2.5 rounded-lg px-2 py-1.5 text-text-secondary hover:bg-hover-row"
              >
                <div
                  className={`w-6 h-6 rounded-full ${dm.color} flex items-center justify-center text-white text-[10px] font-medium`}
                >
                  {dm.initial}
                </div>
                <span className="text-[13px] font-medium">{dm.name}</span>
              </div>
            ))}
          </div>

          {/* Spaces */}
          <div>
            <div className="flex items-center justify-between px-2.5 pb-1">
              <span className="text-[10px] font-semibold uppercase tracking-[0.08em] text-text-faint">
                Spaces
              </span>
              <Plus className="w-3.5 h-3.5 text-text-muted" />
            </div>

            {/* Active space, expanded */}
            <div className="flex items-center gap-2.5 rounded-lg bg-active-row px-2 py-1.5 text-text-primary">
              <span className="w-6 h-6 rounded-md bg-accent flex items-center justify-center text-white text-[10px] font-bold">
                GD
              </span>
              <span className="flex-1 text-[13px] font-semibold">Game Dev Hub</span>
              <ChevronRight className="w-3.5 h-3.5 rotate-90 text-text-faint" />
            </div>

            <div className="ml-2 mt-0.5 space-y-2 border-l border-border-subtle pl-2">
              <div>
                <div className="flex items-center gap-1 px-1.5 py-1 text-[10px] font-semibold uppercase tracking-[0.06em] text-text-faint">
                  <ChevronDown className="w-3 h-3" />
                  Text
                </div>
                {[
                  { name: "general", active: true },
                  { name: "show-your-work", unread: true },
                  { name: "resources" },
                ].map((ch) => (
                  <div
                    key={ch.name}
                    className={`flex items-center gap-2 rounded-md px-2 py-1.5 ${
                      ch.active
                        ? "bg-active-row text-text-primary"
                        : ch.unread
                          ? "text-text-primary"
                          : "text-text-muted"
                    }`}
                  >
                    <Hash className="w-3.5 h-3.5 shrink-0" />
                    <span className="truncate text-[13px] font-medium">{ch.name}</span>
                  </div>
                ))}
              </div>
              <div>
                <div className="flex items-center gap-1 px-1.5 py-1 text-[10px] font-semibold uppercase tracking-[0.06em] text-text-faint">
                  <ChevronDown className="w-3 h-3" />
                  Voice
                </div>
                <div className="flex items-center gap-2 rounded-md px-2 py-1.5 text-live">
                  <Volume2 className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate text-[13px] font-medium">Lounge</span>
                  <span className="ml-auto flex items-center gap-1 text-[9px] font-bold uppercase tracking-[0.1em]">
                    <span className="h-1.5 w-1.5 rounded-full bg-live" />3
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Self panel */}
        <div className="h-14 px-3 flex items-center gap-2 border-t border-border-subtle">
          <div className="relative">
            <div className="w-8 h-8 rounded-full bg-accent/40 flex items-center justify-center text-micro font-medium">
              Y
            </div>
            <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-success border-2 border-channel-sidebar" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-micro font-semibold text-text-primary truncate">You</div>
            <div className="text-[10px] text-text-muted truncate">Online</div>
          </div>
          <div className="flex items-center gap-1 text-text-muted">
            <Mic className="w-4 h-4" />
            <Headphones className="w-4 h-4" />
            <Settings className="w-4 h-4" />
          </div>
        </div>
      </div>

      {/* ─── Content ─── */}
      <div className="flex-1 flex flex-col min-w-0 bg-background">
        {/* Top bar */}
        <div className="h-[52px] px-4 flex items-center gap-2.5 border-b border-border-subtle shrink-0">
          <span className="flex h-6 w-6 items-center justify-center rounded-md bg-accent/10">
            <Hash className="w-3.5 h-3.5 text-accent" />
          </span>
          <span className="font-semibold text-text-primary tracking-[-0.01em]">general</span>
          <span className="hidden lg:block text-micro text-text-muted truncate">
            Welcome to the server! Say hi
          </span>
          <div className="ml-auto flex items-center gap-1 text-text-muted">
            <Search className="w-4 h-4" />
            <Users className="w-4 h-4 hidden sm:block" />
            <Pin className="w-4 h-4 hidden lg:block" />
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-hidden px-3 py-3 space-y-1">
          <MockMessage avatar="bg-indigo-500" initial="A" name="Alex" nameColor="text-indigo-400" time="2:14 PM" text="Hey everyone! Just pushed the new collision system — check the physics demo in #show-your-work" />
          <MockMessage avatar="bg-emerald-500" initial="S" name="Sarah" nameColor="text-emerald-400" time="2:16 PM" text="Nice! The ragdoll physics look so smooth. What engine are you using?" />
          <MockMessage avatar="bg-rose-500" initial="M" name="Marcus" nameColor="text-rose-400" time="2:18 PM" text="This is incredible, love the particle effects on impact 🔥">
            <div className="flex gap-1.5 mt-2">
              <span className="inline-flex items-center gap-1.5 px-2 py-1 bg-surface-raised border border-border-highlight rounded-lg text-micro font-medium">
                🔥 <span className="text-text-muted">3</span>
              </span>
              <span className="inline-flex items-center gap-1.5 px-2 py-1 bg-reaction-own border border-accent-violet rounded-lg text-micro font-medium">
                ❤️ <span className="text-text-muted">1</span>
              </span>
            </div>
          </MockMessage>
          <MockMessage avatar="bg-amber-500" initial="J" name="Jenna" nameColor="text-amber-400" time="2:21 PM" text="Has anyone tried integrating LiveKit for the multiplayer voice chat? The latency is unreal." />
          {/* Typing */}
          <div className="flex items-center gap-2 text-micro text-text-muted pl-[46px] pt-1">
            <div className="flex gap-0.5">
              <span className="w-1.5 h-1.5 rounded-full bg-text-muted animate-bounce" />
              <span className="w-1.5 h-1.5 rounded-full bg-text-muted animate-bounce" style={{ animationDelay: "0.15s" }} />
              <span className="w-1.5 h-1.5 rounded-full bg-text-muted animate-bounce" style={{ animationDelay: "0.3s" }} />
            </div>
            <span>Alex is typing…</span>
          </div>
        </div>

        {/* Composer */}
        <div className="px-4 pb-4 pt-2">
          <div className="flex items-center gap-2 bg-surface-raised border border-border-highlight shadow-e1 rounded-2xl px-3 py-2.5">
            <PlusIcon className="w-4 h-4 text-text-faint shrink-0" />
            <span className="flex-1 text-text-faint text-[13.5px]">Message #general</span>
            <Smile className="w-4 h-4 text-text-faint shrink-0" />
            <span className="ml-0.5 flex h-7 w-7 items-center justify-center rounded-lg bg-accent-violet text-white">
              <ArrowUp className="w-4 h-4" />
            </span>
          </div>
        </div>
      </div>

      {/* ─── Members context panel ─── */}
      <div className="hidden xl:flex w-[200px] shrink-0 flex-col border-l border-border-subtle bg-member-sidebar">
        <div className="h-[52px] px-4 flex items-center gap-2 border-b border-border-subtle text-[13px] font-semibold text-text-primary">
          <Users className="w-4 h-4 text-text-muted" />
          Members
        </div>
        <div className="p-2 space-y-3">
          <div>
            <div className="px-2 pb-1.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-text-faint">
              Online — 4
            </div>
            {[
              { initial: "A", name: "Alex", color: "bg-indigo-500" },
              { initial: "S", name: "Sarah", color: "bg-emerald-500" },
              { initial: "M", name: "Marcus", color: "bg-rose-500" },
              { initial: "J", name: "Jenna", color: "bg-amber-500" },
            ].map((m) => (
              <div key={m.name} className="flex items-center gap-2.5 rounded-lg px-2 py-1.5">
                <div className="relative">
                  <div className={`w-7 h-7 rounded-full ${m.color} flex items-center justify-center text-white text-[10px] font-medium`}>
                    {m.initial}
                  </div>
                  <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-success border-2 border-member-sidebar" />
                </div>
                <span className="text-[13px] font-medium text-text-secondary">{m.name}</span>
              </div>
            ))}
          </div>
          <div className="flex items-center gap-1.5 px-2 text-[10px] text-text-faint">
            <Sparkles className="w-3 h-3" /> Designed for focus
          </div>
        </div>
      </div>
    </div>
  );
}

function MockMessage({
  avatar,
  initial,
  name,
  nameColor,
  time,
  text,
  children,
}: {
  avatar: string;
  initial: string;
  name: string;
  nameColor: string;
  time: string;
  text: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="flex gap-3 group -mx-2 px-2 py-1.5 rounded-xl hover:bg-hover-row transition-colors">
      <div
        className={`w-9 h-9 rounded-xl ${avatar} flex items-center justify-center text-white font-medium text-micro shrink-0`}
      >
        {initial}
      </div>
      <div className="min-w-0">
        <div className="flex items-baseline gap-2">
          <span className={`font-semibold text-[14px] ${nameColor}`}>{name}</span>
          <span className="text-[11px] text-text-faint">{time}</span>
        </div>
        <p className="text-[13.5px] text-text-primary leading-[1.6] mt-0.5">{text}</p>
        {children}
      </div>
    </div>
  );
}
