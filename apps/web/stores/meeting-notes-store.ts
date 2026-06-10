import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

export interface MeetingActionItem {
    id: string;
    text: string;
    owner: string;
    due: string;
    done: boolean;
}

export interface MeetingNotesSession {
    contextId: string;
    title: string;
    subtitle?: string;
    agenda: string;
    notes: string;
    decisions: string[];
    actionItems: MeetingActionItem[];
    createdAt: string;
    updatedAt: string;
}

interface MeetingNotesState {
    sessions: Record<string, MeetingNotesSession>;
    ensureSession: (context: { contextId: string; title: string; subtitle?: string }) => void;
    setAgenda: (contextId: string, agenda: string) => void;
    setNotes: (contextId: string, notes: string) => void;
    addDecision: (contextId: string, decision: string) => void;
    updateDecision: (contextId: string, index: number, decision: string) => void;
    removeDecision: (contextId: string, index: number) => void;
    addActionItem: (contextId: string, text: string) => void;
    updateActionItem: (contextId: string, itemId: string, updates: Partial<Omit<MeetingActionItem, "id">>) => void;
    removeActionItem: (contextId: string, itemId: string) => void;
    clearSession: (contextId: string) => void;
}

function nowIso() {
    return new Date().toISOString();
}

function createId() {
    if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
        return crypto.randomUUID();
    }
    return `note-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function updateSession(
    sessions: Record<string, MeetingNotesSession>,
    contextId: string,
    updater: (session: MeetingNotesSession) => MeetingNotesSession
) {
    const session = sessions[contextId];
    if (!session) return sessions;
    return {
        ...sessions,
        [contextId]: {
            ...updater(session),
            updatedAt: nowIso(),
        },
    };
}

export function hasMeetingNotesContent(session: MeetingNotesSession | undefined) {
    if (!session) return false;
    return (
        session.agenda.trim().length > 0 ||
        session.notes.trim().length > 0 ||
        session.decisions.some((decision) => decision.trim().length > 0) ||
        session.actionItems.some((item) => item.text.trim().length > 0)
    );
}

export function formatMeetingNotesMarkdown(session: MeetingNotesSession) {
    const lines = [
        `# ${session.title}`,
        session.subtitle ? `_${session.subtitle}_` : "",
        "",
        `Last updated: ${new Date(session.updatedAt).toLocaleString()}`,
        "",
        "## Agenda",
        session.agenda.trim() || "-",
        "",
        "## Notes",
        session.notes.trim() || "-",
        "",
        "## Decisions",
        ...(
            session.decisions.filter((decision) => decision.trim()).length > 0
                ? session.decisions
                    .filter((decision) => decision.trim())
                    .map((decision) => `- ${decision.trim()}`)
                : ["-"]
        ),
        "",
        "## Action Items",
        ...(
            session.actionItems.filter((item) => item.text.trim()).length > 0
                ? session.actionItems
                    .filter((item) => item.text.trim())
                    .map((item) => {
                        const details = [
                            item.owner.trim() ? `Owner: ${item.owner.trim()}` : null,
                            item.due.trim() ? `Due: ${item.due.trim()}` : null,
                        ].filter(Boolean);
                        return `- [${item.done ? "x" : " "}] ${item.text.trim()}${details.length > 0 ? ` (${details.join(", ")})` : ""}`;
                    })
                : ["-"]
        ),
        "",
    ];

    return lines.filter((line, index) => line !== "" || lines[index - 1] !== "").join("\n");
}

export const useMeetingNotesStore = create<MeetingNotesState>()(
    persist(
        (set) => ({
            sessions: {},

            ensureSession: ({ contextId, title, subtitle }) =>
                set((state) => {
                    const existing = state.sessions[contextId];
                    const timestamp = nowIso();

                    if (existing) {
                        if (existing.title === title && existing.subtitle === subtitle) {
                            return state;
                        }
                        return {
                            sessions: {
                                ...state.sessions,
                                [contextId]: {
                                    ...existing,
                                    title,
                                    subtitle,
                                    updatedAt: timestamp,
                                },
                            },
                        };
                    }

                    return {
                        sessions: {
                            ...state.sessions,
                            [contextId]: {
                                contextId,
                                title,
                                subtitle,
                                agenda: "",
                                notes: "",
                                decisions: [],
                                actionItems: [],
                                createdAt: timestamp,
                                updatedAt: timestamp,
                            },
                        },
                    };
                }),

            setAgenda: (contextId, agenda) =>
                set((state) => ({
                    sessions: updateSession(state.sessions, contextId, (session) => ({
                        ...session,
                        agenda,
                    })),
                })),

            setNotes: (contextId, notes) =>
                set((state) => ({
                    sessions: updateSession(state.sessions, contextId, (session) => ({
                        ...session,
                        notes,
                    })),
                })),

            addDecision: (contextId, decision) =>
                set((state) => ({
                    sessions: updateSession(state.sessions, contextId, (session) => ({
                        ...session,
                        decisions: [...session.decisions, decision],
                    })),
                })),

            updateDecision: (contextId, index, decision) =>
                set((state) => ({
                    sessions: updateSession(state.sessions, contextId, (session) => ({
                        ...session,
                        decisions: session.decisions.map((item, itemIndex) =>
                            itemIndex === index ? decision : item
                        ),
                    })),
                })),

            removeDecision: (contextId, index) =>
                set((state) => ({
                    sessions: updateSession(state.sessions, contextId, (session) => ({
                        ...session,
                        decisions: session.decisions.filter((_, itemIndex) => itemIndex !== index),
                    })),
                })),

            addActionItem: (contextId, text) =>
                set((state) => ({
                    sessions: updateSession(state.sessions, contextId, (session) => ({
                        ...session,
                        actionItems: [
                            ...session.actionItems,
                            {
                                id: createId(),
                                text,
                                owner: "",
                                due: "",
                                done: false,
                            },
                        ],
                    })),
                })),

            updateActionItem: (contextId, itemId, updates) =>
                set((state) => ({
                    sessions: updateSession(state.sessions, contextId, (session) => ({
                        ...session,
                        actionItems: session.actionItems.map((item) =>
                            item.id === itemId ? { ...item, ...updates } : item
                        ),
                    })),
                })),

            removeActionItem: (contextId, itemId) =>
                set((state) => ({
                    sessions: updateSession(state.sessions, contextId, (session) => ({
                        ...session,
                        actionItems: session.actionItems.filter((item) => item.id !== itemId),
                    })),
                })),

            clearSession: (contextId) =>
                set((state) => {
                    const existing = state.sessions[contextId];
                    if (!existing) return state;
                    return {
                        sessions: {
                            ...state.sessions,
                            [contextId]: {
                                ...existing,
                                agenda: "",
                                notes: "",
                                decisions: [],
                                actionItems: [],
                                updatedAt: nowIso(),
                            },
                        },
                    };
                }),
        }),
        {
            name: "corvus-meeting-notes",
            storage: createJSONStorage(() => {
                if (typeof window !== "undefined") return localStorage;
                return {
                    getItem: () => null,
                    setItem: () => {},
                    removeItem: () => {},
                };
            }),
        }
    )
);
