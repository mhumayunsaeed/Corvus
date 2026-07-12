import { Hono } from "hono";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { authMiddleware, type AuthEnv } from "../middleware/auth.js";

const invites = new Hono<AuthEnv>();

invites.use("*", authMiddleware);

// ─── Validation ─────────────────────────────────────────────────

const createInviteSchema = z.object({
    maxUses: z.number().int().min(1).optional(),
    expiresInHours: z.number().int().min(1).max(168).optional(), // max 7 days
});

// ─── Helper: generate invite code ───────────────────────────────

function generateInviteCode(): string {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
    let code = "";
    const array = new Uint8Array(8);
    crypto.getRandomValues(array);
    for (let i = 0; i < 8; i++) {
        code += chars[array[i] % chars.length];
    }
    return code;
}

// ─── POST /servers/:serverId/invites — Create invite ────────────

invites.post("/servers/:serverId/invites", async (c) => {
    const userId = c.get("userId");
    const serverId = c.req.param("serverId");

    const membership = await prisma.serverMember.findUnique({
        where: { serverId_userId: { serverId, userId } },
    });

    if (!membership) {
        return c.json({ error: "You are not a member of this server." }, 403);
    }

    const body = await c.req.json().catch(() => ({}));
    const result = createInviteSchema.safeParse(body);

    if (!result.success) {
        return c.json({ error: result.error.issues[0].message }, 400);
    }

    const expiresAt = result.data.expiresInHours
        ? new Date(Date.now() + result.data.expiresInHours * 3600000)
        : null;

    const invite = await prisma.invite.create({
        data: {
            serverId,
            creatorId: userId,
            code: generateInviteCode(),
            maxUses: result.data.maxUses ?? null,
            expiresAt,
        },
    });

    return c.json({ invite }, 201);
});

// ─── GET /servers/:serverId/invites — List invites ──────────────

invites.get("/servers/:serverId/invites", async (c) => {
    const userId = c.get("userId");
    const serverId = c.req.param("serverId");

    const membership = await prisma.serverMember.findUnique({
        where: { serverId_userId: { serverId, userId } },
    });

    if (!membership || !["owner", "admin"].includes(membership.role)) {
        return c.json({ error: "You do not have permission to view invites." }, 403);
    }

    const inviteList = await prisma.invite.findMany({
        where: { serverId },
        include: {
            creator: {
                select: { id: true, displayName: true, username: true },
            },
        },
        orderBy: { createdAt: "desc" },
    });

    return c.json({ invites: inviteList });
});

// ─── DELETE /invites/:id — Revoke invite ────────────────────────

invites.delete("/invites/:id", async (c) => {
    const userId = c.get("userId");
    const inviteId = c.req.param("id");

    const invite = await prisma.invite.findUnique({
        where: { id: inviteId },
    });

    if (!invite) {
        return c.json({ error: "Invite not found." }, 404);
    }

    // Only creator, admin, or owner can revoke
    const membership = await prisma.serverMember.findUnique({
        where: { serverId_userId: { serverId: invite.serverId, userId } },
    });

    if (!membership) {
        return c.json({ error: "You are not a member of this server." }, 403);
    }

    if (invite.creatorId !== userId && !["owner", "admin"].includes(membership.role)) {
        return c.json({ error: "You do not have permission to revoke this invite." }, 403);
    }

    await prisma.invite.delete({ where: { id: inviteId } });

    return c.json({ message: "Invite revoked." });
});

// ─── POST /invites/:code/join — Join server via invite ──────────

invites.post("/invites/:code/join", async (c) => {
    const userId = c.get("userId");
    const code = c.req.param("code");

    const invite = await prisma.invite.findUnique({
        where: { code },
        include: {
            server: {
                select: { id: true, name: true, iconUrl: true },
            },
        },
    });

    if (!invite) {
        return c.json({ error: "Invalid invite code." }, 404);
    }

    // Check expiry
    if (invite.expiresAt && invite.expiresAt < new Date()) {
        return c.json({ error: "This invite has expired." }, 410);
    }

    // Check max uses
    if (invite.maxUses !== null && invite.uses >= invite.maxUses) {
        return c.json({ error: "This invite has reached its maximum uses." }, 410);
    }

    // Check if already a member
    const existing = await prisma.serverMember.findUnique({
        where: { serverId_userId: { serverId: invite.serverId, userId } },
    });

    if (existing) {
        return c.json({ error: "You are already a member of this server.", server: invite.server }, 409);
    }

    // Claim a limited invite and create membership atomically. The conditional
    // update prevents concurrent requests from exceeding maxUses.
    const joined = await prisma.$transaction(async (tx) => {
        if (invite.maxUses !== null) {
            const claimed = await tx.invite.updateMany({
                where: { id: invite.id, uses: { lt: invite.maxUses } },
                data: { uses: { increment: 1 } },
            });
            if (claimed.count === 0) return false;
        } else {
            await tx.invite.update({
                where: { id: invite.id },
                data: { uses: { increment: 1 } },
            });
        }

        await tx.serverMember.create({
            data: {
                serverId: invite.serverId,
                userId,
                role: "member",
            },
        });
        return true;
    });

    if (!joined) {
        return c.json({ error: "This invite has reached its maximum uses." }, 410);
    }

    return c.json({ message: "Joined server.", server: invite.server });
});

export default invites;
