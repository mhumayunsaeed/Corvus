import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim().replace(/\/+$/, "") || "";
const RELEASES_BUCKET = process.env.NEXT_PUBLIC_RELEASES_BUCKET?.trim() || "releases";
const LATEST_JSON_KEY = process.env.NEXT_PUBLIC_RELEASE_LATEST_JSON?.trim() || "latest.json";

function publicObjectUrl(key: string) {
    return `${SUPABASE_URL}/storage/v1/object/public/${RELEASES_BUCKET}/${encodeURIComponent(key)}`;
}

export async function GET() {
    if (!SUPABASE_URL) {
        return new NextResponse(null, { status: 204 });
    }

    try {
        const response = await fetch(publicObjectUrl(LATEST_JSON_KEY), {
            cache: "no-store",
            headers: { Accept: "application/json" },
        });

        if (!response.ok) {
            return new NextResponse(null, { status: 204 });
        }

        const metadata = await response.json();
        if (!metadata?.version || !metadata?.platforms) {
            return new NextResponse(null, { status: 204 });
        }

        return NextResponse.json(metadata, {
            headers: {
                "Cache-Control": "no-store",
            },
        });
    } catch (err) {
        console.error("Updater API error:", err);
        return new NextResponse(null, { status: 204 });
    }
}
