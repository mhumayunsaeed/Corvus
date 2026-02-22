const DEV_API_URL = "http://localhost:3001";
const DEV_WS_URL = "ws://localhost:3001/ws";

function trimTrailingSlash(url: string) {
    return url.replace(/\/+$/, "");
}

function toWebSocketUrl(httpUrl: string) {
    if (httpUrl.startsWith("https://")) {
        return `wss://${httpUrl.slice("https://".length)}/ws`;
    }
    if (httpUrl.startsWith("http://")) {
        return `ws://${httpUrl.slice("http://".length)}/ws`;
    }
    return "";
}

const envApiUrl = process.env.NEXT_PUBLIC_API_URL?.trim() || "";
const envWsUrl = process.env.NEXT_PUBLIC_WS_URL?.trim() || "";
const isDev = process.env.NODE_ENV !== "production";

export const API_URL = trimTrailingSlash(
    envApiUrl || (isDev ? DEV_API_URL : "")
);

export const WS_URL = envWsUrl || toWebSocketUrl(API_URL) || (isDev ? DEV_WS_URL : "");

export function ensureApiUrl() {
    if (!API_URL) {
        throw new Error(
            "NEXT_PUBLIC_API_URL is not configured for this build. " +
            "Set it in the release workflow environment before building desktop."
        );
    }
    return API_URL;
}

export function ensureWsUrl() {
    if (!WS_URL) {
        throw new Error(
            "NEXT_PUBLIC_WS_URL is not configured for this build. " +
            "Set NEXT_PUBLIC_WS_URL (or NEXT_PUBLIC_API_URL) in the release workflow."
        );
    }
    return WS_URL;
}
