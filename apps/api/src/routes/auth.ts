import { Hono } from "hono";
import { z } from "zod";
import { hash, verify } from "@node-rs/argon2";
import { prisma } from "../lib/prisma.js";
import { signToken, generateVerifyToken, verifyToken } from "../lib/jwt.js";
import { sendConfirmationEmail, sendPasswordResetEmail, hasSmtpConfig } from "../lib/email.js";
import {
    broadcastPresenceUpdate,
    type PresenceStatus,
} from "../ws.js";

const auth = new Hono();

// ─── Rate Limiting ──────────────────────────────────────────────

interface RateLimitEntry {
    timestamps: number[];
}

const rateLimitStore = new Map<string, RateLimitEntry>();

// Clean up expired entries every 5 minutes
setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of rateLimitStore) {
        entry.timestamps = entry.timestamps.filter((t) => now - t < 15 * 60 * 1000);
        if (entry.timestamps.length === 0) rateLimitStore.delete(key);
    }
}, 5 * 60 * 1000);

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

const registerSchema = z.object({
    displayName: z.string().min(1, "Display name is required").max(50),
    username: z
        .string()
        .min(3, "Username must be at least 3 characters")
        .max(30)
        .regex(
            /^[a-zA-Z0-9_]+$/,
            "Username can only contain letters, numbers, and underscores"
        )
        .transform((v) => v.toLowerCase()),
    email: z
        .string()
        .trim()
        .toLowerCase()
        .email("Invalid email address"),
    password: z
        .string()
        .min(8, "Password must be at least 8 characters")
        .max(128),
});

const profileUpdateSchema = z.object({
    displayName: z.string().min(1).max(50).optional(),
    bio: z.string().max(500).nullable().optional(),
    avatarUrl: z.string().url().nullable().optional(),
    status: z.enum(["online", "idle", "dnd", "invisible", "offline"]).optional(),
    onboardingCompleted: z.boolean().optional(),
}).strict();

const loginSchema = z.object({
    email: z
        .string()
        .trim()
        .toLowerCase()
        .email("Invalid email address"),
    password: z.string().min(1, "Password is required"),
});

// ─── POST /auth/register ────────────────────────────────────────

auth.post("/register", async (c) => {
    const ip = getClientIp(c);
    if (!checkRateLimit(`register:${ip}`, 5)) {
        return c.json({ error: "Too many registration attempts. Please try again later." }, 429);
    }

    const body = await c.req.json();
    const result = registerSchema.safeParse(body);

    if (!result.success) {
        const firstError = result.error.errors[0];
        return c.json({ error: firstError.message }, 400);
    }

    const { displayName, username, email, password } = result.data;

    // Check if email already exists
    const existingEmail = await prisma.user.findFirst({
        where: { email: { equals: email, mode: "insensitive" } },
    });
    if (existingEmail) {
        // If the account is unverified (stuck from a failed email send),
        // delete it so the user can re-register cleanly.
        if (!existingEmail.emailVerified) {
            await prisma.user.delete({ where: { id: existingEmail.id } });
        } else {
            return c.json({ error: "An account with this email already exists." }, 409);
        }
    }

    // Check if username already exists (skip if it was the deleted unverified user)
    const existingUsername = await prisma.user.findUnique({
        where: { username },
    });
    if (existingUsername) {
        return c.json(
            { error: "Username is already taken. Please choose another." },
            409
        );
    }

    // Hash password with Argon2id (OWASP recommended)
    const passwordHash = await hash(password, {
        memoryCost: 19456,
        timeCost: 2,
        outputLen: 32,
        parallelism: 1,
    });

    // Generate email verification token
    const verifyEmailToken = generateVerifyToken();
    const verifyExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    // Auto-verify only when SMTP is not configured (no email provider available)
    const hasSmtp = !!(process.env.SMTP_USER && process.env.SMTP_PASS);
    const autoVerify = !hasSmtp;

    // Create user
    const user = await prisma.user.create({
        data: {
            email,
            username,
            displayName,
            passwordHash,
            status: "offline",
            emailVerified: autoVerify,
            emailVerifyToken: autoVerify ? null : verifyEmailToken,
            emailVerifyExpires: autoVerify ? null : verifyExpires,
        },
    });

    if (autoVerify) {
        console.log(`✓ Auto-verified ${email} (no SMTP configured)`);
        return c.json(
            {
                message: "Account created and verified.",
                confirmEmail: false,
                email,
            },
            201
        );
    }

    // Send confirmation email — if it fails, auto-verify so the user isn't stuck
    try {
        await sendConfirmationEmail(email, displayName, verifyEmailToken);
    } catch (err) {
        console.error(`Email delivery failed for ${email}, auto-verifying:`, err);
        // The user record may have been replaced by a concurrent re-registration
        // attempt (unverified accounts are cleaned up). Use updateMany to avoid
        // P2025 "record not found" errors.
        await prisma.user.updateMany({
            where: { id: user.id },
            data: {
                emailVerified: true,
                emailVerifyToken: null,
                emailVerifyExpires: null,
            },
        });
        return c.json(
            {
                message: "Account created and verified.",
                confirmEmail: false,
                email,
            },
            201
        );
    }

    return c.json(
        {
            message: "Account created. Please check your email to verify.",
            confirmEmail: true,
            email,
        },
        201
    );
});

// ─── POST /auth/login ───────────────────────────────────────────

auth.post("/login", async (c) => {
    const ip = getClientIp(c);
    if (!checkRateLimit(`login:${ip}`, 10)) {
        return c.json({ error: "Too many login attempts. Please try again later." }, 429);
    }

    const body = await c.req.json();
    const result = loginSchema.safeParse(body);

    if (!result.success) {
        return c.json({ error: result.error.errors[0].message }, 400);
    }

    const { email, password } = result.data;

    const user = await prisma.user.findFirst({
        where: { email: { equals: email, mode: "insensitive" } },
    });
    if (!user) {
        return c.json({ error: "Invalid email or password." }, 401);
    }

    // Verify password (Google-only accounts have no passwordHash)
    if (!user.passwordHash) {
        return c.json({ error: "This account uses Google sign-in. Please log in with Google." }, 401);
    }
    const valid = await verify(user.passwordHash, password);
    if (!valid) {
        return c.json({ error: "Invalid email or password." }, 401);
    }

    // Check email verification
    if (!user.emailVerified) {
        // If SMTP is not configured or the verify token has expired,
        // auto-verify so the user isn't permanently locked out.
        const tokenExpired = user.emailVerifyExpires && user.emailVerifyExpires < new Date();
        if (!hasSmtpConfig() || tokenExpired) {
            await prisma.user.update({
                where: { id: user.id },
                data: {
                    emailVerified: true,
                    emailVerifyToken: null,
                    emailVerifyExpires: null,
                },
            });
        } else {
            return c.json(
                {
                    error: "Please verify your email before logging in.",
                    needsVerification: true,
                    email: user.email,
                },
                403
            );
        }
    }

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
    });
});

// ─── GET /auth/verify-email?token=xxx ───────────────────────────

auth.get("/verify-email", async (c) => {
    const token = c.req.query("token");
    if (!token) {
        return c.json({ error: "Verification token is required." }, 400);
    }

    const user = await prisma.user.findUnique({
        where: { emailVerifyToken: token },
    });

    if (!user) {
        return c.json({ error: "Invalid or expired verification link." }, 400);
    }

    if (user.emailVerifyExpires && user.emailVerifyExpires < new Date()) {
        return c.json(
            { error: "Verification link has expired. Please register again." },
            400
        );
    }

    // Mark email as verified
    await prisma.user.update({
        where: { id: user.id },
        data: {
            emailVerified: true,
            emailVerifyToken: null,
            emailVerifyExpires: null,
        },
    });

    return c.json({ message: "Email verified successfully. You can now log in." });
});

// ─── POST /auth/resend-verification ─────────────────────────────

auth.post("/resend-verification", async (c) => {
    const ip = getClientIp(c);
    if (!checkRateLimit(`resend:${ip}`, 3)) {
        return c.json({ error: "Too many requests. Please try again later." }, 429);
    }

    const body = await c.req.json().catch(() => ({}));
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    if (!email) {
        return c.json({ error: "Email is required." }, 400);
    }

    const user = await prisma.user.findFirst({
        where: { email: { equals: email, mode: "insensitive" } },
    });
    if (!user) {
        // Don't reveal whether the email exists
        return c.json({ message: "If that email exists, a new verification link has been sent." });
    }

    if (user.emailVerified) {
        return c.json({ message: "Email is already verified." });
    }

    // Generate new token
    const verifyEmailToken = generateVerifyToken();
    const verifyExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);

    await prisma.user.update({
        where: { id: user.id },
        data: {
            emailVerifyToken: verifyEmailToken,
            emailVerifyExpires: verifyExpires,
        },
    });

    await sendConfirmationEmail(email, user.displayName, verifyEmailToken);

    return c.json({ message: "Verification email sent." });
});

// ─── POST /auth/forgot-password ──────────────────────────────────

auth.post("/forgot-password", async (c) => {
    const ip = getClientIp(c);
    if (!checkRateLimit(`forgot:${ip}`, 3)) {
        return c.json({ error: "Too many requests. Please try again later." }, 429);
    }

    const body = await c.req.json().catch(() => ({}));
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    if (!email) {
        return c.json({ error: "Email is required." }, 400);
    }

    // Always return success to prevent email enumeration
    const successMsg = "If an account with that email exists, a password reset link has been sent.";

    const user = await prisma.user.findFirst({
        where: { email: { equals: email, mode: "insensitive" } },
    });

    if (!user) {
        return c.json({ message: successMsg });
    }

    const resetToken = generateVerifyToken();
    const resetExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    await prisma.user.update({
        where: { id: user.id },
        data: {
            passwordResetToken: resetToken,
            passwordResetExpires: resetExpires,
        },
    });

    await sendPasswordResetEmail(email, user.displayName, resetToken);

    return c.json({ message: successMsg });
});

// ─── POST /auth/reset-password ──────────────────────────────────

auth.post("/reset-password", async (c) => {
    const body = await c.req.json().catch(() => ({}));
    const token = typeof body.token === "string" ? body.token : "";
    const password = typeof body.password === "string" ? body.password : "";

    if (!token) {
        return c.json({ error: "Reset token is required." }, 400);
    }

    if (!password || password.length < 8) {
        return c.json({ error: "Password must be at least 8 characters." }, 400);
    }

    if (password.length > 128) {
        return c.json({ error: "Password is too long." }, 400);
    }

    const user = await prisma.user.findUnique({
        where: { passwordResetToken: token },
    });

    if (!user) {
        return c.json({ error: "Invalid or expired reset link." }, 400);
    }

    if (user.passwordResetExpires && user.passwordResetExpires < new Date()) {
        return c.json({ error: "Reset link has expired. Please request a new one." }, 400);
    }

    const passwordHash = await hash(password, {
        memoryCost: 19456,
        timeCost: 2,
        outputLen: 32,
        parallelism: 1,
    });

    await prisma.user.update({
        where: { id: user.id },
        data: {
            passwordHash,
            passwordResetToken: null,
            passwordResetExpires: null,
        },
    });

    return c.json({ message: "Password reset successfully. You can now log in." });
});

// ─── POST /auth/change-password (requires token) ────────────────

auth.post("/change-password", async (c) => {
    const authHeader = c.req.header("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
        return c.json({ error: "Unauthorized." }, 401);
    }

    try {
        const payload = await verifyToken(authHeader.slice(7));
        const body = await c.req.json();

        const currentPassword = typeof body.currentPassword === "string" ? body.currentPassword : "";
        const newPassword = typeof body.newPassword === "string" ? body.newPassword : "";

        if (!currentPassword) {
            return c.json({ error: "Current password is required." }, 400);
        }

        if (!newPassword || newPassword.length < 8) {
            return c.json({ error: "New password must be at least 8 characters." }, 400);
        }

        if (newPassword.length > 128) {
            return c.json({ error: "New password is too long." }, 400);
        }

        const user = await prisma.user.findUnique({ where: { id: payload.userId } });
        if (!user) {
            return c.json({ error: "User not found." }, 404);
        }

        if (!user.passwordHash) {
            return c.json({ error: "This account uses Google sign-in. Set a password via 'Forgot Password' first." }, 400);
        }

        const valid = await verify(user.passwordHash, currentPassword);
        if (!valid) {
            return c.json({ error: "Current password is incorrect." }, 401);
        }

        const passwordHash = await hash(newPassword, {
            memoryCost: 19456,
            timeCost: 2,
            outputLen: 32,
            parallelism: 1,
        });

        await prisma.user.update({
            where: { id: user.id },
            data: { passwordHash },
        });

        return c.json({ message: "Password changed successfully." });
    } catch {
        return c.json({ error: "Invalid or expired token." }, 401);
    }
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

        const user = await prisma.user.findUnique({ where: { id: payload.userId } });
        if (!user) {
            return c.json({ error: "User not found." }, 404);
        }

        if (user.passwordHash) {
            const valid = await verify(user.passwordHash, password);
            if (!valid) {
                return c.json({ error: "Incorrect password." }, 401);
            }
        }

        // Set user offline before deletion
        broadcastPresenceUpdate(user.id, "offline");

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

        await prisma.user.delete({ where: { id: user.id } });

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

    const existing = await prisma.user.findUnique({ where: { username } });
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
        const user = await prisma.user.findUnique({
            where: { id: payload.userId },
        });

        if (!user) {
            return c.json({ error: "User not found." }, 404);
        }

        return c.json({
            user: {
                id: user.id,
                email: user.email,
                displayName: user.displayName,
                username: user.username,
                avatar: user.avatarUrl,
                bio: user.bio,
                status: user.status,
                onboardingCompleted: user.onboardingCompleted,
            },
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
            return c.json({ error: result.error.errors[0].message }, 400);
        }

        const updateData: Record<string, unknown> = {};
        if (result.data.displayName !== undefined) updateData.displayName = result.data.displayName;
        if (result.data.bio !== undefined) updateData.bio = result.data.bio;
        if (result.data.avatarUrl !== undefined) updateData.avatarUrl = result.data.avatarUrl;
        if (result.data.status !== undefined) updateData.status = result.data.status;
        if (result.data.onboardingCompleted !== undefined)
            updateData.onboardingCompleted = result.data.onboardingCompleted;

        const user = await prisma.user.update({
            where: { id: payload.userId },
            data: updateData,
        });

        if (result.data.status !== undefined) {
            broadcastPresenceUpdate(user.id, user.status as PresenceStatus);
        }

        return c.json({
            user: {
                id: user.id,
                email: user.email,
                displayName: user.displayName,
                username: user.username,
                avatar: user.avatarUrl,
                bio: user.bio,
                status: user.status,
                onboardingCompleted: user.onboardingCompleted,
            },
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

        // Always set the user offline on explicit logout.
        // If there are still active WS connections (multi-tab), the WS connection
        // handler in ws.ts will restore the correct presence when the next tab
        // calls resolveConnectedPresence().
        await prisma.user.update({
            where: { id: payload.userId },
            data: { status: "offline" },
        });
        broadcastPresenceUpdate(payload.userId, "offline");

        return c.json({ message: "Logged out." });
    } catch {
        return c.json({ error: "Invalid or expired token." }, 401);
    }
});

export default auth;
