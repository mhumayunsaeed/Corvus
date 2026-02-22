import { Hono } from "hono";
import { prisma } from "../lib/prisma.js";
import { authMiddleware, type AuthEnv } from "../middleware/auth.js";
import { broadcastToChannel } from "../ws.js";

const stage = new Hono<AuthEnv>();

stage.use("*", authMiddleware);

// In-memory stage state: channelId -> Set of userIds with speak permission
const stageSpeakers = new Map<string, Set<string>>();
const stageRaiseHands = new Map<string, Set<string>>();

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

    // Track raised hand
    if (!stageRaiseHands.has(channelId)) {
        stageRaiseHands.set(channelId, new Set());
    }
    stageRaiseHands.get(channelId)!.add(userId);

    // Get user details
    const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { displayName: true, avatarUrl: true },
    });

    broadcastToChannel(channelId, {
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

    const membership = await prisma.serverMember.findUnique({
        where: { serverId_userId: { serverId: channel.serverId, userId } },
    });

    if (!membership || !["owner", "admin"].includes(membership.role)) {
        return c.json({ error: "Only moderators can grant speak permission." }, 403);
    }

    // Grant speaker status
    if (!stageSpeakers.has(channelId)) {
        stageSpeakers.set(channelId, new Set());
    }
    stageSpeakers.get(channelId)!.add(targetUserId);

    // Remove from raised hands
    stageRaiseHands.get(channelId)?.delete(targetUserId);

    broadcastToChannel(channelId, {
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

    const membership = await prisma.serverMember.findUnique({
        where: { serverId_userId: { serverId: channel.serverId, userId } },
    });

    if (!membership || !["owner", "admin"].includes(membership.role)) {
        return c.json({ error: "Only moderators can revoke speak permission." }, 403);
    }

    // Revoke speaker status
    stageSpeakers.get(channelId)?.delete(targetUserId);

    broadcastToChannel(channelId, {
        type: "stage_speaker_removed",
        data: { channelId, userId: targetUserId },
    });

    return c.json({ message: "Speaker removed." });
});

// ─── GET /channels/:channelId/stage/state ────────────────────────

stage.get("/channels/:channelId/stage/state", async (c) => {
    const channelId = c.req.param("channelId");

    return c.json({
        speakers: Array.from(stageSpeakers.get(channelId) || []),
        raisedHands: Array.from(stageRaiseHands.get(channelId) || []),
    });
});

export default stage;
