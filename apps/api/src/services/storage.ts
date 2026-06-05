import { randomBytes } from "node:crypto";
import { getSupabaseAdmin } from "../lib/supabase.js";

/**
 * Supabase Storage service layer.
 *
 * All binary assets (avatars, server icons, message attachments, stickers) are
 * uploaded server-side using the service-role client and served from public
 * buckets via Supabase's CDN. Uploading through the API (rather than directly
 * from the browser) keeps a single authorization model: callers are
 * authenticated with the app JWT, and the service role performs the write.
 */

export const STORAGE_BUCKETS = {
    avatars: "avatars",
    serverIcons: "server-icons",
    attachments: "attachments",
    stickers: "stickers",
    releases: "releases",
} as const;

export type StorageBucket = (typeof STORAGE_BUCKETS)[keyof typeof STORAGE_BUCKETS];

/** Every bucket is public-read; writes only ever happen via the service role. */
export const ALL_BUCKETS: StorageBucket[] = Object.values(STORAGE_BUCKETS);

/** Build a collision-resistant object key, preserving an optional extension. */
export function generateObjectKey(ext: string): string {
    const normalized = ext ? (ext.startsWith(".") ? ext : `.${ext}`) : "";
    return `${Date.now()}_${randomBytes(8).toString("hex")}${normalized}`;
}

export async function uploadObject(params: {
    bucket: StorageBucket;
    key: string;
    data: Buffer | Uint8Array;
    contentType: string;
    upsert?: boolean;
}): Promise<string> {
    const supabase = getSupabaseAdmin();

    const { error } = await supabase.storage.from(params.bucket).upload(params.key, params.data, {
        contentType: params.contentType,
        upsert: params.upsert ?? false,
        cacheControl: "31536000",
    });

    if (error) {
        throw new Error(`Storage upload failed: ${error.message}`);
    }

    const { data } = supabase.storage.from(params.bucket).getPublicUrl(params.key);
    return data.publicUrl;
}

export async function deleteObject(bucket: StorageBucket, key: string): Promise<void> {
    const supabase = getSupabaseAdmin();
    const { error } = await supabase.storage.from(bucket).remove([key]);
    if (error) {
        throw new Error(`Storage delete failed: ${error.message}`);
    }
}

/**
 * Parse a `data:<mime>;base64,<payload>` URI into its mime type and raw bytes.
 * Returns null if the string is not a base64 data URI.
 */
export function parseDataUri(dataUri: string): { mime: string; bytes: Buffer } | null {
    const match = /^data:([^;,]+);base64,(.+)$/s.exec(dataUri.trim());
    if (!match) return null;
    try {
        return { mime: match[1].toLowerCase(), bytes: Buffer.from(match[2], "base64") };
    } catch {
        return null;
    }
}
