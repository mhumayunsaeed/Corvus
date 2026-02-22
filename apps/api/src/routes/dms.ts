import { Hono } from "hono";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { authMiddleware, type AuthEnv } from "../middleware/auth.js";
import { broadcastToDMConversation } from "../ws.js";

const dms = new Hono<AuthEnv>();
const db = prisma as any;

dms.use("*", authMiddleware);
dms.use("*", async (c, next) => {
    const hasDMModels =
        typeof db.dMConversation !== "undefined" &&
        typeof db.dMParticipant !== "undefined" &&
        typeof db.dMMessage !== "undefined";

    if (!hasDMModels) {
        return c.json(
            {
                error:
                    "DM system is not initialized. Run Prisma generate and sync your database schema.",
            },
            503
        );
    }

    await next();
});

const createConversationSchema = z.object({
    participantIds: z.array(z.string().min(1)).min(1).max(9),
    name: z.string().min(1).max(100).optional(),
});

const sendDMMessageSchema = z.object({
    content: z.string().min(1, "Message cannot be empty").max(4000),
});

const userSelect = {
    id: true,
    displayName: true,
    username: true,
    avatarUrl: true,
    status: true,
};

function buildDirectKey(a: string, b: string) {
    return [a, b].sort().join(":");
}

function mapConversation(conversation: any) {
    return {
        id: conversation.id,
        type: conversation.type,
        name: conversation.name,
        createdAt: conversation.createdAt,
        updatedAt: conversation.updatedAt,
        participants: conversation.participants.map((p: any) => ({
            id: p.user.id,
            displayName: p.user.displayName,
            username: p.user.username,
            avatarUrl: p.user.avatarUrl,
            status: p.user.status,
        })),
        lastMessage:
            conversation.messages?.[0]
                ? {
                    id: conversation.messages[0].id,
                    content: conversation.messages[0].content,
                    type: conversation.messages[0].type,
                    metadata: conversation.messages[0].metadata,
                    createdAt: conversation.messages[0].createdAt,
                    author: conversation.messages[0].author,
                }
                : null,
    };
}

async function verifyConversationMembership(conversationId: string, userId: string) {
    const membership = await db.dMParticipant.findUnique({
        where: {
            conversationId_userId: { conversationId, userId },
        },
    });
    return !!membership;
}

// GET /dms
dms.get("/dms", async (c) => {
    const userId = c.get("userId");

    const conversations = await db.dMConversation.findMany({
        where: {
            participants: {
                some: { userId },
            },
        },
        include: {
            participants: {
                include: {
                    user: { select: userSelect },
                },
            },
            messages: {
                take: 1,
                orderBy: { createdAt: "desc" },
                include: {
                    author: { select: userSelect },
                },
            },
        },
        orderBy: { updatedAt: "desc" },
    });

    return c.json({ conversations: conversations.map(mapConversation) });
});

// POST /dms
dms.post("/dms", async (c) => {
    const userId = c.get("userId");
    const body = await c.req.json();
    const parsed = createConversationSchema.safeParse(body);

    if (!parsed.success) {
        return c.json({ error: parsed.error.errors[0].message }, 400);
    }

    const dedupedParticipantIds = [...new Set(parsed.data.participantIds)].filter(
        (id) => id !== userId
    );

    if (dedupedParticipantIds.length === 0) {
        return c.json({ error: "At least one other participant is required." }, 400);
    }

    const targetUsers = await db.user.findMany({
        where: { id: { in: dedupedParticipantIds } },
        select: { id: true },
    });

    if (targetUsers.length !== dedupedParticipantIds.length) {
        return c.json({ error: "One or more users were not found." }, 404);
    }

    const friendLinks = await db.friend.findMany({
        where: {
            userId,
            friendId: { in: dedupedParticipantIds },
        },
        select: { friendId: true },
    });

    if (friendLinks.length !== dedupedParticipantIds.length) {
        return c.json({ error: "You can only create DMs with your friends." }, 403);
    }

    const blocked = await db.block.findFirst({
        where: {
            OR: [
                {
                    blockerId: userId,
                    blockedId: { in: dedupedParticipantIds },
                },
                {
                    blockerId: { in: dedupedParticipantIds },
                    blockedId: userId,
                },
            ],
        },
    });

    if (blocked) {
        return c.json({ error: "Cannot create DM due to a block relationship." }, 403);
    }

    // 1:1 DM
    if (dedupedParticipantIds.length === 1) {
        const peerId = dedupedParticipantIds[0];
        const directKey = buildDirectKey(userId, peerId);

        const existing = await db.dMConversation.findUnique({
            where: { directKey },
            include: {
                participants: {
                    include: {
                        user: { select: userSelect },
                    },
                },
                messages: {
                    take: 1,
                    orderBy: { createdAt: "desc" },
                    include: {
                        author: { select: userSelect },
                    },
                },
            },
        });

        if (existing) {
            return c.json({ conversation: mapConversation(existing), created: false });
        }

        const conversation = await db.dMConversation.create({
            data: {
                type: "direct",
                directKey,
                createdById: userId,
                participants: {
                    create: [{ userId }, { userId: peerId }],
                },
            },
            include: {
                participants: {
                    include: {
                        user: { select: userSelect },
                    },
                },
                messages: {
                    take: 1,
                    orderBy: { createdAt: "desc" },
                    include: {
                        author: { select: userSelect },
                    },
                },
            },
        });

        return c.json({ conversation: mapConversation(conversation), created: true }, 201);
    }

    // Group DM
    const participantIds = [userId, ...dedupedParticipantIds];
    const conversation = await db.dMConversation.create({
        data: {
            type: "group",
            name: parsed.data.name?.trim() || null,
            createdById: userId,
            participants: {
                createMany: {
                    data: participantIds.map((participantId) => ({ userId: participantId })),
                    skipDuplicates: true,
                },
            },
        },
        include: {
            participants: {
                include: {
                    user: { select: userSelect },
                },
            },
            messages: {
                take: 1,
                orderBy: { createdAt: "desc" },
                include: {
                    author: { select: userSelect },
                },
            },
        },
    });

    return c.json({ conversation: mapConversation(conversation), created: true }, 201);
});

// GET /dms/:id/messages
dms.get("/dms/:id/messages", async (c) => {
    const userId = c.get("userId");
    const conversationId = c.req.param("id");

    const isMember = await verifyConversationMembership(conversationId, userId);
    if (!isMember) {
        return c.json({ error: "Conversation not found." }, 404);
    }

    const cursor = c.req.query("cursor");
    const limit = Math.min(parseInt(c.req.query("limit") || "50", 10), 100);

    const messages = await db.dMMessage.findMany({
        where: { conversationId },
        take: limit,
        ...(cursor
            ? {
                cursor: { id: cursor },
                skip: 1,
            }
            : {}),
        orderBy: { createdAt: "desc" },
        include: {
            author: { select: userSelect },
        },
    });

    const ordered = messages
        .map((m: any) => ({
            id: m.id,
            conversationId: m.conversationId,
            content: m.content,
            type: m.type,
            metadata: m.metadata,
            createdAt: m.createdAt,
            editedAt: m.editedAt,
            author: m.author,
        }))
        .reverse();

    const hasMore = messages.length === limit;
    const nextCursor = messages.length > 0 ? messages[messages.length - 1].id : null;

    return c.json({
        messages: ordered,
        hasMore,
        nextCursor,
    });
});

// POST /dms/:id/messages
dms.post("/dms/:id/messages", async (c) => {
    const userId = c.get("userId");
    const conversationId = c.req.param("id");

    const isMember = await verifyConversationMembership(conversationId, userId);
    if (!isMember) {
        return c.json({ error: "Conversation not found." }, 404);
    }

    const body = await c.req.json();
    const parsed = sendDMMessageSchema.safeParse(body);

    if (!parsed.success) {
        return c.json({ error: parsed.error.errors[0].message }, 400);
    }

    const message = await db.$transaction(async (tx: any) => {
        const created = await tx.dMMessage.create({
            data: {
                conversationId,
                authorId: userId,
                content: parsed.data.content,
            },
            include: {
                author: { select: userSelect },
            },
        });

        await tx.dMConversation.update({
            where: { id: conversationId },
            data: { updatedAt: new Date() },
        });

        return created;
    });

    const conversation = await db.dMConversation.findUnique({
        where: { id: conversationId },
        include: {
            participants: {
                include: {
                    user: { select: userSelect },
                },
            },
            messages: {
                take: 1,
                orderBy: { createdAt: "desc" },
                include: {
                    author: { select: userSelect },
                },
            },
        },
    });

    const messagePayload = {
        id: message.id,
        conversationId: message.conversationId,
        content: message.content,
        type: message.type,
        metadata: message.metadata,
        createdAt: message.createdAt,
        editedAt: message.editedAt,
        author: message.author,
    };

    broadcastToDMConversation(conversationId, {
        type: "new_dm_message",
        data: {
            conversationId,
            message: messagePayload,
            conversation: conversation ? mapConversation(conversation) : null,
        },
    });

    return c.json(
        {
            message: messagePayload,
        },
        201
    );
});

export default dms;
