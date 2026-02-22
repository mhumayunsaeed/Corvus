import { Hono } from "hono";
import { prisma } from "../lib/prisma.js";
import { authMiddleware, type AuthEnv } from "../middleware/auth.js";
import { generateVoiceToken, getLiveKitUrl } from "../lib/livekit.js";
import { broadcastToDMConversation } from "../ws.js";

const calls = new Hono<AuthEnv>();

calls.use("*", authMiddleware);

// Active call rooms: conversationId -> { roomName, startTime }
const activeCallRooms = new Map<string, { roomName: string, startTime: number }>();

// ─── POST /dms/:conversationId/call/start ────────────────────────

calls.post("/dms/:conversationId/call/start", async (c) => {
    const userId = c.get("userId");
    const username = c.get("username");
    const conversationId = c.req.param("conversationId");

    // Verify participant
    const participant = await prisma.dMParticipant.findUnique({
        where: { conversationId_userId: { conversationId, userId } },
    });

    if (!participant) {
        return c.json({ error: "You are not a participant in this conversation." }, 403);
    }

    // Get user details
    const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { displayName: true, avatarUrl: true },
    });

    const displayName = user?.displayName || username;

    // Create or reuse room
    let roomInfo = activeCallRooms.get(conversationId);
    if (!roomInfo) {
        roomInfo = { roomName: `dm_call_${conversationId}_${Date.now()}`, startTime: Date.now() };
        activeCallRooms.set(conversationId, roomInfo);
    }
    const roomName = roomInfo.roomName;

    const token = await generateVoiceToken(roomName, userId, displayName, {
        canPublish: true,
        canSubscribe: true,
    });

    // Broadcast incoming call to other participants
    broadcastToDMConversation(conversationId, {
        type: "incoming_call",
        data: {
            conversationId,
            roomName,
            callerId: userId,
            callerName: displayName,
            callerAvatar: user?.avatarUrl || null,
        },
    });

    return c.json({
        token,
        url: getLiveKitUrl(),
        roomName,
    });
});

// ─── POST /dms/:conversationId/call/join ─────────────────────────

calls.post("/dms/:conversationId/call/join", async (c) => {
    const userId = c.get("userId");
    const username = c.get("username");
    const conversationId = c.req.param("conversationId");

    // Verify participant
    const participant = await prisma.dMParticipant.findUnique({
        where: { conversationId_userId: { conversationId, userId } },
    });

    if (!participant) {
        return c.json({ error: "You are not a participant in this conversation." }, 403);
    }

    const roomInfo = activeCallRooms.get(conversationId);
    if (!roomInfo) {
        return c.json({ error: "No active call in this conversation." }, 404);
    }
    const roomName = roomInfo.roomName;

    const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { displayName: true },
    });

    const displayName = user?.displayName || username;

    const token = await generateVoiceToken(roomName, userId, displayName, {
        canPublish: true,
        canSubscribe: true,
    });

    return c.json({
        token,
        url: getLiveKitUrl(),
        roomName,
    });
});

// ─── POST /dms/:conversationId/call/end ──────────────────────────

calls.post("/dms/:conversationId/call/end", async (c) => {
    const userId = c.get("userId");
    const conversationId = c.req.param("conversationId");

    const roomInfo = activeCallRooms.get(conversationId);

    if (roomInfo) {
        activeCallRooms.delete(conversationId);

        const duration = Math.floor((Date.now() - roomInfo.startTime) / 1000);

        const dmMessage = await prisma.dMMessage.create({
            data: {
                conversationId,
                authorId: userId,
                content: "Call ended",
                type: "call",
                metadata: JSON.stringify({ duration }),
            },
            include: { author: { select: { id: true, username: true, displayName: true, avatarUrl: true, status: true } } },
        });

        broadcastToDMConversation(conversationId, {
            type: "call_ended",
            data: { conversationId, endedBy: userId },
        });

        const messagePayload = {
            id: dmMessage.id,
            conversationId: dmMessage.conversationId,
            content: dmMessage.content,
            type: dmMessage.type,
            metadata: dmMessage.metadata,
            createdAt: dmMessage.createdAt,
            editedAt: dmMessage.editedAt,
            author: dmMessage.author,
        };

        broadcastToDMConversation(conversationId, {
            type: "new_dm_message",
            data: {
                conversationId,
                message: messagePayload,
            },
        });
    }

    return c.json({ message: "Call ended." });
});

export default calls;
