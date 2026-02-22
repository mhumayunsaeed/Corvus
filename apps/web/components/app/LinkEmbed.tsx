"use client";

import type { MessageEmbedData } from "@/lib/api";

interface LinkEmbedProps {
    embed: MessageEmbedData;
}

export function LinkEmbed({ embed }: LinkEmbedProps) {
    if (!embed.title && !embed.description) return null;

    return (
        <a
            href={embed.url}
            target="_blank"
            rel="noopener noreferrer"
            className="block mt-2 max-w-[520px] rounded-lg overflow-hidden bg-surface border border-border hover:border-accent-violet/30 transition-colors"
        >
            <div className="flex">
                {/* Left accent bar */}
                <div className="w-[3px] bg-accent-violet flex-shrink-0" />

                <div className="flex-1 p-3 min-w-0">
                    {/* Site name + favicon */}
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

                    {/* Title */}
                    {embed.title && (
                        <div className="text-body font-semibold text-accent-violet leading-tight mb-1 line-clamp-2">
                            {embed.title}
                        </div>
                    )}

                    {/* Description */}
                    {embed.description && (
                        <div className="text-micro text-text-muted line-clamp-3 leading-relaxed">
                            {embed.description}
                        </div>
                    )}
                </div>

                {/* Optional thumbnail */}
                {embed.imageUrl && (
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
    );
}
