import { Hono } from "hono";
import { prisma } from "../lib/prisma.js";
import { authMiddleware, type AuthEnv } from "../middleware/auth.js";
import { generateVoiceToken, getLiveKitUrl } from "../lib/livekit.js";
import { broadcastToChannel } from "../services/realtime.js";
import { getChannelAccess, hasPermission, Permissions } from "../lib/permissions.js";

const voice = new Hono<AuthEnv>();

voice.use("*", authMiddleware);

interface VoiceParticipantView {
    userId: string;
    username: string;
    displayName: string;
    avatarUrl: string | null;
}

function toParticipantView(p: {
    userId: string;
    username: string;
    displayName: string;
    avatarUrl: string | null;
}): VoiceParticipantView {
    return {
        userId: p.userId,
        username: p.username,
        displayName: p.displayName,
        avatarUrl: p.avatarUrl,
    };
}

async function listParticipants(channelId: string): Promise<VoiceParticipantView[]> {
    const rows = await prisma.voiceParticipant.findMany({
        where: { channelId },
        select: { userId: true, username: true, displayName: true, avatarUrl: true },
        orderBy: { joinedAt: "asc" },
    });
    return rows.map(toParticipantView);
}

// ─── POST /channels/:channelId/voice/join ────────────────────────

voice.post("/channels/:channelId/voice/join", async (c) => {
    const userId = c.get("userId");
    const username = c.get("username");
    const channelId = c.req.param("channelId");

    const channel = await prisma.channel.findUnique({
        where: { id: channelId },
        include: { server: { select: { name: true } } },
    });

    if (!channel || !["voice", "stage"].includes(channel.type)) {
        return c.json({ error: "Voice channel not found." }, 404);
    }

    const access = await getChannelAccess(prisma, channelId, userId);
    if (!access || !hasPermission(access.permissions, Permissions.CONNECT_VOICE)) {
        return c.json({ error: "You do not have permission to join this voice channel." }, 403);
    }
    const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { displayName: true, avatarUrl: true },
    });

    const displayName = user?.displayName || username;

    // Leave any other voice channels first (single active voice channel per user).
    const existing = await prisma.voiceParticipant.findMany({
        where: { userId, NOT: { channelId } },
        select: { channelId: true },
    });
    if (existing.length > 0) {
        await prisma.voiceParticipant.deleteMany({ where: { userId, NOT: { channelId } } });
        for (const row of existing) {
            await broadcastToChannel(row.channelId, {
                type: "voice_participant_leave",
                data: { channelId: row.channelId, userId },
            });
        }
    }

    const roomName = `channel_${channelId}`;
    const isStage = channel.type === "stage";
    const canPublish = isStage
        ? hasPermission(access.permissions, Permissions.STAGE_MODERATOR)
        : hasPermission(access.permissions, Permissions.SPEAK);

    const token = await generateVoiceToken(roomName, userId, displayName, {
        canPublish,
        canSubscribe: true,
    });

    const participant = {
        userId,
        username,
        displayName,
        avatarUrl: user?.avatarUrl || null,
    };

    await prisma.voiceParticipant.upsert({
        where: { channelId_userId: { channelId, userId } },
        create: { channelId, ...participant },
        update: { username, displayName, avatarUrl: participant.avatarUrl },
    });

    await broadcastToChannel(channelId, {
        type: "voice_participant_join",
        data: { channelId, participant },
    });

    return c.json({
        token,
        url: getLiveKitUrl(),
        roomName,
        channelName: channel.name,
        serverName: channel.server.name,
        serverId: channel.serverId,
        channelType: channel.type,
        participants: await listParticipants(channelId),
    });
});

// ─── POST /channels/:channelId/voice/leave ───────────────────────

voice.post("/channels/:channelId/voice/leave", async (c) => {
    const userId = c.get("userId");
    const channelId = c.req.param("channelId");

    const access = await getChannelAccess(prisma, channelId, userId);
    if (!access || !hasPermission(access.permissions, Permissions.VIEW_CHANNEL)) {
        return c.json({ error: "Voice channel not found or inaccessible." }, 404);
    }

    await prisma.voiceParticipant.deleteMany({ where: { channelId, userId } });

    await broadcastToChannel(channelId, {
        type: "voice_participant_leave",
        data: { channelId, userId },
    });

    return c.json({ message: "Left voice channel." });
});

// ─── GET /channels/:channelId/voice/participants ─────────────────

voice.get("/channels/:channelId/voice/participants", async (c) => {
    const userId = c.get("userId");
    const channelId = c.req.param("channelId");
    const access = await getChannelAccess(prisma, channelId, userId);
    if (!access || !hasPermission(access.permissions, Permissions.VIEW_CHANNEL)) {
        return c.json({ error: "Voice channel not found or inaccessible." }, 404);
    }
    return c.json({ participants: await listParticipants(channelId) });
});

// ─── GET /servers/:serverId/voice/states ─────────────────────────

voice.get("/servers/:serverId/voice/states", async (c) => {
    const userId = c.get("userId");
    const serverId = c.req.param("serverId");

    const membership = await prisma.serverMember.findUnique({
        where: { serverId_userId: { serverId, userId } },
    });

    if (!membership) {
        return c.json({ error: "You are not a member of this server." }, 403);
    }

    const voiceChannels = await prisma.channel.findMany({
        where: { serverId, type: { in: ["voice", "stage"] } },
        select: { id: true },
    });
    const channelIds = voiceChannels.map((ch) => ch.id);

    const rows = await prisma.voiceParticipant.findMany({
        where: { channelId: { in: channelIds } },
        select: { channelId: true, userId: true, username: true, displayName: true, avatarUrl: true },
        orderBy: { joinedAt: "asc" },
    });

    const voiceStates: Record<string, VoiceParticipantView[]> = {};
    for (const row of rows) {
        (voiceStates[row.channelId] ??= []).push(toParticipantView(row));
    }

    return c.json({ voiceStates });
});

export default voice;
