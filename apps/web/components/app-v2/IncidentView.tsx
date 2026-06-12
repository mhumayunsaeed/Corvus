"use client";

import { useState } from "react";
import { cn } from "@corvus/ui";
import { PanelRight } from "lucide-react";
import { Avatar } from "@/components/ui";
import type { ChatMessage, IncidentMeta, IncidentStatus } from "./types";
import { Composer } from "./Composer";
import { MessageFeed } from "./MessageFeed";

const STATUS_TONE: Record<IncidentStatus, string> = {
  active: "text-danger border-danger",
  monitoring: "text-warning border-warning",
  resolved: "text-success border-success",
};

/**
 * Incident channel (brief §Incidents) — a structured channel type for
 * engineering incidents. Replaces the standard channel header and uses the
 * Thread Panel slot for the incident sidebar.
 */
export function IncidentView({
  channelName,
  incident,
  messages,
}: {
  channelName: string;
  incident: IncidentMeta;
  messages: ChatMessage[];
}) {
  const [showSidebar, setShowSidebar] = useState(true);

  return (
    <>
      <section className="flex h-full min-w-0 flex-1 flex-col bg-background">
        {/* Incident header — replaces the standard channel header */}
        <header className="flex h-12 shrink-0 items-center gap-3 border-b border-border px-4">
          <span aria-hidden className="font-mono text-[14px] leading-none text-danger">!</span>
          <h1 className="text-[15px] font-semibold text-danger">{channelName}</h1>
          <StatusPill status={incident.status} />
          <span className="font-mono text-[11px] uppercase tracking-[0.06em] text-text-muted">
            {incident.severity}
          </span>
          <span className="font-mono text-[11px] text-text-muted">{incident.duration}</span>
          <div className="ml-auto flex items-center gap-2">
            {incident.status !== "resolved" && (
              <button
                type="button"
                className="flex h-7 items-center rounded-md border border-success/40 px-3 text-[13px] font-medium text-success transition-colors hover:bg-success/10"
              >
                Resolve
              </button>
            )}
            <button
              type="button"
              aria-label="Toggle incident sidebar"
              onClick={() => setShowSidebar((v) => !v)}
              className="flex h-8 w-8 items-center justify-center rounded-sm text-text-faint transition-colors hover:bg-hover-row hover:text-text-primary"
            >
              <PanelRight size={16} />
            </button>
          </div>
        </header>

        <div className="flex flex-1 flex-col overflow-y-auto py-4">
          {/* Auto-generated timeline entries as system lines */}
          {incident.timeline.slice(0, 2).map((entry, i) => (
            <TimelineLine key={i} at={entry.at} text={entry.text} active={incident.status === "active"} />
          ))}
          <MessageFeed messages={messages} />
        </div>

        <Composer channelName={channelName} />
      </section>

      {showSidebar && <IncidentSidebar incident={incident} onClose={() => setShowSidebar(false)} />}
    </>
  );
}

function StatusPill({ status }: { status: IncidentStatus }) {
  return (
    <span
      data-status={status}
      className={cn(
        "flex h-5 items-center rounded-[3px] border px-2 font-mono text-[10px] uppercase tracking-[0.06em]",
        STATUS_TONE[status]
      )}
    >
      {status}
    </span>
  );
}

/** System line in the feed — github-event styling with an error border while active. */
function TimelineLine({ at, text, active }: { at: string; text: string; active: boolean }) {
  return (
    <div
      className={cn(
        "mx-4 my-0.5 rounded-r-sm border-l-2 py-1 pl-8 pr-4 font-mono text-[12px] text-text-muted",
        active ? "border-danger/60" : "border-border"
      )}
    >
      {text}
      {"  ·  "}
      <span className="text-text-faint">{at}</span>
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3">
      <span className="w-[88px] shrink-0 font-mono text-[11px] uppercase tracking-[0.08em] text-text-muted">
        {label}
      </span>
      {children}
    </div>
  );
}

function IncidentSidebar({ incident, onClose }: { incident: IncidentMeta; onClose: () => void }) {
  return (
    <aside className="flex h-full w-[360px] shrink-0 flex-col overflow-y-auto border-l border-border bg-surface-raised">
      <div className="flex h-12 shrink-0 items-center justify-between border-b border-border px-4">
        <span className="font-mono text-[11px] uppercase tracking-[0.08em] text-text-muted">Incident</span>
        <button
          type="button"
          onClick={onClose}
          className="text-[12px] text-text-faint transition-colors hover:text-text-primary"
        >
          Close
        </button>
      </div>

      <div className="flex flex-col gap-5 p-4">
        <Row label="Status">
          <StatusPill status={incident.status} />
        </Row>
        <Row label="Severity">
          <span className="font-mono text-[12px] text-text-primary">{incident.severity}</span>
        </Row>
        <Row label="Commander">
          {incident.commander ? (
            <span className="flex items-center gap-2">
              <Avatar size={20} radius={4} src={incident.commander.avatar} name={incident.commander.name} />
              <span className="text-[13px] text-text-primary">{incident.commander.name}</span>
            </span>
          ) : (
            <span className="text-[13px] text-text-faint">Unassigned</span>
          )}
        </Row>
        <Row label="Affected">
          <span className="flex flex-wrap gap-1.5">
            {incident.services.map((s) => (
              <span
                key={s}
                className="rounded-[3px] border border-border px-[5px] py-px font-mono text-[10px] uppercase tracking-[0.06em] text-text-secondary"
              >
                {s}
              </span>
            ))}
          </span>
        </Row>

        <hr className="border-border" />

        <div>
          <p className="font-mono text-[11px] uppercase tracking-[0.08em] text-text-muted">Timeline</p>
          <div className="mt-3 flex flex-col gap-2.5">
            {incident.timeline.map((entry, i) => (
              <div key={i} className="flex gap-3">
                <span className="shrink-0 font-mono text-[11px] text-text-faint">{entry.at}</span>
                <span className="text-[12px] leading-[1.5] text-text-secondary">{entry.text}</span>
              </div>
            ))}
          </div>
        </div>

        <hr className="border-border" />

        <div>
          <p className="font-mono text-[11px] uppercase tracking-[0.08em] text-text-muted">Postmortem</p>
          <p className="mt-2 text-[13px] text-text-muted">
            {incident.status === "resolved"
              ? "↗ Postmortem doc created."
              : "A postmortem doc is created automatically on resolve."}
          </p>
        </div>
      </div>
    </aside>
  );
}
