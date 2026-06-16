import { Hono, type Context } from "hono";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";

const waitlist = new Hono();

// ─── Rate limiting (per-IP, in-memory) ──────────────────────────
// Mirrors the lightweight limiter used by the auth routes. On serverless this
// resets per cold start, which is fine for a low-stakes public signup form —
// the unique email constraint is the real guard against duplicates.

const rateLimitStore = new Map<string, number[]>();

if (!process.env.VERCEL) {
    const cleanup = setInterval(() => {
        const now = Date.now();
        for (const [key, timestamps] of rateLimitStore) {
            const recent = timestamps.filter((t) => now - t < 60 * 60 * 1000);
            if (recent.length === 0) rateLimitStore.delete(key);
            else rateLimitStore.set(key, recent);
        }
    }, 10 * 60 * 1000);
    if (typeof cleanup.unref === "function") cleanup.unref();
}

function checkRateLimit(key: string, maxAttempts: number, windowMs: number): boolean {
    const now = Date.now();
    const timestamps = (rateLimitStore.get(key) ?? []).filter((t) => now - t < windowMs);
    if (timestamps.length >= maxAttempts) {
        rateLimitStore.set(key, timestamps);
        return false;
    }
    timestamps.push(now);
    rateLimitStore.set(key, timestamps);
    return true;
}

function getClientIp(c: Context): string {
    return (
        c.req.header("x-forwarded-for")?.split(",")[0]?.trim() ||
        c.req.header("x-real-ip") ||
        "unknown"
    );
}

// ─── Validation ─────────────────────────────────────────────────

// Pragmatic email check — deliberately permissive, the unique constraint and a
// real confirmation email (later) are the source of truth.
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const joinSchema = z.object({
    email: z.string().trim().min(3).max(254),
    name: z.string().trim().min(1).max(80).optional(),
    source: z.string().trim().max(60).optional(),
});

// ─── GET /waitlist/count ────────────────────────────────────────
// Public — drives the live "N builders already on the list" counter.

waitlist.get("/waitlist/count", async (c) => {
    const count = await prisma.waitlistEntry.count();
    return c.json({ count });
});

// ─── POST /waitlist ─────────────────────────────────────────────
// Public signup. Idempotent: signing up with an existing email succeeds and
// returns the original position instead of erroring.

waitlist.post("/waitlist", async (c) => {
    const ip = getClientIp(c);
    if (!checkRateLimit(`waitlist:${ip}`, 10, 60 * 60 * 1000)) {
        return c.json({ error: "Too many signups from this network. Try again later." }, 429);
    }

    const body = await c.req.json().catch(() => ({}));
    const parsed = joinSchema.safeParse(body);
    if (!parsed.success) {
        return c.json({ error: "Please enter a valid email address." }, 400);
    }

    const email = parsed.data.email.toLowerCase();
    if (!emailRegex.test(email)) {
        return c.json({ error: "Please enter a valid email address." }, 400);
    }

    const existing = await prisma.waitlistEntry.findUnique({
        where: { email },
        select: { createdAt: true },
    });

    if (existing) {
        const position = await prisma.waitlistEntry.count({
            where: { createdAt: { lte: existing.createdAt } },
        });
        const count = await prisma.waitlistEntry.count();
        return c.json({ alreadyJoined: true, position, count });
    }

    await prisma.waitlistEntry.create({
        data: {
            email,
            name: parsed.data.name,
            source: parsed.data.source ?? "landing",
        },
    });

    // The freshly created row is the newest, so the total count is its position.
    const count = await prisma.waitlistEntry.count();
    return c.json({ alreadyJoined: false, position: count, count }, 201);
});

export default waitlist;
