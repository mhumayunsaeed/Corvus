import { Hono } from "hono";
import { randomBytes } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { authMiddleware, type AuthEnv } from "../middleware/auth.js";

const attachments = new Hono<AuthEnv>();

const UPLOADS_DIR = path.resolve(process.cwd(), "uploads");
const FREE_ATTACHMENT_MAX_BYTES = Number(process.env.FREE_ATTACHMENT_MAX_BYTES || 10 * 1024 * 1024);

type AttachmentKind = "image" | "video" | "document";

const DOCUMENT_MIME_TYPES = new Set([
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/vnd.ms-excel",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "application/vnd.ms-powerpoint",
    "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    "text/plain",
    "application/zip",
    "application/x-zip-compressed",
]);

const DOCUMENT_EXTENSIONS = new Set([
    ".pdf",
    ".doc",
    ".docx",
    ".xls",
    ".xlsx",
    ".ppt",
    ".pptx",
    ".txt",
    ".zip",
]);

const EXT_TO_MIME: Record<string, string> = {
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".png": "image/png",
    ".gif": "image/gif",
    ".webp": "image/webp",
    ".svg": "image/svg+xml",
    ".mp4": "video/mp4",
    ".webm": "video/webm",
    ".mov": "video/quicktime",
    ".m4v": "video/x-m4v",
    ".pdf": "application/pdf",
    ".doc": "application/msword",
    ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ".xls": "application/vnd.ms-excel",
    ".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    ".ppt": "application/vnd.ms-powerpoint",
    ".pptx": "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    ".txt": "text/plain",
    ".zip": "application/zip",
};

function inferAttachmentKind(mimeType: string, fileName: string): AttachmentKind | null {
    const normalizedMime = (mimeType || "").toLowerCase();
    const ext = path.extname(fileName || "").toLowerCase();

    if (normalizedMime.startsWith("image/")) return "image";
    if (normalizedMime.startsWith("video/")) return "video";
    if (DOCUMENT_MIME_TYPES.has(normalizedMime) || DOCUMENT_EXTENSIONS.has(ext)) return "document";

    return null;
}

function sanitizeExt(fileName: string): string {
    const ext = path.extname(fileName || "").toLowerCase();
    const clean = ext.replace(/[^a-z0-9.]/g, "");
    return clean.length > 0 && clean.length <= 10 ? clean : "";
}

function extFromMime(mimeType: string): string {
    const normalized = (mimeType || "").toLowerCase();
    for (const [ext, mime] of Object.entries(EXT_TO_MIME)) {
        if (mime === normalized) return ext;
    }
    return "";
}

function sanitizeName(fileName: string): string {
    const base = path.basename(fileName || "attachment");
    const withoutControl = base.replace(/[^\x20-\x7E]/g, "");
    return withoutControl.slice(0, 120) || "attachment";
}

function isSafeFileName(fileName: string): boolean {
    return /^[A-Za-z0-9._-]+$/.test(fileName);
}

attachments.post("/attachments", authMiddleware, async (c) => {
    const formData = await c.req.formData();
    const fileField = formData.get("file");

    if (
        !fileField ||
        typeof fileField !== "object" ||
        !("arrayBuffer" in fileField) ||
        !("size" in fileField) ||
        !("type" in fileField) ||
        !("name" in fileField)
    ) {
        return c.json({ error: "File is required." }, 400);
    }

    const uploadedFile = fileField as {
        arrayBuffer: () => Promise<ArrayBuffer>;
        size: number;
        type: string;
        name: string;
    };

    const kind = inferAttachmentKind(uploadedFile.type || "", uploadedFile.name || "");
    if (!kind) {
        return c.json({ error: "Unsupported file type. Allowed: images, videos, and common documents." }, 400);
    }

    if (uploadedFile.size <= 0) {
        return c.json({ error: "File cannot be empty." }, 400);
    }

    if (uploadedFile.size > FREE_ATTACHMENT_MAX_BYTES) {
        return c.json(
            {
                error: `File exceeds free limit of ${Math.floor(FREE_ATTACHMENT_MAX_BYTES / (1024 * 1024))}MB.`,
                maxSizeBytes: FREE_ATTACHMENT_MAX_BYTES,
            },
            413
        );
    }

    const originalName = sanitizeName(uploadedFile.name || "attachment");
    const ext = sanitizeExt(originalName) || extFromMime(uploadedFile.type || "");
    const uniqueName = `${Date.now()}_${randomBytes(8).toString("hex")}${ext}`;
    const filePath = path.join(UPLOADS_DIR, uniqueName);

    await mkdir(UPLOADS_DIR, { recursive: true });
    const bytes = Buffer.from(await uploadedFile.arrayBuffer());
    await writeFile(filePath, bytes);

    const origin = new URL(c.req.url).origin;
    const mimeType = uploadedFile.type || EXT_TO_MIME[ext] || "application/octet-stream";

    return c.json(
        {
            attachment: {
                url: `${origin}/uploads/${uniqueName}`,
                name: originalName,
                size: uploadedFile.size,
                mimeType,
                kind,
            },
            maxSizeBytes: FREE_ATTACHMENT_MAX_BYTES,
        },
        201
    );
});

attachments.get("/uploads/:fileName", async (c) => {
    const fileName = c.req.param("fileName");
    if (!isSafeFileName(fileName)) {
        return c.json({ error: "Invalid file path." }, 400);
    }

    const filePath = path.join(UPLOADS_DIR, fileName);
    const resolved = path.resolve(filePath);
    if (!resolved.startsWith(UPLOADS_DIR)) {
        return c.json({ error: "Invalid file path." }, 400);
    }

    try {
        const data = await readFile(resolved);
        const ext = path.extname(fileName).toLowerCase();
        const mimeType = EXT_TO_MIME[ext] || "application/octet-stream";
        return new Response(data, {
            headers: {
                "Content-Type": mimeType,
                "Cache-Control": "public, max-age=31536000, immutable",
            },
        });
    } catch {
        return c.json({ error: "File not found." }, 404);
    }
});

export default attachments;
