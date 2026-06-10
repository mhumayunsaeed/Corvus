"use client";

import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import {
    Check,
    Clipboard,
    Download,
    FileText,
    ListTodo,
    NotebookPen,
    Plus,
    Trash2,
    X,
} from "lucide-react";
import {
    formatMeetingNotesMarkdown,
    hasMeetingNotesContent,
    useMeetingNotesStore,
} from "@/stores/meeting-notes-store";
import { notifyError, notifySuccess } from "@/lib/notify";

export interface MeetingNotesContext {
    contextId: string;
    title: string;
    subtitle?: string;
}

interface MeetingNotesPanelProps {
    context: MeetingNotesContext;
    onClose: () => void;
    className?: string;
}

interface MeetingNotesButtonProps {
    context: MeetingNotesContext;
    open: boolean;
    onClick: () => void;
    className?: string;
}

function safeFileName(value: string) {
    return value
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "")
        .slice(0, 48) || "meeting-notes";
}

function NoteSection({
    icon,
    label,
    children,
}: {
    icon: ReactNode;
    label: string;
    children: ReactNode;
}) {
    return (
        <section className="space-y-2">
            <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.08em] text-text-faint">
                {icon}
                <span>{label}</span>
            </div>
            {children}
        </section>
    );
}

export function MeetingNotesButton({
    context,
    open,
    onClick,
    className = "",
}: MeetingNotesButtonProps) {
    const ensureSession = useMeetingNotesStore((s) => s.ensureSession);
    const session = useMeetingNotesStore((s) => s.sessions[context.contextId]);
    const hasContent = hasMeetingNotesContent(session);

    useEffect(() => {
        ensureSession(context);
    }, [context, ensureSession]);

    return (
        <button
            onClick={onClick}
            className={`relative inline-flex h-8 w-8 items-center justify-center rounded-lg border transition-colors ${
                open
                    ? "border-accent-violet/40 bg-accent-violet/15 text-accent-violet"
                    : "border-border/60 bg-surface-raised text-text-muted hover:border-border-highlight hover:text-text-primary"
            } ${className}`}
            title={open ? "Hide meeting notes" : "Open meeting notes"}
            aria-label={open ? "Hide meeting notes" : "Open meeting notes"}
            aria-pressed={open}
        >
            <NotebookPen className="h-4 w-4" />
            {hasContent && (
                <span className="absolute right-1 top-1 h-1.5 w-1.5 rounded-full bg-live ring-2 ring-surface-raised" />
            )}
        </button>
    );
}

export function MeetingNotesPanel({ context, onClose, className = "" }: MeetingNotesPanelProps) {
    const ensureSession = useMeetingNotesStore((s) => s.ensureSession);
    const session = useMeetingNotesStore((s) => s.sessions[context.contextId]);
    const setAgenda = useMeetingNotesStore((s) => s.setAgenda);
    const setNotes = useMeetingNotesStore((s) => s.setNotes);
    const addDecision = useMeetingNotesStore((s) => s.addDecision);
    const updateDecision = useMeetingNotesStore((s) => s.updateDecision);
    const removeDecision = useMeetingNotesStore((s) => s.removeDecision);
    const addActionItem = useMeetingNotesStore((s) => s.addActionItem);
    const updateActionItem = useMeetingNotesStore((s) => s.updateActionItem);
    const removeActionItem = useMeetingNotesStore((s) => s.removeActionItem);
    const clearSession = useMeetingNotesStore((s) => s.clearSession);

    const [decisionDraft, setDecisionDraft] = useState("");
    const [actionDraft, setActionDraft] = useState("");

    useEffect(() => {
        ensureSession(context);
    }, [context, ensureSession]);

    const markdown = useMemo(
        () => (session ? formatMeetingNotesMarkdown(session) : ""),
        [session]
    );

    const completedActions = session?.actionItems.filter((item) => item.done).length ?? 0;
    const actionCount = session?.actionItems.length ?? 0;

    const handleAddDecision = () => {
        const decision = decisionDraft.trim();
        if (!decision) return;
        addDecision(context.contextId, decision);
        setDecisionDraft("");
    };

    const handleAddAction = () => {
        const action = actionDraft.trim();
        if (!action) return;
        addActionItem(context.contextId, action);
        setActionDraft("");
    };

    const handleCopy = async () => {
        if (!session) return;
        try {
            await navigator.clipboard.writeText(markdown);
            notifySuccess("Meeting notes copied");
        } catch {
            notifyError("Could not copy meeting notes");
        }
    };

    const handleDownload = () => {
        if (!session) return;
        const blob = new Blob([markdown], { type: "text/markdown;charset=utf-8" });
        const url = URL.createObjectURL(blob);
        const anchor = document.createElement("a");
        anchor.href = url;
        anchor.download = `${safeFileName(session.title)}.md`;
        anchor.click();
        URL.revokeObjectURL(url);
    };

    if (!session) {
        return null;
    }

    return (
        <aside
            className={`flex min-h-0 w-full flex-col border-l border-border-subtle bg-channel-sidebar/95 shadow-float-lg md:w-[360px] ${className}`}
            aria-label="Meeting notes"
        >
            <div className="flex h-12 flex-shrink-0 items-center justify-between border-b border-border-subtle px-3">
                <div className="flex min-w-0 items-center gap-2">
                    <span className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg border border-accent-violet/25 bg-accent-violet/10 text-accent-violet">
                        <NotebookPen className="h-4 w-4" />
                    </span>
                    <div className="min-w-0">
                        <div className="truncate text-[13px] font-semibold text-text-primary">
                            Meeting Notes
                        </div>
                        <div className="truncate text-[11px] text-text-muted">
                            {session.title}
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-1">
                    <button
                        onClick={handleCopy}
                        className="flex h-8 w-8 items-center justify-center rounded-lg text-text-muted transition-colors hover:bg-hover-row hover:text-text-primary"
                        title="Copy as Markdown"
                        aria-label="Copy meeting notes"
                    >
                        <Clipboard className="h-4 w-4" />
                    </button>
                    <button
                        onClick={handleDownload}
                        className="flex h-8 w-8 items-center justify-center rounded-lg text-text-muted transition-colors hover:bg-hover-row hover:text-text-primary"
                        title="Download Markdown"
                        aria-label="Download meeting notes"
                    >
                        <Download className="h-4 w-4" />
                    </button>
                    <button
                        onClick={onClose}
                        className="flex h-8 w-8 items-center justify-center rounded-lg text-text-muted transition-colors hover:bg-hover-row hover:text-text-primary"
                        title="Close meeting notes"
                        aria-label="Close meeting notes"
                    >
                        <X className="h-4 w-4" />
                    </button>
                </div>
            </div>

            <div className="flex-1 space-y-5 overflow-y-auto px-3 py-4">
                <div className="grid grid-cols-3 gap-2">
                    <div className="rounded-lg border border-border/60 bg-surface/60 px-3 py-2">
                        <div className="text-[18px] font-bold leading-none text-text-primary">
                            {session.decisions.length}
                        </div>
                        <div className="mt-1 text-[10px] uppercase tracking-[0.08em] text-text-faint">
                            Decisions
                        </div>
                    </div>
                    <div className="rounded-lg border border-border/60 bg-surface/60 px-3 py-2">
                        <div className="text-[18px] font-bold leading-none text-text-primary">
                            {actionCount}
                        </div>
                        <div className="mt-1 text-[10px] uppercase tracking-[0.08em] text-text-faint">
                            Actions
                        </div>
                    </div>
                    <div className="rounded-lg border border-border/60 bg-surface/60 px-3 py-2">
                        <div className="text-[18px] font-bold leading-none text-text-primary">
                            {completedActions}
                        </div>
                        <div className="mt-1 text-[10px] uppercase tracking-[0.08em] text-text-faint">
                            Done
                        </div>
                    </div>
                </div>

                <NoteSection icon={<FileText className="h-3.5 w-3.5" />} label="Agenda">
                    <textarea
                        value={session.agenda}
                        onChange={(event) => setAgenda(context.contextId, event.target.value)}
                        placeholder="Topics, goals, and sequence for this call"
                        className="min-h-[92px] w-full resize-none rounded-lg border border-border bg-surface-raised px-3 py-2 text-[13px] leading-5 text-text-primary outline-none transition-colors placeholder:text-text-faint focus:border-accent-violet/45"
                    />
                </NoteSection>

                <NoteSection icon={<NotebookPen className="h-3.5 w-3.5" />} label="Notes">
                    <textarea
                        value={session.notes}
                        onChange={(event) => setNotes(context.contextId, event.target.value)}
                        placeholder="Capture discussion details, links, risks, and follow-up context"
                        className="min-h-[150px] w-full resize-y rounded-lg border border-border bg-surface-raised px-3 py-2 text-[13px] leading-5 text-text-primary outline-none transition-colors placeholder:text-text-faint focus:border-accent-violet/45"
                    />
                </NoteSection>

                <NoteSection icon={<Check className="h-3.5 w-3.5" />} label="Decisions">
                    <div className="space-y-2">
                        {session.decisions.map((decision, index) => (
                            <div key={`${index}-${decision}`} className="flex items-start gap-2">
                                <textarea
                                    value={decision}
                                    onChange={(event) =>
                                        updateDecision(context.contextId, index, event.target.value)
                                    }
                                    className="min-h-[40px] flex-1 resize-none rounded-lg border border-border bg-surface-raised px-3 py-2 text-[13px] leading-5 text-text-primary outline-none transition-colors focus:border-accent-violet/45"
                                />
                                <button
                                    onClick={() => removeDecision(context.contextId, index)}
                                    className="mt-1 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg text-text-muted transition-colors hover:bg-danger/10 hover:text-danger"
                                    title="Remove decision"
                                    aria-label="Remove decision"
                                >
                                    <Trash2 className="h-4 w-4" />
                                </button>
                            </div>
                        ))}
                        <div className="flex items-center gap-2">
                            <input
                                value={decisionDraft}
                                onChange={(event) => setDecisionDraft(event.target.value)}
                                onKeyDown={(event) => {
                                    if (event.key === "Enter") {
                                        event.preventDefault();
                                        handleAddDecision();
                                    }
                                }}
                                placeholder="Add a decision"
                                className="h-9 min-w-0 flex-1 rounded-lg border border-border bg-surface-raised px-3 text-[13px] text-text-primary outline-none transition-colors placeholder:text-text-faint focus:border-accent-violet/45"
                            />
                            <button
                                onClick={handleAddDecision}
                                className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-accent-violet text-on-accent transition-colors hover:bg-accent-violet/90 disabled:opacity-50"
                                title="Add decision"
                                aria-label="Add decision"
                                disabled={!decisionDraft.trim()}
                            >
                                <Plus className="h-4 w-4" />
                            </button>
                        </div>
                    </div>
                </NoteSection>

                <NoteSection icon={<ListTodo className="h-3.5 w-3.5" />} label="Action Items">
                    <div className="space-y-2">
                        {session.actionItems.map((item) => (
                            <div
                                key={item.id}
                                className="rounded-lg border border-border bg-surface-raised p-2.5"
                            >
                                <div className="flex items-start gap-2">
                                    <button
                                        onClick={() =>
                                            updateActionItem(context.contextId, item.id, {
                                                done: !item.done,
                                            })
                                        }
                                        className={`mt-1 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded border transition-colors ${
                                            item.done
                                                ? "border-live bg-live text-background"
                                                : "border-border-highlight text-transparent hover:text-text-muted"
                                        }`}
                                        title={item.done ? "Mark incomplete" : "Mark complete"}
                                        aria-label={item.done ? "Mark action incomplete" : "Mark action complete"}
                                    >
                                        <Check className="h-3.5 w-3.5" />
                                    </button>
                                    <textarea
                                        value={item.text}
                                        onChange={(event) =>
                                            updateActionItem(context.contextId, item.id, {
                                                text: event.target.value,
                                            })
                                        }
                                        className={`min-h-[40px] flex-1 resize-none bg-transparent text-[13px] leading-5 text-text-primary outline-none placeholder:text-text-faint ${
                                            item.done ? "text-text-muted line-through" : ""
                                        }`}
                                    />
                                    <button
                                        onClick={() => removeActionItem(context.contextId, item.id)}
                                        className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg text-text-muted transition-colors hover:bg-danger/10 hover:text-danger"
                                        title="Remove action item"
                                        aria-label="Remove action item"
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </button>
                                </div>
                                <div className="mt-2 grid grid-cols-2 gap-2">
                                    <input
                                        value={item.owner}
                                        onChange={(event) =>
                                            updateActionItem(context.contextId, item.id, {
                                                owner: event.target.value,
                                            })
                                        }
                                        placeholder="Owner"
                                        className="h-8 rounded-md border border-border/70 bg-background/40 px-2 text-[12px] text-text-primary outline-none placeholder:text-text-faint focus:border-accent-violet/45"
                                    />
                                    <input
                                        value={item.due}
                                        onChange={(event) =>
                                            updateActionItem(context.contextId, item.id, {
                                                due: event.target.value,
                                            })
                                        }
                                        placeholder="Due"
                                        className="h-8 rounded-md border border-border/70 bg-background/40 px-2 text-[12px] text-text-primary outline-none placeholder:text-text-faint focus:border-accent-violet/45"
                                    />
                                </div>
                            </div>
                        ))}
                        <div className="flex items-center gap-2">
                            <input
                                value={actionDraft}
                                onChange={(event) => setActionDraft(event.target.value)}
                                onKeyDown={(event) => {
                                    if (event.key === "Enter") {
                                        event.preventDefault();
                                        handleAddAction();
                                    }
                                }}
                                placeholder="Add an action item"
                                className="h-9 min-w-0 flex-1 rounded-lg border border-border bg-surface-raised px-3 text-[13px] text-text-primary outline-none transition-colors placeholder:text-text-faint focus:border-accent-violet/45"
                            />
                            <button
                                onClick={handleAddAction}
                                className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-accent-violet text-on-accent transition-colors hover:bg-accent-violet/90 disabled:opacity-50"
                                title="Add action item"
                                aria-label="Add action item"
                                disabled={!actionDraft.trim()}
                            >
                                <Plus className="h-4 w-4" />
                            </button>
                        </div>
                    </div>
                </NoteSection>
            </div>

            <div className="flex flex-shrink-0 items-center justify-between border-t border-border-subtle px-3 py-2">
                <span className="truncate text-[11px] text-text-muted">
                    Saved locally {new Date(session.updatedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </span>
                <button
                    onClick={() => clearSession(context.contextId)}
                    className="flex h-8 items-center gap-1.5 rounded-lg px-2 text-[12px] font-medium text-text-muted transition-colors hover:bg-danger/10 hover:text-danger"
                    title="Clear notes"
                >
                    <Trash2 className="h-3.5 w-3.5" />
                    Clear
                </button>
            </div>
        </aside>
    );
}
