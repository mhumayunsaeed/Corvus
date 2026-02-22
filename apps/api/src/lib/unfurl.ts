import { parse } from "node-html-parser";

const URL_REGEX = /https?:\/\/[^\s<>\[\]()]+/gi;

export interface EmbedMetadata {
    url: string;
    siteName: string | null;
    title: string | null;
    description: string | null;
    imageUrl: string | null;
    faviconUrl: string | null;
}

// Simple LRU cache
const cache = new Map<string, { data: EmbedMetadata | null; expiresAt: number }>();
const CACHE_TTL = 60 * 60 * 1000; // 1 hour
const MAX_CACHE = 500;

function cleanCache() {
    if (cache.size <= MAX_CACHE) return;
    const now = Date.now();
    for (const [key, entry] of cache) {
        if (entry.expiresAt < now) {
            cache.delete(key);
        }
    }
    // If still over limit, remove oldest entries
    if (cache.size > MAX_CACHE) {
        const keys = Array.from(cache.keys());
        for (let i = 0; i < keys.length - MAX_CACHE; i++) {
            cache.delete(keys[i]);
        }
    }
}

export function extractUrls(content: string): string[] {
    const matches = content.match(URL_REGEX);
    if (!matches) return [];
    // Deduplicate and limit to 5
    return [...new Set(matches)].slice(0, 5);
}

function resolveUrl(base: string, relative: string | null | undefined): string | null {
    if (!relative) return null;
    try {
        return new URL(relative, base).href;
    } catch {
        return null;
    }
}

export async function unfurlUrl(url: string): Promise<EmbedMetadata | null> {
    // Check cache
    const cached = cache.get(url);
    if (cached && cached.expiresAt > Date.now()) {
        return cached.data;
    }

    try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 3000);

        const res = await fetch(url, {
            signal: controller.signal,
            headers: {
                "User-Agent": "VeyraBot/1.0 (+https://veyra.app)",
                Accept: "text/html,application/xhtml+xml",
            },
            redirect: "follow",
        });

        clearTimeout(timeout);

        if (!res.ok) {
            cache.set(url, { data: null, expiresAt: Date.now() + CACHE_TTL });
            cleanCache();
            return null;
        }

        const contentType = res.headers.get("content-type") || "";
        if (!contentType.includes("text/html") && !contentType.includes("application/xhtml")) {
            cache.set(url, { data: null, expiresAt: Date.now() + CACHE_TTL });
            cleanCache();
            return null;
        }

        const html = await res.text();
        const root = parse(html);

        // Extract OG tags
        const getMeta = (property: string): string | null => {
            const el =
                root.querySelector(`meta[property="${property}"]`) ||
                root.querySelector(`meta[name="${property}"]`);
            return el?.getAttribute("content") || null;
        };

        const ogTitle = getMeta("og:title");
        const ogDescription = getMeta("og:description");
        const ogImage = getMeta("og:image");
        const ogSiteName = getMeta("og:site_name");

        // Fallbacks
        const title = ogTitle || root.querySelector("title")?.textContent?.trim() || null;
        const description =
            ogDescription ||
            getMeta("description") ||
            getMeta("twitter:description") ||
            null;
        const imageUrl = resolveUrl(url, ogImage || getMeta("twitter:image"));

        // Favicon
        const faviconLink =
            root.querySelector('link[rel="icon"]') ||
            root.querySelector('link[rel="shortcut icon"]') ||
            root.querySelector('link[rel="apple-touch-icon"]');
        const faviconHref = faviconLink?.getAttribute("href");
        const faviconUrl = resolveUrl(url, faviconHref) || `${new URL(url).origin}/favicon.ico`;

        // Site name fallback to hostname
        const siteName = ogSiteName || new URL(url).hostname.replace(/^www\./, "");

        const result: EmbedMetadata = {
            url,
            siteName,
            title: title?.slice(0, 256) || null,
            description: description?.slice(0, 300) || null,
            imageUrl,
            faviconUrl,
        };

        cache.set(url, { data: result, expiresAt: Date.now() + CACHE_TTL });
        cleanCache();
        return result;
    } catch {
        cache.set(url, { data: null, expiresAt: Date.now() + CACHE_TTL });
        cleanCache();
        return null;
    }
}
