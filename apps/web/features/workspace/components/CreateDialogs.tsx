"use client";

import { useEffect, useState } from "react";
import { cn } from "@corvus/ui";
import { X, Check } from "lucide-react";
import { Avatar, ChannelGlyph, type ChannelType } from "@/shared/components/ui";
import type { FriendEntry } from "./types";

/* ── Space templates ────────────────────────────────────────────────── */

export interface SpaceTemplate {
  id: string;
  name: string;
  description: string;
  blueprint: { section: string; channels: { name: string; type: ChannelType }[] }[];
}

export const SPACE_TEMPLATES: SpaceTemplate[] = [
  {
    id: "blank",
    name: "Start from scratch",
    description: "One #general channel — add everything else as you go.",
    blueprint: [{ section: "General", channels: [{ name: "general", type: "text" }] }],
  },
  {
    id: "friends",
    name: "Friends & community",
    description: "Chat, a voice lounge, announcements and a stage for events.",
    blueprint: [
      {
        section: "General",
        channels: [
          { name: "general", type: "text" },
          { name: "introductions", type: "text" },
          { name: "lounge", type: "voice" },
        ],
      },
      {
        section: "Events",
        channels: [
          { name: "announcements", type: "announcement" },
          { name: "town-hall", type: "stage" },
        ],
      },
    ],
  },
  {
    id: "project",
    name: "Project team",
    description: "Plan and ship — kanban board, docs, whiteboard and a PR feed.",
    blueprint: [
      {
        section: "Plan",
        channels: [
          { name: "general", type: "text" },
          { name: "roadmap", type: "board" },
          { name: "docs", type: "docs" },
        ],
      },
      {
        section: "Build",
        channels: [
          { name: "pull-requests", type: "github" },
          { name: "whiteboard", type: "canvas" },
        ],
      },
    ],
  },
  {
    id: "engineering",
    name: "Engineering org",
    description: "Everything Corvus offers: voice, kanban, docs, GitHub, incidents.",
    blueprint: [
      {
        section: "General",
        channels: [
          { name: "general", type: "text" },
          { name: "dev", type: "text" },
          { name: "standup", type: "voice" },
        ],
      },
      {
        section: "Delivery",
        channels: [
          { name: "sprint-board", type: "board" },
          { name: "specs", type: "docs" },
          { name: "pull-requests", type: "github" },
        ],
      },
      {
        section: "Ops",
        channels: [
          { name: "incidents", type: "incident" },
          { name: "war-room", type: "canvas" },
        ],
      },
    ],
  },
];

export const CHANNEL_TYPES: { type: ChannelType; label: string; description: string }[] = [
  { type: "text", label: "Text", description: "Messages, threads, files" },
  { type: "voice", label: "Voice", description: "Live voice and video" },
  { type: "stage", label: "Stage", description: "Speakers + audience" },
  { type: "announcement", label: "Announcement", description: "One-way broadcasts" },
  { type: "board", label: "Kanban board", description: "Cards, columns, sprints" },
  { type: "docs", label: "Docs", description: "Long-form documents" },
  { type: "canvas", label: "Canvas", description: "Shared whiteboard" },
  { type: "github", label: "GitHub", description: "PR and commit feed" },
  { type: "incident", label: "Incident", description: "Sev tracking, timeline" },
];

/* ── Shared dialog scaffold ─────────────────────────────────────────── */

function DialogShell({
  title,
  onClose,
  children,
  width = 480,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  width?: number;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      className="absolute inset-0 z-[180] flex items-center justify-center bg-black/50 p-6"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="flex w-full flex-col overflow-hidden rounded-[12px] border border-border bg-surface-overlay"
        style={{ maxWidth: width, boxShadow: "0 16px 48px rgba(0,0,0,0.5)" }}
      >
        <header className="flex h-12 shrink-0 items-center justify-between border-b border-border px-4">
          <h2 className="text-[15px] font-semibold text-text-primary">{title}</h2>
          <button
            type="button"
            aria-label="Close"
            onClick={onClose}
            className="flex h-7 w-7 items-center justify-center rounded-sm text-text-faint transition-colors hover:bg-hover-row hover:text-text-primary"
          >
            <X size={16} />
          </button>
        </header>
        <div className="max-h-[70vh] overflow-y-auto p-5">{children}</div>
      </div>
    </div>
  );
}

const inputClass =
  "h-10 w-full rounded-md border border-border bg-surface-input px-3 text-[14px] text-text-primary outline-none transition-colors placeholder:text-text-faint focus:border-border-active";

function PrimaryButton({
  disabled,
  onClick,
  children,
}: {
  disabled?: boolean;
  onClick?: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "mt-5 flex h-10 w-full items-center justify-center rounded-md text-[14px] font-medium transition-colors",
        disabled
          ? "cursor-not-allowed bg-surface-raised text-text-faint"
          : "bg-accent text-on-accent hover:bg-accent-violet-bright"
      )}
    >
      {children}
    </button>
  );
}

/* ── Create space ───────────────────────────────────────────────────── */

export function CreateSpaceDialog({
  onCreate,
  onClose,
}: {
  onCreate: (name: string, template: SpaceTemplate) => void;
  onClose: () => void;
}) {
  const [name, setName] = useState("");
  const [templateId, setTemplateId] = useState("blank");
  const template = SPACE_TEMPLATES.find((t) => t.id === templateId) ?? SPACE_TEMPLATES[0];

  return (
    <DialogShell title="Create a space" onClose={onClose} width={520}>
      <p className="mb-1.5 font-mono text-[12px] uppercase tracking-[0.08em] text-text-secondary">
        Space name
      </p>
      <input
        autoFocus
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="e.g. weekend-project"
        className={inputClass}
      />

      <p className="mb-1.5 mt-5 font-mono text-[12px] uppercase tracking-[0.08em] text-text-secondary">
        Template
      </p>
      <div className="flex flex-col gap-2">
        {SPACE_TEMPLATES.map((t) => (
          <button
            key={t.id}
            type="button"
            aria-pressed={t.id === templateId}
            onClick={() => setTemplateId(t.id)}
            className={cn(
              "rounded-[10px] border px-4 py-3 text-left transition-colors",
              t.id === templateId
                ? "border-accent bg-accent-soft"
                : "border-border bg-surface-raised hover:border-border-active"
            )}
          >
            <span className="block text-[14px] font-medium text-text-primary">{t.name}</span>
            <span className="mt-0.5 block text-[12px] leading-relaxed text-text-muted">
              {t.description}
            </span>
            <span className="mt-2 flex flex-wrap items-center gap-x-2.5 gap-y-1">
              {t.blueprint
                .flatMap((b) => b.channels)
                .map((c, i) => (
                  <span key={i} className="flex items-center gap-1 font-mono text-[11px] text-text-secondary">
                    <ChannelGlyph type={c.type} size={11} />
                    {c.name}
                  </span>
                ))}
            </span>
          </button>
        ))}
      </div>

      <PrimaryButton disabled={!name.trim()} onClick={() => onCreate(name.trim(), template)}>
        Create space
      </PrimaryButton>
      <p className="mt-2 text-center text-[12px] text-text-muted">
        You can add channels and sections any time after creating.
      </p>
    </DialogShell>
  );
}

/* ── Add channel ────────────────────────────────────────────────────── */

export function AddChannelDialog({
  sectionName,
  onCreate,
  onClose,
}: {
  sectionName: string;
  onCreate: (name: string, type: ChannelType) => void;
  onClose: () => void;
}) {
  const [name, setName] = useState("");
  const [type, setType] = useState<ChannelType>("text");

  return (
    <DialogShell title={`Add a channel to ${sectionName}`} onClose={onClose} width={520}>
      <p className="mb-1.5 font-mono text-[12px] uppercase tracking-[0.08em] text-text-secondary">
        Channel name
      </p>
      <input
        autoFocus
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="e.g. design-reviews"
        className={inputClass}
      />

      <p className="mb-1.5 mt-5 font-mono text-[12px] uppercase tracking-[0.08em] text-text-secondary">
        Channel type
      </p>
      <div className="grid grid-cols-3 gap-2">
        {CHANNEL_TYPES.map((t) => (
          <button
            key={t.type}
            type="button"
            aria-pressed={t.type === type}
            onClick={() => setType(t.type)}
            className={cn(
              "flex flex-col items-start gap-1 rounded-[10px] border px-3 py-2.5 text-left transition-colors",
              t.type === type
                ? "border-accent bg-accent-soft"
                : "border-border bg-surface-raised hover:border-border-active"
            )}
          >
            <span className="flex items-center gap-1.5 text-[13px] font-medium text-text-primary">
              <ChannelGlyph type={t.type} size={13} />
              {t.label}
            </span>
            <span className="text-[11px] leading-snug text-text-muted">{t.description}</span>
          </button>
        ))}
      </div>

      <PrimaryButton disabled={!name.trim()} onClick={() => onCreate(name.trim(), type)}>
        Create channel
      </PrimaryButton>
    </DialogShell>
  );
}

/* ── Add section ────────────────────────────────────────────────────── */

export function AddSectionDialog({
  onCreate,
  onClose,
}: {
  onCreate: (name: string) => void;
  onClose: () => void;
}) {
  const [name, setName] = useState("");
  return (
    <DialogShell title="Add a section" onClose={onClose} width={420}>
      <p className="mb-1.5 font-mono text-[12px] uppercase tracking-[0.08em] text-text-secondary">
        Section name
      </p>
      <input
        autoFocus
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="e.g. Design"
        className={inputClass}
      />
      <PrimaryButton disabled={!name.trim()} onClick={() => onCreate(name.trim())}>
        Add section
      </PrimaryButton>
    </DialogShell>
  );
}

/* ── New DM / group DM ──────────────────────────────────────────────── */

export function NewGroupDialog({
  friends,
  onCreate,
  onClose,
}: {
  friends: FriendEntry[];
  onCreate: (members: FriendEntry[], name?: string) => void;
  onClose: () => void;
}) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [name, setName] = useState("");
  const accepted = friends.filter((f) => !f.pending);

  const toggle = (id: string) =>
    setSelected((s) => {
      const next = new Set(s);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  return (
    <DialogShell title="New conversation" onClose={onClose} width={440}>
      <p className="text-[13px] leading-relaxed text-text-secondary">
        Pick one friend to start a DM, or several for a group.
      </p>

      <div className="mt-3 flex max-h-[280px] flex-col overflow-y-auto rounded-[10px] border border-border">
        {accepted.map((f) => {
          const on = selected.has(f.id);
          return (
            <button
              key={f.id}
              type="button"
              aria-pressed={on}
              onClick={() => toggle(f.id)}
              className={cn(
                "flex h-11 items-center gap-3 border-b border-border px-3 text-left transition-colors last:border-b-0",
                on ? "bg-accent-soft" : "hover:bg-hover-row"
              )}
            >
              <Avatar src={f.avatar} name={f.name} size={26} radius={6} />
              <span className="min-w-0 flex-1 truncate text-[14px] text-text-primary">{f.name}</span>
              <span
                className={cn(
                  "flex h-5 w-5 items-center justify-center rounded-[6px] border transition-colors",
                  on ? "border-accent bg-accent text-on-accent" : "border-border"
                )}
              >
                {on && <Check size={13} />}
              </span>
            </button>
          );
        })}
        {accepted.length === 0 && (
          <p className="px-3 py-6 text-[13px] text-text-muted">
            No friends yet — add some from Home → Friends.
          </p>
        )}
      </div>

      {selected.size > 1 && (
        <>
          <p className="mb-1.5 mt-4 font-mono text-[12px] uppercase tracking-[0.08em] text-text-secondary">
            Group name <span className="normal-case text-text-faint">(optional)</span>
          </p>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. weekend crew"
            className={inputClass}
          />
        </>
      )}

      <PrimaryButton
        disabled={selected.size === 0}
        onClick={() =>
          onCreate(
            accepted.filter((f) => selected.has(f.id)),
            name.trim() || undefined
          )
        }
      >
        {selected.size > 1 ? `Create group (${selected.size})` : "Start conversation"}
      </PrimaryButton>
    </DialogShell>
  );
}
