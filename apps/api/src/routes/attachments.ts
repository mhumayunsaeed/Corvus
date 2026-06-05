import { Hono, type Context } from "hono";
import path from "node:path";
import { authMiddleware, type AuthEnv } from "../middleware/auth.js";
import {
    STORAGE_BUCKETS,
    generateObjectKey,
    uploadObject,
    type StorageBucket,
} from "../services/storage.js";

const attachments = new Hono<AuthEnv>();

const FREE_ATTACHMENT_MAX_BYTES = Number(process.env.FREE_ATTACHMENT_MAX_BYTES || 10 * 1024 * 1024);
const IMAGE_MAX_BYTES = Number(process.env.IMAGE_UPLOAD_MAX_BYTES || 5 * 1024 * 1024);

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

interface UploadedFile {
    arrayBuffer: () => Promise<ArrayBuffer>;
    size: number;
    type: string;
    name: string;
}

function extractFile(fileField: unknown): UploadedFile | null {
    if (
        !fileField ||
        typeof fileField !== "object" ||
        !("arrayBuffer" in fileField) ||
        !("size" in fileField) ||
        !("type" in fileField) ||
        !("name" in fileField)
    ) {
        return null;
    }
    return fileField as UploadedFile;
}

// ─── POST /attachments — message attachments (image/video/document) ──

attachments.post("/attachments", authMiddleware, async (c) => {
    const formData = await c.req.formData();
    const uploadedFile = extractFile(formData.get("file"));

    if (!uploadedFile) {
        return c.json({ error: "File is required." }, 400);
    }

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
    const mimeType = uploadedFile.type || EXT_TO_MIME[ext] || "application/octet-stream";
    const bytes = Buffer.from(await uploadedFile.arrayBuffer());

    const url = await uploadObject({
        bucket: STORAGE_BUCKETS.attachments,
        key: generateObjectKey(ext),
        data: bytes,
        contentType: mimeType,
    });

    return c.json(
        {
            attachment: {
                url,
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

// ─── Image uploads (avatars, server icons) ──────────────────────────

async function handleImageUpload(c: Context<AuthEnv>, bucket: StorageBucket) {
    const formData = await c.req.formData();
    const uploadedFile = extractFile(formData.get("file"));

    if (!uploadedFile) {
        return c.json({ error: "File is required." }, 400);
    }

    if (!(uploadedFile.type || "").toLowerCase().startsWith("image/")) {
        return c.json({ error: "File must be an image." }, 400);
    }

    if (uploadedFile.size <= 0) {
        return c.json({ error: "File cannot be empty." }, 400);
    }

    if (uploadedFile.size > IMAGE_MAX_BYTES) {
        return c.json(
            { error: `Image exceeds limit of ${Math.floor(IMAGE_MAX_BYTES / (1024 * 1024))}MB.` },
            413
        );
    }

    const ext = sanitizeExt(uploadedFile.name || "") || extFromMime(uploadedFile.type) || ".png";
    const bytes = Buffer.from(await uploadedFile.arrayBuffer());

    const url = await uploadObject({
        bucket,
        key: generateObjectKey(ext),
        data: bytes,
        contentType: uploadedFile.type || "image/png",
    });

    return c.json({ url }, 201);
}

attachments.post("/uploads/avatar", authMiddleware, (c) => handleImageUpload(c, STORAGE_BUCKETS.avatars));
attachments.post("/uploads/icon", authMiddleware, (c) => handleImageUpload(c, STORAGE_BUCKETS.serverIcons));

export default attachments;
