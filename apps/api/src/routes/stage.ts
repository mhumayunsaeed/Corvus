import { Hono } from "hono";
import { prisma } from "../lib/prisma.js";
import { authMiddleware, type AuthEnv } from "../middleware/auth.js";
import { broadcastToChannel } from "../services/realtime.js";
import { getChannelAccess, hasPermission, Permissions } from "../lib/permissions.js";

const stage = new Hono<AuthEnv>();

stage.use("*", authMiddleware);

// Stage state is persisted in the `stage_participants` table (role =
// "speaker" | "raised_hand") so it survives stateless API invocations.

// ─── POST /channels/:channelId/stage/request-speak ───────────────

stage.post("/channels/:channelId/stage/request-speak", async (c) => {
    const userId = c.get("userId");
    const username = c.get("username");
    const channelId = c.req.param("channelId");

    // Verify stage channel
    const channel = await prisma.channel.findUnique({ where: { id: channelId } });
    if (!channel || channel.type !== "stage") {
        return c.json({ error: "Stage channel not found." }, 404);
    }
    const access = await getChannelAccess(prisma, channelId, userId);
    if (!access || !hasPermission(access.permissions, Permissions.CONNECT_VOICE)) {
        return c.json({ error: "You do not have permission to access this stage." }, 403);
    }

    // Track raised hand (no-op if already a speaker)
    await prisma.stageParticipant.upsert({
        where: { channelId_userId: { channelId, userId } },
        create: { channelId, userId, role: "raised_hand" },
        update: {},
    });

    // Get user details
    const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { displayName: true, avatarUrl: true },
    });

    await broadcastToChannel(channelId, {
        type: "stage_speak_request",
        data: {
            channelId,
            userId,
            username,
            displayName: user?.displayName || username,
            avatarUrl: user?.avatarUrl || null,
        },
    });

    return c.json({ message: "Speak request sent." });
});

// ─── POST /channels/:channelId/stage/grant-speak ─────────────────

stage.post("/channels/:channelId/stage/grant-speak", async (c) => {
    const userId = c.get("userId");
    const channelId = c.req.param("channelId");

    const body = await c.req.json();
    const targetUserId = body.userId as string;

    if (!targetUserId) {
        return c.json({ error: "Target userId is required." }, 400);
    }

    // Verify moderator permissions
    const channel = await prisma.channel.findUnique({ where: { id: channelId } });
    if (!channel || channel.type !== "stage") {
        return c.json({ error: "Stage channel not found." }, 404);
    }

    const access = await getChannelAccess(prisma, channelId, userId);
    if (!access || !hasPermission(access.permissions, Permissions.STAGE_MODERATOR)) {
        return c.json({ error: "Only moderators can grant speak permission." }, 403);
    }

    const targetMember = await prisma.serverMember.findUnique({
        where: { serverId_userId: { serverId: channel.serverId, userId: targetUserId } },
    });
    if (!targetMember) return c.json({ error: "Target user is not a server member." }, 404);

    // Grant speaker status (clears the raised-hand state via the role update)
    await prisma.stageParticipant.upsert({
        where: { channelId_userId: { channelId, userId: targetUserId } },
        create: { channelId, userId: targetUserId, role: "speaker" },
        update: { role: "speaker" },
    });

    await broadcastToChannel(channelId, {
        type: "stage_speaker_added",
        data: { channelId, userId: targetUserId },
    });

    return c.json({ message: "Speaker added." });
});

// ─── POST /channels/:channelId/stage/revoke-speak ────────────────

stage.post("/channels/:channelId/stage/revoke-speak", async (c) => {
    const userId = c.get("userId");
    const channelId = c.req.param("channelId");

    const body = await c.req.json();
    const targetUserId = body.userId as string;

    if (!targetUserId) {
        return c.json({ error: "Target userId is required." }, 400);
    }

    // Verify moderator permissions
    const channel = await prisma.channel.findUnique({ where: { id: channelId } });
    if (!channel || channel.type !== "stage") {
        return c.json({ error: "Stage channel not found." }, 404);
    }

    const access = await getChannelAccess(prisma, channelId, userId);
    if (!access || !hasPermission(access.permissions, Permissions.STAGE_MODERATOR)) {
        return c.json({ error: "Only moderators can revoke speak permission." }, 403);
    }

    // Revoke speaker status entirely (removes them from the stage roster)
    await prisma.stageParticipant.deleteMany({
        where: { channelId, userId: targetUserId, role: "speaker" },
    });

    await broadcastToChannel(channelId, {
        type: "stage_speaker_removed",
        data: { channelId, userId: targetUserId },
    });

    return c.json({ message: "Speaker removed." });
});

// ─── GET /channels/:channelId/stage/state ────────────────────────

stage.get("/channels/:channelId/stage/state", async (c) => {
    const userId = c.get("userId");
    const channelId = c.req.param("channelId");

    const access = await getChannelAccess(prisma, channelId, userId);
    if (!access || access.channel.type !== "stage" || !hasPermission(access.permissions, Permissions.VIEW_CHANNEL)) {
        return c.json({ error: "Stage channel not found or inaccessible." }, 404);
    }

    const rows = await prisma.stageParticipant.findMany({
        where: { channelId },
        select: { userId: true, role: true },
    });

    return c.json({
        speakers: rows.filter((r) => r.role === "speaker").map((r) => r.userId),
        raisedHands: rows.filter((r) => r.role === "raised_hand").map((r) => r.userId),
    });
});

export default stage;
