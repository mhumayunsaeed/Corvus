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

const MENTION_REGEX = /@(\w+)/g;

/**
 * Process a plain text segment to highlight @mentions.
 */
function highlightMentions(text: string, keyPrefix: string): ReactNode[] {
    const parts: ReactNode[] = [];
    let lastIdx = 0;
    let m: RegExpExecArray | null;

    MENTION_REGEX.lastIndex = 0;
    while ((m = MENTION_REGEX.exec(text)) !== null) {
        if (m.index > lastIdx) {
            parts.push(
                <span key={`${keyPrefix}-t-${lastIdx}`} className="whitespace-pre-wrap break-words">
                    {text.slice(lastIdx, m.index)}
                </span>
            );
        }
        const mention = m[0];
        const isSpecial = m[1] === "everyone" || m[1] === "here";
        parts.push(
            <span
                key={`${keyPrefix}-m-${m.index}`}
                className={`rounded px-0.5 font-medium ${
                    isSpecial
                        ? "bg-warning/20 text-warning"
                        : "bg-accent-violet/20 text-accent-violet"
                } cursor-pointer hover:underline`}
            >
                {mention}
            </span>
        );
        lastIdx = m.index + m[0].length;
    }

    if (lastIdx < text.length) {
        parts.push(
            <span key={`${keyPrefix}-t-${lastIdx}`} className="whitespace-pre-wrap break-words">
                {text.slice(lastIdx)}
            </span>
        );
    }

    return parts.length > 0 ? parts : [<span key={keyPrefix} className="whitespace-pre-wrap break-words">{text}</span>];
}

/**
 * Like linkifyMessageText but also highlights @mentions in plain text segments.
 */
export function linkifyAndMentionText(content: string): ReactNode[] {
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
            nodes.push(...highlightMentions(content.slice(lastIndex, start), `pre-${start}`));
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
        nodes.push(...highlightMentions(content.slice(lastIndex), `end-${lastIndex}`));
    }

    return nodes.length > 0 ? nodes : highlightMentions(content, "full");
}
