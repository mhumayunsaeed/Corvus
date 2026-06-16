"use client";

import { useState } from "react";
import { cn } from "@corvus/ui";
import { GitPullRequest } from "lucide-react";
import { ChannelGlyph } from "@/shared/components/ui";
import type { CIStatus, PullRequest, PRStatus } from "./types";

type Filter = "all" | "review" | "changes" | "approved" | "merged";

const FILTERS: { id: Filter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "review", label: "Needs review" },
  { id: "changes", label: "Changes requested" },
  { id: "approved", label: "Approved" },
  { id: "merged", label: "Merged" },
];

const STATUS_DOT: Record<PRStatus, string> = {
  open: "bg-status-online",
  draft: "bg-text-faint",
  review: "bg-status-idle",
  merged: "bg-accent",
  closed: "bg-status-dnd",
};

/**
 * GitHub Connect — the PR review feed (brief §GitHub). A native surface, not
 * a notification plugin: status dot, mono metadata, CI badge, review count.
 */
export function GitHubView({
  prs,
  onConnect,
}: {
  prs: PullRequest[];
  /** Connect a repository — shown when the channel has no feed yet. */
  onConnect?: () => void;
}) {
  const [filter, setFilter] = useState<Filter>("all");

  const visible = prs.filter((pr) => {
    if (filter === "all") return true;
    if (filter === "review") return pr.status === "review" || pr.status === "open";
    if (filter === "changes") return pr.ciStatus === "failing";
    if (filter === "approved") return pr.status === "open" && pr.ciStatus === "passing";
    return pr.status === "merged";
  });

  // Not connected yet — the setup state for freshly-created github channels.
  if (prs.length === 0) {
    return (
      <section className="flex h-full min-w-0 flex-1 flex-col bg-background">
        <header className="flex h-12 shrink-0 items-center gap-3 border-b border-border px-4">
          <ChannelGlyph type="github" size={16} />
          <h1 className="text-[15px] font-semibold text-text-primary">Pull Requests</h1>
        </header>
        <div className="flex flex-1 flex-col items-center justify-center gap-3 px-6">
          <span className="flex h-14 w-14 items-center justify-center rounded-2xl border border-border bg-surface-raised">
            <GitPullRequest size={24} className="text-text-muted" />
          </span>
          <p className="text-[15px] font-medium text-text-primary">Connect a repository</p>
          <p className="max-w-[42ch] text-center text-[13px] leading-relaxed text-text-muted">
            PRs, reviews, and CI status route into this channel once a repository is connected.
          </p>
          <button
            type="button"
            onClick={onConnect}
            className="mt-1 h-9 rounded-md bg-accent px-4 text-[13px] font-medium text-on-accent transition-colors hover:bg-accent-violet-bright"
          >
            Connect GitHub
          </button>
        </div>
      </section>
    );
  }

  return (
    <section className="flex h-full min-w-0 flex-1 flex-col bg-background">
      <header className="flex h-12 shrink-0 items-center gap-3 border-b border-border px-4">
        <ChannelGlyph type="github" size={16} />
        <h1 className="text-[15px] font-semibold text-text-primary">Pull Requests</h1>
      </header>

      {/* Filter row — same tab pattern as Board tabs */}
      <div className="flex shrink-0 items-center gap-1 overflow-x-auto border-b border-border px-4 py-2">
        {FILTERS.map((f) => (
          <button
            key={f.id}
            type="button"
            data-active={filter === f.id}
            onClick={() => setFilter(f.id)}
            className={cn(
              "h-7 shrink-0 rounded px-3 text-[13px] transition-colors",
              filter === f.id
                ? "bg-surface-overlay text-text-primary"
                : "text-text-secondary hover:bg-hover-row hover:text-text-primary"
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto">
        {visible.map((pr) => (
          <button
            key={pr.id}
            type="button"
            className="flex h-14 w-full items-center gap-3 border-b border-border px-4 text-left transition-colors hover:bg-hover-row"
          >
            <span className={cn("h-2 w-2 shrink-0 rounded-full", STATUS_DOT[pr.status])} />
            <div className="min-w-0 flex-1 leading-tight">
              <p className="truncate text-[14px] text-text-primary">{pr.title}</p>
              <p className="mt-0.5 truncate font-mono text-[11px] text-text-muted">
                {pr.repo} · #{pr.number} · {pr.author} · {pr.updatedAt}
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              {pr.ciStatus && <CIBadge status={pr.ciStatus} />}
              {!!pr.reviewCount && (
                <span className="font-mono text-[11px] text-text-muted">◎ {pr.reviewCount}</span>
              )}
            </div>
          </button>
        ))}
        {visible.length === 0 && (
          <p className="px-4 py-8 text-[13px] text-text-muted">No pull requests here.</p>
        )}
      </div>
    </section>
  );
}

export function CIBadge({ status }: { status: CIStatus }) {
  const tone: Record<CIStatus, string> = {
    passing: "text-success border-success/30",
    failing: "text-danger border-danger/30",
    pending: "text-warning border-warning/30",
  };
  return (
    <span
      className={cn(
        "flex h-5 items-center rounded-[3px] border px-2 font-mono text-[10px] uppercase tracking-[0.04em]",
        tone[status]
      )}
    >
      {status}
    </span>
  );
}

/**
 * Commit/PR events routed into a message channel — a typographic system line,
 * not a bot message with an avatar (brief §GitHub).
 */
export function GitHubEvent({ text, meta }: { text: string; meta: string }) {
  return (
    <div className="mx-4 my-0.5 rounded-r-sm border-l-2 border-border py-1 pl-8 pr-4 font-mono text-[12px] text-text-muted">
      <span className="text-text-faint">↗ github</span>
      {"  "}
      {text}
      {"  ·  "}
      {meta}
    </div>
  );
}
