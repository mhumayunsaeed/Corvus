import { parse } from "node-html-parser";
import { resolve as dnsResolve } from "node:dns/promises";
import { isIP } from "node:net";

const URL_REGEX = /https?:\/\/[^\s<>[\]()]+/gi;

function isPrivateIP(ip: string): boolean {
    // IPv4 private/reserved ranges
    const parts = ip.split(".").map(Number);
    if (parts.length === 4) {
        if (parts[0] === 127) return true;                          // 127.0.0.0/8
        if (parts[0] === 10) return true;                           // 10.0.0.0/8
        if (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) return true; // 172.16.0.0/12
        if (parts[0] === 192 && parts[1] === 168) return true;     // 192.168.0.0/16
        if (parts[0] === 169 && parts[1] === 254) return true;     // 169.254.0.0/16
        if (parts[0] === 0) return true;                            // 0.0.0.0/8
    }
    // IPv6 loopback and private
    if (ip === "::1" || ip === "::") return true;
    if (ip.startsWith("fc") || ip.startsWith("fd")) return true;   // fc00::/7
    if (ip.startsWith("fe80")) return true;                         // link-local
    return false;
}

async function isUrlSafe(url: string): Promise<boolean> {
    try {
        const parsed = new URL(url);
        if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return false;

        const hostname = parsed.hostname;

        // Check if hostname is a direct IP
        if (isIP(hostname)) return !isPrivateIP(hostname);

        // Resolve hostname and check all IPs
        const addresses = await dnsResolve(hostname);
        return addresses.every((addr) => !isPrivateIP(addr));
    } catch {
        return false;
    }
}

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

// Twitter/X returns garbage HTML to bots — build a synthetic embed instead
function buildTwitterEmbed(url: string): EmbedMetadata {
    try {
        const parsed = new URL(url);
        const parts = parsed.pathname.split("/").filter(Boolean);
        // Extract @username from /username/status/123 pattern
        const username = parts.length > 0 ? parts[0] : null;
        const isStatus = parts.includes("status");

        return {
            url,
            siteName: "X (formerly Twitter)",
            title: isStatus && username
                ? `${username.startsWith("@") ? username : `@${username}`} on X`
                : "X (formerly Twitter)",
            description: null,
            imageUrl: null,
            faviconUrl: "https://abs.twimg.com/favicons/twitter.3.ico",
        };
    } catch {
        return {
            url,
            siteName: "X (formerly Twitter)",
            title: "Post on X",
            description: null,
            imageUrl: null,
            faviconUrl: "https://abs.twimg.com/favicons/twitter.3.ico",
        };
    }
}

function isTwitterUrl(url: string): boolean {
    try {
        const parsed = new URL(url);
        return parsed.hostname === "x.com"
            || parsed.hostname === "www.x.com"
            || parsed.hostname === "twitter.com"
            || parsed.hostname === "www.twitter.com"
            || parsed.hostname === "mobile.twitter.com"
            || parsed.hostname === "mobile.x.com";
    } catch {
        return false;
    }
}

export async function unfurlUrl(url: string): Promise<EmbedMetadata | null> {
    // Check cache
    const cached = cache.get(url);
    if (cached && cached.expiresAt > Date.now()) {
        return cached.data;
    }

    // Twitter/X is hostile to bot scraping — return synthetic embed
    if (isTwitterUrl(url)) {
        const result = buildTwitterEmbed(url);
        cache.set(url, { data: result, expiresAt: Date.now() + CACHE_TTL });
        cleanCache();
        return result;
    }

    try {
        // SSRF protection: block private/internal IPs
        if (!(await isUrlSafe(url))) {
            cache.set(url, { data: null, expiresAt: Date.now() + CACHE_TTL });
            return null;
        }

        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 3000);

        const res = await fetch(url, {
            signal: controller.signal,
            headers: {
                "User-Agent": "CorvusBot/1.0 (+https://corvus.app)",
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
