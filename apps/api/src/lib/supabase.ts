import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Server-side Supabase admin client (service-role key).
 *
 * Used to:
 *   - verify Supabase Auth access tokens (`auth.getUser`)
 *   - perform privileged Storage operations (see services/storage in later phases)
 *
 * The service-role key bypasses Row Level Security and must NEVER be exposed
 * to the browser. It is read from the server-only `SUPABASE_SERVICE_ROLE_KEY`.
 */

let cachedAdmin: SupabaseClient | null = null;

export function getSupabaseAdmin(): SupabaseClient {
    if (cachedAdmin) return cachedAdmin;

    const url = process.env.SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!url || !serviceRoleKey) {
        throw new Error(
            "SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables are required."
        );
    }

    cachedAdmin = createClient(url, serviceRoleKey, {
        auth: {
            autoRefreshToken: false,
            persistSession: false,
        },
    });

    return cachedAdmin;
}

export interface VerifiedSupabaseUser {
    externalId: string;
    email: string;
    displayName: string;
    avatarUrl: string | null;
    emailVerified: boolean;
}

function readMetaString(meta: Record<string, unknown>, key: string): string | null {
    const value = meta[key];
    return typeof value === "string" && value.trim() ? value.trim() : null;
}

/**
 * Verify a Supabase Auth access token and return a normalized user profile.
 * Throws if the token is missing/invalid/expired.
 */
export async function verifySupabaseToken(token: string): Promise<VerifiedSupabaseUser> {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase.auth.getUser(token);

    if (error || !data.user) {
        throw new Error(error?.message || "Invalid Supabase session.");
    }

    const user = data.user;
    const email = user.email?.trim().toLowerCase();
    if (!email) {
        throw new Error("Supabase token is missing an email address.");
    }

    const meta = (user.user_metadata ?? {}) as Record<string, unknown>;

    const displayName =
        readMetaString(meta, "display_name") ??
        readMetaString(meta, "full_name") ??
        readMetaString(meta, "name") ??
        email.split("@")[0];

    const avatarUrl =
        readMetaString(meta, "avatar_url") ??
        readMetaString(meta, "picture") ??
        null;

    return {
        externalId: user.id,
        email,
        displayName,
        avatarUrl,
        emailVerified: Boolean(user.email_confirmed_at),
    };
}
