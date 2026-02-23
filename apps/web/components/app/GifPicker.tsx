"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Search, X, Loader2 } from "lucide-react";

interface GifPickerProps {
    onSelect: (gifUrl: string) => void;
    onClose: () => void;
}

interface TenorGif {
    id: string;
    title: string;
    media_formats: {
        gif: { url: string; dims: [number, number] };
        tinygif: { url: string; dims: [number, number] };
        nanogif: { url: string; dims: [number, number] };
    };
}

const TENOR_API_KEY = "AIzaSyAyimkuYQYF_FXVALexPuGQctUWRURdCYQ"; // Tenor public API key
const TENOR_BASE = "https://tenor.googleapis.com/v2";

export function GifPicker({ onSelect, onClose }: GifPickerProps) {
    const [search, setSearch] = useState("");
    const [gifs, setGifs] = useState<TenorGif[]>([]);
    const [loading, setLoading] = useState(false);
    const [next, setNext] = useState("");
    const pickerRef = useRef<HTMLDivElement>(null);
    const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);

    useEffect(() => {
        function handleClickOutside(e: MouseEvent) {
            if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
                onClose();
            }
        }
        function handleEsc(e: KeyboardEvent) {
            if (e.key === "Escape") onClose();
        }
        document.addEventListener("mousedown", handleClickOutside);
        document.addEventListener("keydown", handleEsc);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
            document.removeEventListener("keydown", handleEsc);
        };
    }, [onClose]);

    const fetchGifs = useCallback(async (query: string, pos?: string) => {
        setLoading(true);
        try {
            const endpoint = query.trim()
                ? `${TENOR_BASE}/search`
                : `${TENOR_BASE}/featured`;
            const params = new URLSearchParams({
                key: TENOR_API_KEY,
                client_key: "corvus_chat",
                limit: "30",
                media_filter: "gif,tinygif,nanogif",
            });
            if (query.trim()) params.set("q", query);
            if (pos) params.set("pos", pos);

            const res = await fetch(`${endpoint}?${params}`);
            const data = await res.json();

            if (pos) {
                setGifs((prev) => [...prev, ...(data.results || [])]);
            } else {
                setGifs(data.results || []);
            }
            setNext(data.next || "");
        } catch (err) {
            console.error("Failed to fetch GIFs:", err);
        } finally {
            setLoading(false);
        }
    }, []);

    // Load featured on mount
    useEffect(() => {
        fetchGifs("");
    }, [fetchGifs]);

    // Debounced search
    useEffect(() => {
        if (debounceRef.current) clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(() => {
            fetchGifs(search);
        }, 400);
        return () => {
            if (debounceRef.current) clearTimeout(debounceRef.current);
        };
    }, [search, fetchGifs]);

    return (
        <div
            ref={pickerRef}
            className="w-[420px] h-[460px] bg-surface border border-border rounded-xl shadow-2xl flex flex-col overflow-hidden z-50"
        >
            {/* Header */}
            <div className="p-2 border-b border-border">
                <div className="flex items-center gap-2 bg-surface-raised rounded-lg px-3 py-1.5">
                    <Search className="w-4 h-4 text-text-muted flex-shrink-0" />
                    <input
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Search Tenor..."
                        className="flex-1 bg-transparent text-sm text-text-primary placeholder:text-text-muted outline-none"
                        autoFocus
                    />
                    {search && (
                        <button onClick={() => setSearch("")} className="text-text-muted hover:text-text-primary">
                            <X className="w-3.5 h-3.5" />
                        </button>
                    )}
                </div>
            </div>

            {/* GIF grid */}
            <div className="flex-1 overflow-y-auto p-2">
                {gifs.length === 0 && !loading && (
                    <div className="flex items-center justify-center h-full text-text-muted text-sm">
                        No GIFs found
                    </div>
                )}

                <div className="columns-2 gap-2">
                    {gifs.map((gif) => (
                        <button
                            key={gif.id}
                            onClick={() => {
                                onSelect(gif.media_formats.gif.url);
                                onClose();
                            }}
                            className="w-full mb-2 rounded-lg overflow-hidden hover:ring-2 hover:ring-accent-violet transition-all break-inside-avoid"
                        >
                            <img
                                src={gif.media_formats.tinygif.url}
                                alt={gif.title}
                                className="w-full h-auto"
                                loading="lazy"
                            />
                        </button>
                    ))}
                </div>

                {loading && (
                    <div className="flex justify-center py-4">
                        <Loader2 className="w-5 h-5 text-accent-violet animate-spin" />
                    </div>
                )}

                {next && !loading && gifs.length > 0 && (
                    <button
                        onClick={() => fetchGifs(search, next)}
                        className="w-full py-2 text-sm text-accent-violet hover:underline"
                    >
                        Load more
                    </button>
                )}
            </div>

            {/* Tenor attribution */}
            <div className="px-3 py-1.5 border-t border-border flex items-center justify-end">
                <span className="text-[10px] text-text-muted">Powered by Tenor</span>
            </div>
        </div>
    );
}
