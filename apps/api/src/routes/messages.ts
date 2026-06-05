import { Hono } from "hono";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { authMiddleware, type AuthEnv } from "../middleware/auth.js";
import { broadcastToChannel } from "../services/realtime.js";
import { extractUrls, unfurlUrl } from "../lib/unfurl.js";
import { executeSlashCommand } from "../lib/slash-commands.js";

const messages = new Hono<AuthEnv>();

messages.use("*", authMiddleware);

// ─── Validation Schemas ─────────────────────────────────────────

const createMessageSchema = z.object({
    content: z.string().min(1, "Message cannot be empty").max(4000),
    type: z.enum(["default", "reply", "system"]).default("default"),
    replyToId: z.string().optional(),
});

const updateMessageSchema = z.object({
    content: z.string().min(1).max(4000),
});

const unfurlQuerySchema = z.object({
    url: z.string().url("Invalid URL"),
});

// ─── Helper: verify channel membership ──────────────────────────

async function verifyChannelAccess(channelId: string, userId: string) {
    const channel = await prisma.channel.findUnique({
        where: { id: channelId },
    });
    if (!channel) return null;

    const membership = await prisma.serverMember.findUnique({
        where: { serverId_userId: { serverId: channel.serverId, userId } },
    });
    if (!membership) return null;

    return { channel, membership };
}

messages.get("/unfurl", async (c) => {
    const parsed = unfurlQuerySchema.safeParse({
        url: c.req.query("url"),
    });

    if (!parsed.success) {
        return c.json({ error: parsed.error.issues[0]?.message || "Invalid URL" }, 400);
    }

    const embed = await unfurlUrl(parsed.data.url);
    if (!embed) {
        return c.json({ embed: null });
    }

    return c.json({
        embed: {
            url: embed.url,
            siteName: embed.siteName,
            title: embed.title,
            description: embed.description,
            imageUrl: embed.imageUrl,
            faviconUrl: embed.faviconUrl,
        },
    });
});

// ─── GET /channels/:channelId/messages — List messages (paginated) ──

messages.get("/channels/:channelId/messages", async (c) => {
    const userId = c.get("userId");
    const channelId = c.req.param("channelId");

    const access = await verifyChannelAccess(channelId, userId);
    if (!access) {
        return c.json({ error: "Channel not found or you are not a member." }, 404);
    }

    const cursor = c.req.query("cursor");
    const limit = Math.min(parseInt(c.req.query("limit") || "50", 10), 100);

    const messageList = await prisma.message.findMany({
        where: { channelId },
        take: limit,
        ...(cursor
            ? {
                  cursor: { id: cursor },
                  skip: 1, // skip the cursor itself
              }
            : {}),
        orderBy: { createdAt: "desc" },
        include: {
            author: {
                select: {
                    id: true,
                    displayName: true,
                    username: true,
                    avatarUrl: true,
                    status: true,
                },
            },
            reactions: {
                select: {
                    id: true,
                    emoji: true,
                    userId: true,
                },
            },
            replyTo: {
                select: {
                    id: true,
                    content: true,
                    author: {
                        select: {
                            id: true,
                            displayName: true,
                            username: true,
                        },
                    },
                },
            },
            embeds: {
                select: {
                    id: true,
                    url: true,
                    siteName: true,
                    title: true,
                    description: true,
                    imageUrl: true,
                    faviconUrl: true,
                },
            },
        },
    });

    // Aggregate reactions for each message
    const messagesWithReactions = messageList.map((msg) => {
        const reactionMap = new Map<string, { emoji: string; count: number; userIds: string[] }>();
        for (const r of msg.reactions) {
            const existing = reactionMap.get(r.emoji);
            if (existing) {
                existing.count++;
                existing.userIds.push(r.userId);
            } else {
                reactionMap.set(r.emoji, { emoji: r.emoji, count: 1, userIds: [r.userId] });
            }
        }

        return {
            id: msg.id,
            channelId: msg.channelId,
            content: msg.content,
            type: msg.type,
            editedAt: msg.editedAt,
            createdAt: msg.createdAt,
            author: msg.author,
            replyTo: msg.replyTo,
            reactions: Array.from(reactionMap.values()).map((r) => ({
                emoji: r.emoji,
                count: r.count,
                reacted: r.userIds.includes(userId),
            })),
            embeds: msg.embeds,
        };
    });

    // Reverse so oldest first (we queried desc for cursor pagination)
    messagesWithReactions.reverse();

    const hasMore = messageList.length === limit;
    const nextCursor = messageList.length > 0 ? messageList[messageList.length - 1].id : null;

    return c.json({
        messages: messagesWithReactions,
        nextCursor,
        hasMore,
    });
});

// ─── POST /channels/:channelId/messages — Create message ────────

messages.post("/channels/:channelId/messages", async (c) => {
    const userId = c.get("userId");
    const username = c.get("username");
    const channelId = c.req.param("channelId");

    const access = await verifyChannelAccess(channelId, userId);
    if (!access) {
        return c.json({ error: "Channel not found or you are not a member." }, 404);
    }

    const body = await c.req.json();
    const result = createMessageSchema.safeParse(body);

    if (!result.success) {
        return c.json({ error: result.error.issues[0].message }, 400);
    }

    const { content, type, replyToId } = result.data;
    let resolvedContent = content;
    let resolvedType: "default" | "reply" | "system" = replyToId ? "reply" : type;

    const slash = executeSlashCommand(content, { username });
    if (slash.kind === "error") {
        return c.json({ error: slash.error }, 400);
    }
    if (slash.kind === "ok") {
        resolvedContent = slash.content;
        resolvedType = slash.type === "system" ? "system" : replyToId ? "reply" : "default";
    } else {
        resolvedContent = slash.content;
    }

    const message = await prisma.message.create({
        data: {
            channelId,
            authorId: userId,
            content: resolvedContent,
            type: resolvedType,
            replyToId,
        },
        include: {
            author: {
                select: {
                    id: true,
                    displayName: true,
                    username: true,
                    avatarUrl: true,
                    status: true,
                },
            },
            replyTo: {
                select: {
                    id: true,
                    content: true,
                    author: {
                        select: {
                            id: true,
                            displayName: true,
                            username: true,
                        },
                    },
                },
            },
        },
    });

    const messageData = {
        id: message.id,
        channelId: message.channelId,
        content: message.content,
        type: message.type,
        editedAt: message.editedAt,
        createdAt: message.createdAt,
        author: message.author,
        replyTo: message.replyTo,
        reactions: [],
        embeds: [],
    };

    // Broadcast to WebSocket subscribers
    broadcastToChannel(channelId, {
        type: "new_message",
        data: messageData,
    });

    // Async embed unfurling (fire-and-forget)
    const urls = extractUrls(resolvedContent);
    if (urls.length > 0) {
        processMessageEmbeds(message.id, channelId, urls).catch(console.error);
    }

    return c.json({ message: messageData }, 201);
});

// ─── Async embed processing ─────────────────────────────────────

async function processMessageEmbeds(messageId: string, channelId: string, urls: string[]) {
    const results = await Promise.all(urls.map(unfurlUrl));
    const validEmbeds = results.filter(
        (r): r is NonNullable<typeof r> => r !== null && (!!r.title || !!r.description)
    );

    if (validEmbeds.length === 0) return;

    await prisma.messageEmbed.createMany({
        data: validEmbeds.map((embed) => ({
            messageId,
            url: embed.url,
            siteName: embed.siteName,
            title: embed.title,
            description: embed.description,
            imageUrl: embed.imageUrl,
            faviconUrl: embed.faviconUrl,
        })),
    });

    const embeds = await prisma.messageEmbed.findMany({
        where: { messageId },
        select: {
            id: true,
            url: true,
            siteName: true,
            title: true,
            description: true,
            imageUrl: true,
            faviconUrl: true,
        },
    });

    broadcastToChannel(channelId, {
        type: "message_embeds_ready",
        data: { messageId, channelId, embeds },
    });
}

// ─── PATCH /messages/:id — Edit message ─────────────────────────

messages.patch("/messages/:id", async (c) => {
    const userId = c.get("userId");
    const messageId = c.req.param("id");

    const message = await prisma.message.findUnique({
        where: { id: messageId },
    });

    if (!message) {
        return c.json({ error: "Message not found." }, 404);
    }

    if (message.authorId !== userId) {
        return c.json({ error: "You can only edit your own messages." }, 403);
    }

    const body = await c.req.json();
    const result = updateMessageSchema.safeParse(body);

    if (!result.success) {
        return c.json({ error: result.error.issues[0].message }, 400);
    }

    const updated = await prisma.message.update({
        where: { id: messageId },
        data: {
            content: result.data.content,
            editedAt: new Date(),
        },
        include: {
            author: {
                select: {
                    id: true,
                    displayName: true,
                    username: true,
                    avatarUrl: true,
                    status: true,
                },
            },
        },
    });

    broadcastToChannel(message.channelId, {
        type: "message_update",
        data: {
            id: updated.id,
            channelId: updated.channelId,
            content: updated.content,
            editedAt: updated.editedAt,
        },
    });

    return c.json({ message: updated });
});

// ─── DELETE /messages/:id — Delete message ──────────────────────

messages.delete("/messages/:id", async (c) => {
    const userId = c.get("userId");
    const messageId = c.req.param("id");

    const message = await prisma.message.findUnique({
        where: { id: messageId },
        include: { channel: true },
    });

    if (!message) {
        return c.json({ error: "Message not found." }, 404);
    }

    // Allow author or admin/owner to delete
    if (message.authorId !== userId) {
        const membership = await prisma.serverMember.findUnique({
            where: {
                serverId_userId: {
                    serverId: message.channel.serverId,
                    userId,
                },
            },
        });

        if (!membership || !["owner", "admin"].includes(membership.role)) {
            return c.json({ error: "You do not have permission to delete this message." }, 403);
        }
    }

    await prisma.message.delete({ where: { id: messageId } });

    broadcastToChannel(message.channelId, {
        type: "message_delete",
        data: { id: messageId, channelId: message.channelId },
    });

    return c.json({ message: "Message deleted." });
});

// ─── POST /messages/:id/reactions — Add reaction ────────────────

messages.post("/messages/:id/reactions", async (c) => {
    const userId = c.get("userId");
    const messageId = c.req.param("id");

    const body = await c.req.json();
    const emoji = body.emoji;

    if (!emoji || typeof emoji !== "string") {
        return c.json({ error: "Emoji is required." }, 400);
    }

    const message = await prisma.message.findUnique({
        where: { id: messageId },
    });

    if (!message) {
        return c.json({ error: "Message not found." }, 404);
    }

    // Verify access
    const access = await verifyChannelAccess(message.channelId, userId);
    if (!access) {
        return c.json({ error: "You are not a member of this channel's server." }, 403);
    }

    // Upsert reaction (ignore if already exists)
    try {
        await prisma.reaction.create({
            data: {
                messageId,
                userId,
                emoji,
            },
        });
    } catch {
        // Unique constraint violation — already reacted with this emoji
        return c.json({ message: "Already reacted." });
    }

    broadcastToChannel(message.channelId, {
        type: "reaction_add",
        data: { messageId, userId, emoji, channelId: message.channelId },
    });

    return c.json({ message: "Reaction added." }, 201);
});

// ─── DELETE /messages/:id/reactions/:emoji — Remove reaction ────

messages.delete("/messages/:id/reactions/:emoji", async (c) => {
    const userId = c.get("userId");
    const messageId = c.req.param("id");
    const emoji = decodeURIComponent(c.req.param("emoji"));

    const reaction = await prisma.reaction.findUnique({
        where: {
            messageId_userId_emoji: { messageId, userId, emoji },
        },
    });

    if (!reaction) {
        return c.json({ error: "Reaction not found." }, 404);
    }

    const message = await prisma.message.findUnique({
        where: { id: messageId },
    });

    await prisma.reaction.delete({
        where: { id: reaction.id },
    });

    if (message) {
        broadcastToChannel(message.channelId, {
            type: "reaction_remove",
            data: { messageId, userId, emoji, channelId: message.channelId },
        });
    }

    return c.json({ message: "Reaction removed." });
});

export default messages;
