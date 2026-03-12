import { Hono } from "hono";
import { prisma } from "../lib/prisma.js";
import { signToken } from "../lib/jwt.js";
import { broadcastPresenceUpdate, type PresenceStatus } from "../ws.js";

const googleAuth = new Hono();

// Google's public keys endpoint for verifying ID tokens
const GOOGLE_CERTS_URL = "https://www.googleapis.com/oauth2/v3/certs";

interface GoogleTokenPayload {
    iss: string;
    sub: string; // Google user ID
    email: string;
    email_verified: boolean;
    name: string;
    picture?: string;
    aud: string;
    exp: number;
    iat: number;
}

/**
 * Verify a Google ID token by checking it against Google's public keys.
 * Uses the jose library (already a project dependency) for JWT verification.
 */
async function verifyGoogleToken(idToken: string): Promise<GoogleTokenPayload> {
    const { createRemoteJWKSet, jwtVerify } = await import("jose");

    const JWKS = createRemoteJWKSet(new URL(GOOGLE_CERTS_URL));

    const clientId = process.env.GOOGLE_CLIENT_ID;
    if (!clientId) {
        throw new Error("GOOGLE_CLIENT_ID is not configured");
    }

    const { payload } = await jwtVerify(idToken, JWKS, {
        issuer: ["https://accounts.google.com", "accounts.google.com"],
        audience: clientId,
    });

    return payload as unknown as GoogleTokenPayload;
}

/**
 * Generate a unique username from a Google display name.
 * Strips non-alphanumeric chars, lowercases, and appends random digits if taken.
 */
async function generateUsername(name: string): Promise<string> {
    const base = name
        .replace(/[^a-zA-Z0-9_]/g, "")
        .toLowerCase()
        .slice(0, 20) || "user";

    // Try base username first
    const existing = await prisma.user.findUnique({ where: { username: base } });
    if (!existing && base.length >= 3) return base;

    // Append random digits
    for (let i = 0; i < 10; i++) {
        const suffix = Math.floor(Math.random() * 10000).toString().padStart(4, "0");
        const candidate = `${base.slice(0, 24)}_${suffix}`;
        const taken = await prisma.user.findUnique({ where: { username: candidate } });
        if (!taken) return candidate;
    }

    // Fallback: use cuid-style suffix
    const fallback = `${base.slice(0, 20)}_${Date.now().toString(36)}`;
    return fallback;
}

// ─── POST /auth/google ─────────────────────────────────────────
// Accepts { credential: "google-id-token" } from Google Sign-In
// Returns { token, user, isNewUser }

googleAuth.post("/google", async (c) => {
    const body = await c.req.json().catch(() => ({}));
    const credential = typeof body.credential === "string" ? body.credential : "";

    if (!credential) {
        return c.json({ error: "Google credential is required." }, 400);
    }

    let googlePayload: GoogleTokenPayload;
    try {
        googlePayload = await verifyGoogleToken(credential);
    } catch (err) {
        const message = err instanceof Error ? err.message : "Unknown error";
        console.error("Google token verification failed:", message);
        return c.json({
            error: "Google sign-in failed.",
            details: process.env.NODE_ENV === "production" ? undefined : message,
        }, 401);
    }

    if (!googlePayload.email_verified) {
        return c.json({ error: "Google email is not verified." }, 401);
    }

    const { sub: googleId, email, name, picture } = googlePayload;
    const normalizedEmail = email.toLowerCase().trim();

    // Check if user exists by googleId or email
    let user = await prisma.user.findFirst({
        where: {
            OR: [
                { googleId },
                { email: { equals: normalizedEmail, mode: "insensitive" } },
            ],
        },
    });

    let isNewUser = false;

    if (user) {
        // Link Google ID if not already linked
        if (!user.googleId) {
            user = await prisma.user.update({
                where: { id: user.id },
                data: {
                    googleId,
                    emailVerified: true,
                    // Update avatar if user doesn't have one
                    ...(picture && !user.avatarUrl ? { avatarUrl: picture } : {}),
                },
            });
        }
    } else {
        // Create new user
        const username = await generateUsername(name || "user");

        user = await prisma.user.create({
            data: {
                email: normalizedEmail,
                username,
                displayName: name || username,
                googleId,
                passwordHash: null,
                avatarUrl: picture || null,
                status: "online",
                emailVerified: true,
                onboardingCompleted: false,
            },
        });
        isNewUser = true;
    }

    // Set user online
    const userStatus = user.status === "offline" ? "online" : user.status;
    const activeUser = await prisma.user.update({
        where: { id: user.id },
        data: { status: userStatus },
    });
    broadcastPresenceUpdate(activeUser.id, activeUser.status as PresenceStatus);

    // Generate JWT
    const token = await signToken({
        userId: user.id,
        email: user.email,
        username: user.username,
    });

    return c.json({
        token,
        user: {
            id: activeUser.id,
            email: activeUser.email,
            displayName: activeUser.displayName,
            username: activeUser.username,
            avatar: activeUser.avatarUrl,
            bio: activeUser.bio,
            status: activeUser.status,
            onboardingCompleted: activeUser.onboardingCompleted,
        },
        isNewUser,
    });
});

export default googleAuth;
