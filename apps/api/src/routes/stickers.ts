import { Hono } from "hono";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { authMiddleware, type AuthEnv } from "../middleware/auth.js";

const stickers = new Hono<AuthEnv>();
stickers.use("*", authMiddleware);

const MAX_STICKER_SIZE = 256 * 1024; // 256KB base64 limit

const createStickerSchema = z.object({
    name: z.string().min(1).max(32),
    imageData: z.string().max(MAX_STICKER_SIZE),
});

// ─── List user's stickers ────────────────────────────────────────

stickers.get("/stickers", async (c) => {
    const userId = c.get("userId");

    const userStickers = await prisma.sticker.findMany({
        where: { creatorId: userId },
        orderBy: { createdAt: "desc" },
        select: {
            id: true,
            name: true,
            imageData: true,
            createdAt: true,
        },
    });

    return c.json({ stickers: userStickers });
});

// â”€â”€â”€ Get a sticker by ID (for shared sticker messages) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

stickers.get("/stickers/:id", async (c) => {
    const stickerId = c.req.param("id");

    const sticker = await prisma.sticker.findUnique({
        where: { id: stickerId },
        select: {
            id: true,
            name: true,
            imageData: true,
            createdAt: true,
        },
    });

    if (!sticker) {
        return c.json({ error: "Sticker not found." }, 404);
    }

    return c.json({ sticker });
});

// ─── Create a sticker ────────────────────────────────────────────

stickers.post("/stickers", async (c) => {
    const userId = c.get("userId");
    const body = await c.req.json();
    const parsed = createStickerSchema.safeParse(body);

    if (!parsed.success) {
        return c.json({ error: parsed.error.errors[0]?.message || "Invalid input." }, 400);
    }

    const { name, imageData } = parsed.data;

    // Validate it's a data URI
    if (!imageData.startsWith("data:image/")) {
        return c.json({ error: "Image data must be a data URI." }, 400);
    }

    // Limit to 50 stickers per user
    const count = await prisma.sticker.count({ where: { creatorId: userId } });
    if (count >= 50) {
        return c.json({ error: "Maximum 50 stickers reached." }, 400);
    }

    const sticker = await prisma.sticker.create({
        data: {
            name,
            imageData,
            creatorId: userId,
        },
        select: {
            id: true,
            name: true,
            imageData: true,
            createdAt: true,
        },
    });

    return c.json({ sticker }, 201);
});

// ─── Delete a sticker ────────────────────────────────────────────

stickers.delete("/stickers/:id", async (c) => {
    const userId = c.get("userId");
    const stickerId = c.req.param("id");

    const sticker = await prisma.sticker.findUnique({
        where: { id: stickerId },
    });

    if (!sticker) {
        return c.json({ error: "Sticker not found." }, 404);
    }

    if (sticker.creatorId !== userId) {
        return c.json({ error: "Not your sticker." }, 403);
    }

    await prisma.sticker.delete({ where: { id: stickerId } });

    return c.json({ message: "Sticker deleted." });
});

export default stickers;
