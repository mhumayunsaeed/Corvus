import { Hono } from "hono";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { authMiddleware, type AuthEnv } from "../middleware/auth.js";

const friends = new Hono<AuthEnv>();
const db = prisma as any;

friends.use("*", authMiddleware);
friends.use("*", async (c, next) => {
    const hasFriendModels =
        typeof db.friend !== "undefined" &&
        typeof db.friendRequest !== "undefined" &&
        typeof db.block !== "undefined";

    if (!hasFriendModels) {
        return c.json(
            {
                error:
                    "Friend system is not initialized. Run Prisma generate and sync your database schema.",
            },
            503
        );
    }

    await next();
});

const friendRequestSchema = z.object({
    target: z.string().min(3).max(320),
});

const blockSchema = z.object({
    userId: z.string().min(1),
});

const publicUserSelect = {
    id: true,
    email: true,
    username: true,
    displayName: true,
    avatarUrl: true,
    status: true,
    bio: true,
};

// GET /friends - dashboard data
friends.get("/friends", async (c) => {
    const userId = c.get("userId");

    const [friendRows, incomingRows, outgoingRows, blockedRows] = await Promise.all([
        db.friend.findMany({
            where: { userId },
            include: { friend: { select: publicUserSelect } },
            orderBy: { createdAt: "desc" },
        }),
        db.friendRequest.findMany({
            where: { receiverId: userId, status: "pending" },
            include: { sender: { select: publicUserSelect } },
            orderBy: { createdAt: "desc" },
        }),
        db.friendRequest.findMany({
            where: { senderId: userId, status: "pending" },
            include: { receiver: { select: publicUserSelect } },
            orderBy: { createdAt: "desc" },
        }),
        db.block.findMany({
            where: { blockerId: userId },
            include: { blocked: { select: publicUserSelect } },
            orderBy: { createdAt: "desc" },
        }),
    ]);

    return c.json({
        friends: friendRows.map((row: any) => ({
            user: row.friend,
            createdAt: row.createdAt,
        })),
        pendingIncoming: incomingRows.map((row: any) => ({
            id: row.id,
            user: row.sender,
            createdAt: row.createdAt,
        })),
        pendingOutgoing: outgoingRows.map((row: any) => ({
            id: row.id,
            user: row.receiver,
            createdAt: row.createdAt,
        })),
        blocked: blockedRows.map((row: any) => ({
            user: row.blocked,
            createdAt: row.createdAt,
        })),
    });
});

// GET /friends/search?query=...
friends.get("/friends/search", async (c) => {
    const userId = c.get("userId");
    const query = (c.req.query("query") ?? c.req.query("q") ?? "").trim();

    if (query.length < 2) {
        return c.json({ error: "Search query must be at least 2 characters." }, 400);
    }

    const users = await db.user.findMany({
        where: {
            id: { not: userId },
            OR: [
                { username: { contains: query, mode: "insensitive" } },
                { email: { contains: query, mode: "insensitive" } },
            ],
        },
        select: publicUserSelect,
        take: 20,
        orderBy: { username: "asc" },
    });

    if (users.length === 0) {
        return c.json({ users: [] });
    }

    const targetIds = users.map((u: any) => u.id);

    const [friendLinks, outgoingRequests, incomingRequests, blockedByYou, blockedYou] =
        await Promise.all([
            db.friend.findMany({
                where: { userId, friendId: { in: targetIds } },
                select: { friendId: true },
            }),
            db.friendRequest.findMany({
                where: { senderId: userId, receiverId: { in: targetIds }, status: "pending" },
                select: { id: true, receiverId: true },
            }),
            db.friendRequest.findMany({
                where: { senderId: { in: targetIds }, receiverId: userId, status: "pending" },
                select: { id: true, senderId: true },
            }),
            db.block.findMany({
                where: { blockerId: userId, blockedId: { in: targetIds } },
                select: { blockedId: true },
            }),
            db.block.findMany({
                where: { blockerId: { in: targetIds }, blockedId: userId },
                select: { blockerId: true },
            }),
        ]);

    const friendSet = new Set(friendLinks.map((row: any) => row.friendId));
    const blockedByYouSet = new Set(blockedByYou.map((row: any) => row.blockedId));
    const blockedYouSet = new Set(blockedYou.map((row: any) => row.blockerId));
    const outgoingMap = new Map(outgoingRequests.map((row: any) => [row.receiverId, row.id]));
    const incomingMap = new Map(incomingRequests.map((row: any) => [row.senderId, row.id]));

    const mappedUsers = users.map((user: any) => {
        if (blockedByYouSet.has(user.id)) {
            return {
                ...user,
                relationStatus: "blocked_by_you" as const,
                pendingRequestId: null,
            };
        }

        if (blockedYouSet.has(user.id)) {
            return {
                ...user,
                relationStatus: "blocked_you" as const,
                pendingRequestId: null,
            };
        }

        if (friendSet.has(user.id)) {
            return {
                ...user,
                relationStatus: "friends" as const,
                pendingRequestId: null,
            };
        }

        if (incomingMap.has(user.id)) {
            return {
                ...user,
                relationStatus: "incoming_request" as const,
                pendingRequestId: incomingMap.get(user.id) ?? null,
            };
        }

        if (outgoingMap.has(user.id)) {
            return {
                ...user,
                relationStatus: "outgoing_request" as const,
                pendingRequestId: outgoingMap.get(user.id) ?? null,
            };
        }

        return {
            ...user,
            relationStatus: "none" as const,
            pendingRequestId: null,
        };
    });

    return c.json({ users: mappedUsers });
});

// POST /friends/requests
friends.post("/friends/requests", async (c) => {
    const userId = c.get("userId");
    const body = await c.req.json();
    const result = friendRequestSchema.safeParse(body);

    if (!result.success) {
        return c.json({ error: result.error.issues[0].message }, 400);
    }

    const target = result.data.target.trim();
    const targetLower = target.toLowerCase();

    const targetUser = await db.user.findFirst({
        where: {
            OR: [
                { id: target },
                { username: targetLower },
                { email: targetLower },
            ],
        },
        select: publicUserSelect,
    });

    if (!targetUser) {
        return c.json({ error: "User not found." }, 404);
    }

    if (targetUser.id === userId) {
        return c.json({ error: "You cannot send a friend request to yourself." }, 400);
    }

    const [existingBlock, friendLink] = await Promise.all([
        db.block.findFirst({
            where: {
                OR: [
                    { blockerId: userId, blockedId: targetUser.id },
                    { blockerId: targetUser.id, blockedId: userId },
                ],
            },
        }),
        db.friend.findFirst({
            where: {
                OR: [
                    { userId, friendId: targetUser.id },
                    { userId: targetUser.id, friendId: userId },
                ],
            },
        }),
    ]);

    if (existingBlock) {
        if (existingBlock.blockerId === userId) {
            return c.json({ error: "Unblock this user before sending a request." }, 403);
        }
        return c.json({ error: "You cannot send a request to this user." }, 403);
    }

    if (friendLink) {
        return c.json({ error: "You are already friends with this user." }, 409);
    }

    const incomingRequest = await db.friendRequest.findUnique({
        where: {
            senderId_receiverId: {
                senderId: targetUser.id,
                receiverId: userId,
            },
        },
    });

    if (incomingRequest?.status === "pending") {
        const now = new Date();
        await db.$transaction(async (tx: any) => {
            await tx.friendRequest.update({
                where: { id: incomingRequest.id },
                data: { status: "accepted", respondedAt: now },
            });
            await tx.friend.createMany({
                data: [
                    { userId, friendId: targetUser.id },
                    { userId: targetUser.id, friendId: userId },
                ],
                skipDuplicates: true,
            });
            await tx.friendRequest.updateMany({
                where: {
                    senderId: userId,
                    receiverId: targetUser.id,
                    status: "pending",
                },
                data: {
                    status: "canceled",
                    respondedAt: now,
                },
            });
        });

        return c.json({
            message: "Friend request accepted.",
            status: "accepted",
            user: targetUser,
        });
    }

    const outgoingRequest = await db.friendRequest.findUnique({
        where: {
            senderId_receiverId: {
                senderId: userId,
                receiverId: targetUser.id,
            },
        },
    });

    if (outgoingRequest?.status === "pending") {
        return c.json({ error: "Friend request already sent." }, 409);
    }

    let request;
    if (outgoingRequest) {
        request = await db.friendRequest.update({
            where: { id: outgoingRequest.id },
            data: {
                status: "pending",
                respondedAt: null,
            },
        });
    } else {
        request = await db.friendRequest.create({
            data: {
                senderId: userId,
                receiverId: targetUser.id,
                status: "pending",
            },
        });
    }

    return c.json(
        {
            message: "Friend request sent.",
            status: "pending",
            request: {
                id: request.id,
                createdAt: request.createdAt,
            },
            user: targetUser,
        },
        201
    );
});

// POST /friends/requests/:id/accept
friends.post("/friends/requests/:id/accept", async (c) => {
    const userId = c.get("userId");
    const requestId = c.req.param("id");

    const request = await db.friendRequest.findUnique({
        where: { id: requestId },
        include: {
            sender: { select: publicUserSelect },
        },
    });

    if (!request || request.receiverId !== userId) {
        return c.json({ error: "Friend request not found." }, 404);
    }

    if (request.status !== "pending") {
        return c.json({ error: "This friend request is no longer pending." }, 400);
    }

    const blocked = await db.block.findFirst({
        where: {
            OR: [
                { blockerId: userId, blockedId: request.senderId },
                { blockerId: request.senderId, blockedId: userId },
            ],
        },
    });

    if (blocked) {
        return c.json({ error: "Cannot accept request while one user is blocked." }, 403);
    }

    const now = new Date();
    await db.$transaction(async (tx: any) => {
        await tx.friendRequest.update({
            where: { id: requestId },
            data: {
                status: "accepted",
                respondedAt: now,
            },
        });

        await tx.friend.createMany({
            data: [
                { userId, friendId: request.senderId },
                { userId: request.senderId, friendId: userId },
            ],
            skipDuplicates: true,
        });

        await tx.friendRequest.updateMany({
            where: {
                senderId: userId,
                receiverId: request.senderId,
                status: "pending",
            },
            data: {
                status: "canceled",
                respondedAt: now,
            },
        });
    });

    return c.json({
        message: "Friend request accepted.",
        user: request.sender,
    });
});

// POST /friends/requests/:id/decline
friends.post("/friends/requests/:id/decline", async (c) => {
    const userId = c.get("userId");
    const requestId = c.req.param("id");

    const request = await db.friendRequest.findUnique({
        where: { id: requestId },
    });

    if (!request || request.receiverId !== userId) {
        return c.json({ error: "Friend request not found." }, 404);
    }

    if (request.status !== "pending") {
        return c.json({ error: "This friend request is no longer pending." }, 400);
    }

    await db.friendRequest.update({
        where: { id: requestId },
        data: {
            status: "declined",
            respondedAt: new Date(),
        },
    });

    return c.json({ message: "Friend request declined." });
});

// DELETE /friends/requests/:id
friends.delete("/friends/requests/:id", async (c) => {
    const userId = c.get("userId");
    const requestId = c.req.param("id");

    const request = await db.friendRequest.findUnique({
        where: { id: requestId },
    });

    if (!request || request.senderId !== userId) {
        return c.json({ error: "Friend request not found." }, 404);
    }

    if (request.status !== "pending") {
        return c.json({ error: "Only pending requests can be canceled." }, 400);
    }

    await db.friendRequest.update({
        where: { id: requestId },
        data: {
            status: "canceled",
            respondedAt: new Date(),
        },
    });

    return c.json({ message: "Friend request canceled." });
});

// POST /friends/block
friends.post("/friends/block", async (c) => {
    const currentUserId = c.get("userId");
    const body = await c.req.json();
    const result = blockSchema.safeParse(body);

    if (!result.success) {
        return c.json({ error: result.error.issues[0].message }, 400);
    }

    const targetUserId = result.data.userId;

    if (targetUserId === currentUserId) {
        return c.json({ error: "You cannot block yourself." }, 400);
    }

    const target = await db.user.findUnique({
        where: { id: targetUserId },
        select: publicUserSelect,
    });

    if (!target) {
        return c.json({ error: "User not found." }, 404);
    }

    const now = new Date();
    await db.$transaction(async (tx: any) => {
        await tx.block.upsert({
            where: {
                blockerId_blockedId: {
                    blockerId: currentUserId,
                    blockedId: targetUserId,
                },
            },
            create: {
                blockerId: currentUserId,
                blockedId: targetUserId,
            },
            update: {},
        });

        await tx.friend.deleteMany({
            where: {
                OR: [
                    { userId: currentUserId, friendId: targetUserId },
                    { userId: targetUserId, friendId: currentUserId },
                ],
            },
        });

        await tx.friendRequest.updateMany({
            where: {
                status: "pending",
                OR: [
                    { senderId: currentUserId, receiverId: targetUserId },
                    { senderId: targetUserId, receiverId: currentUserId },
                ],
            },
            data: {
                status: "canceled",
                respondedAt: now,
            },
        });
    });

    return c.json({
        message: "User blocked.",
        user: target,
    });
});

// DELETE /friends/block/:userId
friends.delete("/friends/block/:userId", async (c) => {
    const currentUserId = c.get("userId");
    const targetUserId = c.req.param("userId");

    const result = await db.block.deleteMany({
        where: {
            blockerId: currentUserId,
            blockedId: targetUserId,
        },
    });

    if (result.count === 0) {
        return c.json({ error: "Block relationship not found." }, 404);
    }

    return c.json({ message: "User unblocked." });
});

// DELETE /friends/:friendUserId
friends.delete("/friends/:friendUserId", async (c) => {
    const userId = c.get("userId");
    const friendUserId = c.req.param("friendUserId");

    if (friendUserId === userId) {
        return c.json({ error: "Invalid friend user ID." }, 400);
    }

    const result = await db.friend.deleteMany({
        where: {
            OR: [
                { userId, friendId: friendUserId },
                { userId: friendUserId, friendId: userId },
            ],
        },
    });

    if (result.count === 0) {
        return c.json({ error: "Friend relationship not found." }, 404);
    }

    return c.json({ message: "Friend removed." });
});

export default friends;
