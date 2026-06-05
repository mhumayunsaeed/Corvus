import { Hono } from "hono";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { authMiddleware, type AuthEnv } from "../middleware/auth.js";

const channels = new Hono<AuthEnv>();

channels.use("*", authMiddleware);

// ─── Validation Schemas ─────────────────────────────────────────

const createChannelSchema = z.object({
    name: z
        .string()
        .min(1, "Channel name is required")
        .max(50)
        .regex(/^[a-z0-9-]+$/, "Channel name can only contain lowercase letters, numbers, and hyphens")
        .transform((v) => v.toLowerCase()),
    type: z.enum(["text", "voice", "announcement", "forum", "stage"]).default("text"),
    category: z.string().min(1).max(50).default("General"),
    topic: z.string().max(200).optional(),
});

const updateChannelSchema = z.object({
    name: z
        .string()
        .min(1)
        .max(50)
        .regex(/^[a-z0-9-]+$/)
        .transform((v) => v.toLowerCase())
        .optional(),
    topic: z.string().max(200).nullable().optional(),
    category: z.string().min(1).max(50).optional(),
    position: z.number().int().min(0).optional(),
});

// ─── Helper: verify server membership ───────────────────────────

async function verifyMembership(serverId: string, userId: string) {
    return prisma.serverMember.findUnique({
        where: { serverId_userId: { serverId, userId } },
    });
}

// ─── POST /servers/:serverId/channels — Create channel ──────────

channels.post("/servers/:serverId/channels", async (c) => {
    const userId = c.get("userId");
    const serverId = c.req.param("serverId");

    const membership = await verifyMembership(serverId, userId);
    if (!membership || !["owner", "admin"].includes(membership.role)) {
        return c.json({ error: "You do not have permission to create channels." }, 403);
    }

    const body = await c.req.json();
    const result = createChannelSchema.safeParse(body);

    if (!result.success) {
        return c.json({ error: result.error.issues[0].message }, 400);
    }

    // Get max position in this category
    const maxPos = await prisma.channel.aggregate({
        where: { serverId, category: result.data.category },
        _max: { position: true },
    });

    const channel = await prisma.channel.create({
        data: {
            serverId,
            name: result.data.name,
            type: result.data.type,
            category: result.data.category,
            topic: result.data.topic,
            position: (maxPos._max.position ?? -1) + 1,
        },
    });

    return c.json({ channel }, 201);
});

// ─── GET /servers/:serverId/channels — List channels ────────────

channels.get("/servers/:serverId/channels", async (c) => {
    const userId = c.get("userId");
    const serverId = c.req.param("serverId");

    const membership = await verifyMembership(serverId, userId);
    if (!membership) {
        return c.json({ error: "You are not a member of this server." }, 403);
    }

    const channelList = await prisma.channel.findMany({
        where: { serverId },
        orderBy: [{ category: "asc" }, { position: "asc" }],
    });

    return c.json({ channels: channelList });
});

// ─── PATCH /channels/:id — Update channel ───────────────────────

channels.patch("/channels/:id", async (c) => {
    const userId = c.get("userId");
    const channelId = c.req.param("id");

    const channel = await prisma.channel.findUnique({
        where: { id: channelId },
    });

    if (!channel) {
        return c.json({ error: "Channel not found." }, 404);
    }

    const membership = await verifyMembership(channel.serverId, userId);
    if (!membership || !["owner", "admin"].includes(membership.role)) {
        return c.json({ error: "You do not have permission to update this channel." }, 403);
    }

    const body = await c.req.json();
    const result = updateChannelSchema.safeParse(body);

    if (!result.success) {
        return c.json({ error: result.error.issues[0].message }, 400);
    }

    const updateData: Record<string, unknown> = {};
    if (result.data.name !== undefined) updateData.name = result.data.name;
    if (result.data.topic !== undefined) updateData.topic = result.data.topic;
    if (result.data.category !== undefined) updateData.category = result.data.category;
    if (result.data.position !== undefined) updateData.position = result.data.position;

    const updated = await prisma.channel.update({
        where: { id: channelId },
        data: updateData,
    });

    return c.json({ channel: updated });
});

// ─── DELETE /channels/:id — Delete channel ──────────────────────

channels.delete("/channels/:id", async (c) => {
    const userId = c.get("userId");
    const channelId = c.req.param("id");

    const channel = await prisma.channel.findUnique({
        where: { id: channelId },
    });

    if (!channel) {
        return c.json({ error: "Channel not found." }, 404);
    }

    const membership = await verifyMembership(channel.serverId, userId);
    if (!membership || !["owner", "admin"].includes(membership.role)) {
        return c.json({ error: "You do not have permission to delete this channel." }, 403);
    }

    await prisma.channel.delete({ where: { id: channelId } });

    return c.json({ message: "Channel deleted." });
});

// ─── POST /channels/:id/read — Mark channel as read ─────────────

channels.post("/channels/:id/read", async (c) => {
    const userId = c.get("userId");
    const channelId = c.req.param("id");

    const channel = await prisma.channel.findUnique({
        where: { id: channelId },
    });

    if (!channel) {
        return c.json({ error: "Channel not found." }, 404);
    }

    const membership = await verifyMembership(channel.serverId, userId);
    if (!membership) {
        return c.json({ error: "You are not a member of this server." }, 403);
    }

    await prisma.channelRead.upsert({
        where: { channelId_userId: { channelId, userId } },
        update: { lastReadAt: new Date() },
        create: { channelId, userId, lastReadAt: new Date() },
    });

    return c.json({ success: true });
});

export default channels;
