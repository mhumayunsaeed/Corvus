import type { Session } from "@supabase/supabase-js";
import { getSupabaseClient } from "@/lib/supabase/client";
import { ensureApiUrl } from "@/lib/endpoints";

const pendingSignupStorageKey = "corvus-pending-signups";

export interface PendingSignupProfile {
    email: string;
    displayName: string;
    username: string;
}

export interface SessionExchangeResponse {
    token: string;
    user: {
        id: string;
        email: string;
        displayName: string;
        username: string;
        avatar: string | null;
        bio: string | null;
        status: "online" | "idle" | "dnd" | "invisible" | "offline";
        onboardingCompleted: boolean;
    };
    isNewUser: boolean;
}

function normalizeEmail(email: string): string {
    return email.trim().toLowerCase();
}

function getResponseError(data: unknown, fallback: string): string {
    if (!data || typeof data !== "object") {
        return fallback;
    }

    const maybeError = data as { error?: string; message?: string; details?: string };
    const baseMessage = maybeError.error || maybeError.message || fallback;
    return maybeError.details ? `${baseMessage}: ${maybeError.details}` : baseMessage;
}

// ─── Pending signup profile (display name / username chosen before the
//     Supabase confirmation email is clicked) ───────────────────────────

function readPendingSignups(): Record<string, PendingSignupProfile> {
    if (typeof window === "undefined") return {};

    try {
        const raw = window.localStorage.getItem(pendingSignupStorageKey);
        if (!raw) return {};
        const parsed = JSON.parse(raw);
        return parsed && typeof parsed === "object"
            ? (parsed as Record<string, PendingSignupProfile>)
            : {};
    } catch {
        return {};
    }
}

function writePendingSignups(value: Record<string, PendingSignupProfile>): void {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(pendingSignupStorageKey, JSON.stringify(value));
}

export function savePendingSignupProfile(profile: PendingSignupProfile): void {
    const pendingSignups = readPendingSignups();
    pendingSignups[normalizeEmail(profile.email)] = {
        email: normalizeEmail(profile.email),
        username: profile.username.trim().toLowerCase(),
        displayName: profile.displayName.trim(),
    };
    writePendingSignups(pendingSignups);
}

export function getPendingSignupProfile(email: string): PendingSignupProfile | null {
    return readPendingSignups()[normalizeEmail(email)] ?? null;
}

export function clearPendingSignupProfile(email: string): void {
    const pendingSignups = readPendingSignups();
    delete pendingSignups[normalizeEmail(email)];
    writePendingSignups(pendingSignups);
}

// ─── Redirect URLs ───────────────────────────────────────────────

function buildAbsoluteUrl(path: string): string {
    if (typeof window === "undefined") return path;
    return new URL(path, window.location.origin).toString();
}

export function getAuthCallbackUrl(): string {
    return buildAbsoluteUrl("/auth/callback");
}

export function getPasswordResetUrl(): string {
    return buildAbsoluteUrl("/reset-password");
}

// ─── Supabase Auth operations ────────────────────────────────────

export async function signInWithEmail(email: string, password: string): Promise<void> {
    const { error } = await getSupabaseClient().auth.signInWithPassword({
        email: normalizeEmail(email),
        password,
    });
    if (error) throw new Error(error.message);
}

export async function signUpWithEmail(params: {
    email: string;
    password: string;
    displayName: string;
}): Promise<{ needsConfirmation: boolean }> {
    const { data, error } = await getSupabaseClient().auth.signUp({
        email: normalizeEmail(params.email),
        password: params.password,
        options: {
            data: { display_name: params.displayName.trim() },
            emailRedirectTo: getAuthCallbackUrl(),
        },
    });
    if (error) throw new Error(error.message);

    // When email confirmation is enabled, Supabase returns a user but no session.
    const needsConfirmation = !data.session;
    return { needsConfirmation };
}

export async function signInWithGoogle(): Promise<void> {
    const { error } = await getSupabaseClient().auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: getAuthCallbackUrl() },
    });
    if (error) throw new Error(error.message);
}

export async function signOutSupabase(): Promise<void> {
    await getSupabaseClient().auth.signOut();
}

export async function requestPasswordReset(email: string): Promise<void> {
    const { error } = await getSupabaseClient().auth.resetPasswordForEmail(
        normalizeEmail(email),
        { redirectTo: getPasswordResetUrl() }
    );
    if (error) throw new Error(error.message);
}

export async function updatePassword(newPassword: string): Promise<void> {
    const { error } = await getSupabaseClient().auth.updateUser({ password: newPassword });
    if (error) throw new Error(error.message);
}

export async function resendVerificationEmail(email: string): Promise<void> {
    const { error } = await getSupabaseClient().auth.resend({
        type: "signup",
        email: normalizeEmail(email),
        options: { emailRedirectTo: getAuthCallbackUrl() },
    });
    if (error) throw new Error(error.message);
}

/**
 * Return the current Supabase session, waiting briefly for `detectSessionInUrl`
 * to finish parsing OAuth / email-link redirects on first load.
 */
export async function getActiveSupabaseSession(timeoutMs = 4000): Promise<Session | null> {
    const supabase = getSupabaseClient();

    const { data } = await supabase.auth.getSession();
    if (data.session) return data.session;

    return new Promise<Session | null>((resolve) => {
        const timer = setTimeout(() => {
            subscription.unsubscribe();
            resolve(null);
        }, timeoutMs);

        const {
            data: { subscription },
        } = supabase.auth.onAuthStateChange((_event, session) => {
            if (session) {
                clearTimeout(timer);
                subscription.unsubscribe();
                resolve(session);
            }
        });
    });
}

export async function getSupabaseAccessToken(): Promise<string | null> {
    const session = await getActiveSupabaseSession();
    return session?.access_token ?? null;
}

/**
 * Exchange a verified Supabase access token for an app session token + profile
 * by calling the API's /auth/session/exchange endpoint.
 */
export async function exchangeSupabaseSession(
    profile?: Partial<Pick<PendingSignupProfile, "displayName" | "username">>
): Promise<SessionExchangeResponse | null> {
    const token = await getSupabaseAccessToken();
    if (!token) return null;

    const response = await fetch(`${ensureApiUrl()}/auth/session/exchange`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
            preferredDisplayName: profile?.displayName?.trim() || undefined,
            preferredUsername: profile?.username?.trim().toLowerCase() || undefined,
        }),
    });

    const data = await response.json().catch(() => null);
    if (!response.ok) {
        throw new Error(getResponseError(data, "Unable to finish sign-in."));
    }

    return data as SessionExchangeResponse;
}
