"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { cn } from "@corvus/ui";
import { Search } from "lucide-react";
import { Avatar } from "@/shared/components/ui";
import type { MemberRef } from "./types";

/**
 * Composer popovers (brief §Composer) — emoji, GIF, and @mention menus.
 * All three share the system popover treatment: overlay surface, 1px border,
 * 10px radius, one soft shadow. No category icon rails, no colored chrome.
 */

const POPOVER =
  "absolute bottom-full right-0 z-30 mb-2 rounded-[10px] border border-border bg-surface-overlay";
const SHADOW = { boxShadow: "0 8px 24px rgba(0,0,0,0.3)" } as const;

/* ── Emoji ──────────────────────────────────────────────────────────── */

const EMOJI_GROUPS: { label: string; emoji: string[] }[] = [
  {
    label: "Frequent",
    emoji: ["👍", "🔥", "❤️", "😂", "🎉", "👀", "✅", "🚀", "😅", "🙏", "💯", "🤝"],
  },
  {
    label: "Faces",
    emoji: ["😀", "😄", "😊", "😉", "😍", "🤔", "😴", "😎", "🥲", "😬", "🫠", "🤯", "🥳", "😤", "😭", "🙃"],
  },
  {
    label: "Hands",
    emoji: ["👋", "✌️", "🤞", "👏", "🙌", "💪", "🫡", "👌", "🤙", "✍️", "🤌", "🖖"],
  },
  {
    label: "Things",
    emoji: ["⚡", "🐛", "🔧", "📌", "📝", "🧠", "☕", "🍕", "🎯", "🧪", "📦", "🛰️"],
  },
];

export function EmojiPicker({ onPick }: { onPick: (emoji: string) => void }) {
  return (
    <div className={cn(POPOVER, "max-h-[320px] w-[296px] overflow-y-auto p-3")} style={SHADOW}>
      {EMOJI_GROUPS.map((group) => (
        <div key={group.label} className="mb-2">
          <p className="px-1 pb-1 font-mono text-[10px] uppercase tracking-[0.08em] text-text-muted">
            {group.label}
          </p>
          <div className="grid grid-cols-8">
            {group.emoji.map((e) => (
              <button
                key={e}
                type="button"
                onClick={() => onPick(e)}
                className="flex h-8 w-8 items-center justify-center rounded-sm text-[18px] leading-none transition-colors hover:bg-hover-row"
              >
                {e}
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

/* ── GIFs — live Tenor search ───────────────────────────────────────── */

const TENOR_KEY = "AIzaSyAyimkuYQYF_FXVALexPuGQctUWRURdCYQ"; // Tenor public API key
const TENOR_BASE = "https://tenor.googleapis.com/v2";

interface TenorGif {
  id: string;
  title: string;
  media_formats: {
    tinygif?: { url: string };
    gif?: { url: string };
  };
}

const GIF_TABS = ["Trending", "Reactions", "Dev", "Celebrate", "Nope"] as const;
const TAB_QUERY: Record<string, string | null> = {
  Trending: null,
  Reactions: "reactions",
  Dev: "programming",
  Celebrate: "celebration",
  Nope: "nope",
};

export function GifPicker({ onPick }: { onPick: (gif: { url: string; name: string }) => void }) {
  const [query, setQuery] = useState("");
  const [tab, setTab] = useState<(typeof GIF_TABS)[number]>("Trending");
  const [gifs, setGifs] = useState<TenorGif[]>([]);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (debounce.current) clearTimeout(debounce.current);
    debounce.current = setTimeout(async () => {
      setState("loading");
      try {
        const q = query.trim() || TAB_QUERY[tab];
        const url = q
          ? `${TENOR_BASE}/search?key=${TENOR_KEY}&q=${encodeURIComponent(q)}&limit=24&media_filter=tinygif,gif`
          : `${TENOR_BASE}/featured?key=${TENOR_KEY}&limit=24&media_filter=tinygif,gif`;
        const res = await fetch(url);
        if (!res.ok) throw new Error(String(res.status));
        const json = (await res.json()) as { results: TenorGif[] };
        setGifs(json.results ?? []);
        setState("ready");
      } catch {
        setState("error");
      }
    }, query ? 350 : 0);
    return () => {
      if (debounce.current) clearTimeout(debounce.current);
    };
  }, [query, tab]);

  return (
    <div className={cn(POPOVER, "flex w-[360px] flex-col p-3")} style={SHADOW}>
      <div className="flex h-8 shrink-0 items-center gap-2 rounded-md border border-border bg-surface-input px-2.5">
        <Search size={13} className="shrink-0 text-text-faint" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search Tenor"
          autoFocus
          className="w-full bg-transparent text-[13px] text-text-primary outline-none placeholder:text-text-faint"
        />
      </div>

      {!query && (
        <div className="mt-2 flex shrink-0 items-center gap-1 overflow-x-auto">
          {GIF_TABS.map((t) => (
            <button
              key={t}
              type="button"
              data-active={tab === t}
              onClick={() => setTab(t)}
              className={cn(
                "h-6 shrink-0 rounded px-2.5 text-[12px] transition-colors",
                tab === t
                  ? "bg-surface-raised text-text-primary"
                  : "text-text-secondary hover:bg-hover-row hover:text-text-primary"
              )}
            >
              {t}
            </button>
          ))}
        </div>
      )}

      <div className="mt-2.5 grid max-h-[280px] min-h-[120px] grid-cols-2 content-start gap-1.5 overflow-y-auto">
        {state === "loading" && (
          <p className="col-span-2 py-8 text-center font-mono text-[11px] text-text-muted">
            loading…
          </p>
        )}
        {state === "error" && (
          <p className="col-span-2 py-8 text-center text-[12px] text-text-muted">
            Couldn&apos;t reach Tenor. Check your connection.
          </p>
        )}
        {state === "ready" &&
          gifs.map((g) => {
            const preview = g.media_formats.tinygif?.url ?? g.media_formats.gif?.url;
            const full = g.media_formats.gif?.url ?? preview;
            if (!preview || !full) return null;
            return (
              <button
                key={g.id}
                type="button"
                title={g.title}
                onClick={() => onPick({ url: full, name: g.title || "gif" })}
                className="overflow-hidden rounded-md border border-border bg-surface-raised transition-colors hover:border-accent"
              >
                <img src={preview} alt={g.title} loading="lazy" className="block h-[88px] w-full object-cover" />
              </button>
            );
          })}
        {state === "ready" && gifs.length === 0 && (
          <p className="col-span-2 py-8 text-center text-[12px] text-text-muted">
            No GIFs for “{query}”.
          </p>
        )}
      </div>
      <p className="pt-2 text-right font-mono text-[9px] uppercase tracking-[0.08em] text-text-faint">
        via tenor
      </p>
    </div>
  );
}

/* ── Mentions ───────────────────────────────────────────────────────── */

export function MentionMenu({
  members,
  query,
  onPick,
}: {
  members: MemberRef[];
  /** The text typed after “@”. */
  query: string;
  onPick: (name: string) => void;
}) {
  const visible = useMemo(
    () =>
      members
        .filter((m) => m.name.toLowerCase().startsWith(query.toLowerCase()))
        .slice(0, 6),
    [members, query]
  );

  if (visible.length === 0) return null;

  return (
    <div
      className="absolute bottom-full left-0 z-30 mb-2 min-w-[240px] rounded-[10px] border border-border bg-surface-overlay p-1"
      style={SHADOW}
    >
      <p className="px-2.5 pb-1 pt-1.5 font-mono text-[10px] uppercase tracking-[0.08em] text-text-muted">
        Members
      </p>
      {visible.map((m) => (
        <button
          key={m.id}
          type="button"
          onClick={() => onPick(m.name)}
          className="flex h-9 w-full items-center gap-2.5 rounded-sm px-2.5 text-left transition-colors hover:bg-hover-row"
        >
          <Avatar src={m.avatar} name={m.name} size={20} radius={5} />
          <span className="text-[13px] text-text-primary">{m.name}</span>
          <span className="ml-auto font-mono text-[10px] text-text-faint">@{m.name}</span>
        </button>
      ))}
    </div>
  );
}
