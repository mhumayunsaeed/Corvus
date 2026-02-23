"use client";

import { useState, useRef, useEffect } from "react";
import type { MessageEmbedData } from "@/lib/api";

interface LinkEmbedProps {
    embed: MessageEmbedData;
}

function getYoutubeId(url: URL): string | null {
    if (url.hostname === "youtu.be") {
        const id = url.pathname.replace(/^\/+/, "").split("/")[0];
        return id || null;
    }

    if (url.hostname.includes("youtube.com")) {
        const v = url.searchParams.get("v");
        if (v) return v;

        const parts = url.pathname.split("/").filter(Boolean);
        const embedIndex = parts.indexOf("embed");
        if (embedIndex >= 0 && parts[embedIndex + 1]) {
            return parts[embedIndex + 1];
        }
    }

    return null;
}

function getVimeoId(url: URL): string | null {
    if (!url.hostname.includes("vimeo.com")) return null;
    const parts = url.pathname.split("/").filter(Boolean);
    return parts.length > 0 ? parts[parts.length - 1] : null;
}

function isTweetUrl(url: URL): boolean {
    return (
        (url.hostname.includes("twitter.com") || url.hostname.includes("x.com")) &&
        url.pathname.includes("/status/")
    );
}

function getTweetEmbedUrl(url: URL): string {
    // Normalize to twitter.com for twitframe compatibility
    const canonical = `https://twitter.com${url.pathname}`;
    return `https://twitframe.com/show?url=${encodeURIComponent(canonical)}`;
}

type PlayableInfo =
    | { kind: "direct"; src: string }
    | { kind: "iframe"; src: string }
    | { kind: "tweet"; src: string }
    | null;

function resolvePlayable(urlString: string): PlayableInfo {
    try {
        const url = new URL(urlString);
        const lowerPath = url.pathname.toLowerCase();

        if (/\.(mp4|webm|mov|m4v|ogg)(\?.*)?$/.test(lowerPath)) {
            return { kind: "direct", src: url.toString() };
        }

        const youtubeId = getYoutubeId(url);
        if (youtubeId) {
            return { kind: "iframe", src: `https://www.youtube.com/embed/${youtubeId}` };
        }

        const vimeoId = getVimeoId(url);
        if (vimeoId) {
            return { kind: "iframe", src: `https://player.vimeo.com/video/${vimeoId}` };
        }

        if (isTweetUrl(url)) {
            return { kind: "tweet", src: getTweetEmbedUrl(url) };
        }
    } catch {
        return null;
    }

    return null;
}

function TweetEmbed({ src, title }: { src: string; title: string }) {
    const iframeRef = useRef<HTMLIFrameElement>(null);
    const [height, setHeight] = useState(300);

    useEffect(() => {
        const handleMessage = (event: MessageEvent) => {
            if (event.origin !== "https://twitframe.com") return;
            try {
                const data = typeof event.data === "string" ? JSON.parse(event.data) : event.data;
                if (data.element === iframeRef.current?.id && typeof data.height === "number") {
                    setHeight(data.height);
                }
            } catch {
                // Not a twitframe message
            }
        };
        window.addEventListener("message", handleMessage);
        return () => window.removeEventListener("message", handleMessage);
    }, []);

    const iframeId = `tweet-${title.replace(/\W/g, "").slice(0, 20)}-${Date.now()}`;

    return (
        <iframe
            ref={iframeRef}
            id={iframeId}
            src={src}
            className="w-full border-0 rounded-t-lg"
            style={{ height: `${height}px`, colorScheme: "dark" }}
            loading="lazy"
            sandbox="allow-scripts allow-same-origin allow-popups"
            title={title}
        />
    );
}

export function LinkEmbed({ embed }: LinkEmbedProps) {
    if (!embed.title && !embed.description) return null;

    const playable = resolvePlayable(embed.url);

    // For tweet embeds, render a dedicated layout
    if (playable?.kind === "tweet") {
        return (
            <div className="mt-2 max-w-[520px] rounded-lg overflow-hidden bg-surface border border-border hover:border-accent-violet/30 transition-colors">
                <TweetEmbed src={playable.src} title={embed.title || embed.url} />
                <a
                    href={embed.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block"
                >
                    <div className="flex">
                        <div className="w-[3px] bg-[#1D9BF0] flex-shrink-0" />
                        <div className="flex-1 px-3 py-2 min-w-0">
                            <div className="flex items-center gap-1.5">
                                {embed.faviconUrl && (
                                    <img
                                        src={embed.faviconUrl}
                                        alt=""
                                        className="w-4 h-4 rounded-sm flex-shrink-0"
                                        onError={(e) => {
                                            (e.target as HTMLImageElement).style.display = "none";
                                        }}
                                    />
                                )}
                                <span className="text-micro text-text-muted truncate">
                                    {embed.siteName || "X (formerly Twitter)"}
                                </span>
                                {embed.title && (
                                    <>
                                        <span className="text-micro text-text-muted">·</span>
                                        <span className="text-micro font-medium text-[#1D9BF0] truncate">
                                            {embed.title}
                                        </span>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>
                </a>
            </div>
        );
    }

    return (
        <div className="mt-2 max-w-[520px] rounded-lg overflow-hidden bg-surface border border-border hover:border-accent-violet/30 transition-colors">
            {playable?.kind === "direct" && (
                <video
                    src={playable.src}
                    controls
                    className="w-full max-h-[320px] bg-black"
                />
            )}

            {playable?.kind === "iframe" && (
                <div className="w-full bg-black">
                    <iframe
                        src={playable.src}
                        className="w-full aspect-video"
                        loading="lazy"
                        allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture; web-share"
                        allowFullScreen
                        title={embed.title || embed.url}
                    />
                </div>
            )}

            <a
                href={embed.url}
                target="_blank"
                rel="noopener noreferrer"
                className="block"
            >
                <div className="flex">
                    <div className="w-[3px] bg-accent-violet flex-shrink-0" />

                    <div className="flex-1 p-3 min-w-0">
                        {(embed.siteName || embed.faviconUrl) && (
                            <div className="flex items-center gap-1.5 mb-1">
                                {embed.faviconUrl && (
                                    <img
                                        src={embed.faviconUrl}
                                        alt=""
                                        className="w-4 h-4 rounded-sm flex-shrink-0"
                                        onError={(e) => {
                                            (e.target as HTMLImageElement).style.display = "none";
                                        }}
                                    />
                                )}
                                {embed.siteName && (
                                    <span className="text-micro text-text-muted truncate">
                                        {embed.siteName}
                                    </span>
                                )}
                            </div>
                        )}

                        {embed.title && (
                            <div className="text-body font-semibold text-accent-violet leading-tight mb-1 line-clamp-2">
                                {embed.title}
                            </div>
                        )}

                        {embed.description && (
                            <div className="text-micro text-text-muted line-clamp-3 leading-relaxed">
                                {embed.description}
                            </div>
                        )}
                    </div>

                    {!playable && embed.imageUrl && (
                        <div className="flex-shrink-0 w-20 h-20 m-3 ml-0">
                            <img
                                src={embed.imageUrl}
                                alt=""
                                className="w-full h-full object-cover rounded-md"
                                onError={(e) => {
                                    (e.target as HTMLImageElement).style.display = "none";
                                }}
                            />
                        </div>
                    )}
                </div>
            </a>
        </div>
    );
}
