const DEV_API_URL = "http://localhost:3001";

function trimTrailingSlash(url: string) {
    return url.replace(/\/+$/, "");
}

const envApiUrl = process.env.NEXT_PUBLIC_API_URL?.trim() || "";
const isDev = process.env.NODE_ENV !== "production";

export const API_URL = trimTrailingSlash(envApiUrl || (isDev ? DEV_API_URL : ""));

export function ensureApiUrl() {
    if (!API_URL) {
        throw new Error(
            "NEXT_PUBLIC_API_URL is not configured for this build. " +
            "Set it in the release workflow environment before building desktop."
        );
    }
    return API_URL;
}
