import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// ─── Direct download from Supabase Storage (releases bucket) ─────
// The desktop installer lives in the public `releases` bucket; the download
// button serves it straight from Supabase's CDN (no GitHub proxy).

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim().replace(/\/+$/, "") || "";
const RELEASES_BUCKET = process.env.NEXT_PUBLIC_RELEASES_BUCKET?.trim() || "releases";

// Object key in the `releases` bucket for each platform.
const RELEASE_KEYS: Record<string, string> = {
    windows: process.env.NEXT_PUBLIC_RELEASE_WINDOWS || "Corvus-Setup.exe",
    mac: process.env.NEXT_PUBLIC_RELEASE_MAC || "Corvus.dmg",
    linux: process.env.NEXT_PUBLIC_RELEASE_LINUX || "Corvus.AppImage",
};

function publicObjectUrl(key: string) {
    return `${SUPABASE_URL}/storage/v1/object/public/${RELEASES_BUCKET}/${encodeURIComponent(key)}`;
}

export async function GET(request: Request) {
    if (!SUPABASE_URL) {
        return NextResponse.json(
            { error: "Downloads are not configured (NEXT_PUBLIC_SUPABASE_URL missing)." },
            { status: 503 }
        );
    }

    const { searchParams } = new URL(request.url);
    const os = searchParams.get("os")?.toLowerCase() ?? "windows";
    const key = RELEASE_KEYS[os] ?? RELEASE_KEYS.windows;

    const objectUrl = publicObjectUrl(key);

    // Confirm the installer exists so we can return a clear error instead of a
    // raw storage 400 if it hasn't been uploaded yet.
    try {
        const head = await fetch(objectUrl, { method: "HEAD", cache: "no-store" });
        if (!head.ok) {
            return NextResponse.json(
                { error: `Installer "${key}" is not available yet. Please try again later.` },
                { status: 404 }
            );
        }
    } catch {
        // HEAD failed (network) — fall through and let the browser try the URL.
    }

    // `?download=<name>` makes Supabase serve Content-Disposition: attachment.
    return NextResponse.redirect(`${objectUrl}?download=${encodeURIComponent(key)}`);
}
