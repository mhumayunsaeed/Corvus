"use client";

import {
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useState,
} from "react";
import {
    Hash,
    Volume2,
    Radio,
    Megaphone,
    Search,
    Plus,
    Compass,
    Settings,
    UserPlus,
    Sun,
    Moon,
    Sparkles,
    Users,
    CornerDownLeft,
    MessageSquare,
} from "lucide-react";
import { useTheme } from "@corvus/ui";
import { useAppStore } from "@/stores/app-store";
import { useAuthStore } from "@/stores/auth-store";
import { setFeatureFlag, useNewShell } from "@/lib/flags";
import type { FriendListEntry } from "@/lib/api";

export interface CommandPaletteProps {
    onCreateServer: () => void;
    onJoinServer: () => void;
    onCreateChannel: () => void;
    onInvite: () => void;
    onOpenSettings: () => void;
    openDirectDM: (friendUserId: string) => void;
    friends: FriendListEntry[];
}

type CommandKind = "space" | "channel" | "dm" | "friend" | "action";

interface CommandItem {
    id: string;
    kind: CommandKind;
    label: string;
    hint?: string;
    keywords?: string;
    icon: React.ComponentType<{ className?: string }>;
    run: () => void;
}

const SECTION_LABEL: Record<CommandKind, string> = {
    action: "Actions",
    space: "Spaces",
    channel: "Channels",
    dm: "Direct Messages",
    friend: "People",
};

const SECTION_ORDER: CommandKind[] = ["action", "channel", "space", "dm", "friend"];

/** Subsequence fuzzy score — higher is better, -1 means no match. */
function fuzzyScore(query: string, text: string): number {
    if (!query) return 0;
    const q = query.toLowerCase();
    const t = text.toLowerCase();
    const direct = t.indexOf(q);
    if (direct !== -1) return 1000 - direct; // contiguous match ranks best

    let score = 0;
    let ti = 0;
    let lastMatch = -1;
    for (let qi = 0; qi < q.length; qi++) {
        const ch = q[qi];
        let found = -1;
        for (; ti < t.length; ti++) {
            if (t[ti] === ch) {
                found = ti;
                ti++;
                break;
            }
        }
        if (found === -1) return -1;
        score += lastMatch === found - 1 ? 5 : 1; // reward adjacency
        lastMatch = found;
    }
    return score;
}

export function CommandPalette({
    onCreateServer,
    onJoinServer,
    onCreateChannel,
    onInvite,
    onOpenSettings,
    openDirectDM,
    friends,
}: CommandPaletteProps) {
    const [open, setOpen] = useState(false);
    const [query, setQuery] = useState("");
    const [activeIndex, setActiveIndex] = useState(0);
    const inputRef = useRef<HTMLInputElement>(null);
    const listRef = useRef<HTMLDivElement>(null);

    const servers = useAppStore((s) => s.servers);
    const channels = useAppStore((s) => s.channels);
    const dmConversations = useAppStore((s) => s.dmConversations);
    const activeServerId = useAppStore((s) => s.activeServerId);
    const setActiveServer = useAppStore((s) => s.setActiveServer);
    const setActiveChannel = useAppStore((s) => s.setActiveChannel);
    const setActiveDMConversation = useAppStore((s) => s.setActiveDMConversation);
    const user = useAuthStore((s) => s.user);
    const { resolvedTheme, toggleTheme } = useTheme();
    const newShell = useNewShell();

    const close = useCallback(() => {
        setOpen(false);
        setQuery("");
        setActiveIndex(0);
    }, []);

    // Global ⌘K / Ctrl+K toggle.
    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
                e.preventDefault();
                setOpen((v) => !v);
            }
        };
        const onOpenEvent = () => setOpen(true);
        window.addEventListener("keydown", onKey);
        window.addEventListener("corvus:open-command", onOpenEvent);
        return () => {
            window.removeEventListener("keydown", onKey);
            window.removeEventListener("corvus:open-command", onOpenEvent);
        };
    }, []);

    useEffect(() => {
        if (open) {
            // Focus after paint so the entrance animation runs.
            requestAnimationFrame(() => inputRef.current?.focus());
        }
    }, [open]);

    const dmLabel = useCallback(
        (conversation: (typeof dmConversations)[number]) => {
            if (conversation.name) return conversation.name;
            const others = conversation.participants.filter(
                (p) => p.id !== user?.id
            );
            if (others.length === 0) return "Direct Message";
            return others.map((p) => p.displayName || p.username).join(", ");
        },
        [user?.id]
    );

    const items = useMemo<CommandItem[]>(() => {
        const list: CommandItem[] = [];

        // ── Actions ──────────────────────────────────────────
        list.push({
            id: "action-create-server",
            kind: "action",
            label: "Create a Space",
            hint: "Server",
            icon: Plus,
            run: onCreateServer,
        });
        list.push({
            id: "action-join-server",
            kind: "action",
            label: "Join a Space with an invite",
            icon: Compass,
            run: onJoinServer,
        });
        if (activeServerId) {
            list.push({
                id: "action-create-channel",
                kind: "action",
                label: "Create a Channel",
                icon: Hash,
                run: onCreateChannel,
            });
            list.push({
                id: "action-invite",
                kind: "action",
                label: "Invite People",
                icon: UserPlus,
                run: onInvite,
            });
        }
        list.push({
            id: "action-settings",
            kind: "action",
            label: "Open Settings",
            icon: Settings,
            run: onOpenSettings,
        });
        list.push({
            id: "action-toggle-theme",
            kind: "action",
            label: `Switch to ${resolvedTheme === "dark" ? "Light" : "Dark"} theme`,
            keywords: "theme appearance dark light",
            icon: resolvedTheme === "dark" ? Sun : Moon,
            run: toggleTheme,
        });
        list.push({
            id: "action-toggle-shell",
            kind: "action",
            label: newShell
                ? "Switch to Classic layout"
                : "Try the new layout (beta)",
            keywords: "shell layout experimental beta sidebar",
            icon: Sparkles,
            run: () => setFeatureFlag("newShell", !newShell),
        });

        // ── Channels (active space only — that's what's loaded) ─
        for (const channel of channels) {
            const icon =
                channel.type === "voice"
                    ? Volume2
                    : channel.type === "stage"
                      ? Radio
                      : channel.type === "announcement"
                        ? Megaphone
                        : Hash;
            list.push({
                id: `channel-${channel.id}`,
                kind: "channel",
                label: channel.name,
                hint: channel.category,
                keywords: channel.type,
                icon,
                run: () => {
                    if (channel.type === "text" || channel.type === "announcement") {
                        setActiveChannel(channel.id);
                    }
                },
            });
        }

        // ── Spaces ───────────────────────────────────────────
        for (const server of servers) {
            list.push({
                id: `space-${server.id}`,
                kind: "space",
                label: server.name,
                icon: Users,
                run: () => setActiveServer(server.id),
            });
        }

        // ── DMs ──────────────────────────────────────────────
        for (const conversation of dmConversations) {
            list.push({
                id: `dm-${conversation.id}`,
                kind: "dm",
                label: dmLabel(conversation),
                icon: MessageSquare,
                run: () => setActiveDMConversation(conversation.id),
            });
        }

        // ── People (open / start a DM) ───────────────────────
        for (const entry of friends) {
            list.push({
                id: `friend-${entry.user.id}`,
                kind: "friend",
                label: entry.user.displayName || entry.user.username,
                hint: `@${entry.user.username}`,
                icon: UserPlus,
                run: () => openDirectDM(entry.user.id),
            });
        }

        return list;
    }, [
        servers,
        channels,
        dmConversations,
        friends,
        activeServerId,
        resolvedTheme,
        newShell,
        dmLabel,
        onCreateServer,
        onJoinServer,
        onCreateChannel,
        onInvite,
        onOpenSettings,
        openDirectDM,
        setActiveServer,
        setActiveChannel,
        setActiveDMConversation,
        toggleTheme,
    ]);

    const filtered = useMemo(() => {
        if (!query.trim()) {
            // No query: show actions first, then a few of everything.
            return items;
        }
        return items
            .map((item) => ({
                item,
                score: Math.max(
                    fuzzyScore(query, item.label),
                    item.keywords ? fuzzyScore(query, item.keywords) - 2 : -1,
                    item.hint ? fuzzyScore(query, item.hint) - 3 : -1
                ),
            }))
            .filter((x) => x.score > -1)
            .sort((a, b) => b.score - a.score)
            .map((x) => x.item);
    }, [items, query]);

    // Group filtered items by section, preserving rank order within sections.
    const grouped = useMemo(() => {
        const map = new Map<CommandKind, CommandItem[]>();
        for (const item of filtered) {
            const arr = map.get(item.kind) ?? [];
            arr.push(item);
            map.set(item.kind, arr);
        }
        const flat: CommandItem[] = [];
        const sections: { kind: CommandKind; items: CommandItem[] }[] = [];
        for (const kind of SECTION_ORDER) {
            const arr = map.get(kind);
            if (arr && arr.length) {
                sections.push({ kind, items: arr });
                flat.push(...arr);
            }
        }
        return { sections, flat };
    }, [filtered]);

    useEffect(() => {
        setActiveIndex(0);
    }, [query]);

    const runIndex = useCallback(
        (index: number) => {
            const item = grouped.flat[index];
            if (!item) return;
            item.run();
            close();
        },
        [grouped.flat, close]
    );

    const onKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "ArrowDown") {
            e.preventDefault();
            setActiveIndex((i) => Math.min(i + 1, grouped.flat.length - 1));
        } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setActiveIndex((i) => Math.max(i - 1, 0));
        } else if (e.key === "Enter") {
            e.preventDefault();
            runIndex(activeIndex);
        } else if (e.key === "Escape") {
            e.preventDefault();
            close();
        }
    };

    // Keep the active row scrolled into view.
    useEffect(() => {
        const node = listRef.current?.querySelector<HTMLElement>(
            `[data-cmd-index="${activeIndex}"]`
        );
        node?.scrollIntoView({ block: "nearest" });
    }, [activeIndex]);

    if (!open) return null;

    let runningIndex = -1;

    return (
        <div
            className="fixed inset-0 z-[200] flex items-start justify-center px-4 pt-[12vh]"
            role="dialog"
            aria-modal="true"
            aria-label="Command palette"
        >
            <div
                className="absolute inset-0 bg-bg-deep/70 backdrop-blur-glass-sm animate-fade-in"
                onClick={close}
            />
            <div className="relative w-full max-w-xl overflow-hidden rounded-2xl border border-border-highlight bg-surface-overlay shadow-e3 animate-scale-in">
                {/* Search */}
                <div className="flex items-center gap-3 border-b border-border-subtle px-4">
                    <Search className="h-4 w-4 flex-shrink-0 text-text-muted" />
                    <input
                        ref={inputRef}
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        onKeyDown={onKeyDown}
                        placeholder="Search spaces, channels, people, or run a command…"
                        className="h-14 flex-1 bg-transparent text-[15px] text-text-primary placeholder:text-text-muted focus:outline-none"
                    />
                    <kbd className="hidden rounded-md border border-border-highlight bg-surface px-1.5 py-0.5 text-[10px] font-medium text-text-muted sm:block">
                        ESC
                    </kbd>
                </div>

                {/* Results */}
                <div
                    ref={listRef}
                    className="max-h-[52vh] overflow-y-auto p-2 scrollbar-none"
                >
                    {grouped.flat.length === 0 ? (
                        <div className="px-3 py-10 text-center text-[13px] text-text-muted">
                            No results for “{query}”.
                        </div>
                    ) : (
                        grouped.sections.map((section) => (
                            <div key={section.kind} className="mb-1.5">
                                <div className="px-2.5 pb-1 pt-2 text-[10px] font-semibold uppercase tracking-[0.08em] text-text-faint">
                                    {SECTION_LABEL[section.kind]}
                                </div>
                                {section.items.map((item) => {
                                    runningIndex++;
                                    const index = runningIndex;
                                    const active = index === activeIndex;
                                    const Icon = item.icon;
                                    return (
                                        <button
                                            key={item.id}
                                            data-cmd-index={index}
                                            onClick={() => runIndex(index)}
                                            onMouseMove={() => setActiveIndex(index)}
                                            className={`flex w-full items-center gap-3 rounded-lg px-2.5 py-2 text-left transition-colors ${
                                                active
                                                    ? "bg-accent-soft text-text-primary"
                                                    : "text-text-secondary hover:bg-hover-row"
                                            }`}
                                        >
                                            <span
                                                className={`flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-md ${
                                                    active
                                                        ? "bg-accent/15 text-accent"
                                                        : "bg-surface-raised text-text-muted"
                                                }`}
                                            >
                                                <Icon className="h-4 w-4" />
                                            </span>
                                            <span className="flex-1 truncate text-[14px] font-medium">
                                                {item.label}
                                            </span>
                                            {item.hint && (
                                                <span className="truncate text-[11px] text-text-faint">
                                                    {item.hint}
                                                </span>
                                            )}
                                            {active && (
                                                <CornerDownLeft className="h-3.5 w-3.5 flex-shrink-0 text-text-muted" />
                                            )}
                                        </button>
                                    );
                                })}
                            </div>
                        ))
                    )}
                </div>

                {/* Footer hints */}
                <div className="flex items-center gap-4 border-t border-border-subtle px-4 py-2.5 text-[11px] text-text-muted">
                    <span className="flex items-center gap-1.5">
                        <kbd className="rounded border border-border-highlight bg-surface px-1 py-0.5 text-[10px]">↑</kbd>
                        <kbd className="rounded border border-border-highlight bg-surface px-1 py-0.5 text-[10px]">↓</kbd>
                        to navigate
                    </span>
                    <span className="flex items-center gap-1.5">
                        <kbd className="rounded border border-border-highlight bg-surface px-1 py-0.5 text-[10px]">↵</kbd>
                        to select
                    </span>
                    <span className="ml-auto flex items-center gap-1.5 font-medium text-text-faint">
                        <Sparkles className="h-3 w-3" /> Corvus
                    </span>
                </div>
            </div>
        </div>
    );
}
