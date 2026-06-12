import { Hono } from "hono";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { authMiddleware, type AuthEnv } from "../middleware/auth.js";
import { broadcastToDMConversation } from "../services/realtime.js";
import { executeSlashCommand } from "../lib/slash-commands.js";

const dms = new Hono<AuthEnv>();
const db = prisma as any;

dms.use("*", authMiddleware);
dms.use("*", async (c, next) => {
    const hasDMModels =
        typeof db.dMConversation !== "undefined" &&
        typeof db.dMParticipant !== "undefined" &&
        typeof db.dMMessage !== "undefined" &&
        typeof db.pinnedDMMessage !== "undefined";

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
    replyToId: z.string().optional(),
});

const dmReactionSchema = z.object({
    emoji: z.string().min(1).max(32),
});

const userSelect = {
    id: true,
    displayName: true,
    username: true,
    avatarUrl: true,
    status: true,
};

interface DMReactionEntry {
    emoji: string;
    userIds: string[];
}

type DMMetadata = Record<string, unknown> & {
    reactions?: DMReactionEntry[];
};

function parseDMMetadata(metadata: string | null | undefined): DMMetadata {
    if (!metadata) return {};

    try {
        const parsed = JSON.parse(metadata);
        if (parsed && typeof parsed === "object") {
            return parsed as DMMetadata;
        }
    } catch {
        // Ignore malformed JSON metadata.
    }

    return {};
}

function sanitizeReactionEntries(input: unknown): DMReactionEntry[] {
    if (!Array.isArray(input)) return [];

    const sanitized: DMReactionEntry[] = [];
    for (const value of input) {
        if (!value || typeof value !== "object") continue;
        const candidate = value as { emoji?: unknown; userIds?: unknown };
        if (typeof candidate.emoji !== "string" || candidate.emoji.length === 0) continue;
        if (!Array.isArray(candidate.userIds)) continue;

        const uniqueUserIds = Array.from(
            new Set(candidate.userIds.filter((id): id is string => typeof id === "string"))
        );
        if (uniqueUserIds.length === 0) continue;

        sanitized.push({
            emoji: candidate.emoji,
            userIds: uniqueUserIds,
        });
    }

    return sanitized;
}

function buildDMReactions(metadata: string | null | undefined, currentUserId: string) {
    const parsed = parseDMMetadata(metadata);
    const entries = sanitizeReactionEntries(parsed.reactions);

    return entries
        .map((entry) => ({
            emoji: entry.emoji,
            count: entry.userIds.length,
            reacted: entry.userIds.includes(currentUserId),
        }))
        .filter((entry) => entry.count > 0);
}

function writeDMReactionsMetadata(
    metadata: string | null | undefined,
    reactions: DMReactionEntry[]
): string | null {
    const parsed = parseDMMetadata(metadata);
    const next = { ...parsed } as DMMetadata;

    if (reactions.length > 0) {
        next.reactions = reactions;
    } else {
        delete next.reactions;
    }

    return Object.keys(next).length > 0 ? JSON.stringify(next) : null;
}

function buildDirectKey(a: string, b: string) {
    return [a, b].sort().join(":");
}

function isMissingTableError(error: unknown): boolean {
    const err = error as { code?: string; message?: string } | null;
    return (
        err?.code === "P2021" ||
        Boolean(err?.message?.includes("does not exist") || err?.message?.includes("not exist"))
    );
}

async function optionalBlockFindFirst(args: unknown) {
    if (typeof db.block === "undefined") return null;
    try {
        return await db.block.findFirst(args);
    } catch (error) {
        if (isMissingTableError(error)) return null;
        throw error;
    }
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

    // Compute unread counts per DM conversation
    const dmUnreadCounts: Record<string, number> = {};
    for (const conv of conversations) {
        const myParticipant = conv.participants.find((p: any) => p.userId === userId);
        if (!myParticipant) continue;
        const lastRead = myParticipant.lastReadAt;
        const count = await db.dMMessage.count({
            where: {
                conversationId: conv.id,
                authorId: { not: userId },
                createdAt: { gt: lastRead },
            },
        });
        if (count > 0) dmUnreadCounts[conv.id] = count;
    }

    return c.json({
        conversations: conversations.map(mapConversation),
        dmUnreadCounts,
    });
});

// POST /dms
dms.post("/dms", async (c) => {
    const userId = c.get("userId");
    const body = await c.req.json();
    const parsed = createConversationSchema.safeParse(body);

    if (!parsed.success) {
        return c.json({ error: parsed.error.issues[0].message }, 400);
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

    const blocked = await optionalBlockFindFirst({
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
            replyTo: {
                select: {
                    id: true,
                    content: true,
                    author: { select: userSelect },
                },
            },
        },
    });

    const ordered = messages
        .map((m: any) => ({
            id: m.id,
            conversationId: m.conversationId,
            content: m.content,
            type: m.type,
            metadata: m.metadata,
            reactions: buildDMReactions(m.metadata, userId),
            createdAt: m.createdAt,
            editedAt: m.editedAt,
            author: m.author,
            replyTo: m.replyTo || null,
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
    const username = c.get("username");
    const conversationId = c.req.param("id");

    const isMember = await verifyConversationMembership(conversationId, userId);
    if (!isMember) {
        return c.json({ error: "Conversation not found." }, 404);
    }

    const body = await c.req.json();
    const parsed = sendDMMessageSchema.safeParse(body);

    if (!parsed.success) {
        return c.json({ error: parsed.error.issues[0].message }, 400);
    }

    let resolvedContent = parsed.data.content;
    let resolvedType = "default";
    const replyToId = parsed.data.replyToId;

    const slash = executeSlashCommand(parsed.data.content, { username });
    if (slash.kind === "error") {
        return c.json({ error: slash.error }, 400);
    }
    if (slash.kind === "ok") {
        resolvedContent = slash.content;
        resolvedType = slash.type === "system" ? "system" : replyToId ? "reply" : "default";
    } else {
        resolvedContent = slash.content;
        if (replyToId) resolvedType = "reply";
    }

    const message = await db.$transaction(async (tx: any) => {
        const created = await tx.dMMessage.create({
            data: {
                conversationId,
                authorId: userId,
                content: resolvedContent,
                type: resolvedType,
                replyToId,
            },
            include: {
                author: { select: userSelect },
                replyTo: {
                    select: {
                        id: true,
                        content: true,
                        author: { select: userSelect },
                    },
                },
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
        reactions: [],
        createdAt: message.createdAt,
        editedAt: message.editedAt,
        author: message.author,
        replyTo: message.replyTo || null,
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

// ─── PATCH /dms/:conversationId/messages/:messageId — Edit DM message ────

const updateDMMessageSchema = z.object({
    content: z.string().min(1, "Message cannot be empty").max(4000),
});

dms.patch("/dms/:conversationId/messages/:messageId", async (c) => {
    const userId = c.get("userId");
    const conversationId = c.req.param("conversationId");
    const messageId = c.req.param("messageId");

    const isMember = await verifyConversationMembership(conversationId, userId);
    if (!isMember) {
        return c.json({ error: "Conversation not found." }, 404);
    }

    const message = await db.dMMessage.findUnique({
        where: { id: messageId },
    });

    if (!message) {
        return c.json({ error: "Message not found." }, 404);
    }

    if (message.authorId !== userId) {
        return c.json({ error: "You can only edit your own messages." }, 403);
    }

    if (message.conversationId !== conversationId) {
        return c.json({ error: "Message not found in this conversation." }, 404);
    }

    const body = await c.req.json();
    const parsed = updateDMMessageSchema.safeParse(body);

    if (!parsed.success) {
        return c.json({ error: parsed.error.issues[0].message }, 400);
    }

    const updated = await db.dMMessage.update({
        where: { id: messageId },
        data: {
            content: parsed.data.content,
            editedAt: new Date(),
        },
        include: {
            author: { select: userSelect },
        },
    });

    broadcastToDMConversation(conversationId, {
        type: "dm_message_update",
        data: {
            id: updated.id,
            conversationId: updated.conversationId,
            content: updated.content,
            editedAt: updated.editedAt,
        },
    });

    return c.json({
        message: {
            id: updated.id,
            conversationId: updated.conversationId,
            content: updated.content,
            type: updated.type,
            metadata: updated.metadata,
            reactions: buildDMReactions(updated.metadata, userId),
            createdAt: updated.createdAt,
            editedAt: updated.editedAt,
            author: updated.author,
        },
    });
});

// ─── DELETE /dms/:conversationId/messages/:messageId — Delete DM message ────

dms.post("/dms/:conversationId/messages/:messageId/reactions", async (c) => {
    const userId = c.get("userId");
    const conversationId = c.req.param("conversationId");
    const messageId = c.req.param("messageId");

    const isMember = await verifyConversationMembership(conversationId, userId);
    if (!isMember) {
        return c.json({ error: "Conversation not found." }, 404);
    }

    const body = await c.req.json();
    const parsed = dmReactionSchema.safeParse(body);
    if (!parsed.success) {
        return c.json({ error: parsed.error.issues[0]?.message || "Invalid emoji." }, 400);
    }

    const emoji = parsed.data.emoji.trim();
    if (!emoji) {
        return c.json({ error: "Emoji is required." }, 400);
    }

    const message = await db.dMMessage.findUnique({
        where: { id: messageId },
    });

    if (!message || message.conversationId !== conversationId) {
        return c.json({ error: "Message not found." }, 404);
    }

    const existingReactions = sanitizeReactionEntries(
        parseDMMetadata(message.metadata).reactions
    );

    const current = existingReactions.find((reaction) => reaction.emoji === emoji);
    if (current && current.userIds.includes(userId)) {
        return c.json({ message: "Already reacted." });
    }

    const nextReactions = current
        ? existingReactions.map((reaction) =>
            reaction.emoji === emoji
                ? { ...reaction, userIds: Array.from(new Set([...reaction.userIds, userId])) }
                : reaction
        )
        : [...existingReactions, { emoji, userIds: [userId] }];

    const metadata = writeDMReactionsMetadata(message.metadata, nextReactions);
    await db.dMMessage.update({
        where: { id: messageId },
        data: { metadata },
    });

    broadcastToDMConversation(conversationId, {
        type: "dm_reaction_add",
        data: { conversationId, messageId, userId, emoji },
    });

    return c.json({ message: "Reaction added." }, 201);
});

dms.delete("/dms/:conversationId/messages/:messageId/reactions/:emoji", async (c) => {
    const userId = c.get("userId");
    const conversationId = c.req.param("conversationId");
    const messageId = c.req.param("messageId");
    const emoji = decodeURIComponent(c.req.param("emoji"));

    const isMember = await verifyConversationMembership(conversationId, userId);
    if (!isMember) {
        return c.json({ error: "Conversation not found." }, 404);
    }

    const message = await db.dMMessage.findUnique({
        where: { id: messageId },
    });

    if (!message || message.conversationId !== conversationId) {
        return c.json({ error: "Message not found." }, 404);
    }

    const existingReactions = sanitizeReactionEntries(
        parseDMMetadata(message.metadata).reactions
    );
    const target = existingReactions.find((reaction) => reaction.emoji === emoji);
    if (!target || !target.userIds.includes(userId)) {
        return c.json({ error: "Reaction not found." }, 404);
    }

    const nextReactions = existingReactions
        .map((reaction) =>
            reaction.emoji === emoji
                ? { ...reaction, userIds: reaction.userIds.filter((id) => id !== userId) }
                : reaction
        )
        .filter((reaction) => reaction.userIds.length > 0);

    const metadata = writeDMReactionsMetadata(message.metadata, nextReactions);
    await db.dMMessage.update({
        where: { id: messageId },
        data: { metadata },
    });

    broadcastToDMConversation(conversationId, {
        type: "dm_reaction_remove",
        data: { conversationId, messageId, userId, emoji },
    });

    return c.json({ message: "Reaction removed." });
});

dms.delete("/dms/:conversationId/messages/:messageId", async (c) => {
    const userId = c.get("userId");
    const conversationId = c.req.param("conversationId");
    const messageId = c.req.param("messageId");

    const isMember = await verifyConversationMembership(conversationId, userId);
    if (!isMember) {
        return c.json({ error: "Conversation not found." }, 404);
    }

    const message = await db.dMMessage.findUnique({
        where: { id: messageId },
    });

    if (!message) {
        return c.json({ error: "Message not found." }, 404);
    }

    if (message.authorId !== userId) {
        return c.json({ error: "You can only delete your own messages." }, 403);
    }

    if (message.conversationId !== conversationId) {
        return c.json({ error: "Message not found in this conversation." }, 404);
    }

    await db.dMMessage.delete({ where: { id: messageId } });

    broadcastToDMConversation(conversationId, {
        type: "dm_message_delete",
        data: { id: messageId, conversationId },
    });

    return c.json({ message: "Message deleted." });
});

// ─── GET /dms/:conversationId/pins — List pinned messages ────────

dms.get("/dms/:conversationId/pins", async (c) => {
    const userId = c.get("userId");
    const conversationId = c.req.param("conversationId");

    const isMember = await verifyConversationMembership(conversationId, userId);
    if (!isMember) {
        return c.json({ error: "Conversation not found." }, 404);
    }

    const pinned = await db.pinnedDMMessage.findMany({
        where: { conversationId },
        include: {
            message: {
                include: {
                    author: { select: userSelect },
                },
            },
            pinnedBy: { select: userSelect },
        },
        orderBy: { pinnedAt: "desc" },
    });

    return c.json({
        pins: pinned.map((p: any) => ({
            id: p.id,
            pinnedAt: p.pinnedAt,
            pinnedBy: p.pinnedBy,
            message: {
                id: p.message.id,
                conversationId: p.message.conversationId,
                content: p.message.content,
                type: p.message.type,
                metadata: p.message.metadata,
                reactions: buildDMReactions(p.message.metadata, userId),
                createdAt: p.message.createdAt,
                editedAt: p.message.editedAt,
                author: p.message.author,
            },
        })),
    });
});

// ─── POST /dms/:conversationId/messages/:messageId/pin — Pin a message ──

dms.post("/dms/:conversationId/messages/:messageId/pin", async (c) => {
    const userId = c.get("userId");
    const conversationId = c.req.param("conversationId");
    const messageId = c.req.param("messageId");

    const isMember = await verifyConversationMembership(conversationId, userId);
    if (!isMember) {
        return c.json({ error: "Conversation not found." }, 404);
    }

    const message = await db.dMMessage.findUnique({
        where: { id: messageId },
        include: { author: { select: userSelect } },
    });

    if (!message || message.conversationId !== conversationId) {
        return c.json({ error: "Message not found." }, 404);
    }

    try {
        await db.pinnedDMMessage.create({
            data: {
                conversationId,
                messageId,
                pinnedById: userId,
            },
        });
    } catch {
        return c.json({ error: "Message is already pinned." }, 409);
    }

    broadcastToDMConversation(conversationId, {
        type: "dm_message_pin",
        data: {
            conversationId,
            messageId,
            pinnedById: userId,
            message: {
                id: message.id,
                conversationId: message.conversationId,
                content: message.content,
                type: message.type,
                createdAt: message.createdAt,
                author: message.author,
            },
        },
    });

    return c.json({ message: "Message pinned." }, 201);
});

// ─── DELETE /dms/:conversationId/messages/:messageId/pin — Unpin a message ──

dms.delete("/dms/:conversationId/messages/:messageId/pin", async (c) => {
    const userId = c.get("userId");
    const conversationId = c.req.param("conversationId");
    const messageId = c.req.param("messageId");

    const isMember = await verifyConversationMembership(conversationId, userId);
    if (!isMember) {
        return c.json({ error: "Conversation not found." }, 404);
    }

    const result = await db.pinnedDMMessage.deleteMany({
        where: { conversationId, messageId },
    });

    if (result.count === 0) {
        return c.json({ error: "Message is not pinned." }, 404);
    }

    broadcastToDMConversation(conversationId, {
        type: "dm_message_unpin",
        data: { conversationId, messageId },
    });

    return c.json({ message: "Message unpinned." });
});

// ─── POST /dms/:conversationId/read — Mark DM conversation as read ──

dms.post("/dms/:conversationId/read", async (c) => {
    const userId = c.get("userId");
    const conversationId = c.req.param("conversationId");

    const isMember = await verifyConversationMembership(conversationId, userId);
    if (!isMember) {
        return c.json({ error: "You are not a participant of this conversation." }, 403);
    }

    await db.dMParticipant.update({
        where: { conversationId_userId: { conversationId, userId } },
        data: { lastReadAt: new Date() },
    });

    return c.json({ success: true });
});

// ─── GET /dms/:conversationId/messages/search?q= ─────────────────
dms.get("/dms/:conversationId/messages/search", async (c) => {
    const userId = c.get("userId");
    const conversationId = c.req.param("conversationId");

    if (!(await verifyConversationMembership(conversationId, userId))) {
        return c.json({ error: "Conversation not found." }, 404);
    }

    const query = (c.req.query("q") || "").trim();
    if (query.length < 2) {
        return c.json({ results: [] });
    }

    const results = await db.dMMessage.findMany({
        where: { conversationId, content: { contains: query, mode: "insensitive" } },
        take: 50,
        orderBy: { createdAt: "desc" },
        include: { author: { select: userSelect } },
    });

    return c.json({
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        results: results.map((m: any) => ({
            id: m.id,
            conversationId: m.conversationId,
            content: m.content,
            createdAt: m.createdAt,
            author: m.author,
        })),
    });
});

export default dms;
