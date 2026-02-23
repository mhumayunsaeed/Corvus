import type { ReactNode } from "react";

const URL_REGEX = /https?:\/\/[^\s<>\[\]()]+/gi;

function splitTrailingPunctuation(value: string) {
    let url = value;
    let trailing = "";

    while (/[.,!?;:)\]]$/.test(url)) {
        trailing = url.slice(-1) + trailing;
        url = url.slice(0, -1);
    }

    return { url, trailing };
}

export function extractMessageUrls(content: string, max = 5): string[] {
    const matches = content.match(URL_REGEX);
    if (!matches) return [];

    const deduped = new Set<string>();
    for (const match of matches) {
        const { url } = splitTrailingPunctuation(match);
        if (url) deduped.add(url);
        if (deduped.size >= max) break;
    }

    return Array.from(deduped);
}

export function linkifyMessageText(content: string): ReactNode[] {
    const nodes: ReactNode[] = [];
    let lastIndex = 0;
    let match: RegExpExecArray | null;

    URL_REGEX.lastIndex = 0;
    while ((match = URL_REGEX.exec(content)) !== null) {
        const start = match.index;
        const raw = match[0];
        const { url, trailing } = splitTrailingPunctuation(raw);
        const matchedLength = raw.length;

        if (start > lastIndex) {
            nodes.push(
                <span key={`text-${lastIndex}`} className="whitespace-pre-wrap break-words">
                    {content.slice(lastIndex, start)}
                </span>
            );
        }

        nodes.push(
            <a
                key={`link-${start}`}
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-accent-violet hover:underline break-all"
            >
                {url}
            </a>
        );

        if (trailing) {
            nodes.push(
                <span key={`trail-${start}`} className="whitespace-pre-wrap break-words">
                    {trailing}
                </span>
            );
        }

        lastIndex = start + matchedLength;
    }

    if (lastIndex < content.length) {
        nodes.push(
            <span key={`text-${lastIndex}`} className="whitespace-pre-wrap break-words">
                {content.slice(lastIndex)}
            </span>
        );
    }

    return nodes.length > 0 ? nodes : [content];
}
