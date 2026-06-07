"use client";

import { useEffect, useRef, useState } from "react";
import { Search, X, Loader2 } from "lucide-react";
import { searchDMMessages, type DMSearchResult } from "@/lib/api";
import { UserAvatar } from "./UserAvatar";
import { getUsernameColor } from "@/lib/color-utils";

interface DMSearchPanelProps {
    conversationId: string;
    title: string;
    onClose: () => void;
}

function formatWhen(iso: string) {
    return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export function DMSearchPanel({ conversationId, title, onClose }: DMSearchPanelProps) {
    const [query, setQuery] = useState("");
    const [results, setResults] = useState<DMSearchResult[]>([]);
    const [loading, setLoading] = useState(false);
    const [searched, setSearched] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        inputRef.current?.focus();
    }, []);

    useEffect(() => {
        const trimmed = query.trim();
        if (trimmed.length < 2) {
            setResults([]);
            setSearched(false);
            return;
        }
        let cancelled = false;
        setLoading(true);
        const handle = setTimeout(() => {
            searchDMMessages(conversationId, trimmed)
                .then((res) => {
                    if (!cancelled) {
                        setResults(res.results);
                        setSearched(true);
                    }
                })
                .catch(() => {
                    if (!cancelled) setResults([]);
                })
                .finally(() => {
                    if (!cancelled) setLoading(false);
                });
        }, 280);
        return () => {
            cancelled = true;
            clearTimeout(handle);
        };
    }, [query, conversationId]);

    return (
        <div className="absolute right-3 top-[56px] z-50 w-[380px] max-w-[calc(100vw-2rem)] overflow-hidden rounded-2xl border border-border-highlight bg-surface-overlay shadow-e3 animate-scale-in">
            <div className="flex items-center gap-2.5 border-b border-border-subtle px-3.5">
                <Search className="h-4 w-4 flex-shrink-0 text-text-muted" />
                <input
                    ref={inputRef}
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onKeyDown={(e) => {
                        if (e.key === "Escape") onClose();
                    }}
                    placeholder={`Search ${title}`}
                    className="h-11 flex-1 bg-transparent text-[14px] text-text-primary placeholder:text-text-muted focus:outline-none"
                />
                {loading && <Loader2 className="h-3.5 w-3.5 animate-spin text-text-muted" />}
                <button
                    onClick={onClose}
                    aria-label="Close search"
                    className="flex h-6 w-6 items-center justify-center rounded-md text-text-muted transition-colors hover:bg-hover-row-strong hover:text-text-primary"
                >
                    <X className="h-3.5 w-3.5" />
                </button>
            </div>

            <div className="max-h-[50vh] overflow-y-auto p-1.5 scrollbar-none">
                {query.trim().length < 2 ? (
                    <div className="px-3 py-8 text-center text-[12px] text-text-muted">
                        Type at least 2 characters to search.
                    </div>
                ) : searched && results.length === 0 && !loading ? (
                    <div className="px-3 py-8 text-center text-[12px] text-text-muted">
                        No messages match “{query.trim()}”.
                    </div>
                ) : (
                    results.map((r) => (
                        <div
                            key={r.id}
                            className="flex items-start gap-2.5 rounded-lg px-2.5 py-2 transition-colors hover:bg-hover-row"
                        >
                            <UserAvatar
                                avatarUrl={r.author.avatarUrl}
                                username={r.author.username}
                                className="mt-0.5 h-7 w-7 flex-shrink-0"
                            />
                            <div className="min-w-0 flex-1">
                                <div className="flex items-baseline gap-2">
                                    <span
                                        className="text-[13px] font-semibold"
                                        style={{ color: getUsernameColor(r.author.username) }}
                                    >
                                        {r.author.displayName}
                                    </span>
                                    <span className="text-[10px] text-text-faint">
                                        {formatWhen(r.createdAt)}
                                    </span>
                                </div>
                                <p className="mt-0.5 line-clamp-2 text-[13px] text-text-secondary">
                                    {r.content}
                                </p>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
