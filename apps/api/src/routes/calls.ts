import { Hono } from "hono";
import { prisma } from "../lib/prisma.js";
import { authMiddleware, type AuthEnv } from "../middleware/auth.js";
import { generateVoiceToken, getLiveKitUrl } from "../lib/livekit.js";
import { broadcastToDMConversation, broadcastToUsers } from "../services/realtime.js";

const calls = new Hono<AuthEnv>();

calls.use("*", authMiddleware);

// Active call rooms are persisted (call_rooms / call_participants) so they
// survive stateless API invocations.

async function assertConversationParticipant(conversationId: string, userId: string) {
    const participant = await prisma.dMParticipant.findUnique({
        where: { conversationId_userId: { conversationId, userId } },
    });
    return !!participant;
}

async function finalizeRoomIfEmpty(conversationId: string, endedBy: string) {
    const room = await prisma.callRoom.findUnique({
        where: { conversationId },
        include: { participants: true },
    });
    if (!room) return false;

    await prisma.callParticipant.deleteMany({ where: { roomId: room.id, userId: endedBy } });

    const remaining = room.participants.filter((p) => p.userId !== endedBy).length;
    if (remaining > 0) {
        return false;
    }

    // Deleting the room cascades to any remaining participant rows.
    await prisma.callRoom.delete({ where: { id: room.id } });

    const participants = await prisma.dMParticipant.findMany({
        where: { conversationId },
        select: { userId: true },
    });
    const participantUserIds = participants.map((p) => p.userId);

    const duration = Math.floor((Date.now() - room.startedAt.getTime()) / 1000);

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

    const room = await prisma.callRoom.upsert({
        where: { conversationId },
        create: { conversationId, roomName: `dm_call_${conversationId}_${Date.now()}` },
        update: {},
    });
    await prisma.callParticipant.upsert({
        where: { roomId_userId: { roomId: room.id, userId } },
        create: { roomId: room.id, userId },
        update: {},
    });
    const roomName = room.roomName;

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

    const room = await prisma.callRoom.findUnique({ where: { conversationId } });
    if (!room) {
        return c.json({ error: "No active call in this conversation." }, 404);
    }

    await prisma.callParticipant.upsert({
        where: { roomId_userId: { roomId: room.id, userId } },
        create: { roomId: room.id, userId },
        update: {},
    });
    const roomName = room.roomName;

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

// Decline an incoming call — notify the caller (and other participants) that
// this user rejected the call, without joining the room.
calls.post("/dms/:conversationId/call/decline", async (c) => {
    const userId = c.get("userId");
    const conversationId = c.req.param("conversationId");

    if (!(await assertConversationParticipant(conversationId, userId))) {
        return c.json({ error: "You are not a participant in this conversation." }, 403);
    }

    const [participants, user] = await Promise.all([
        prisma.dMParticipant.findMany({
            where: { conversationId },
            select: { userId: true },
        }),
        prisma.user.findUnique({
            where: { id: userId },
            select: { displayName: true, username: true },
        }),
    ]);

    const targetUserIds = participants
        .map((p) => p.userId)
        .filter((id) => id !== userId);

    broadcastToUsers(targetUserIds, {
        type: "call_declined",
        data: {
            conversationId,
            declinedBy: userId,
            declinedByName: user?.displayName || user?.username || "Someone",
        },
    });

    return c.json({ message: "Call declined." });
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
