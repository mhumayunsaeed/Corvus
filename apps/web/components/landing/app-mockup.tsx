"use client";

import {
  Hash,
  Volume2,
  Megaphone,
  ChevronDown,
  Bell,
  Plus,
  Settings,
  Mic,
  Headphones,
  Search,
  Users,
  Pin,
  Smile,
  Paperclip,
  Image,
} from "lucide-react";

/** Realistic mock of Veyra's main app shell (Screen 4) used as a hero visual. */
export function AppMockup() {
  return (
    <div className="flex h-[520px] sm:h-[560px] lg:h-[620px] bg-background text-text-primary text-body select-none overflow-hidden">
      {/* Server Rail */}
      <div className="hidden sm:flex w-[68px] shrink-0 flex-col items-center py-3 gap-2 bg-background border-r border-border">
        {/* Home / logo */}
        <div className="w-12 h-12 rounded-md bg-gradient-to-br from-accent-violet to-accent-teal flex items-center justify-center mb-1 shadow-glow">
          <span className="text-white font-bold text-lg">V</span>
        </div>
        <div className="w-8 h-px bg-border" />
        {/* Servers */}
        {[
          { color: "bg-indigo-500", letter: "G", active: true },
          { color: "bg-emerald-600", letter: "D" },
          { color: "bg-rose-500", letter: "A" },
          { color: "bg-orange-500", letter: "M" },
          { color: "bg-cyan-500", letter: "T" },
        ].map((s, i) => (
          <div key={i} className="relative group">
            {s.active && (
              <div className="absolute -left-1 top-1/2 -translate-y-1/2 w-[3px] h-6 bg-accent-violet rounded-r" />
            )}
            <div
              className={`w-12 h-12 rounded-md flex items-center justify-center text-white font-semibold text-emphasis ${s.color} ${s.active ? "ring-2 ring-accent-violet/40" : "opacity-80"} transition-all`}
            >
              {s.letter}
            </div>
          </div>
        ))}
        <div className="mt-auto">
          <div className="w-12 h-12 rounded-md border border-dashed border-border flex items-center justify-center text-text-muted">
            <Plus className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Channel Sidebar */}
      <div className="hidden md:flex w-[240px] shrink-0 flex-col bg-channel-sidebar">
        {/* Server header */}
        <div className="h-12 px-4 flex items-center justify-between border-b border-border">
          <span className="font-semibold text-emphasis truncate">
            Game Dev Hub
          </span>
          <ChevronDown className="w-4 h-4 text-text-muted" />
        </div>

        {/* Channels */}
        <div className="flex-1 overflow-y-auto px-2 py-3 space-y-4">
          {/* Category */}
          <div>
            <div className="flex items-center gap-1 px-1 mb-1">
              <ChevronDown className="w-3 h-3 text-text-muted" />
              <span className="text-micro text-text-muted uppercase font-semibold tracking-wider">
                Text Channels
              </span>
            </div>
            {[
              { name: "general", active: true },
              { name: "introductions" },
              { name: "show-your-work", unread: true },
              { name: "resources" },
            ].map((ch) => (
              <div
                key={ch.name}
                className={`flex items-center gap-2 px-2 py-1.5 rounded-sm cursor-pointer ${
                  ch.active
                    ? "bg-surface-raised text-text-primary"
                    : "text-text-muted hover:text-text-primary hover:bg-surface-raised/50"
                } transition-colors`}
              >
                <Hash className="w-4 h-4 shrink-0 opacity-60" />
                <span
                  className={`truncate ${ch.unread ? "font-semibold text-text-primary" : ""}`}
                >
                  {ch.name}
                </span>
                {ch.unread && (
                  <div className="ml-auto w-1.5 h-1.5 rounded-full bg-text-primary" />
                )}
              </div>
            ))}
          </div>

          <div>
            <div className="flex items-center gap-1 px-1 mb-1">
              <ChevronDown className="w-3 h-3 text-text-muted" />
              <span className="text-micro text-text-muted uppercase font-semibold tracking-wider">
                Voice Channels
              </span>
            </div>
            {[{ name: "Lounge", users: 3 }, { name: "Collab" }].map((ch) => (
              <div key={ch.name}>
                <div className="flex items-center gap-2 px-2 py-1.5 rounded-sm text-text-muted hover:text-text-primary hover:bg-surface-raised/50 cursor-pointer transition-colors">
                  <Volume2 className="w-4 h-4 shrink-0 opacity-60" />
                  <span className="truncate">{ch.name}</span>
                </div>
                {ch.users && (
                  <div className="ml-7 flex items-center gap-1.5 py-1">
                    {Array.from({ length: ch.users }).map((_, i) => (
                      <div
                        key={i}
                        className="w-5 h-5 rounded-full bg-accent-violet/30 ring-1 ring-accent-teal/40"
                      />
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>

          <div>
            <div className="flex items-center gap-1 px-1 mb-1">
              <ChevronDown className="w-3 h-3 text-text-muted" />
              <span className="text-micro text-text-muted uppercase font-semibold tracking-wider">
                Info
              </span>
            </div>
            <div className="flex items-center gap-2 px-2 py-1.5 rounded-sm text-text-muted hover:text-text-primary hover:bg-surface-raised/50 cursor-pointer transition-colors">
              <Megaphone className="w-4 h-4 shrink-0 opacity-60" />
              <span className="truncate">announcements</span>
            </div>
          </div>
        </div>

        {/* User bar */}
        <div className="h-14 px-3 flex items-center gap-2 bg-titlebar-bg border-t border-border">
          <div className="relative">
            <div className="w-8 h-8 rounded-full bg-accent-violet/40 flex items-center justify-center text-micro font-medium">
              Y
            </div>
            <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-success border-2 border-titlebar-bg" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-micro font-medium text-text-primary truncate">
              You
            </div>
            <div className="text-[10px] text-text-muted truncate">Online</div>
          </div>
          <div className="flex items-center gap-1">
            <Mic className="w-4 h-4 text-text-muted" />
            <Headphones className="w-4 h-4 text-text-muted" />
            <Settings className="w-4 h-4 text-text-muted" />
          </div>
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 flex flex-col min-w-0 bg-background">
        {/* Top bar */}
        <div className="h-12 px-4 flex items-center gap-3 border-b border-border shrink-0">
          <Hash className="w-5 h-5 text-text-muted" />
          <span className="font-semibold text-text-primary">general</span>
          <span className="hidden lg:block text-micro text-text-muted truncate">
            Welcome to the server! Say hi
          </span>
          <div className="ml-auto flex items-center gap-3 text-text-muted">
            <Bell className="w-4 h-4 hidden sm:block" />
            <Search className="w-4 h-4" />
            <Users className="w-4 h-4 hidden sm:block" />
            <Pin className="w-4 h-4 hidden lg:block" />
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-hidden px-4 py-4 space-y-5">
          <MockMessage
            avatar="bg-indigo-500"
            initial="A"
            name="Alex"
            nameColor="text-indigo-400"
            time="Today at 2:14 PM"
            text="Hey everyone! Just pushed the new collision system. Check out the physics demo in #show-your-work"
          />
          <MockMessage
            avatar="bg-emerald-500"
            initial="S"
            name="Sarah"
            nameColor="text-emerald-400"
            time="Today at 2:16 PM"
            text="Nice! The ragdoll physics look so smooth. What engine are you using?"
          />
          <MockMessage
            avatar="bg-rose-500"
            initial="M"
            name="Marcus"
            nameColor="text-rose-400"
            time="Today at 2:18 PM"
            text="This is incredible, love the particle effects on impact 🔥"
          >
            {/* Reactions */}
            <div className="flex gap-1.5 mt-2">
              <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-surface-raised border border-border rounded-full text-micro">
                🔥 3
              </span>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-reaction-own border border-accent-violet/40 rounded-full text-micro">
                ❤️ 1
              </span>
            </div>
          </MockMessage>
          <MockMessage
            avatar="bg-amber-500"
            initial="J"
            name="Jenna"
            nameColor="text-amber-400"
            time="Today at 2:21 PM"
            text="Has anyone tried integrating LiveKit for the multiplayer voice chat? The latency is unreal."
          />
          {/* Typing indicator */}
          <div className="flex items-center gap-2 text-micro text-text-muted pl-[52px]">
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
            <span>Alex is typing...</span>
          </div>
        </div>

        {/* Message input */}
        <div className="px-4 pb-4">
          <div className="flex items-center gap-2 bg-surface-raised border border-border rounded-md px-4 py-3">
            <Paperclip className="w-5 h-5 text-text-muted shrink-0" />
            <Image className="w-5 h-5 text-text-muted shrink-0 hidden sm:block" />
            <span className="flex-1 text-text-muted text-body">
              Message #general
            </span>
            <Smile className="w-5 h-5 text-text-muted shrink-0" />
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
    <div className="flex gap-3 group">
      <div
        className={`w-9 h-9 rounded-full ${avatar} flex items-center justify-center text-white font-medium text-micro shrink-0`}
      >
        {initial}
      </div>
      <div className="min-w-0">
        <div className="flex items-baseline gap-2">
          <span className={`font-semibold text-body ${nameColor}`}>{name}</span>
          <span className="text-[10px] text-text-muted">{time}</span>
        </div>
        <p className="text-body text-text-primary leading-relaxed mt-0.5">
          {text}
        </p>
        {children}
      </div>
    </div>
  );
}
