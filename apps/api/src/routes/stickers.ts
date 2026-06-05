import { Hono } from "hono";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { authMiddleware, type AuthEnv } from "../middleware/auth.js";
import {
    STORAGE_BUCKETS,
    deleteObject,
    generateObjectKey,
    parseDataUri,
    uploadObject,
} from "../services/storage.js";

const stickers = new Hono<AuthEnv>();
stickers.use("*", authMiddleware);

const MAX_STICKER_SIZE = 256 * 1024; // 256KB base64 source limit
const STICKER_MIME_TO_EXT: Record<string, string> = {
    "image/png": ".png",
    "image/webp": ".webp",
    "image/gif": ".gif",
    "image/jpeg": ".jpg",
};

const createStickerSchema = z.object({
    name: z.string().min(1).max(32),
    imageData: z.string().max(MAX_STICKER_SIZE),
});

const stickerSelect = {
    id: true,
    name: true,
    imageUrl: true,
    createdAt: true,
} as const;

/** Extract the storage object key from a Supabase public URL for this bucket. */
function stickerKeyFromUrl(url: string): string | null {
    const marker = `/${STORAGE_BUCKETS.stickers}/`;
    const idx = url.indexOf(marker);
    return idx >= 0 ? url.slice(idx + marker.length) : null;
}

// ─── List user's stickers ────────────────────────────────────────

stickers.get("/stickers", async (c) => {
    const userId = c.get("userId");

    const userStickers = await prisma.sticker.findMany({
        where: { creatorId: userId },
        orderBy: { createdAt: "desc" },
        select: stickerSelect,
    });

    return c.json({ stickers: userStickers });
});

// ─── Get a sticker by ID (for shared sticker messages) ───────────

stickers.get("/stickers/:id", async (c) => {
    const stickerId = c.req.param("id");

    const sticker = await prisma.sticker.findUnique({
        where: { id: stickerId },
        select: stickerSelect,
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
        return c.json({ error: parsed.error.issues[0]?.message || "Invalid input." }, 400);
    }

    const { name, imageData } = parsed.data;

    const decoded = parseDataUri(imageData);
    if (!decoded || !decoded.mime.startsWith("image/")) {
        return c.json({ error: "Image data must be an image data URI." }, 400);
    }

    // Limit to 50 stickers per user
    const count = await prisma.sticker.count({ where: { creatorId: userId } });
    if (count >= 50) {
        return c.json({ error: "Maximum 50 stickers reached." }, 400);
    }

    const ext = STICKER_MIME_TO_EXT[decoded.mime] || ".png";
    const imageUrl = await uploadObject({
        bucket: STORAGE_BUCKETS.stickers,
        key: generateObjectKey(ext),
        data: decoded.bytes,
        contentType: decoded.mime,
    });

    const sticker = await prisma.sticker.create({
        data: {
            name,
            imageUrl,
            creatorId: userId,
        },
        select: stickerSelect,
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

    // Best-effort cleanup of the stored object.
    const key = stickerKeyFromUrl(sticker.imageUrl);
    if (key) {
        await deleteObject(STORAGE_BUCKETS.stickers, key).catch(() => {
            // Object may already be gone; ignore.
        });
    }

    return c.json({ message: "Sticker deleted." });
});

export default stickers;
