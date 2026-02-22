import { Hono } from "hono";
import { prisma } from "../lib/prisma.js";
import { authMiddleware, type AuthEnv } from "../middleware/auth.js";
import { generateVoiceToken, getLiveKitUrl } from "../lib/livekit.js";
import {
    broadcastToChannel,
    addVoiceParticipant,
    removeVoiceParticipant,
    getVoiceParticipants,
    getUserVoiceChannel,
    getAllVoiceChannelStates,
} from "../ws.js";

const voice = new Hono<AuthEnv>();

voice.use("*", authMiddleware);

// ─── POST /channels/:channelId/voice/join ────────────────────────

voice.post("/channels/:channelId/voice/join", async (c) => {
    const userId = c.get("userId");
    const username = c.get("username");
    const channelId = c.req.param("channelId");

    // Verify channel exists and is voice/stage type
    const channel = await prisma.channel.findUnique({
        where: { id: channelId },
        include: { server: { select: { name: true } } },
    });

    if (!channel || !["voice", "stage"].includes(channel.type)) {
        return c.json({ error: "Voice channel not found." }, 404);
    }

    // Verify membership
    const membership = await prisma.serverMember.findUnique({
        where: { serverId_userId: { serverId: channel.serverId, userId } },
    });

    if (!membership) {
        return c.json({ error: "You are not a member of this server." }, 403);
    }

    // Get user details
    const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { displayName: true, avatarUrl: true },
    });

    const displayName = user?.displayName || username;

    // Leave any existing voice channel first
    const currentVoiceChannel = getUserVoiceChannel(userId);
    if (currentVoiceChannel && currentVoiceChannel !== channelId) {
        removeVoiceParticipant(currentVoiceChannel, userId);
        broadcastToChannel(currentVoiceChannel, {
            type: "voice_participant_leave",
            data: { channelId: currentVoiceChannel, userId },
        });
    }

    // Generate LiveKit token
    const roomName = `channel_${channelId}`;
    const isStage = channel.type === "stage";
    const canPublish = isStage ? ["owner", "admin"].includes(membership.role) : true;

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

    // Track participant
    addVoiceParticipant(channelId, participant);

    // Broadcast join to channel subscribers
    broadcastToChannel(channelId, {
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
        participants: getVoiceParticipants(channelId),
    });
});

// ─── POST /channels/:channelId/voice/leave ───────────────────────

voice.post("/channels/:channelId/voice/leave", async (c) => {
    const userId = c.get("userId");
    const channelId = c.req.param("channelId");

    removeVoiceParticipant(channelId, userId);

    broadcastToChannel(channelId, {
        type: "voice_participant_leave",
        data: { channelId, userId },
    });

    return c.json({ message: "Left voice channel." });
});

// ─── GET /channels/:channelId/voice/participants ─────────────────

voice.get("/channels/:channelId/voice/participants", async (c) => {
    const channelId = c.req.param("channelId");
    return c.json({ participants: getVoiceParticipants(channelId) });
});

// ─── GET /servers/:serverId/voice/states ─────────────────────────
// Returns all voice channel participant states for a server

voice.get("/servers/:serverId/voice/states", async (c) => {
    const userId = c.get("userId");
    const serverId = c.req.param("serverId");

    // Verify membership
    const membership = await prisma.serverMember.findUnique({
        where: { serverId_userId: { serverId, userId } },
    });

    if (!membership) {
        return c.json({ error: "You are not a member of this server." }, 403);
    }

    // Get all voice channels for this server
    const voiceChannels = await prisma.channel.findMany({
        where: { serverId, type: { in: ["voice", "stage"] } },
        select: { id: true },
    });

    const channelIds = new Set(voiceChannels.map((ch) => ch.id));
    const allStates = getAllVoiceChannelStates();

    const serverVoiceStates: Record<string, typeof allStates[string]> = {};
    for (const [channelId, participants] of Object.entries(allStates)) {
        if (channelIds.has(channelId)) {
            serverVoiceStates[channelId] = participants;
        }
    }

    return c.json({ voiceStates: serverVoiceStates });
});

export default voice;
