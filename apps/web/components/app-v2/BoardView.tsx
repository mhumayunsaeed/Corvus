"use client";

import { useMemo, useState } from "react";
import { cn } from "@corvus/ui";
import { Plus, X, SlidersHorizontal, Rows3 } from "lucide-react";
import { Avatar } from "@/components/ui";
import type { BoardCard, BoardColumn, BoardData, CardStatus } from "./types";

type BoardTab = "board" | "backlog" | "timeline" | "settings";

const TABS: { id: BoardTab; label: string }[] = [
  { id: "board", label: "Board" },
  { id: "backlog", label: "Backlog" },
  { id: "timeline", label: "Timeline" },
  { id: "settings", label: "Settings" },
];

const STATUS_OF_COLUMN: Record<string, CardStatus> = {
  "to do": "todo",
  "in progress": "in-progress",
  done: "done",
  cancelled: "cancelled",
};

const STATUSES: { id: CardStatus; label: string }[] = [
  { id: "todo", label: "To do" },
  { id: "in-progress", label: "In progress" },
  { id: "done", label: "Done" },
  { id: "cancelled", label: "Cancelled" },
];

/**
 * Kanban board view (brief §Boards). Lives in the main area when a board
 * channel is selected. Tabs follow the shared tab pattern; columns are
 * raised surfaces; cards are base surfaces with a single accent label chip —
 * no priority bars, no background colors, no emoji status.
 */
export function BoardView({ board: initial }: { board: BoardData }) {
  const [columns, setColumns] = useState<BoardColumn[]>(initial.columns);
  const [tab, setTab] = useState<BoardTab>("board");
  const [openCardId, setOpenCardId] = useState<string | null>(null);
  const [dragCardId, setDragCardId] = useState<string | null>(null);

  const allCards = useMemo(() => columns.flatMap((c) => c.cards), [columns]);
  const openCard = allCards.find((c) => c.id === openCardId) ?? null;
  const openCardColumn = columns.find((col) => col.cards.some((c) => c.id === openCardId));

  const moveCard = (cardId: string, toColumnId: string) => {
    setColumns((cols) => {
      const card = cols.flatMap((c) => c.cards).find((c) => c.id === cardId);
      if (!card) return cols;
      return cols.map((col) => {
        const without = col.cards.filter((c) => c.id !== cardId);
        if (col.id === toColumnId) return { ...col, cards: [...without, card] };
        return { ...col, cards: without };
      });
    });
  };

  const setCardStatus = (cardId: string, status: CardStatus) => {
    const target = columns.find((c) => STATUS_OF_COLUMN[c.title.toLowerCase()] === status);
    if (target) moveCard(cardId, target.id);
  };

  return (
    <section className="flex h-full min-w-0 flex-1 flex-col bg-background">
      {/* Board header — matches channel header height */}
      <header className="flex h-12 shrink-0 items-center gap-3 border-b border-border px-4">
        <span aria-hidden className="font-mono text-[14px] leading-none text-text-muted">▦</span>
        <h1 className="text-[15px] font-semibold text-text-primary">{initial.name}</h1>
        {initial.sprint && (
          <span className="font-mono text-[11px] uppercase tracking-[0.06em] text-text-muted">
            {initial.sprint}
          </span>
        )}
        <div className="ml-auto flex items-center gap-1">
          <HeaderAction label="Filter"><SlidersHorizontal size={16} /></HeaderAction>
          <HeaderAction label="Group by"><Rows3 size={16} /></HeaderAction>
          <button
            type="button"
            className="ml-1 flex h-8 items-center gap-1.5 rounded-md bg-accent px-3 text-[13px] font-medium text-on-accent transition-colors hover:bg-accent-violet-bright"
          >
            <Plus size={14} /> New card
          </button>
        </div>
      </header>

      {/* Tab row — same pattern as Home/Friends tabs */}
      <div className="flex shrink-0 items-center gap-1 border-b border-border px-4 py-2">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            data-active={tab === t.id}
            onClick={() => setTab(t.id)}
            className={cn(
              "h-7 rounded px-3 text-[13px] transition-colors",
              tab === t.id
                ? "bg-surface-overlay text-text-primary"
                : "text-text-secondary hover:bg-hover-row hover:text-text-primary"
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="flex min-h-0 flex-1">
        <div className="min-w-0 flex-1">
          {tab === "board" && (
            <div className="flex h-full gap-3 overflow-x-auto p-4">
              {columns.map((col) => (
                <Column
                  key={col.id}
                  column={col}
                  dragging={dragCardId != null}
                  onDragStartCard={setDragCardId}
                  onDragEndCard={() => setDragCardId(null)}
                  onDropCard={(columnId) => {
                    if (dragCardId) moveCard(dragCardId, columnId);
                    setDragCardId(null);
                  }}
                  onOpenCard={setOpenCardId}
                />
              ))}
              <button
                type="button"
                className="flex h-10 w-[272px] shrink-0 items-center justify-center gap-1.5 rounded-[10px] border border-dashed border-border text-[13px] text-text-muted transition-colors hover:border-border-active hover:text-text-secondary"
              >
                <Plus size={14} /> Add column
              </button>
            </div>
          )}

          {tab === "backlog" && (
            <div className="h-full overflow-y-auto">
              {allCards.map((card) => (
                <BacklogRow
                  key={card.id}
                  card={card}
                  column={columns.find((c) => c.cards.includes(card))?.title ?? ""}
                  onOpen={() => setOpenCardId(card.id)}
                />
              ))}
            </div>
          )}

          {tab === "timeline" && (
            <EmptyTab text="Timeline view groups cards by due date across the sprint." />
          )}
          {tab === "settings" && (
            <EmptyTab text="Board settings — columns, automation, and GitHub links." />
          )}
        </div>

        {openCard && (
          <CardDetail
            card={openCard}
            status={
              openCardColumn
                ? STATUS_OF_COLUMN[openCardColumn.title.toLowerCase()] ?? "todo"
                : "todo"
            }
            onSetStatus={(s) => setCardStatus(openCard.id, s)}
            onClose={() => setOpenCardId(null)}
          />
        )}
      </div>
    </section>
  );
}

function HeaderAction({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className="flex h-8 w-8 items-center justify-center rounded-sm text-text-faint transition-colors hover:bg-hover-row hover:text-text-primary"
    >
      {children}
    </button>
  );
}

function Column({
  column,
  dragging,
  onDragStartCard,
  onDragEndCard,
  onDropCard,
  onOpenCard,
}: {
  column: BoardColumn;
  dragging: boolean;
  onDragStartCard: (id: string) => void;
  onDragEndCard: () => void;
  onDropCard: (columnId: string) => void;
  onOpenCard: (id: string) => void;
}) {
  const [over, setOver] = useState(false);
  return (
    <div
      className={cn(
        "flex max-h-full w-[272px] shrink-0 flex-col rounded-[10px] border bg-surface-raised",
        over && dragging ? "border-border-active" : "border-border"
      )}
      onDragOver={(e) => {
        e.preventDefault();
        setOver(true);
      }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setOver(false);
        onDropCard(column.id);
      }}
    >
      <div className="flex h-10 shrink-0 items-center gap-2 border-b border-border px-3">
        <span className="flex-1 text-[13px] font-medium text-text-primary">{column.title}</span>
        <span className="rounded-[10px] bg-surface-overlay px-[7px] py-px font-mono text-[11px] text-text-muted">
          {column.cards.length}
        </span>
      </div>
      <div className="flex flex-1 flex-col gap-1 overflow-y-auto p-2">
        {column.cards.map((card) => (
          <Card
            key={card.id}
            card={card}
            onDragStart={() => onDragStartCard(card.id)}
            onDragEnd={onDragEndCard}
            onOpen={() => onOpenCard(card.id)}
          />
        ))}
      </div>
    </div>
  );
}

function Card({
  card,
  onDragStart,
  onDragEnd,
  onOpen,
}: {
  card: BoardCard;
  onDragStart: () => void;
  onDragEnd: () => void;
  onOpen: () => void;
}) {
  return (
    <div
      role="button"
      tabIndex={0}
      draggable
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onClick={onOpen}
      onKeyDown={(e) => e.key === "Enter" && onOpen()}
      className="flex cursor-grab flex-col gap-2 rounded-md border border-border bg-background px-3 py-2.5 transition-colors hover:border-border-active hover:bg-hover-row active:cursor-grabbing"
    >
      {card.label && <CardLabel label={card.label} />}
      <p className="text-[13px] leading-[1.45] text-text-primary">{card.title}</p>
      <CardMeta card={card} />
    </div>
  );
}

function CardLabel({ label }: { label: string }) {
  return (
    <span className="self-start rounded-[3px] border border-accent/50 px-[5px] py-px font-mono text-[10px] uppercase tracking-[0.08em] text-accent">
      {label}
    </span>
  );
}

function CardMeta({ card }: { card: BoardCard }) {
  if (!card.assignee && !card.dueDate && !card.linkedPR && !card.commentCount) return null;
  return (
    <div className="flex flex-wrap items-center gap-2">
      {card.assignee && <Avatar size={16} radius={3} src={card.assignee.avatar} name={card.assignee.name} />}
      {card.dueDate && (
        <span className={cn("font-mono text-[11px]", card.overdue ? "text-danger" : "text-text-muted")}>
          {card.dueDate}
        </span>
      )}
      {card.linkedPR && <span className="font-mono text-[11px] text-text-muted">↗ PR #{card.linkedPR}</span>}
      {!!card.commentCount && <span className="font-mono text-[11px] text-text-muted">◎ {card.commentCount}</span>}
    </div>
  );
}

function BacklogRow({
  card,
  column,
  onOpen,
}: {
  card: BoardCard;
  column: string;
  onOpen: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className="flex h-10 w-full items-center gap-3 border-b border-border px-3 text-left transition-colors hover:bg-hover-row"
    >
      <span className="w-[72px] shrink-0 font-mono text-[11px] text-text-muted">▦ {card.id}</span>
      <span className="min-w-0 flex-1 truncate text-[13px] text-text-primary">{card.title}</span>
      {card.label && <CardLabel label={card.label} />}
      <span className="hidden font-mono text-[11px] text-text-faint sm:block">{column}</span>
      {card.assignee && <Avatar size={16} radius={3} src={card.assignee.avatar} name={card.assignee.name} />}
      {card.dueDate && (
        <span className={cn("font-mono text-[11px]", card.overdue ? "text-danger" : "text-text-muted")}>
          {card.dueDate}
        </span>
      )}
      {card.linkedPR && <span className="font-mono text-[11px] text-text-muted">↗ #{card.linkedPR}</span>}
    </button>
  );
}

/** Slide-in card detail — same width/pattern as the Thread Panel. */
function CardDetail({
  card,
  status,
  onSetStatus,
  onClose,
}: {
  card: BoardCard;
  status: CardStatus;
  onSetStatus: (s: CardStatus) => void;
  onClose: () => void;
}) {
  return (
    <aside className="flex h-full w-[360px] shrink-0 flex-col overflow-y-auto border-l border-border bg-surface-raised">
      <div className="flex h-12 shrink-0 items-center justify-between border-b border-border px-4">
        <span className="font-mono text-[11px] uppercase tracking-[0.08em] text-text-muted">{card.id}</span>
        <button
          type="button"
          aria-label="Close card"
          onClick={onClose}
          className="flex h-7 w-7 items-center justify-center rounded-sm text-text-faint transition-colors hover:bg-hover-row hover:text-text-primary"
        >
          <X size={16} />
        </button>
      </div>

      <div className="flex flex-col gap-5 p-4">
        <h2 className="text-[18px] font-medium leading-[1.35] text-text-primary">{card.title}</h2>

        {/* Status — inline pill tabs */}
        <div className="flex flex-wrap gap-1.5">
          {STATUSES.map((s) => (
            <button
              key={s.id}
              type="button"
              data-active={status === s.id}
              onClick={() => onSetStatus(s.id)}
              className={cn(
                "h-6 rounded px-2.5 font-mono text-[11px] tracking-[0.04em] transition-colors",
                status === s.id
                  ? "border border-accent/50 bg-accent/10 text-accent"
                  : "border border-border text-text-secondary hover:border-border-active"
              )}
            >
              {s.label}
            </button>
          ))}
        </div>

        <DetailRow label="Assignee">
          {card.assignee ? (
            <span className="flex items-center gap-2">
              <Avatar size={20} radius={4} src={card.assignee.avatar} name={card.assignee.name} />
              <span className="text-[13px] text-text-primary">{card.assignee.name}</span>
            </span>
          ) : (
            <Unset>Unassigned</Unset>
          )}
        </DetailRow>

        <DetailRow label="Due date">
          {card.dueDate ? (
            <span className={cn("font-mono text-[12px]", card.overdue ? "text-danger" : "text-text-primary")}>
              {card.dueDate}
            </span>
          ) : (
            <Unset>No due date</Unset>
          )}
        </DetailRow>

        <DetailRow label="Labels">
          {card.label ? <CardLabel label={card.label} /> : <Unset>No labels</Unset>}
        </DetailRow>

        <DetailRow label="Linked PR">
          {card.linkedPR ? (
            <span className="flex items-center gap-2">
              <span className="font-mono text-[12px] text-text-primary">↗ PR #{card.linkedPR}</span>
              <span className="flex h-5 items-center rounded-[3px] border border-success/30 px-2 font-mono text-[10px] tracking-[0.04em] text-success">
                CI PASSING
              </span>
            </span>
          ) : (
            <Unset>Link a PR</Unset>
          )}
        </DetailRow>

        <hr className="border-border" />

        <div>
          <SectionLabel>Description</SectionLabel>
          <p className="mt-2 text-[13px] leading-[1.6] text-text-secondary">
            {card.description ?? "No description yet."}
          </p>
        </div>

        <hr className="border-border" />

        <div>
          <SectionLabel>Activity</SectionLabel>
          <p className="mt-2 text-[13px] text-text-muted">No comments yet.</p>
        </div>
      </div>
    </aside>
  );
}

function DetailRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3">
      <span className="w-[88px] shrink-0 font-mono text-[11px] uppercase tracking-[0.08em] text-text-muted">
        {label}
      </span>
      {children}
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="font-mono text-[11px] uppercase tracking-[0.08em] text-text-muted">{children}</p>
  );
}

function Unset({ children }: { children: React.ReactNode }) {
  return <span className="text-[13px] text-text-faint">{children}</span>;
}

function EmptyTab({ text }: { text: string }) {
  return (
    <div className="flex h-full items-center justify-center px-6">
      <p className="max-w-[40ch] text-center text-[14px] leading-[1.6] text-text-muted">{text}</p>
    </div>
  );
}
