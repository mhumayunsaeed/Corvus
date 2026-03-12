import { Hono } from "hono";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { authMiddleware, type AuthEnv } from "../middleware/auth.js";
import { DEFAULT_MEMBER_PERMISSIONS, ADMIN_PERMISSIONS } from "../lib/permissions.js";

const servers = new Hono<AuthEnv>();

servers.use("*", authMiddleware);

// ─── Validation Schemas ─────────────────────────────────────────

const channelTemplateSchema = z.object({
    name: z.string().min(1).max(100),
    type: z.enum(["text", "voice", "announcement", "forum", "stage"]),
    category: z.string().min(1).max(100),
});

const createServerSchema = z.object({
    name: z.string().min(1, "Server name is required").max(100),
    iconUrl: z.string().url().optional(),
    description: z.string().max(500).optional(),
    channels: z.array(channelTemplateSchema).max(20).optional(),
});

const updateServerSchema = z.object({
    name: z.string().min(1).max(100).optional(),
    iconUrl: z.string().url().nullable().optional(),
    description: z.string().max(500).nullable().optional(),
});

// ─── POST /servers — Create server ──────────────────────────────

servers.post("/", async (c) => {
    const userId = c.get("userId");

    let body: unknown;
    try {
        body = await c.req.json();
    } catch {
        return c.json({ error: "Invalid JSON in request body." }, 400);
    }

    const parsed = createServerSchema.safeParse(body);
    if (!parsed.success) {
        return c.json({ error: parsed.error.errors[0].message }, 400);
    }

    const { name, iconUrl, description, channels: templateChannels } = parsed.data;

    const channelsToCreate = templateChannels && templateChannels.length > 0
        ? templateChannels.map((ch, i) => ({
            name: ch.name,
            type: ch.type,
            category: ch.category,
            position: i,
        }))
        : [{ name: "general", type: "text" as const, category: "General", position: 0 }];

    // Step 1: Create the server with member + channels in one call
    let server;
    try {
        server = await prisma.server.create({
            data: {
                name,
                iconUrl: iconUrl ?? null,
                description: description ?? null,
                ownerId: userId,
                members: { create: { userId, role: "owner" } },
                channels: { create: channelsToCreate },
            },
            select: {
                id: true,
                name: true,
                iconUrl: true,
                description: true,
                ownerId: true,
                createdAt: true,
                updatedAt: true,
                channels: {
                    select: {
                        id: true,
                        serverId: true,
                        name: true,
                        type: true,
                        category: true,
                        topic: true,
                        position: true,
                        createdAt: true,
                    },
                    orderBy: [{ category: "asc" }, { position: "asc" }],
                },
                _count: { select: { members: true } },
            },
        });
    } catch (err) {
        console.error("[POST /servers] Failed to create server record:", err);
        return c.json({ error: "Could not create the server. Please try again." }, 500);
    }

    // Step 2: Create default roles (non-blocking — server already exists)
    try {
        await Promise.all([
            prisma.role.create({
                data: {
                    serverId: server.id,
                    name: "@everyone",
                    permissions: DEFAULT_MEMBER_PERMISSIONS,
                    position: 0,
                    isDefault: true,
                },
            }),
            prisma.role.create({
                data: {
                    serverId: server.id,
                    name: "Admin",
                    color: "#7C3AED",
                    permissions: ADMIN_PERMISSIONS,
                    position: 100,
                    isDefault: false,
                },
            }),
        ]);
    } catch (err) {
        // Roles failed but the server itself is usable — log and continue
        console.error("[POST /servers] Failed to create default roles for", server.id, err);
    }

    // Step 3: Return a clean response matching the frontend ServerData + channels shape
    const responseBody = {
        server: {
            id: server.id,
            name: server.name,
            iconUrl: server.iconUrl,
            description: server.description,
            ownerId: server.ownerId,
            memberCount: server._count.members,
            role: "owner",
            channels: server.channels,
        },
    };
    return c.json(responseBody, 201);
});

// ─── GET /servers — List user's servers ─────────────────────────

servers.get("/", async (c) => {
    const userId = c.get("userId");

    const memberships = await prisma.serverMember.findMany({
        where: { userId },
        include: {
            server: {
                include: {
                    _count: { select: { members: true } },
                },
            },
        },
        orderBy: { joinedAt: "asc" },
    });

    const serverList = memberships.map((m) => ({
        id: m.server.id,
        name: m.server.name,
        iconUrl: m.server.iconUrl,
        description: m.server.description,
        ownerId: m.server.ownerId,
        memberCount: m.server._count.members,
        role: m.role,
    }));

    return c.json({ servers: serverList });
});

// ─── GET /servers/:id — Get server details ──────────────────────

servers.get("/:id", async (c) => {
    const userId = c.get("userId");
    const serverId = c.req.param("id");

    // Verify membership
    const membership = await prisma.serverMember.findUnique({
        where: { serverId_userId: { serverId, userId } },
    });

    if (!membership) {
        return c.json({ error: "Server not found or you are not a member." }, 404);
    }

    const server = await prisma.server.findUnique({
        where: { id: serverId },
        include: {
            channels: { orderBy: [{ category: "asc" }, { position: "asc" }] },
            _count: { select: { members: true } },
        },
    });

    if (!server) {
        return c.json({ error: "Server not found." }, 404);
    }

    // Compute unread counts per channel
    const channelIds = server.channels.filter((ch) => ch.type === "text").map((ch) => ch.id);
    const reads = await prisma.channelRead.findMany({
        where: { userId, channelId: { in: channelIds } },
        select: { channelId: true, lastReadAt: true },
    });
    const readMap = new Map(reads.map((r) => [r.channelId, r.lastReadAt]));

    // Count unread messages per channel (messages after lastReadAt, not authored by current user)
    const unreadCounts: Record<string, number> = {};
    if (channelIds.length > 0) {
        const countResults = await Promise.all(
            channelIds.map(async (chId) => {
                const lastRead = readMap.get(chId);
                const count = await prisma.message.count({
                    where: {
                        channelId: chId,
                        authorId: { not: userId },
                        ...(lastRead ? { createdAt: { gt: lastRead } } : {}),
                    },
                });
                return { channelId: chId, count };
            })
        );
        for (const { channelId: chId, count } of countResults) {
            if (count > 0) unreadCounts[chId] = count;
        }
    }

    return c.json({
        server: {
            ...server,
            memberCount: server._count.members,
            role: membership.role,
        },
        unreadCounts,
    });
});

// ─── PATCH /servers/:id — Update server ─────────────────────────

servers.patch("/:id", async (c) => {
    const userId = c.get("userId");
    const serverId = c.req.param("id");

    const membership = await prisma.serverMember.findUnique({
        where: { serverId_userId: { serverId, userId } },
    });

    if (!membership || !["owner", "admin"].includes(membership.role)) {
        return c.json({ error: "You do not have permission to update this server." }, 403);
    }

    const body = await c.req.json();
    const result = updateServerSchema.safeParse(body);

    if (!result.success) {
        return c.json({ error: result.error.errors[0].message }, 400);
    }

    const updateData: Record<string, unknown> = {};
    if (result.data.name !== undefined) updateData.name = result.data.name;
    if (result.data.iconUrl !== undefined) updateData.iconUrl = result.data.iconUrl;
    if (result.data.description !== undefined) updateData.description = result.data.description;

    const server = await prisma.server.update({
        where: { id: serverId },
        data: updateData,
    });

    return c.json({ server });
});

// ─── DELETE /servers/:id — Delete server ────────────────────────

servers.delete("/:id", async (c) => {
    const userId = c.get("userId");
    const serverId = c.req.param("id");

    const server = await prisma.server.findUnique({
        where: { id: serverId },
    });

    if (!server) {
        return c.json({ error: "Server not found." }, 404);
    }

    if (server.ownerId !== userId) {
        return c.json({ error: "Only the server owner can delete the server." }, 403);
    }

    await prisma.server.delete({ where: { id: serverId } });

    return c.json({ message: "Server deleted." });
});

export default servers;
