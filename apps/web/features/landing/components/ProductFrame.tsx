import {
    GitPullRequest,
    Hash,
    Headphones,
    Mic,
    MoreHorizontal,
    Paperclip,
    Search,
    Smile,
    Volume2,
} from "lucide-react";
import { cn } from "@corvus/ui";

export type ProductMode = "messages" | "voice" | "boards" | "docs" | "github" | "incidents";

const members = [
    { name: "Mara", color: "bg-[#D49A6A]" },
    { name: "Owen", color: "bg-[#5C8FB8]" },
    { name: "Noor", color: "bg-[#5D9B84]" },
];

function Avatar({ index, size = "md" }: { index: number; size?: "sm" | "md" }) {
    const member = members[index % members.length]!;
    return (
        <span
            aria-hidden
            className={cn(
                "grid shrink-0 place-items-center rounded-md text-[10px] font-semibold text-white",
                member.color,
                size === "sm" ? "h-5 w-5" : "h-8 w-8",
            )}
        >
            {member.name[0]}
        </span>
    );
}

function Messages() {
    return (
        <div className="flex h-full min-h-0 flex-col">
            <div className="flex-1 space-y-5 overflow-hidden px-5 py-5 sm:px-7">
                <div className="flex gap-3">
                    <Avatar index={0} />
                    <div>
                        <p className="text-[12px] font-semibold">
                            Mara Chen{" "}
                            <span className="ml-1 font-mono text-[9px] font-normal text-text-faint">
                                09:42
                            </span>
                        </p>
                        <p className="mt-1 max-w-[540px] text-[12px] leading-5 text-text-secondary">
                            The reconnect state is ready. I linked the edge case in the pull
                            request.
                        </p>
                        <div className="mt-2 inline-flex items-center gap-2 rounded-md bg-surface-raised px-3 py-2 text-[11px]">
                            <GitPullRequest size={13} className="text-live" />
                            <span className="text-text-primary">
                                #184 Reconnect without dropping presence
                            </span>
                            <span className="text-live">Ready</span>
                        </div>
                    </div>
                </div>
                <div className="flex gap-3">
                    <Avatar index={1} />
                    <div>
                        <p className="text-[12px] font-semibold">
                            Owen Park{" "}
                            <span className="ml-1 font-mono text-[9px] font-normal text-text-faint">
                                09:46
                            </span>
                        </p>
                        <p className="mt-1 text-[12px] leading-5 text-text-secondary">
                            Nice. I’ll test it in the desktop build before we merge.
                        </p>
                        <div className="mt-2 flex gap-1.5">
                            <span className="rounded-full bg-live-soft px-2 py-0.5 text-[10px] text-live">
                                ✓ 3
                            </span>
                            <span className="rounded-full bg-surface-raised px-2 py-0.5 text-[10px]">
                                👀 2
                            </span>
                        </div>
                    </div>
                </div>
                <div className="ml-11 border-l-2 border-accent/40 pl-3 text-[10px] text-text-muted">
                    2 replies · Last reply 2m ago
                </div>
            </div>
            <div className="mx-4 mb-4 flex min-h-11 items-center gap-2 rounded-lg bg-surface-raised px-3 text-[11px] text-text-muted shadow-e1 sm:mx-6">
                <Paperclip size={15} />
                <span className="flex-1">Message #desktop</span>
                <Smile size={15} />
                <span className="grid h-7 w-7 place-items-center rounded-md bg-accent text-on-accent">
                    ↑
                </span>
            </div>
        </div>
    );
}

function Voice() {
    return (
        <div className="flex h-full flex-col items-center justify-center p-5">
            <div className="mb-6 flex items-center gap-2 text-[11px] text-live">
                <Volume2 size={14} /> Voice room · design-sync
            </div>
            <div className="grid w-full max-w-lg grid-cols-2 gap-3 sm:grid-cols-3">
                {members.map((member, i) => (
                    <div
                        key={member.name}
                        className={cn(
                            "relative grid aspect-[4/3] place-items-center rounded-xl bg-surface-raised",
                            i === 0 && "ring-2 ring-live/70",
                        )}
                    >
                        <Avatar index={i} />
                        <span className="absolute bottom-2 left-2 text-[10px]">{member.name}</span>
                        {i === 0 && (
                            <span className="absolute right-2 top-2 flex items-center gap-1 text-[9px] text-live">
                                <span className="h-1.5 w-1.5 rounded-full bg-live" /> speaking
                            </span>
                        )}
                    </div>
                ))}
            </div>
            <div className="mt-6 flex gap-2">
                <span className="grid h-9 w-9 place-items-center rounded-full bg-surface-overlay">
                    <Mic size={15} />
                </span>
                <span className="grid h-9 w-9 place-items-center rounded-full bg-surface-overlay">
                    <Headphones size={15} />
                </span>
                <span className="rounded-full bg-danger/20 px-4 py-2 text-[11px] text-danger">
                    Leave
                </span>
            </div>
        </div>
    );
}

function Board() {
    const columns = [
        ["Reconnect states", "Desktop QA"],
        ["Presence sync", "Review error copy"],
        ["Release notes"],
    ];
    return (
        <div className="grid h-full grid-cols-3 gap-3 overflow-hidden p-4 sm:p-6">
            {columns.map((cards, i) => (
                <div key={i} className="min-w-0 rounded-lg bg-surface-raised p-3">
                    <div className="mb-3 flex items-center justify-between text-[10px] font-semibold">
                        <span>{["TO DO", "IN PROGRESS", "DONE"][i]}</span>
                        <span className="text-text-faint">{cards.length}</span>
                    </div>
                    {cards.map((card, j) => (
                        <div
                            key={card}
                            className="mb-2 rounded-md bg-surface-overlay p-3 shadow-e1"
                        >
                            <p className="text-[11px] leading-4">{card}</p>
                            <div className="mt-3 flex items-center justify-between">
                                <span
                                    className={cn(
                                        "h-1.5 w-10 rounded-full",
                                        j ? "bg-live" : "bg-accent",
                                    )}
                                />
                                <Avatar index={i + j} size="sm" />
                            </div>
                        </div>
                    ))}
                </div>
            ))}
        </div>
    );
}

function Document() {
    return (
        <div className="mx-auto h-full max-w-2xl overflow-hidden px-6 py-8">
            <p className="text-[10px] text-accent">ENGINEERING / RUNBOOK</p>
            <h3 className="mt-3 text-xl font-semibold tracking-tight">
                Realtime reconnect behaviour
            </h3>
            <p className="mt-2 text-[12px] leading-5 text-text-secondary">
                How clients recover presence and message state after a network interruption.
            </p>
            <div className="mt-7 space-y-4 text-[11px] leading-5 text-text-secondary">
                <p className="border-l-2 border-accent pl-4 text-text-primary">
                    Keep the channel cursor stable while presence is restored.
                </p>
                <p>1. Re-establish the Supabase Realtime channel.</p>
                <p>2. Reconcile local messages against the latest server cursor.</p>
                <div className="rounded-md bg-bg-deep p-3 font-mono text-[10px] text-live">
                    channel.subscribe(status =&gt; restorePresence(status))
                </div>
            </div>
        </div>
    );
}

function GitHubView() {
    return (
        <div className="h-full p-5 sm:p-7">
            <div className="flex items-center gap-3">
                <GitPullRequest className="text-live" size={20} />
                <div>
                    <h3 className="text-sm font-semibold">Reconnect without dropping presence</h3>
                    <p className="font-mono text-[9px] text-text-muted">
                        #184 · humayun/realtime-recovery
                    </p>
                </div>
            </div>
            <div className="mt-6 grid gap-2">
                {["Typecheck", "Web build", "API verification"].map((check) => (
                    <div
                        key={check}
                        className="flex items-center gap-3 rounded-md bg-surface-raised px-4 py-3 text-[11px]"
                    >
                        <span className="grid h-5 w-5 place-items-center rounded-full bg-live-soft text-live">
                            ✓
                        </span>
                        <span className="flex-1">{check}</span>
                        <span className="font-mono text-[9px] text-text-muted">passed</span>
                    </div>
                ))}
            </div>
            <div className="mt-5 rounded-md border-l-2 border-accent bg-accent-soft p-4 text-[11px] text-text-secondary">
                Linked from <span className="text-text-primary">#desktop</span> · discussion stays
                with the work.
            </div>
        </div>
    );
}

function Incident() {
    return (
        <div className="h-full p-5 sm:p-7">
            <div className="flex items-center gap-3">
                <span className="rounded bg-warning/15 px-2 py-1 font-mono text-[10px] text-warning">
                    P2
                </span>
                <div>
                    <h3 className="text-sm font-semibold">Elevated reconnect failures</h3>
                    <p className="text-[10px] text-text-muted">Investigating · 18 minutes</p>
                </div>
            </div>
            <div className="mt-6 space-y-0">
                {["Incident opened from #ops", "Realtime logs attached", "Mitigation deployed"].map(
                    (event, i) => (
                        <div key={event} className="flex gap-3">
                            <div className="flex flex-col items-center">
                                <span
                                    className={cn(
                                        "mt-1 h-2 w-2 rounded-full",
                                        i === 2 ? "bg-live" : "bg-accent",
                                    )}
                                />
                                {i < 2 && <span className="h-10 w-px bg-border-subtle" />}
                            </div>
                            <div>
                                <p className="text-[11px]">{event}</p>
                                <p className="mt-0.5 font-mono text-[9px] text-text-faint">
                                    {["10:04", "10:11", "10:22"][i]}
                                </p>
                            </div>
                        </div>
                    ),
                )}
            </div>
        </div>
    );
}

export function ProductFrame({
    mode = "messages",
    className,
}: {
    mode?: ProductMode;
    className?: string;
}) {
    const content = {
        messages: <Messages />,
        voice: <Voice />,
        boards: <Board />,
        docs: <Document />,
        github: <GitHubView />,
        incidents: <Incident />,
    }[mode];
    return (
        <div
            className={cn(
                "w-full min-w-0 max-w-full overflow-hidden rounded-xl bg-bg-deep shadow-e4 ring-1 ring-white/10",
                className,
            )}
        >
            <div className="flex h-9 items-center gap-2 border-b border-border-subtle bg-surface px-3">
                <span className="h-2 w-2 rounded-full bg-danger/70" />
                <span className="h-2 w-2 rounded-full bg-warning/70" />
                <span className="h-2 w-2 rounded-full bg-live/70" />
                <span className="mx-auto font-mono text-[8px] tracking-wider text-text-faint">
                    CORVUS / NORTHSTAR
                </span>
                <MoreHorizontal size={13} className="text-text-faint" />
            </div>
            <div className="grid h-[430px] grid-cols-[48px_132px_minmax(0,1fr)] sm:grid-cols-[56px_170px_minmax(0,1fr)]">
                <aside className="flex flex-col items-center gap-3 bg-bg-deep py-3">
                    <img src="/corvus-logo-small.png" alt="" className="h-7 w-7 rounded-md" />
                    <span className="h-px w-6 bg-border-subtle" />
                    {["N", "D", "O"].map((x, i) => (
                        <span
                            key={x}
                            className={cn(
                                "grid h-7 w-7 place-items-center rounded-md text-[9px] font-semibold",
                                i === 0
                                    ? "bg-accent-soft text-accent"
                                    : "bg-surface text-text-muted",
                            )}
                        >
                            {x}
                        </span>
                    ))}
                </aside>
                <aside className="overflow-hidden bg-channel-sidebar px-2 py-3">
                    <p className="truncate px-2 text-[11px] font-semibold">Northstar</p>
                    <p className="mt-4 px-2 text-[9px] font-semibold text-text-faint">
                        CONVERSATIONS
                    </p>
                    {["general", "desktop", "release-notes"].map((x, i) => (
                        <div
                            key={x}
                            className={cn(
                                "mt-1 flex h-7 items-center gap-1.5 rounded px-2 text-[10px]",
                                i === 1 && mode === "messages"
                                    ? "bg-active-row text-text-primary"
                                    : "text-text-muted",
                            )}
                        >
                            <Hash size={11} />
                            <span className="truncate">{x}</span>
                        </div>
                    ))}
                    <p className="mt-4 px-2 text-[9px] font-semibold text-text-faint">VOICE</p>
                    <div className="mt-1 flex items-center gap-1.5 px-2 text-[10px] text-live">
                        <Volume2 size={11} />
                        design-sync
                    </div>
                    <div className="mt-2 flex -space-x-1 px-2">
                        {members.map((_, i) => (
                            <Avatar key={i} index={i} size="sm" />
                        ))}
                    </div>
                </aside>
                <main className="min-w-0 bg-background">
                    <div className="flex h-11 items-center border-b border-border-subtle px-4">
                        <Hash size={14} className="text-text-muted" />
                        <span className="ml-2 text-[12px] font-semibold">
                            {mode === "messages" ? "desktop" : mode}
                        </span>
                        <span className="ml-auto flex gap-3 text-text-faint">
                            <Search size={14} />
                            <MoreHorizontal size={14} />
                        </span>
                    </div>
                    <div className="h-[386px]">{content}</div>
                </main>
            </div>
        </div>
    );
}
