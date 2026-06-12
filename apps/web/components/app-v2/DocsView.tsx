"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@corvus/ui";
import { ArrowLeft, MoreHorizontal, Search } from "lucide-react";
import { Avatar } from "@/components/ui";
import type { DocBlock, DocBlockType, DocContent } from "./types";

/**
 * Docs module (brief §Docs) — a focused, channel-linked knowledge layer.
 * Selecting a docs channel shows the document list; clicking a row opens the
 * editor (max-width 720 column, slash menu, minimal inline format bar).
 */
export function DocsView({ docs: initial }: { docs: DocContent[] }) {
  const [docs, setDocs] = useState(initial);
  const [openId, setOpenId] = useState<string | null>(null);
  const [query, setQuery] = useState("");

  const open = docs.find((d) => d.id === openId) ?? null;

  if (open) {
    return (
      <DocEditor
        doc={open}
        onBack={() => setOpenId(null)}
        onChange={(next) => setDocs((ds) => ds.map((d) => (d.id === next.id ? next : d)))}
      />
    );
  }

  const filtered = query
    ? docs.filter((d) => d.title.toLowerCase().includes(query.toLowerCase()))
    : docs;

  return (
    <section className="flex h-full min-w-0 flex-1 flex-col bg-background">
      <header className="flex h-12 shrink-0 items-center gap-3 border-b border-border px-4">
        <span aria-hidden className="font-mono text-[14px] leading-none text-text-muted">↗</span>
        <h1 className="text-[15px] font-semibold text-text-primary">Docs</h1>
      </header>

      <div className="p-4 pb-0">
        <div className="flex h-9 items-center gap-2 rounded-md border border-border bg-surface-raised px-3">
          <Search size={14} className="shrink-0 text-text-faint" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search docs"
            className="w-full bg-transparent text-[13px] text-text-primary outline-none placeholder:text-text-faint"
          />
        </div>
      </div>

      <div className="mt-2 flex-1 overflow-y-auto">
        {filtered.map((doc) => (
          <button
            key={doc.id}
            type="button"
            onClick={() => setOpenId(doc.id)}
            className="flex h-12 w-full items-center gap-3 border-b border-border px-4 text-left transition-colors hover:bg-hover-row"
          >
            <span aria-hidden className="font-mono text-[12px] text-text-muted">↗</span>
            <span className="min-w-0 flex-1 truncate text-[14px] text-text-primary">{doc.title}</span>
            <Avatar size={20} radius={4} src={doc.author.avatar} name={doc.author.name} />
            <span className="font-mono text-[11px] text-text-muted">{doc.editedLabel}</span>
          </button>
        ))}
        {filtered.length === 0 && (
          <p className="px-4 py-8 text-[13px] text-text-muted">No docs match “{query}”.</p>
        )}
      </div>
    </section>
  );
}

/* ── Editor ─────────────────────────────────────────────────────────── */

const SLASH_ITEMS: { glyph: string; label: string; hint: string; type: DocBlockType }[] = [
  { glyph: "—", label: "Text", hint: "Paragraph", type: "p" },
  { glyph: "#", label: "Heading 1", hint: "Large heading", type: "h1" },
  { glyph: "##", label: "Heading 2", hint: "Medium heading", type: "h2" },
  { glyph: "•", label: "Bullet list", hint: "Unordered list", type: "bullet" },
  { glyph: "1.", label: "Numbered", hint: "Ordered list", type: "numbered" },
  { glyph: "`", label: "Code block", hint: "Monospace code", type: "code" },
  { glyph: "“", label: "Blockquote", hint: "Indented quote", type: "quote" },
  { glyph: "!", label: "Callout", hint: "Highlighted note", type: "callout" },
  { glyph: "▦", label: "Card", hint: "Link a kanban card", type: "card" },
  { glyph: "/", label: "Divider", hint: "Horizontal rule", type: "divider" },
];

function DocEditor({
  doc,
  onBack,
  onChange,
}: {
  doc: DocContent;
  onBack: () => void;
  onChange: (doc: DocContent) => void;
}) {
  const [slashAt, setSlashAt] = useState<string | null>(null); // block id with open slash menu

  const setBlock = (id: string, patch: Partial<DocBlock>) =>
    onChange({ ...doc, blocks: doc.blocks.map((b) => (b.id === id ? { ...b, ...patch } : b)) });

  const addBlockAfter = (id: string) => {
    const idx = doc.blocks.findIndex((b) => b.id === id);
    const next: DocBlock = { id: `b${Date.now()}`, type: "p", text: "" };
    const blocks = [...doc.blocks];
    blocks.splice(idx + 1, 0, next);
    onChange({ ...doc, blocks });
    return next.id;
  };

  return (
    <section className="flex h-full min-w-0 flex-1 flex-col bg-background">
      <header className="flex h-12 shrink-0 items-center gap-3 border-b border-border px-4">
        <button
          type="button"
          aria-label="Back to docs"
          onClick={onBack}
          className="flex h-7 w-7 items-center justify-center rounded-sm text-text-faint transition-colors hover:bg-hover-row hover:text-text-primary"
        >
          <ArrowLeft size={16} />
        </button>
        <span className="truncate text-[14px] font-medium text-text-primary">{doc.title}</span>
        <div className="ml-auto flex items-center gap-1">
          <button
            type="button"
            className="flex h-7 items-center rounded-sm px-2.5 text-[13px] text-text-secondary transition-colors hover:bg-hover-row hover:text-text-primary"
          >
            Share
          </button>
          <button
            type="button"
            aria-label="More"
            className="flex h-7 w-7 items-center justify-center rounded-sm text-text-faint transition-colors hover:bg-hover-row hover:text-text-primary"
          >
            <MoreHorizontal size={16} />
          </button>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-[720px] px-6 py-12">
          <input
            value={doc.title}
            onChange={(e) => onChange({ ...doc, title: e.target.value })}
            placeholder="Untitled"
            className="w-full bg-transparent text-[32px] font-semibold leading-[1.2] tracking-[-0.02em] text-text-primary outline-none placeholder:text-text-faint"
          />
          <p className="mt-2 font-mono text-[11px] text-text-muted">
            {doc.author.name} · {doc.editedLabel}
          </p>
          <hr className="mt-6 border-border" />

          <div className="mt-6 flex flex-col gap-1">
            {doc.blocks.map((block) => (
              <Block
                key={block.id}
                block={block}
                slashOpen={slashAt === block.id}
                onText={(text) => {
                  setBlock(block.id, { text });
                  setSlashAt(text === "/" ? block.id : null);
                }}
                onPickSlash={(type) => {
                  setBlock(block.id, { type, text: "" });
                  setSlashAt(null);
                }}
                onEnter={() => addBlockAfter(block.id)}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function Block({
  block,
  slashOpen,
  onText,
  onPickSlash,
  onEnter,
}: {
  block: DocBlock;
  slashOpen: boolean;
  onText: (text: string) => void;
  onPickSlash: (type: DocBlockType) => void;
  onEnter: () => void;
}) {
  if (block.type === "divider") return <hr className="my-3 border-border" />;

  if (block.type === "card") {
    return (
      <span className="my-1 inline-flex items-center gap-2 self-start rounded-md border border-border bg-surface-raised px-3 py-1.5">
        <span aria-hidden className="font-mono text-[12px] text-text-muted">▦</span>
        <span className="font-mono text-[12px] text-text-secondary">{block.cardId ?? "CARD-000"}</span>
        <span className="text-[13px] text-text-primary">{block.text}</span>
      </span>
    );
  }

  if (block.type === "bullet" || block.type === "numbered") {
    return (
      <ul className="my-1 flex flex-col gap-1 pl-1">
        {(block.items ?? []).map((item, i) => (
          <li key={i} className="flex gap-2.5 text-[15px] leading-[1.65] text-text-secondary">
            <span className="shrink-0 font-mono text-[13px] text-text-muted">
              {block.type === "bullet" ? "•" : `${i + 1}.`}
            </span>
            {item}
          </li>
        ))}
      </ul>
    );
  }

  if (block.type === "code") {
    return (
      <pre className="my-2 overflow-x-auto rounded-md border border-border bg-surface-raised p-4 font-mono text-[13px] leading-[1.6] text-text-primary/90">
        <code>{block.text}</code>
      </pre>
    );
  }

  if (block.type === "quote") {
    return (
      <blockquote className="my-2 border-l-2 border-accent pl-4 text-[15px] leading-[1.65] text-text-secondary">
        {block.text}
      </blockquote>
    );
  }

  if (block.type === "callout") {
    return (
      <div className="my-2 rounded-md border border-accent/50 bg-accent/10 px-4 py-3 text-[14px] leading-[1.6] text-text-primary">
        {block.text}
      </div>
    );
  }

  const styles: Record<string, string> = {
    p: "text-[15px] leading-[1.7] text-text-secondary",
    h1: "mt-4 text-[24px] font-semibold leading-[1.3] text-text-primary",
    h2: "mt-3 text-[19px] font-semibold leading-[1.35] text-text-primary",
    h3: "mt-2 text-[16px] font-medium leading-[1.4] text-text-primary",
  };

  return (
    <div className="relative">
      <EditableText
        value={block.text ?? ""}
        className={cn("w-full bg-transparent outline-none", styles[block.type])}
        placeholder={block.type === "p" ? "Type “/” for blocks" : "Heading"}
        onChange={onText}
        onEnter={onEnter}
      />
      {slashOpen && <SlashMenu onPick={onPickSlash} />}
    </div>
  );
}

/** Auto-growing text input that behaves like a doc paragraph. */
function EditableText({
  value,
  className,
  placeholder,
  onChange,
  onEnter,
}: {
  value: string;
  className?: string;
  placeholder?: string;
  onChange: (v: string) => void;
  onEnter: () => void;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (el) {
      el.style.height = "0px";
      el.style.height = `${el.scrollHeight}px`;
    }
  }, [value]);
  return (
    <textarea
      ref={ref}
      rows={1}
      value={value}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
      onKeyDown={(e) => {
        if (e.key === "Enter" && !e.shiftKey) {
          e.preventDefault();
          onEnter();
        }
      }}
      className={cn("resize-none placeholder:text-text-faint", className)}
    />
  );
}

function SlashMenu({ onPick }: { onPick: (type: DocBlockType) => void }) {
  return (
    <div
      className="absolute left-0 top-full z-30 mt-1 min-w-[240px] rounded-[10px] border border-border bg-surface-overlay p-1"
      style={{ boxShadow: "0 8px 24px rgba(0,0,0,0.3)" }}
    >
      {SLASH_ITEMS.map((item) => (
        <button
          key={item.label}
          type="button"
          onClick={() => onPick(item.type)}
          className="flex h-9 w-full items-center gap-2.5 rounded-sm px-2.5 text-left transition-colors hover:bg-hover-row"
        >
          <span aria-hidden className="w-5 text-center font-mono text-[12px] text-text-muted">
            {item.glyph}
          </span>
          <span className="text-[13px] text-text-primary">{item.label}</span>
          <span className="ml-auto text-[11px] text-text-faint">{item.hint}</span>
        </button>
      ))}
    </div>
  );
}
