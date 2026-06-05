import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Browser-side Supabase client (anon key) used for Supabase Auth.
 *
 * Configured for a SPA: PKCE flow + `detectSessionInUrl` so OAuth, email
 * confirmation, and password-recovery redirects are handled automatically
 * when the user lands back on the app.
 */

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim().replace(/\/+$/, "") || "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() || "";

let cachedClient: SupabaseClient | null = null;

export function isSupabaseConfigured(): boolean {
    return Boolean(supabaseUrl && supabaseAnonKey);
}

export function getSupabaseClient(): SupabaseClient {
    if (!isSupabaseConfigured()) {
        throw new Error(
            "NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are not configured."
        );
    }

    if (!cachedClient) {
        cachedClient = createClient(supabaseUrl, supabaseAnonKey, {
            auth: {
                flowType: "pkce",
                detectSessionInUrl: true,
                persistSession: true,
                autoRefreshToken: true,
                storageKey: "corvus-supabase-auth",
            },
        });
    }

    return cachedClient;
}
