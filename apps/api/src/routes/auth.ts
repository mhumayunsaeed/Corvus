import { Hono } from "hono";
import { z } from "zod";
import { verify } from "@node-rs/argon2";
import type { Prisma } from "../generated/prisma/index.js";
import { prisma } from "../lib/prisma.js";
import { userRepository } from "../repositories/userRepository.js";
import { signToken, verifyToken } from "../lib/jwt.js";
import { verifySupabaseToken } from "../lib/supabase.js";

const auth = new Hono();

// ─── Rate Limiting ──────────────────────────────────────────────

interface RateLimitEntry {
    timestamps: number[];
}

const rateLimitStore = new Map<string, RateLimitEntry>();

// Clean up expired entries every 5 minutes (only in non-serverless environments)
if (!process.env.VERCEL) {
    const cleanupInterval = setInterval(() => {
        const now = Date.now();
        for (const [key, entry] of rateLimitStore) {
            entry.timestamps = entry.timestamps.filter((t) => now - t < 15 * 60 * 1000);
            if (entry.timestamps.length === 0) rateLimitStore.delete(key);
        }
    }, 5 * 60 * 1000);

    if (typeof cleanupInterval.unref === "function") {
        cleanupInterval.unref();
    }
}

function checkRateLimit(key: string, maxAttempts: number, windowMs: number = 15 * 60 * 1000): boolean {
    const now = Date.now();
    const entry = rateLimitStore.get(key);

    if (!entry) {
        rateLimitStore.set(key, { timestamps: [now] });
        return true;
    }

    entry.timestamps = entry.timestamps.filter((t) => now - t < windowMs);
    if (entry.timestamps.length >= maxAttempts) return false;

    entry.timestamps.push(now);
    return true;
}

function getClientIp(c: any): string {
    return c.req.header("x-forwarded-for")?.split(",")[0]?.trim()
        || c.req.header("x-real-ip")
        || "unknown";
}

// ─── Validation Schemas ─────────────────────────────────────────

const usernameRegex = /^[a-zA-Z0-9_]+$/;

const sessionExchangeSchema = z.object({
    preferredDisplayName: z.string().trim().min(1).max(50).optional(),
    preferredUsername: z
        .string()
        .trim()
        .min(3, "Username must be at least 3 characters")
        .max(30)
        .regex(
            usernameRegex,
            "Username can only contain letters, numbers, and underscores"
        )
        .transform((value) => value.toLowerCase())
        .optional(),
});

const profileUpdateSchema = z.object({
    displayName: z.string().min(1).max(50).optional(),
    bio: z.string().max(500).nullable().optional(),
    avatarUrl: z.string().url().nullable().optional(),
    status: z.enum(["online", "idle", "dnd", "invisible", "offline"]).optional(),
    onboardingCompleted: z.boolean().optional(),
}).strict();

function serializeUser(user: {
    id: string;
    email: string;
    displayName: string;
    username: string;
    avatarUrl: string | null;
    bio: string | null;
    status: string;
    onboardingCompleted: boolean;
}) {
    return {
        id: user.id,
        email: user.email,
        displayName: user.displayName,
        username: user.username,
        avatar: user.avatarUrl,
        bio: user.bio,
        status: user.status,
        onboardingCompleted: user.onboardingCompleted,
    };
}

function normalizeUsernameCandidate(value: string): string {
    return value.replace(/[^a-zA-Z0-9_]/g, "").toLowerCase().slice(0, 30);
}

async function findUserByEmail(email: string) {
    return userRepository.findByEmailInsensitive(email);
}

async function findAvailableUsername(
    preferredUsername: string | undefined,
    email: string,
    displayName: string
): Promise<string> {
    const candidates = [
        preferredUsername ?? "",
        normalizeUsernameCandidate(displayName),
        normalizeUsernameCandidate(email.split("@")[0] ?? ""),
        "user",
    ];

    const seen = new Set<string>();
    const candidateList: string[] = [];

    for (const candidate of candidates) {
        if (!candidate || candidate.length < 3 || seen.has(candidate)) {
            continue;
        }
        seen.add(candidate);
        candidateList.push(candidate);
    }

    if (candidateList.length > 0) {
        const existingUsers = await prisma.user.findMany({
            where: { username: { in: candidateList } },
            select: { username: true },
        });
        const existingUsernames = new Set(existingUsers.map((u) => u.username));

        for (const candidate of candidateList) {
            if (!existingUsernames.has(candidate)) {
                return candidate;
            }
        }
    }

    const base = normalizeUsernameCandidate(preferredUsername ?? displayName) || "user";

    // Batch suffix checks: generate 10 candidate suffixes at once to avoid multiple sequential round-trips
    const suffixes = Array.from({ length: 10 }, () =>
        Math.floor(Math.random() * 10000).toString().padStart(4, "0")
    );
    const randomCandidates = suffixes.map((suffix) => `${base.slice(0, 25)}_${suffix}`);
    const existingRandom = await prisma.user.findMany({
        where: { username: { in: randomCandidates } },
        select: { username: true },
    });
    const existingRandomUsernames = new Set(existingRandom.map((u) => u.username));

    for (const candidate of randomCandidates) {
        if (!existingRandomUsernames.has(candidate)) {
            return candidate;
        }
    }

    return `${base.slice(0, 20)}_${Date.now().toString(36)}`;
}

// ─── POST /auth/session/exchange ───────────────────────────────

auth.post("/session/exchange", async (c) => {
    const authHeader = c.req.header("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
        return c.json({ error: "Supabase session token is required." }, 401);
    }

    const ip = getClientIp(c);
    if (!checkRateLimit(`session-exchange:${ip}`, 20, 10 * 60 * 1000)) {
        return c.json({ error: "Too many sign-in attempts. Please try again later." }, 429);
    }

    const body = await c.req.json().catch(() => ({}));
    const result = sessionExchangeSchema.safeParse(body);
    if (!result.success) {
        return c.json({ error: result.error.issues[0].message }, 400);
    }

    let authUser;
    try {
        authUser = await verifySupabaseToken(authHeader.slice(7));
    } catch (error) {
        const message = error instanceof Error ? error.message : "Invalid Supabase session.";
        return c.json({ error: message }, 401);
    }

    const preferredDisplayName = result.data.preferredDisplayName?.trim();
    const existingUser = await findUserByEmail(authUser.email);

    let user;
    let isNewUser = false;

    if (existingUser) {
        const nextStatus = existingUser.status === "offline" ? "online" : existingUser.status;
        user = await userRepository.update(existingUser.id, {
                status: nextStatus,
                emailVerified: existingUser.emailVerified || authUser.emailVerified,
                ...(authUser.avatarUrl && !existingUser.avatarUrl
                    ? { avatarUrl: authUser.avatarUrl }
                    : {}),
                ...(preferredDisplayName && existingUser.displayName === existingUser.username
                    ? { displayName: preferredDisplayName }
                    : {}),
        });
    } else {
        const username = await findAvailableUsername(
            result.data.preferredUsername,
            authUser.email,
            preferredDisplayName ?? authUser.displayName
        );

        user = await userRepository.create({
            email: authUser.email,
            username,
            displayName: preferredDisplayName ?? authUser.displayName,
            passwordHash: null,
            avatarUrl: authUser.avatarUrl,
            status: "online",
            emailVerified: authUser.emailVerified,
            onboardingCompleted: false,
        });
        isNewUser = true;
    }

    const token = await signToken({
        userId: user.id,
        email: user.email,
        username: user.username,
    });

    return c.json({
        token,
        user: serializeUser(user),
        isNewUser,
    });
});

// ─── Deprecated custom auth routes ─────────────────────────────

auth.post("/register", async (c) => {
    return c.json({
        error: "Email/password sign-up is handled by Supabase Auth on the client.",
    }, 410);
});

auth.post("/login", async (c) => {
    return c.json({
        error: "Email/password sign-in is handled by Supabase Auth on the client.",
    }, 410);
});

auth.get("/verify-email", async (c) => {
    return c.json({
        error: "Email verification is handled by Supabase Auth on the client.",
    }, 410);
});

auth.post("/resend-verification", async (c) => {
    return c.json({
        error: "Verification emails are handled by Supabase Auth on the client.",
    }, 410);
});

auth.post("/forgot-password", async (c) => {
    return c.json({
        error: "Password reset emails are handled by Supabase Auth on the client.",
    }, 410);
});

auth.post("/reset-password", async (c) => {
    return c.json({
        error: "Password resets are handled by Supabase Auth on the client.",
    }, 410);
});

auth.post("/change-password", async (c) => {
    return c.json({
        error: "Password changes are handled by Supabase Auth on the client.",
    }, 410);
});

// ─── DELETE /auth/account (requires token) ──────────────────────

auth.delete("/account", async (c) => {
    const authHeader = c.req.header("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
        return c.json({ error: "Unauthorized." }, 401);
    }

    try {
        const payload = await verifyToken(authHeader.slice(7));
        const body = await c.req.json().catch(() => ({}));

        const password = typeof body.password === "string" ? body.password : "";
        if (!password) {
            return c.json({ error: "Password is required to delete your account." }, 400);
        }

        const user = await userRepository.findById(payload.userId);
        if (!user) {
            return c.json({ error: "User not found." }, 404);
        }

        if (user.passwordHash) {
            const valid = await verify(user.passwordHash, password);
            if (!valid) {
                return c.json({ error: "Incorrect password." }, 401);
            }
        }

        // Cascade delete handles most relations. Transfer server ownership or delete owned servers.
        const ownedServers = await prisma.server.findMany({
            where: { ownerId: user.id },
            select: { id: true },
        });

        if (ownedServers.length > 0) {
            await prisma.server.deleteMany({
                where: { ownerId: user.id },
            });
        }

        await userRepository.deleteById(user.id);

        return c.json({ message: "Account deleted successfully." });
    } catch {
        return c.json({ error: "Invalid or expired token." }, 401);
    }
});

// ─── GET /auth/check-username?username=xxx ──────────────────────

auth.get("/check-username", async (c) => {
    const username = c.req.query("username")?.toLowerCase();
    if (!username || username.length < 3) {
        return c.json({ available: false, error: "Username must be at least 3 characters." });
    }

    if (!/^[a-zA-Z0-9_]+$/.test(username)) {
        return c.json({ available: false, error: "Invalid characters in username." });
    }

    const existing = await userRepository.findByUsername(username);
    return c.json({ available: !existing });
});

// ─── GET /auth/me (requires token) ─────────────────────────────

auth.get("/me", async (c) => {
    const authHeader = c.req.header("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
        return c.json({ error: "Unauthorized." }, 401);
    }

    try {
        const payload = await verifyToken(authHeader.slice(7));
        const user = await userRepository.findById(payload.userId);

        if (!user) {
            return c.json({ error: "User not found." }, 404);
        }

        return c.json({
            user: serializeUser(user),
        });
    } catch {
        return c.json({ error: "Invalid or expired token." }, 401);
    }
});

// ─── PATCH /auth/profile (requires token) ───────────────────────

auth.patch("/profile", async (c) => {
    const authHeader = c.req.header("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
        return c.json({ error: "Unauthorized." }, 401);
    }

    try {
        const payload = await verifyToken(authHeader.slice(7));
        const body = await c.req.json();

        const result = profileUpdateSchema.safeParse(body);
        if (!result.success) {
            return c.json({ error: result.error.issues[0].message }, 400);
        }

        const updateData: Prisma.UserUpdateInput = {};
        if (result.data.displayName !== undefined) updateData.displayName = result.data.displayName;
        if (result.data.bio !== undefined) updateData.bio = result.data.bio;
        if (result.data.avatarUrl !== undefined) updateData.avatarUrl = result.data.avatarUrl;
        if (result.data.status !== undefined) updateData.status = result.data.status;
        if (result.data.onboardingCompleted !== undefined)
            updateData.onboardingCompleted = result.data.onboardingCompleted;

        const user = await userRepository.update(payload.userId, updateData);

        // Presence (online/offline + status) is now propagated client-side via
        // Supabase Realtime Presence; the persisted status above is the source
        // of truth the client re-broadcasts when it changes.

        return c.json({
            user: serializeUser(user),
        });
    } catch {
        return c.json({ error: "Invalid or expired token." }, 401);
    }
});

// ─── POST /auth/logout (requires token) ──────────────────────────

auth.post("/logout", async (c) => {
    const authHeader = c.req.header("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
        return c.json({ error: "Unauthorized." }, 401);
    }

    try {
        const payload = await verifyToken(authHeader.slice(7));

        // Persist offline on explicit logout. The client also leaves the
        // Supabase Presence channel, which notifies other users in realtime.
        await userRepository.update(payload.userId, { status: "offline" });

        return c.json({ message: "Logged out." });
    } catch {
        return c.json({ error: "Invalid or expired token." }, 401);
    }
});

export default auth;
