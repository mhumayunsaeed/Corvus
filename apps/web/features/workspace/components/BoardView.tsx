"use client";

import { useMemo, useState } from "react";
import { cn } from "@corvus/ui";
import { Plus, X, SlidersHorizontal, Rows3, Trash2 } from "lucide-react";
import { Avatar, ChannelGlyph } from "@/shared/components/ui";
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
  todo: "todo",
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
export function BoardView({
  board: initial,
  onChange,
}: {
  board: BoardData;
  /** Persist board edits — cards, columns, renames. */
  onChange?: (board: BoardData) => void;
}) {
  const [name, setName] = useState(initial.name);
  const [columns, setColumns] = useState<BoardColumn[]>(initial.columns);
  const [tab, setTab] = useState<BoardTab>("board");
  const [openCardId, setOpenCardId] = useState<string | null>(null);
  const [dragCardId, setDragCardId] = useState<string | null>(null);
  const [composerCol, setComposerCol] = useState<string | null>(null);
  const [addingColumn, setAddingColumn] = useState(false);

  const allCards = useMemo(() => columns.flatMap((c) => c.cards), [columns]);
  const openCard = allCards.find((c) => c.id === openCardId) ?? null;
  const openCardColumn = columns.find((col) => col.cards.some((c) => c.id === openCardId));

  const commit = (nextColumns: BoardColumn[], nextName = name) => {
    setColumns(nextColumns);
    onChange?.({ ...initial, name: nextName, columns: nextColumns });
  };

  const moveCard = (cardId: string, toColumnId: string) => {
    const card = columns.flatMap((c) => c.cards).find((c) => c.id === cardId);
    if (!card) return;
    commit(
      columns.map((col) => {
        const without = col.cards.filter((c) => c.id !== cardId);
        if (col.id === toColumnId) return { ...col, cards: [...without, card] };
        return { ...col, cards: without };
      })
    );
  };

  const setCardStatus = (cardId: string, status: CardStatus) => {
    const target = columns.find((c) => STATUS_OF_COLUMN[c.title.toLowerCase()] === status);
    if (target) moveCard(cardId, target.id);
  };

  const nextCardId = () => {
    const nums = allCards
      .map((c) => Number(c.id.replace(/\D/g, "")))
      .filter((n) => Number.isFinite(n));
    const n = (nums.length ? Math.max(...nums) : 0) + 1;
    return `CARD-${String(n).padStart(3, "0")}`;
  };

  const addCard = (columnId: string, title: string) => {
    commit(
      columns.map((col) =>
        col.id === columnId ? { ...col, cards: [...col.cards, { id: nextCardId(), title }] } : col
      )
    );
  };

  const updateCard = (cardId: string, patch: Partial<BoardCard>) =>
    commit(
      columns.map((col) => ({
        ...col,
        cards: col.cards.map((c) => (c.id === cardId ? { ...c, ...patch } : c)),
      }))
    );

  const deleteCard = (cardId: string) => {
    setOpenCardId(null);
    commit(columns.map((col) => ({ ...col, cards: col.cards.filter((c) => c.id !== cardId) })));
  };

  const addColumn = (title: string) =>
    commit([...columns, { id: `col${Date.now()}`, title, cards: [] }]);

  const renameColumn = (id: string, title: string) =>
    commit(columns.map((col) => (col.id === id ? { ...col, title } : col)));

  // Deleting a column moves its cards to the first remaining column.
  const deleteColumn = (id: string) => {
    const col = columns.find((c) => c.id === id);
    const rest = columns.filter((c) => c.id !== id);
    if (!col || rest.length === 0) return;
    commit(rest.map((c, i) => (i === 0 ? { ...c, cards: [...c.cards, ...col.cards] } : c)));
  };

  return (
    <section className="flex h-full min-w-0 flex-1 flex-col bg-background">
      {/* Board header — matches channel header height */}
      <header className="flex h-12 shrink-0 items-center gap-3 border-b border-border px-4">
        <ChannelGlyph type="board" size={16} />
        <h1 className="text-[15px] font-semibold text-text-primary">{name}</h1>
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
            onClick={() => {
              setTab("board");
              if (columns[0]) setComposerCol(columns[0].id);
            }}
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
                  composerOpen={composerCol === col.id}
                  onOpenComposer={() => setComposerCol(col.id)}
                  onCloseComposer={() => setComposerCol(null)}
                  onAddCard={(title) => addCard(col.id, title)}
                  onDragStartCard={setDragCardId}
                  onDragEndCard={() => setDragCardId(null)}
                  onDropCard={(columnId) => {
                    if (dragCardId) moveCard(dragCardId, columnId);
                    setDragCardId(null);
                  }}
                  onOpenCard={setOpenCardId}
                />
              ))}
              {addingColumn ? (
                <NewColumnInput
                  onCreate={(title) => {
                    addColumn(title);
                    setAddingColumn(false);
                  }}
                  onCancel={() => setAddingColumn(false)}
                />
              ) : (
                <button
                  type="button"
                  onClick={() => setAddingColumn(true)}
                  className="flex h-10 w-[272px] shrink-0 items-center justify-center gap-1.5 rounded-[10px] border border-dashed border-border text-[13px] text-text-muted transition-colors hover:border-border-active hover:text-text-secondary"
                >
                  <Plus size={14} /> Add column
                </button>
              )}
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

          {tab === "timeline" && <TimelineTab cards={allCards} onOpen={setOpenCardId} />}
          {tab === "settings" && (
            <BoardSettings
              name={name}
              columns={columns}
              onRename={(n) => {
                setName(n);
                onChange?.({ ...initial, name: n, columns });
              }}
              onRenameColumn={renameColumn}
              onDeleteColumn={deleteColumn}
            />
          )}
        </div>

        {openCard && (
          <CardDetail
            key={openCard.id}
            card={openCard}
            status={
              openCardColumn
                ? STATUS_OF_COLUMN[openCardColumn.title.toLowerCase()] ?? "todo"
                : "todo"
            }
            onSetStatus={(s) => setCardStatus(openCard.id, s)}
            onUpdate={(patch) => updateCard(openCard.id, patch)}
            onDelete={() => deleteCard(openCard.id)}
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
  composerOpen,
  onOpenComposer,
  onCloseComposer,
  onAddCard,
  onDragStartCard,
  onDragEndCard,
  onDropCard,
  onOpenCard,
}: {
  column: BoardColumn;
  dragging: boolean;
  composerOpen: boolean;
  onOpenComposer: () => void;
  onCloseComposer: () => void;
  onAddCard: (title: string) => void;
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
        {composerOpen ? (
          <CardComposer onAdd={onAddCard} onClose={onCloseComposer} />
        ) : (
          <button
            type="button"
            onClick={onOpenComposer}
            className="flex h-8 items-center gap-1.5 rounded-md px-2 text-[12px] text-text-faint transition-colors hover:bg-hover-row hover:text-text-secondary"
          >
            <Plus size={13} /> Add card
          </button>
        )}
      </div>
    </div>
  );
}

/** Inline card composer at the bottom of a column. */
function CardComposer({ onAdd, onClose }: { onAdd: (title: string) => void; onClose: () => void }) {
  const [title, setTitle] = useState("");
  const submit = () => {
    if (title.trim()) onAdd(title.trim());
    setTitle("");
    onClose();
  };
  return (
    <div className="rounded-md border border-border-active bg-background p-2">
      <textarea
        autoFocus
        rows={2}
        value={title}
        placeholder="Card title…"
        onChange={(e) => setTitle(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            submit();
          }
          if (e.key === "Escape") onClose();
        }}
        className="w-full resize-none bg-transparent text-[13px] leading-[1.45] text-text-primary outline-none placeholder:text-text-faint"
      />
      <div className="mt-1 flex items-center gap-2">
        <button
          type="button"
          disabled={!title.trim()}
          onClick={submit}
          className={cn(
            "h-7 rounded-md px-2.5 text-[12px] font-medium transition-colors",
            title.trim()
              ? "bg-accent text-on-accent hover:bg-accent-violet-bright"
              : "cursor-not-allowed bg-surface-overlay text-text-faint"
          )}
        >
          Add card
        </button>
        <button
          type="button"
          onClick={onClose}
          className="h-7 rounded-md px-2 text-[12px] text-text-secondary transition-colors hover:bg-hover-row"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

/** Inline name input where the Add-column button was. */
function NewColumnInput({
  onCreate,
  onCancel,
}: {
  onCreate: (title: string) => void;
  onCancel: () => void;
}) {
  const [title, setTitle] = useState("");
  return (
    <div className="h-10 w-[272px] shrink-0 rounded-[10px] border border-border-active bg-surface-raised px-3">
      <input
        autoFocus
        value={title}
        placeholder="Column name — enter to add"
        onChange={(e) => setTitle(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && title.trim()) onCreate(title.trim());
          if (e.key === "Escape") onCancel();
        }}
        onBlur={onCancel}
        className="h-full w-full bg-transparent text-[13px] text-text-primary outline-none placeholder:text-text-faint"
      />
    </div>
  );
}

/** Timeline — cards grouped by due date; undated cards land last. */
function TimelineTab({ cards, onOpen }: { cards: BoardCard[]; onOpen: (id: string) => void }) {
  const groups = new Map<string, BoardCard[]>();
  for (const card of cards) {
    const key = card.dueDate ?? "Unscheduled";
    groups.set(key, [...(groups.get(key) ?? []), card]);
  }
  const keys = [...groups.keys()].sort((a, b) => {
    if (a === "Unscheduled") return 1;
    if (b === "Unscheduled") return -1;
    return (Date.parse(`${a} ${new Date().getFullYear()}`) || 0) - (Date.parse(`${b} ${new Date().getFullYear()}`) || 0);
  });

  if (cards.length === 0) {
    return <EmptyTab text="No cards yet — add some from the Board tab to see them on the timeline." />;
  }

  return (
    <div className="h-full overflow-y-auto p-4">
      {keys.map((key) => (
        <div key={key} className="mb-5">
          <p className="font-mono text-[11px] uppercase tracking-[0.08em] text-text-muted">
            {key} — {groups.get(key)!.length}
          </p>
          <div className="mt-1.5 flex flex-col">
            {groups.get(key)!.map((card) => (
              <button
                key={card.id}
                type="button"
                onClick={() => onOpen(card.id)}
                className="flex h-9 items-center gap-3 border-b border-border px-2 text-left transition-colors last:border-b-0 hover:bg-hover-row"
              >
                <span className="w-[72px] shrink-0 font-mono text-[11px] text-text-muted">{card.id}</span>
                <span className="min-w-0 flex-1 truncate text-[13px] text-text-primary">{card.title}</span>
                {card.label && <CardLabel label={card.label} />}
                {card.assignee && (
                  <Avatar size={16} radius={3} src={card.assignee.avatar} name={card.assignee.name} />
                )}
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

/** Board settings — rename the board, manage columns. */
function BoardSettings({
  name,
  columns,
  onRename,
  onRenameColumn,
  onDeleteColumn,
}: {
  name: string;
  columns: BoardColumn[];
  onRename: (name: string) => void;
  onRenameColumn: (id: string, title: string) => void;
  onDeleteColumn: (id: string) => void;
}) {
  const [draft, setDraft] = useState(name);
  return (
    <div className="mx-auto max-w-[560px] px-6 py-8">
      <p className="font-mono text-[11px] uppercase tracking-[0.08em] text-text-muted">Board name</p>
      <input
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={() => draft.trim() && draft.trim() !== name && onRename(draft.trim())}
        onKeyDown={(e) => {
          if (e.key === "Enter" && draft.trim()) onRename(draft.trim());
        }}
        className="mt-1.5 h-10 w-full rounded-md border border-border bg-surface-input px-3 text-[14px] text-text-primary outline-none transition-colors focus:border-border-active"
      />

      <p className="mt-7 font-mono text-[11px] uppercase tracking-[0.08em] text-text-muted">
        Columns — {columns.length}
      </p>
      <div className="mt-1.5 flex flex-col">
        {columns.map((col) => (
          <ColumnSettingsRow
            key={col.id}
            column={col}
            canDelete={columns.length > 1}
            onRename={(title) => onRenameColumn(col.id, title)}
            onDelete={() => onDeleteColumn(col.id)}
          />
        ))}
      </div>
      <p className="mt-2 text-[12px] text-text-muted">
        Deleting a column moves its cards into the first remaining column.
      </p>
    </div>
  );
}

function ColumnSettingsRow({
  column,
  canDelete,
  onRename,
  onDelete,
}: {
  column: BoardColumn;
  canDelete: boolean;
  onRename: (title: string) => void;
  onDelete: () => void;
}) {
  const [draft, setDraft] = useState(column.title);
  return (
    <div className="group flex h-11 items-center gap-3 border-b border-border px-1 last:border-b-0">
      <input
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={() => draft.trim() && draft.trim() !== column.title && onRename(draft.trim())}
        onKeyDown={(e) => {
          if (e.key === "Enter" && draft.trim()) onRename(draft.trim());
        }}
        className="h-8 min-w-0 flex-1 rounded-sm bg-transparent px-2 text-[14px] text-text-primary outline-none transition-colors hover:bg-hover-row focus:bg-surface-raised"
      />
      <span className="font-mono text-[11px] text-text-muted">{column.cards.length} cards</span>
      {canDelete && (
        <button
          type="button"
          aria-label={`Delete ${column.title}`}
          onClick={onDelete}
          className="hidden h-7 w-7 items-center justify-center rounded-sm text-danger transition-colors hover:bg-danger/10 group-hover:flex"
        >
          <Trash2 size={14} />
        </button>
      )}
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
  onUpdate,
  onDelete,
  onClose,
}: {
  card: BoardCard;
  status: CardStatus;
  onSetStatus: (s: CardStatus) => void;
  onUpdate?: (patch: Partial<BoardCard>) => void;
  onDelete?: () => void;
  onClose: () => void;
}) {
  const [desc, setDesc] = useState(card.description ?? "");
  return (
    <aside className="flex h-full w-[360px] shrink-0 flex-col overflow-y-auto border-l border-border bg-surface-raised">
      <div className="flex h-12 shrink-0 items-center justify-between border-b border-border px-4">
        <span className="font-mono text-[11px] uppercase tracking-[0.08em] text-text-muted">{card.id}</span>
        <div className="flex items-center gap-0.5">
          {onDelete && (
            <button
              type="button"
              aria-label="Delete card"
              title="Delete card"
              onClick={onDelete}
              className="flex h-7 w-7 items-center justify-center rounded-sm text-text-faint transition-colors hover:bg-danger/10 hover:text-danger"
            >
              <Trash2 size={14} />
            </button>
          )}
          <button
            type="button"
            aria-label="Close card"
            onClick={onClose}
            className="flex h-7 w-7 items-center justify-center rounded-sm text-text-faint transition-colors hover:bg-hover-row hover:text-text-primary"
          >
            <X size={16} />
          </button>
        </div>
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
          <textarea
            value={desc}
            rows={Math.max(3, desc.split("\n").length)}
            placeholder="Add a description…"
            onChange={(e) => setDesc(e.target.value)}
            onBlur={() => {
              if (desc.trim() !== (card.description ?? "")) {
                onUpdate?.({ description: desc.trim() || undefined });
              }
            }}
            className="mt-2 w-full resize-none rounded-md border border-transparent bg-transparent px-2 py-1.5 text-[13px] leading-[1.6] text-text-secondary outline-none transition-colors placeholder:text-text-faint hover:border-border focus:border-border-active focus:bg-background"
          />
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
