import { Hono } from "hono";
import { z } from "zod";
import { hash, verify } from "@node-rs/argon2";
import { prisma } from "../lib/prisma.js";
import { signToken, generateVerifyToken, verifyToken } from "../lib/jwt.js";
import { sendConfirmationEmail } from "../lib/email.js";
import {
    broadcastPresenceUpdate,
    type PresenceStatus,
} from "../ws.js";

const auth = new Hono();

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
        .min(6, "Password must be at least 6 characters")
        .max(128),
});

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
        return c.json({ error: "An account with this email already exists." }, 409);
    }

    // Check if username already exists
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

    // In dev mode, auto-verify to avoid Resend free-tier restrictions
    const isDev = process.env.NODE_ENV !== "production";

    // Create user
    const user = await prisma.user.create({
        data: {
            email,
            username,
            displayName,
            passwordHash,
            status: "offline",
            emailVerified: isDev, // auto-verify in dev
            emailVerifyToken: isDev ? null : verifyEmailToken,
            emailVerifyExpires: isDev ? null : verifyExpires,
        },
    });

    if (isDev) {
        console.log(`✓ Dev mode: auto-verified ${email}`);
        return c.json(
            {
                message: "Account created and auto-verified (dev mode).",
                confirmEmail: false,
                email,
            },
            201
        );
    }

    // Production: send confirmation email
    await sendConfirmationEmail(email, displayName, verifyEmailToken);

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

    // Verify password
    const valid = await verify(user.passwordHash, password);
    if (!valid) {
        return c.json({ error: "Invalid email or password." }, 401);
    }

    // Check email verification
    if (!user.emailVerified) {
        return c.json(
            {
                error: "Please verify your email before logging in.",
                needsVerification: true,
                email: user.email,
            },
            403
        );
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

        const updateData: Record<string, unknown> = {};
        if (body.displayName !== undefined) updateData.displayName = body.displayName;
        if (body.bio !== undefined) updateData.bio = body.bio;
        if (body.avatarUrl !== undefined) updateData.avatarUrl = body.avatarUrl;
        if (body.status !== undefined) updateData.status = body.status;
        if (body.onboardingCompleted !== undefined)
            updateData.onboardingCompleted = body.onboardingCompleted;

        const user = await prisma.user.update({
            where: { id: payload.userId },
            data: updateData,
        });

        if (body.status !== undefined) {
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
