import { Hono } from "hono";
import { prisma } from "../lib/prisma.js";
import { authMiddleware, type AuthEnv } from "../middleware/auth.js";
import { generateVoiceToken, getLiveKitUrl } from "../lib/livekit.js";
import { broadcastToDMConversation, broadcastToUsers } from "../ws.js";

const calls = new Hono<AuthEnv>();

calls.use("*", authMiddleware);

interface ActiveCallRoom {
    roomName: string;
    startTime: number;
    participants: Set<string>;
}

// Active call rooms: conversationId -> room info
const activeCallRooms = new Map<string, ActiveCallRoom>();

async function assertConversationParticipant(conversationId: string, userId: string) {
    const participant = await prisma.dMParticipant.findUnique({
        where: { conversationId_userId: { conversationId, userId } },
    });
    return !!participant;
}

async function finalizeRoomIfEmpty(conversationId: string, endedBy: string) {
    const roomInfo = activeCallRooms.get(conversationId);
    if (!roomInfo) return false;

    roomInfo.participants.delete(endedBy);
    if (roomInfo.participants.size > 0) {
        return false;
    }

    activeCallRooms.delete(conversationId);

    const participants = await prisma.dMParticipant.findMany({
        where: { conversationId },
        select: { userId: true },
    });
    const participantUserIds = participants.map((p) => p.userId);

    const duration = Math.floor((Date.now() - roomInfo.startTime) / 1000);

    const dmMessage = await prisma.dMMessage.create({
        data: {
            conversationId,
            authorId: endedBy,
            content: "Call ended",
            type: "call",
            metadata: JSON.stringify({ duration }),
        },
        include: {
            author: {
                select: {
                    id: true,
                    username: true,
                    displayName: true,
                    avatarUrl: true,
                    status: true,
                },
            },
        },
    });

    broadcastToUsers(participantUserIds, {
        type: "call_ended",
        data: { conversationId, endedBy },
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

    return true;
}

calls.post("/dms/:conversationId/call/start", async (c) => {
    const userId = c.get("userId");
    const username = c.get("username");
    const conversationId = c.req.param("conversationId");

    if (!(await assertConversationParticipant(conversationId, userId))) {
        return c.json({ error: "You are not a participant in this conversation." }, 403);
    }

    const participants = await prisma.dMParticipant.findMany({
        where: { conversationId },
        select: { userId: true },
    });

    const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { displayName: true, avatarUrl: true },
    });

    const displayName = user?.displayName || username;

    let roomInfo = activeCallRooms.get(conversationId);
    if (!roomInfo) {
        roomInfo = {
            roomName: `dm_call_${conversationId}_${Date.now()}`,
            startTime: Date.now(),
            participants: new Set(),
        };
        activeCallRooms.set(conversationId, roomInfo);
    }

    roomInfo.participants.add(userId);
    const roomName = roomInfo.roomName;

    const token = await generateVoiceToken(roomName, userId, displayName, {
        canPublish: true,
        canSubscribe: true,
    });

    const targetUserIds = participants
        .map((p) => p.userId)
        .filter((id) => id !== userId);

    broadcastToUsers(targetUserIds, {
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

calls.post("/dms/:conversationId/call/join", async (c) => {
    const userId = c.get("userId");
    const username = c.get("username");
    const conversationId = c.req.param("conversationId");

    if (!(await assertConversationParticipant(conversationId, userId))) {
        return c.json({ error: "You are not a participant in this conversation." }, 403);
    }

    const roomInfo = activeCallRooms.get(conversationId);
    if (!roomInfo) {
        return c.json({ error: "No active call in this conversation." }, 404);
    }

    roomInfo.participants.add(userId);
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

calls.post("/dms/:conversationId/call/leave", async (c) => {
    const userId = c.get("userId");
    const conversationId = c.req.param("conversationId");

    if (!(await assertConversationParticipant(conversationId, userId))) {
        return c.json({ error: "You are not a participant in this conversation." }, 403);
    }

    const endedForEveryone = await finalizeRoomIfEmpty(conversationId, userId);
    return c.json({ message: endedForEveryone ? "Call ended." : "Left call." });
});

// Backward-compatible alias
calls.post("/dms/:conversationId/call/end", async (c) => {
    const userId = c.get("userId");
    const conversationId = c.req.param("conversationId");

    if (!(await assertConversationParticipant(conversationId, userId))) {
        return c.json({ error: "You are not a participant in this conversation." }, 403);
    }

    const endedForEveryone = await finalizeRoomIfEmpty(conversationId, userId);
    return c.json({ message: endedForEveryone ? "Call ended." : "Left call." });
});

export default calls;
