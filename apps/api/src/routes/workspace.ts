import { Hono } from "hono";
import { z } from "zod";
import type { Prisma } from "../generated/prisma/index.js";
import { prisma } from "../lib/prisma.js";
import { authMiddleware, type AuthEnv } from "../middleware/auth.js";
import {
    ensureChannelModuleState,
    ensureChannelModuleStates,
    getModuleStateForServer,
} from "../lib/module-state.js";

const workspace = new Hono<AuthEnv>();

workspace.use("*", authMiddleware);

const asJson = (value: unknown): Prisma.InputJsonValue => value as Prisma.InputJsonValue;

const settingsSchema = z.object({
    settings: z.record(z.string(), z.unknown()).default({}),
});

const boardSchema = z.object({
    board: z
        .object({
            id: z.string(),
            name: z.string(),
            columns: z.array(z.unknown()),
        })
        .passthrough(),
});

const docsSchema = z.object({
    docs: z.array(z.unknown()),
});

const incidentSchema = z.object({
    incident: z
        .object({
            status: z.string(),
            severity: z.string(),
            services: z.array(z.string()).default([]),
            duration: z.string(),
            timeline: z.array(z.unknown()).default([]),
        })
        .passthrough(),
});

const canvasSchema = z.object({
    data: z.record(z.string(), z.unknown()).default({}),
});

const githubSchema = z.object({
    config: z.record(z.string(), z.unknown()).optional(),
    pullRequests: z.array(z.unknown()).optional(),
});

async function verifyServerAccess(serverId: string, userId: string) {
    return prisma.serverMember.findUnique({
        where: { serverId_userId: { serverId, userId } },
    });
}

async function verifyChannelAccess(channelId: string, userId: string) {
    const channel = await prisma.channel.findUnique({
        where: { id: channelId },
    });
    if (!channel) return null;

    const membership = await verifyServerAccess(channel.serverId, userId);
    if (!membership) return null;

    return { channel, membership };
}

function requireAdmin(role: string) {
    return role === "owner" || role === "admin";
}

workspace.get("/users/me/settings", async (c) => {
    const userId = c.get("userId");

    const settings = await prisma.userSettings.upsert({
        where: { userId },
        update: {},
        create: { userId, settings: {} },
    });

    return c.json({ settings: settings.settings });
});

workspace.put("/users/me/settings", async (c) => {
    const userId = c.get("userId");
    const parsed = settingsSchema.safeParse(await c.req.json().catch(() => ({})));
    if (!parsed.success) {
        return c.json({ error: parsed.error.issues[0]?.message ?? "Invalid settings." }, 400);
    }

    const settings = await prisma.userSettings.upsert({
        where: { userId },
        update: { settings: asJson(parsed.data.settings) },
        create: { userId, settings: asJson(parsed.data.settings) },
    });

    return c.json({ settings: settings.settings });
});

workspace.get("/servers/:serverId/settings", async (c) => {
    const userId = c.get("userId");
    const serverId = c.req.param("serverId");

    const membership = await verifyServerAccess(serverId, userId);
    if (!membership) {
        return c.json({ error: "Server not found or you are not a member." }, 404);
    }

    const settings = await prisma.serverSettings.upsert({
        where: { serverId },
        update: {},
        create: { serverId, settings: {} },
    });

    return c.json({ settings: settings.settings });
});

workspace.put("/servers/:serverId/settings", async (c) => {
    const userId = c.get("userId");
    const serverId = c.req.param("serverId");

    const membership = await verifyServerAccess(serverId, userId);
    if (!membership || !requireAdmin(membership.role)) {
        return c.json({ error: "You do not have permission to update this server." }, 403);
    }

    const parsed = settingsSchema.safeParse(await c.req.json().catch(() => ({})));
    if (!parsed.success) {
        return c.json({ error: parsed.error.issues[0]?.message ?? "Invalid settings." }, 400);
    }

    const settings = await prisma.serverSettings.upsert({
        where: { serverId },
        update: { settings: asJson(parsed.data.settings) },
        create: { serverId, settings: asJson(parsed.data.settings) },
    });

    return c.json({ settings: settings.settings });
});

workspace.get("/servers/:serverId/modules", async (c) => {
    const userId = c.get("userId");
    const serverId = c.req.param("serverId");

    const membership = await verifyServerAccess(serverId, userId);
    if (!membership) {
        return c.json({ error: "Server not found or you are not a member." }, 404);
    }

    const moduleChannels = await prisma.channel.findMany({
        where: {
            serverId,
            type: { in: ["board", "docs", "canvas", "github", "incident"] },
        },
        select: { id: true, name: true, type: true, serverId: true },
    });
    await ensureChannelModuleStates(moduleChannels);

    return c.json(await getModuleStateForServer(serverId));
});

workspace.put("/channels/:channelId/board", async (c) => {
    const userId = c.get("userId");
    const channelId = c.req.param("channelId");
    const access = await verifyChannelAccess(channelId, userId);
    if (!access) return c.json({ error: "Channel not found or you are not a member." }, 404);
    if (access.channel.type !== "board") return c.json({ error: "Channel is not a board channel." }, 400);

    const parsed = boardSchema.safeParse(await c.req.json().catch(() => ({})));
    if (!parsed.success) {
        return c.json({ error: parsed.error.issues[0]?.message ?? "Invalid board." }, 400);
    }

    const row = await prisma.channelBoard.upsert({
        where: { channelId },
        update: { board: asJson(parsed.data.board) },
        create: { channelId, board: asJson(parsed.data.board) },
    });

    return c.json({ board: row.board });
});

workspace.put("/channels/:channelId/docs", async (c) => {
    const userId = c.get("userId");
    const channelId = c.req.param("channelId");
    const access = await verifyChannelAccess(channelId, userId);
    if (!access) return c.json({ error: "Channel not found or you are not a member." }, 404);
    if (access.channel.type !== "docs") return c.json({ error: "Channel is not a docs channel." }, 400);

    const parsed = docsSchema.safeParse(await c.req.json().catch(() => ({})));
    if (!parsed.success) {
        return c.json({ error: parsed.error.issues[0]?.message ?? "Invalid docs." }, 400);
    }

    const row = await prisma.channelDocs.upsert({
        where: { channelId },
        update: { docs: asJson(parsed.data.docs) },
        create: { channelId, docs: asJson(parsed.data.docs) },
    });

    return c.json({ docs: row.docs });
});

workspace.put("/channels/:channelId/incident", async (c) => {
    const userId = c.get("userId");
    const channelId = c.req.param("channelId");
    const access = await verifyChannelAccess(channelId, userId);
    if (!access) return c.json({ error: "Channel not found or you are not a member." }, 404);
    if (access.channel.type !== "incident") {
        return c.json({ error: "Channel is not an incident channel." }, 400);
    }

    const parsed = incidentSchema.safeParse(await c.req.json().catch(() => ({})));
    if (!parsed.success) {
        return c.json({ error: parsed.error.issues[0]?.message ?? "Invalid incident." }, 400);
    }

    const row = await prisma.channelIncident.upsert({
        where: { channelId },
        update: { incident: asJson(parsed.data.incident) },
        create: { channelId, incident: asJson(parsed.data.incident) },
    });

    return c.json({ incident: row.incident });
});

workspace.put("/channels/:channelId/canvas", async (c) => {
    const userId = c.get("userId");
    const channelId = c.req.param("channelId");
    const access = await verifyChannelAccess(channelId, userId);
    if (!access) return c.json({ error: "Channel not found or you are not a member." }, 404);
    if (access.channel.type !== "canvas") return c.json({ error: "Channel is not a canvas channel." }, 400);

    const parsed = canvasSchema.safeParse(await c.req.json().catch(() => ({})));
    if (!parsed.success) {
        return c.json({ error: parsed.error.issues[0]?.message ?? "Invalid canvas." }, 400);
    }

    const row = await prisma.channelCanvas.upsert({
        where: { channelId },
        update: { data: asJson(parsed.data.data) },
        create: { channelId, data: asJson(parsed.data.data) },
    });

    return c.json({ data: row.data });
});

workspace.put("/channels/:channelId/github", async (c) => {
    const userId = c.get("userId");
    const channelId = c.req.param("channelId");
    const access = await verifyChannelAccess(channelId, userId);
    if (!access) return c.json({ error: "Channel not found or you are not a member." }, 404);
    if (access.channel.type !== "github") return c.json({ error: "Channel is not a GitHub channel." }, 400);

    const parsed = githubSchema.safeParse(await c.req.json().catch(() => ({})));
    if (!parsed.success) {
        return c.json({ error: parsed.error.issues[0]?.message ?? "Invalid GitHub state." }, 400);
    }

    await ensureChannelModuleState(access.channel);
    const current = await prisma.channelGitHub.findUniqueOrThrow({ where: { channelId } });
    const row = await prisma.channelGitHub.update({
        where: { channelId },
        data: {
            config: asJson(parsed.data.config ?? current.config ?? {}),
            pullRequests: asJson(parsed.data.pullRequests ?? current.pullRequests ?? []),
        },
    });

    return c.json({ config: row.config, pullRequests: row.pullRequests });
});

export default workspace;
