import { Hono } from "hono";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { authMiddleware, type AuthEnv } from "../middleware/auth.js";

const channelPermissions = new Hono<AuthEnv>();

channelPermissions.use("*", authMiddleware);

// ─── GET /channels/:channelId/permissions ────────────────────────

channelPermissions.get("/channels/:channelId/permissions", async (c) => {
    const userId = c.get("userId");
    const channelId = c.req.param("channelId");

    const channel = await prisma.channel.findUnique({ where: { id: channelId } });
    if (!channel) {
        return c.json({ error: "Channel not found." }, 404);
    }

    // Must be admin/owner to view overrides
    const membership = await prisma.serverMember.findUnique({
        where: { serverId_userId: { serverId: channel.serverId, userId } },
    });
    if (!membership || !["owner", "admin"].includes(membership.role)) {
        return c.json({ error: "You do not have permission to view channel permissions." }, 403);
    }

    const overrides = await prisma.channelPermissionOverride.findMany({
        where: { channelId },
        include: { role: { select: { id: true, name: true, color: true } } },
    });

    return c.json({
        overrides: overrides.map((o) => ({
            id: o.id,
            channelId: o.channelId,
            roleId: o.roleId,
            roleName: o.role.name,
            roleColor: o.role.color,
            allow: o.allow,
            deny: o.deny,
        })),
    });
});

// ─── PUT /channels/:channelId/permissions/:roleId ────────────────

const upsertOverrideSchema = z.object({
    allow: z.number().int().min(0),
    deny: z.number().int().min(0),
});

channelPermissions.put("/channels/:channelId/permissions/:roleId", async (c) => {
    const userId = c.get("userId");
    const channelId = c.req.param("channelId");
    const roleId = c.req.param("roleId");

    const channel = await prisma.channel.findUnique({ where: { id: channelId } });
    if (!channel) {
        return c.json({ error: "Channel not found." }, 404);
    }

    const membership = await prisma.serverMember.findUnique({
        where: { serverId_userId: { serverId: channel.serverId, userId } },
    });
    if (!membership || !["owner", "admin"].includes(membership.role)) {
        return c.json({ error: "You do not have permission to manage channel permissions." }, 403);
    }

    // Verify role belongs to same server
    const role = await prisma.role.findUnique({ where: { id: roleId } });
    if (!role || role.serverId !== channel.serverId) {
        return c.json({ error: "Role not found in this server." }, 404);
    }

    const body = await c.req.json();
    const result = upsertOverrideSchema.safeParse(body);
    if (!result.success) {
        return c.json({ error: result.error.errors[0].message }, 400);
    }

    const override = await prisma.channelPermissionOverride.upsert({
        where: { channelId_roleId: { channelId, roleId } },
        create: {
            channelId,
            roleId,
            allow: result.data.allow,
            deny: result.data.deny,
        },
        update: {
            allow: result.data.allow,
            deny: result.data.deny,
        },
    });

    return c.json({ override });
});

// ─── DELETE /channels/:channelId/permissions/:roleId ─────────────

channelPermissions.delete("/channels/:channelId/permissions/:roleId", async (c) => {
    const userId = c.get("userId");
    const channelId = c.req.param("channelId");
    const roleId = c.req.param("roleId");

    const channel = await prisma.channel.findUnique({ where: { id: channelId } });
    if (!channel) {
        return c.json({ error: "Channel not found." }, 404);
    }

    const membership = await prisma.serverMember.findUnique({
        where: { serverId_userId: { serverId: channel.serverId, userId } },
    });
    if (!membership || !["owner", "admin"].includes(membership.role)) {
        return c.json({ error: "You do not have permission to manage channel permissions." }, 403);
    }

    await prisma.channelPermissionOverride.deleteMany({
        where: { channelId, roleId },
    });

    return c.json({ message: "Permission override removed." });
});

export default channelPermissions;
