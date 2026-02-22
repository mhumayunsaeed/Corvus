"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Loader2 } from "lucide-react";
import {
    acceptFriendRequest,
    blockUser,
    cancelFriendRequest,
    declineFriendRequest,
    fetchFriendDashboard,
    removeFriend,
    searchFriendUsers,
    sendFriendRequest,
    unblockUser,
    type FriendDashboardData,
    type FriendRelationStatus,
    type FriendSearchResult,
} from "@/lib/api";

type FriendTab = "online" | "all" | "pending" | "blocked" | "add";

interface FriendsViewProps {
    onMessageFriend?: (friendUserId: string) => Promise<void> | void;
}

const emptyState: FriendDashboardData = {
    friends: [],
    pendingIncoming: [],
    pendingOutgoing: [],
    blocked: [],
};

function avatarFor(username: string, avatarUrl: string | null) {
    return avatarUrl || `https://api.dicebear.com/9.x/avataaars/svg?seed=${username}`;
}

function relationLabel(status: FriendRelationStatus) {
    if (status === "friends") return "Friends";
    if (status === "incoming_request") return "Incoming request";
    if (status === "outgoing_request") return "Request sent";
    if (status === "blocked_by_you") return "Blocked by you";
    if (status === "blocked_you") return "Blocked you";
    return "No connection";
}

export function FriendsView({ onMessageFriend }: FriendsViewProps) {
    const [tab, setTab] = useState<FriendTab>("online");
    const [loading, setLoading] = useState(true);
    const [dashboard, setDashboard] = useState<FriendDashboardData>(emptyState);
    const [error, setError] = useState<string | null>(null);
    const [notice, setNotice] = useState<string | null>(null);
    const [actionId, setActionId] = useState<string | null>(null);
    const [query, setQuery] = useState("");
    const [searching, setSearching] = useState(false);
    const [searched, setSearched] = useState(false);
    const [results, setResults] = useState<FriendSearchResult[]>([]);
    const [dmLoadingId, setDmLoadingId] = useState<string | null>(null);

    const loadDashboard = useCallback(async () => {
        const data = await fetchFriendDashboard();
        setDashboard(data);
    }, []);

    useEffect(() => {
        (async () => {
            try {
                setLoading(true);
                setError(null);
                await loadDashboard();
            } catch (err) {
                setError(err instanceof Error ? err.message : "Failed to load friends.");
            } finally {
                setLoading(false);
            }
        })();
    }, [loadDashboard]);

    const refreshSearch = useCallback(async () => {
        const q = query.trim();
        if (!searched || q.length < 2) return;
        const data = await searchFriendUsers(q);
        setResults(data.users);
    }, [query, searched]);

    const runAction = useCallback(
        async (id: string, action: () => Promise<unknown>, success: string) => {
            setActionId(id);
            setError(null);
            setNotice(null);
            try {
                await action();
                await loadDashboard();
                await refreshSearch();
                setNotice(success);
            } catch (err) {
                setError(err instanceof Error ? err.message : "Action failed.");
            } finally {
                setActionId(null);
            }
        },
        [loadDashboard, refreshSearch]
    );

    const handleSearch = async (e: React.FormEvent) => {
        e.preventDefault();
        const q = query.trim();
        setSearched(true);
        setError(null);
        setNotice(null);

        if (q.length < 2) {
            setResults([]);
            setError("Enter at least 2 characters.");
            return;
        }

        try {
            setSearching(true);
            const data = await searchFriendUsers(q);
            setResults(data.users);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Search failed.");
        } finally {
            setSearching(false);
        }
    };

    const onlineFriends = useMemo(
        () => dashboard.friends.filter((f) => f.user.status === "online"),
        [dashboard.friends]
    );

    const handleMessageFriend = useCallback(
        async (friendUserId: string) => {
            if (!onMessageFriend) return;
            setDmLoadingId(friendUserId);
            setError(null);
            try {
                await onMessageFriend(friendUserId);
            } catch (err) {
                setError(err instanceof Error ? err.message : "Failed to open DM.");
            } finally {
                setDmLoadingId(null);
            }
        },
        [onMessageFriend]
    );

    if (loading) {
        return (
            <div className="flex-1 flex items-center justify-center bg-background">
                <Loader2 className="w-8 h-8 text-accent-violet animate-spin" />
            </div>
        );
    }

    const friendRows = tab === "online" ? onlineFriends : dashboard.friends;

    return (
        <div className="flex-1 flex flex-col bg-background">
            <div className="h-12 border-b border-border px-4 flex items-center gap-2">
                {(["online", "all", "pending", "blocked", "add"] as FriendTab[]).map((t) => (
                    <button
                        key={t}
                        onClick={() => setTab(t)}
                        className={`px-3 py-1.5 rounded-md text-body capitalize ${tab === t
                            ? "bg-surface-raised text-text-primary"
                            : "text-text-muted hover:text-text-primary hover:bg-hover-row"
                            }`}
                    >
                        {t === "all" ? "all friends" : t}
                    </button>
                ))}
            </div>

            <div className="px-4 py-2 border-b border-border">
                {error && <p className="text-micro text-danger">{error}</p>}
                {!error && notice && <p className="text-micro text-success">{notice}</p>}
                {!error && !notice && <p className="text-micro text-text-muted">Manage your friend network.</p>}
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-2">
                {(tab === "online" || tab === "all") && (
                    <>
                        {friendRows.length === 0 && (
                            <div className="rounded-xl border border-border bg-surface p-4 text-body text-text-muted">
                                No friends found for this tab.
                            </div>
                        )}
                        {friendRows.map((entry) => {
                            const loadingRow = actionId === `friend-${entry.user.id}`;
                            return (
                                <div key={entry.user.id} className="rounded-xl border border-border bg-surface p-3 flex items-center gap-3">
                                    <img src={avatarFor(entry.user.username, entry.user.avatarUrl)} alt={entry.user.displayName} className="w-10 h-10 rounded-full" />
                                    <div className="flex-1 min-w-0">
                                        <p className="text-body text-text-primary truncate">{entry.user.displayName}</p>
                                        <p className="text-micro text-text-muted truncate">@{entry.user.username} • {entry.user.status}</p>
                                    </div>
                                    <button
                                        onClick={() => handleMessageFriend(entry.user.id)}
                                        disabled={dmLoadingId === entry.user.id || !onMessageFriend}
                                        className="px-3 h-8 rounded-md bg-accent-violet text-micro text-white hover:bg-accent-violet/90 disabled:opacity-50"
                                    >
                                        {dmLoadingId === entry.user.id ? "..." : "Message"}
                                    </button>
                                    <button
                                        onClick={() => runAction(`friend-${entry.user.id}`, () => removeFriend(entry.user.id), "Friend removed.")}
                                        disabled={loadingRow}
                                        className="px-3 h-8 rounded-md bg-surface-raised text-micro text-text-primary hover:bg-hover-row disabled:opacity-50"
                                    >
                                        Remove
                                    </button>
                                    <button
                                        onClick={() => runAction(`friend-${entry.user.id}`, () => blockUser(entry.user.id), "User blocked.")}
                                        disabled={loadingRow}
                                        className="px-3 h-8 rounded-md bg-surface-raised text-micro text-danger hover:bg-danger/10 disabled:opacity-50"
                                    >
                                        {loadingRow ? "..." : "Block"}
                                    </button>
                                </div>
                            );
                        })}
                    </>
                )}

                {tab === "pending" && (
                    <>
                        <div className="text-micro uppercase tracking-wider text-text-muted">Incoming</div>
                        {dashboard.pendingIncoming.length === 0 && <div className="rounded-xl border border-border bg-surface p-3 text-body text-text-muted">No incoming requests.</div>}
                        {dashboard.pendingIncoming.map((entry) => (
                            <div key={entry.id} className="rounded-xl border border-border bg-surface p-3 flex items-center gap-3">
                                <img src={avatarFor(entry.user.username, entry.user.avatarUrl)} alt={entry.user.displayName} className="w-10 h-10 rounded-full" />
                                <div className="flex-1 min-w-0">
                                    <p className="text-body text-text-primary truncate">{entry.user.displayName}</p>
                                    <p className="text-micro text-text-muted truncate">@{entry.user.username}</p>
                                </div>
                                <button
                                    onClick={() => runAction(`accept-${entry.id}`, () => acceptFriendRequest(entry.id), "Friend request accepted.")}
                                    disabled={actionId === `accept-${entry.id}` || actionId === `decline-${entry.id}`}
                                    className="px-3 h-8 rounded-md bg-success/20 text-success text-micro hover:bg-success/30 disabled:opacity-50"
                                >
                                    Accept
                                </button>
                                <button
                                    onClick={() => runAction(`decline-${entry.id}`, () => declineFriendRequest(entry.id), "Friend request declined.")}
                                    disabled={actionId === `accept-${entry.id}` || actionId === `decline-${entry.id}`}
                                    className="px-3 h-8 rounded-md bg-danger/20 text-danger text-micro hover:bg-danger/30 disabled:opacity-50"
                                >
                                    Decline
                                </button>
                            </div>
                        ))}

                        <div className="text-micro uppercase tracking-wider text-text-muted pt-3">Outgoing</div>
                        {dashboard.pendingOutgoing.length === 0 && <div className="rounded-xl border border-border bg-surface p-3 text-body text-text-muted">No outgoing requests.</div>}
                        {dashboard.pendingOutgoing.map((entry) => (
                            <div key={entry.id} className="rounded-xl border border-border bg-surface p-3 flex items-center gap-3">
                                <img src={avatarFor(entry.user.username, entry.user.avatarUrl)} alt={entry.user.displayName} className="w-10 h-10 rounded-full" />
                                <div className="flex-1 min-w-0">
                                    <p className="text-body text-text-primary truncate">{entry.user.displayName}</p>
                                    <p className="text-micro text-text-muted truncate">@{entry.user.username}</p>
                                </div>
                                <button
                                    onClick={() => runAction(`cancel-${entry.id}`, () => cancelFriendRequest(entry.id), "Friend request canceled.")}
                                    disabled={actionId === `cancel-${entry.id}`}
                                    className="px-3 h-8 rounded-md bg-surface-raised text-micro text-text-primary hover:bg-hover-row disabled:opacity-50"
                                >
                                    Cancel
                                </button>
                            </div>
                        ))}
                    </>
                )}

                {tab === "blocked" && (
                    <>
                        {dashboard.blocked.length === 0 && <div className="rounded-xl border border-border bg-surface p-4 text-body text-text-muted">No blocked users.</div>}
                        {dashboard.blocked.map((entry) => (
                            <div key={entry.user.id} className="rounded-xl border border-border bg-surface p-3 flex items-center gap-3">
                                <img src={avatarFor(entry.user.username, entry.user.avatarUrl)} alt={entry.user.displayName} className="w-10 h-10 rounded-full" />
                                <div className="flex-1 min-w-0">
                                    <p className="text-body text-text-primary truncate">{entry.user.displayName}</p>
                                    <p className="text-micro text-text-muted truncate">@{entry.user.username}</p>
                                </div>
                                <button
                                    onClick={() => runAction(`unblock-${entry.user.id}`, () => unblockUser(entry.user.id), "User unblocked.")}
                                    disabled={actionId === `unblock-${entry.user.id}`}
                                    className="px-3 h-8 rounded-md bg-surface-raised text-micro text-success hover:bg-success/10 disabled:opacity-50"
                                >
                                    Unblock
                                </button>
                            </div>
                        ))}
                    </>
                )}

                {tab === "add" && (
                    <>
                        <form onSubmit={handleSearch} className="flex gap-2">
                            <input
                                type="text"
                                value={query}
                                onChange={(e) => setQuery(e.target.value)}
                                placeholder="Search by username or email"
                                className="flex-1 h-10 rounded-xl border border-border bg-surface-raised px-3 text-body text-text-primary placeholder:text-text-muted outline-none focus:border-accent-violet"
                            />
                            <button
                                type="submit"
                                disabled={searching}
                                className="px-4 h-10 rounded-xl bg-accent-violet text-white text-body hover:bg-accent-violet/90 disabled:opacity-60"
                            >
                                {searching ? "..." : "Search"}
                            </button>
                        </form>

                        {searched && results.length === 0 && !searching && (
                            <div className="rounded-xl border border-border bg-surface p-4 text-body text-text-muted">No users found.</div>
                        )}

                        {results.map((entry) => (
                            <div key={entry.id} className="rounded-xl border border-border bg-surface p-3 flex items-center gap-3">
                                <img src={avatarFor(entry.username, entry.avatarUrl)} alt={entry.displayName} className="w-10 h-10 rounded-full" />
                                <div className="flex-1 min-w-0">
                                    <p className="text-body text-text-primary truncate">{entry.displayName}</p>
                                    <p className="text-micro text-text-muted truncate">@{entry.username} • {entry.email}</p>
                                </div>
                                <span className="text-micro text-text-muted hidden sm:block">{relationLabel(entry.relationStatus)}</span>

                                {entry.relationStatus === "none" && (
                                    <button
                                        onClick={() => runAction(`send-${entry.id}`, () => sendFriendRequest(entry.username), "Friend request sent.")}
                                        disabled={actionId === `send-${entry.id}`}
                                        className="px-3 h-8 rounded-md bg-accent-violet text-micro text-white hover:bg-accent-violet/90 disabled:opacity-60"
                                    >
                                        Send Request
                                    </button>
                                )}

                                {entry.relationStatus === "incoming_request" && entry.pendingRequestId && (
                                    <>
                                        <button
                                            onClick={() => runAction(`s-accept-${entry.pendingRequestId}`, () => acceptFriendRequest(entry.pendingRequestId!), "Friend request accepted.")}
                                            disabled={actionId === `s-accept-${entry.pendingRequestId}` || actionId === `s-decline-${entry.pendingRequestId}`}
                                            className="px-3 h-8 rounded-md bg-success/20 text-success text-micro hover:bg-success/30 disabled:opacity-50"
                                        >
                                            Accept
                                        </button>
                                        <button
                                            onClick={() => runAction(`s-decline-${entry.pendingRequestId}`, () => declineFriendRequest(entry.pendingRequestId!), "Friend request declined.")}
                                            disabled={actionId === `s-accept-${entry.pendingRequestId}` || actionId === `s-decline-${entry.pendingRequestId}`}
                                            className="px-3 h-8 rounded-md bg-danger/20 text-danger text-micro hover:bg-danger/30 disabled:opacity-50"
                                        >
                                            Decline
                                        </button>
                                    </>
                                )}

                                {entry.relationStatus === "outgoing_request" && entry.pendingRequestId && (
                                    <button
                                        onClick={() => runAction(`s-cancel-${entry.pendingRequestId}`, () => cancelFriendRequest(entry.pendingRequestId!), "Friend request canceled.")}
                                        disabled={actionId === `s-cancel-${entry.pendingRequestId}`}
                                        className="px-3 h-8 rounded-md bg-surface-raised text-micro text-text-primary hover:bg-hover-row disabled:opacity-50"
                                    >
                                        Cancel
                                    </button>
                                )}

                                {entry.relationStatus === "blocked_by_you" && (
                                    <button
                                        onClick={() => runAction(`s-unblock-${entry.id}`, () => unblockUser(entry.id), "User unblocked.")}
                                        disabled={actionId === `s-unblock-${entry.id}`}
                                        className="px-3 h-8 rounded-md bg-surface-raised text-micro text-success hover:bg-success/10 disabled:opacity-50"
                                    >
                                        Unblock
                                    </button>
                                )}
                            </div>
                        ))}
                    </>
                )}
            </div>
        </div>
    );
}
