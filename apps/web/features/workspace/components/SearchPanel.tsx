"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { cn } from "@corvus/ui";
import { X } from "lucide-react";
import { Avatar } from "@/shared/components/ui";
import type { BoardCard, ChatMessage, DocSummary, PullRequest } from "./types";

type SearchTab = "messages" | "cards" | "docs" | "files" | "prs";

const TABS: { id: SearchTab; label: string }[] = [
  { id: "messages", label: "Messages" },
  { id: "cards", label: "Cards" },
  { id: "docs", label: "Docs" },
  { id: "files", label: "Files" },
  { id: "prs", label: "PRs" },
];

export interface SearchCorpus {
  messages: (ChatMessage & { channel: string })[];
  cards: (BoardCard & { column: string })[];
  docs: (DocSummary & { preview?: string })[];
  prs: PullRequest[];
}

/**
 * Full-text search (brief §Search). Opens as a right panel — same width and
 * border treatment as the Thread Panel. Matches highlight in accent-subtle.
 */
export function SearchPanel({ corpus, onClose }: { corpus: SearchCorpus; onClose: () => void }) {
  const [tab, setTab] = useState<SearchTab>("messages");
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => inputRef.current?.focus(), []);

  const q = query.trim().toLowerCase();
  const results = useMemo(() => {
    if (!q) return { messages: [], cards: [], docs: [], prs: [] };
    return {
      messages: corpus.messages.filter((m) => m.text.toLowerCase().includes(q)),
      cards: corpus.cards.filter((c) => c.title.toLowerCase().includes(q)),
      docs: corpus.docs.filter(
        (d) => d.title.toLowerCase().includes(q) || d.preview?.toLowerCase().includes(q)
      ),
      prs: corpus.prs.filter((p) => p.title.toLowerCase().includes(q)),
    };
  }, [corpus, q]);

  return (
    <aside className="flex h-full w-[360px] shrink-0 flex-col border-l border-border bg-surface-raised">
      <div className="flex h-12 shrink-0 items-center justify-between border-b border-border px-4">
        <span className="font-mono text-[11px] uppercase tracking-[0.08em] text-text-muted">Search</span>
        <button
          type="button"
          aria-label="Close search"
          onClick={onClose}
          className="flex h-7 w-7 items-center justify-center rounded-sm text-text-faint transition-colors hover:bg-hover-row hover:text-text-primary"
        >
          <X size={16} />
        </button>
      </div>

      <div className="p-3 pb-0">
        <input
          ref={inputRef}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search this space"
          className="h-10 w-full rounded-md border border-border bg-surface-input px-3 text-[14px] text-text-primary outline-none transition-colors placeholder:text-text-faint focus:border-border-active"
        />
      </div>

      <div className="flex shrink-0 items-center gap-1 overflow-x-auto px-3 py-2">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            data-active={tab === t.id}
            onClick={() => setTab(t.id)}
            className={cn(
              "h-6 shrink-0 rounded px-2.5 text-[12px] transition-colors",
              tab === t.id
                ? "bg-surface-overlay text-text-primary"
                : "text-text-secondary hover:bg-hover-row hover:text-text-primary"
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto">
        {!q && (
          <p className="px-4 py-6 text-[13px] text-text-muted">
            Search messages, cards, docs, and PRs across this space.
          </p>
        )}

        {q && tab === "messages" &&
          (results.messages.length ? (
            results.messages.map((m) => (
              <div key={m.id} className="border-b border-border px-4 py-3 transition-colors hover:bg-hover-row">
                <div className="flex items-center gap-2">
                  <Avatar size={24} radius={5} src={m.author.avatar} name={m.author.name} />
                  <span className="font-mono text-[11px] text-text-secondary">{m.author.name}</span>
                  <span className="font-mono text-[11px] text-text-muted">— {m.channel}</span>
                </div>
                <p className="mt-1.5 text-[13px] leading-[1.5] text-text-secondary">
                  <Highlight text={m.text} query={q} />
                </p>
              </div>
            ))
          ) : (
            <NoResults />
          ))}

        {q && tab === "cards" &&
          (results.cards.length ? (
            results.cards.map((c) => (
              <div
                key={c.id}
                className="flex items-center gap-2.5 border-b border-border px-4 py-3 transition-colors hover:bg-hover-row"
              >
                <span aria-hidden className="font-mono text-[12px] text-text-muted">▦</span>
                <span className="min-w-0 flex-1 truncate text-[13px] text-text-primary">
                  <Highlight text={c.title} query={q} />
                </span>
                <span className="font-mono text-[11px] text-text-muted">{c.column}</span>
              </div>
            ))
          ) : (
            <NoResults />
          ))}

        {q && tab === "docs" &&
          (results.docs.length ? (
            results.docs.map((d) => (
              <div key={d.id} className="border-b border-border px-4 py-3 transition-colors hover:bg-hover-row">
                <div className="flex items-center gap-2.5">
                  <span aria-hidden className="font-mono text-[12px] text-text-muted">↗</span>
                  <span className="truncate text-[13px] text-text-primary">
                    <Highlight text={d.title} query={q} />
                  </span>
                </div>
                {d.preview && <p className="mt-1 truncate text-[11px] text-text-muted">{d.preview}</p>}
              </div>
            ))
          ) : (
            <NoResults />
          ))}

        {q && tab === "files" && <NoResults />}

        {q && tab === "prs" &&
          (results.prs.length ? (
            results.prs.map((p) => (
              <div key={p.id} className="border-b border-border px-4 py-3 transition-colors hover:bg-hover-row">
                <p className="truncate text-[13px] text-text-primary">
                  <Highlight text={p.title} query={q} />
                </p>
                <p className="mt-0.5 font-mono text-[11px] text-text-muted">
                  {p.repo} · #{p.number} · {p.status}
                </p>
              </div>
            ))
          ) : (
            <NoResults />
          ))}
      </div>
    </aside>
  );
}

function Highlight({ text, query }: { text: string; query: string }) {
  const idx = text.toLowerCase().indexOf(query);
  if (idx < 0) return <>{text}</>;
  return (
    <>
      {text.slice(0, idx)}
      <mark className="rounded-[2px] bg-accent/15 px-0.5 text-accent">
        {text.slice(idx, idx + query.length)}
      </mark>
      {text.slice(idx + query.length)}
    </>
  );
}

function NoResults() {
  return <p className="px-4 py-6 text-[13px] text-text-muted">No results.</p>;
}
