"use client";

import { useEffect, useMemo, useState } from "react";
import {
    Users,
    PanelRightClose,
    Crown,
    Shield,
    ChevronLeft,
    AtSign,
    CalendarDays,
} from "lucide-react";
import { fetchMembers, type MemberData } from "@/lib/api";
import { UserAvatar } from "@/components/app/UserAvatar";
import { getUsernameColor } from "@/lib/color-utils";

const STORAGE_KEY = "corvus-context-open";

const ONLINE_STATUSES = new Set(["online", "idle", "dnd"]);
const STATUS_COLOR: Record<string, string> = {
    online: "#22C55E",
    idle: "#F59E0B",
    dnd: "#EF4444",
    invisible: "#6B7280",
    offline: "#6B7280",
};

interface ContextPanelProps {
    serverId: string;
}

export function ContextPanel({ serverId }: ContextPanelProps) {
    const [open, setOpen] = useState(true);
    const [members, setMembers] = useState<MemberData[]>([]);
    const [loading, setLoading] = useState(false);
    const [selected, setSelected] = useState<MemberData | null>(null);

    // Restore persisted open state.
    useEffect(() => {
        if (typeof localStorage === "undefined") return;
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored !== null) setOpen(stored === "true");
    }, []);

    const toggle = () => {
        setOpen((prev) => {
            const next = !prev;
            if (typeof localStorage !== "undefined") {
                localStorage.setItem(STORAGE_KEY, String(next));
            }
            return next;
        });
    };

    // Return to the member list when switching spaces.
    useEffect(() => {
        setSelected(null);
    }, [serverId]);

    // Load members when the active server changes (and panel is open).
    useEffect(() => {
        if (!open) return;
        let cancelled = false;
        setLoading(true);
        fetchMembers(serverId)
            .then((result) => {
                if (!cancelled) setMembers(result.members);
            })
            .catch(() => {
                if (!cancelled) setMembers([]);
            })
            .finally(() => {
                if (!cancelled) setLoading(false);
            });
        return () => {
            cancelled = true;
        };
    }, [serverId, open]);

    // Reflect live presence changes.
    useEffect(() => {
        const handler = (event: Event) => {
            const detail = (event as CustomEvent<{ userId?: string; status?: string }>)
                .detail;
            if (!detail?.userId || !detail.status) return;
            setMembers((prev) =>
                prev.map((m) =>
                    m.user.id === detail.userId
                        ? { ...m, user: { ...m.user, status: detail.status! } }
                        : m
                )
            );
        };
        window.addEventListener("corvus:presence_update", handler as EventListener);
        return () =>
            window.removeEventListener(
                "corvus:presence_update",
                handler as EventListener
            );
    }, []);

    const { online, offline } = useMemo(() => {
        const sortByName = (a: MemberData, b: MemberData) =>
            (a.nickname || a.user.displayName).localeCompare(
                b.nickname || b.user.displayName
            );
        const on = members
            .filter((m) => ONLINE_STATUSES.has(m.user.status))
            .sort(sortByName);
        const off = members
            .filter((m) => !ONLINE_STATUSES.has(m.user.status))
            .sort(sortByName);
        return { online: on, offline: off };
    }, [members]);

    if (!open) {
        return (
            <div className="hidden flex-shrink-0 flex-col items-center border-l border-border-subtle bg-member-sidebar py-3 lg:flex">
                <button
                    onClick={toggle}
                    title="Show members"
                    className="flex h-9 w-9 items-center justify-center rounded-lg text-text-muted transition-colors hover:bg-hover-row-strong hover:text-text-secondary"
                >
                    <Users className="h-4 w-4" />
                </button>
            </div>
        );
    }

    const RoleIcon = ({ role }: { role: string }) =>
        role === "owner" ? (
            <Crown className="h-3 w-3 text-accent-warm" />
        ) : role === "admin" ? (
            <Shield className="h-3 w-3 text-accent" />
        ) : null;

    const renderGroup = (label: string, list: MemberData[]) => {
        if (list.length === 0) return null;
        return (
            <div className="mb-4">
                <div className="px-2 pb-1.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-text-faint">
                    {label} — {list.length}
                </div>
                <div className="space-y-0.5">
                    {list.map((member) => {
                        const status = member.user.status || "offline";
                        const isOffline = !ONLINE_STATUSES.has(status);
                        return (
                            <button
                                key={member.id}
                                onClick={() => setSelected(member)}
                                className={`flex w-full items-center gap-2.5 rounded-lg px-2 py-1.5 text-left transition-colors hover:bg-hover-row ${isOffline ? "opacity-60" : ""}`}
                            >
                                <div className="relative flex-shrink-0">
                                    <UserAvatar
                                        avatarUrl={member.user.avatarUrl}
                                        username={member.user.username}
                                        className="h-7 w-7"
                                    />
                                    <span
                                        className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-member-sidebar"
                                        style={{ backgroundColor: STATUS_COLOR[status] }}
                                    />
                                </div>
                                <span className="min-w-0 flex-1 truncate text-[13px] font-medium">
                                    <span
                                        style={{
                                            color: getUsernameColor(member.user.username),
                                        }}
                                    >
                                        {member.nickname || member.user.displayName}
                                    </span>
                                </span>
                                <RoleIcon role={member.role} />
                            </button>
                        );
                    })}
                </div>
            </div>
        );
    };

    const renderProfile = (member: MemberData) => {
        const status = member.user.status || "offline";
        const roleLabel =
            member.role === "owner"
                ? "Owner"
                : member.role === "admin"
                  ? "Admin"
                  : "Member";
        const joined = new Date(member.joinedAt);
        return (
            <div className="p-3">
                {/* Brand banner */}
                <div className="relative mb-9 h-20 overflow-hidden rounded-xl">
                    <div
                        className="absolute inset-0 opacity-80"
                        style={{ background: "var(--aurora-gradient)" }}
                    />
                    <div className="absolute -bottom-7 left-3">
                        <div className="relative">
                            <UserAvatar
                                avatarUrl={member.user.avatarUrl}
                                username={member.user.username}
                                className="h-14 w-14 rounded-2xl ring-4 ring-member-sidebar"
                            />
                            <span
                                className="absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full border-2 border-member-sidebar"
                                style={{ backgroundColor: STATUS_COLOR[status] }}
                            />
                        </div>
                    </div>
                </div>

                <div className="rounded-xl border border-border-subtle bg-surface p-3">
                    <div className="flex items-center gap-1.5">
                        <span
                            className="truncate text-[15px] font-semibold"
                            style={{ color: getUsernameColor(member.user.username) }}
                        >
                            {member.nickname || member.user.displayName}
                        </span>
                        <RoleIcon role={member.role} />
                    </div>
                    <div className="mt-0.5 flex items-center gap-1 text-[12px] text-text-muted">
                        <AtSign className="h-3 w-3" />
                        {member.user.username}
                    </div>

                    <div className="my-3 h-px bg-border-subtle" />

                    <div className="mb-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-text-faint">
                        Role
                    </div>
                    <span className="inline-flex items-center gap-1.5 rounded-md bg-accent-soft px-2 py-0.5 text-[12px] font-medium text-accent">
                        {roleLabel}
                    </span>

                    {member.user.bio && (
                        <>
                            <div className="mb-1 mt-3 text-[10px] font-semibold uppercase tracking-[0.08em] text-text-faint">
                                About
                            </div>
                            <p className="text-[12px] leading-relaxed text-text-secondary">
                                {member.user.bio}
                            </p>
                        </>
                    )}

                    <div className="mt-3 flex items-center gap-1.5 text-[11px] text-text-faint">
                        <CalendarDays className="h-3 w-3" />
                        Member since{" "}
                        {joined.toLocaleDateString(undefined, {
                            month: "short",
                            year: "numeric",
                        })}
                    </div>
                </div>
            </div>
        );
    };

    return (
        <aside className="hidden w-60 flex-shrink-0 flex-col border-l border-border-subtle bg-member-sidebar lg:flex">
            <div className="flex h-[52px] flex-shrink-0 items-center justify-between border-b border-border-subtle px-4">
                <span className="flex items-center gap-2 text-[13px] font-semibold text-text-primary">
                    {selected ? (
                        <button
                            onClick={() => setSelected(null)}
                            className="flex items-center gap-1.5 text-text-secondary transition-colors hover:text-text-primary"
                        >
                            <ChevronLeft className="h-4 w-4" />
                            Profile
                        </button>
                    ) : (
                        <>
                            <Users className="h-4 w-4 text-text-muted" />
                            Members
                        </>
                    )}
                </span>
                <button
                    onClick={toggle}
                    title="Hide members"
                    className="flex h-7 w-7 items-center justify-center rounded-md text-text-muted transition-colors hover:bg-hover-row-strong hover:text-text-secondary"
                >
                    <PanelRightClose className="h-4 w-4" />
                </button>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto scrollbar-none">
                {selected ? (
                    renderProfile(selected)
                ) : (
                    <div className="p-2">
                        {loading && members.length === 0 ? (
                            <div className="space-y-2 p-1">
                                {Array.from({ length: 6 }).map((_, i) => (
                                    <div key={i} className="flex items-center gap-2.5 px-1 py-1">
                                        <div className="h-7 w-7 animate-pulse rounded-full bg-surface-raised" />
                                        <div className="h-3 w-24 animate-pulse rounded bg-surface-raised" />
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <>
                                {renderGroup("Online", online)}
                                {renderGroup("Offline", offline)}
                                {members.length === 0 && (
                                    <div className="px-2 py-8 text-center text-[12px] text-text-muted">
                                        No members to show.
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                )}
            </div>
        </aside>
    );
}
