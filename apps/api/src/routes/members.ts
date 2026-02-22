import { Hono } from "hono";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { authMiddleware, type AuthEnv } from "../middleware/auth.js";

const members = new Hono<AuthEnv>();

members.use("*", authMiddleware);

// ─── GET /servers/:serverId/members — List members ──────────────

members.get("/servers/:serverId/members", async (c) => {
    const userId = c.get("userId");
    const serverId = c.req.param("serverId");

    const membership = await prisma.serverMember.findUnique({
        where: { serverId_userId: { serverId, userId } },
    });

    if (!membership) {
        return c.json({ error: "You are not a member of this server." }, 403);
    }

    const memberList = await prisma.serverMember.findMany({
        where: { serverId },
        include: {
            user: {
                select: {
                    id: true,
                    displayName: true,
                    username: true,
                    avatarUrl: true,
                    status: true,
                    bio: true,
                },
            },
        },
        orderBy: { joinedAt: "asc" },
    });

    return c.json({
        members: memberList.map((m) => ({
            id: m.id,
            userId: m.user.id,
            role: m.role,
            nickname: m.nickname,
            joinedAt: m.joinedAt,
            user: m.user,
        })),
    });
});

// ─── PATCH /servers/:serverId/members/:userId — Update role ─────

const updateRoleSchema = z.object({
    role: z.enum(["admin", "member"]),
});

members.patch("/servers/:serverId/members/:userId", async (c) => {
    const currentUserId = c.get("userId");
    const serverId = c.req.param("serverId");
    const targetUserId = c.req.param("userId");

    const currentMembership = await prisma.serverMember.findUnique({
        where: { serverId_userId: { serverId, userId: currentUserId } },
    });

    if (!currentMembership || !["owner", "admin"].includes(currentMembership.role)) {
        return c.json({ error: "You do not have permission to manage roles." }, 403);
    }

    const targetMembership = await prisma.serverMember.findUnique({
        where: { serverId_userId: { serverId, userId: targetUserId } },
    });

    if (!targetMembership) {
        return c.json({ error: "Member not found." }, 404);
    }

    // Can't change owner's role
    if (targetMembership.role === "owner") {
        return c.json({ error: "Cannot change the owner's role." }, 403);
    }

    // Only owner can promote to admin
    const body = await c.req.json();
    const result = updateRoleSchema.safeParse(body);

    if (!result.success) {
        return c.json({ error: result.error.errors[0].message }, 400);
    }

    if (result.data.role === "admin" && currentMembership.role !== "owner") {
        return c.json({ error: "Only the server owner can promote to admin." }, 403);
    }

    const updated = await prisma.serverMember.update({
        where: { serverId_userId: { serverId, userId: targetUserId } },
        data: { role: result.data.role },
    });

    return c.json({ member: updated });
});

// ─── DELETE /servers/:serverId/members/:userId — Kick/Leave ─────

members.delete("/servers/:serverId/members/:userId", async (c) => {
    const currentUserId = c.get("userId");
    const serverId = c.req.param("serverId");
    const targetUserId = c.req.param("userId");

    const isSelf = currentUserId === targetUserId;

    if (isSelf) {
        // Leaving the server
        const membership = await prisma.serverMember.findUnique({
            where: { serverId_userId: { serverId, userId: currentUserId } },
        });

        if (!membership) {
            return c.json({ error: "You are not a member of this server." }, 404);
        }

        if (membership.role === "owner") {
            return c.json({ error: "The server owner cannot leave. Transfer ownership or delete the server." }, 403);
        }

        await prisma.serverMember.delete({
            where: { serverId_userId: { serverId, userId: currentUserId } },
        });

        return c.json({ message: "Left the server." });
    }

    // Kicking another member
    const currentMembership = await prisma.serverMember.findUnique({
        where: { serverId_userId: { serverId, userId: currentUserId } },
    });

    if (!currentMembership || !["owner", "admin"].includes(currentMembership.role)) {
        return c.json({ error: "You do not have permission to kick members." }, 403);
    }

    const targetMembership = await prisma.serverMember.findUnique({
        where: { serverId_userId: { serverId, userId: targetUserId } },
    });

    if (!targetMembership) {
        return c.json({ error: "Member not found." }, 404);
    }

    if (targetMembership.role === "owner") {
        return c.json({ error: "Cannot kick the server owner." }, 403);
    }

    // Admins can't kick other admins (only owner can)
    if (targetMembership.role === "admin" && currentMembership.role !== "owner") {
        return c.json({ error: "Only the server owner can kick admins." }, 403);
    }

    await prisma.serverMember.delete({
        where: { serverId_userId: { serverId, userId: targetUserId } },
    });

    return c.json({ message: "Member kicked." });
});

export default members;
