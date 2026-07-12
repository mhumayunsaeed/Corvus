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

const EXT_TO_MIME: Record<string, string> = {
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".png": "image/png",
    ".gif": "image/gif",
    ".webp": "image/webp",
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

function sanitizeExt(fileName: string): string {
    const ext = path.extname(fileName || "").toLowerCase();
    const clean = ext.replace(/[^a-z0-9.]/g, "");
    return clean.length > 0 && clean.length <= 10 ? clean : "";
}

function sanitizeName(fileName: string): string {
    const base = path.basename(fileName || "attachment");
    const withoutControl = base.replace(/[^\x20-\x7E]/g, "");
    return withoutControl.slice(0, 120) || "attachment";
}

function startsWith(bytes: Buffer, signature: number[], offset = 0): boolean {
    return signature.every((value, index) => bytes[offset + index] === value);
}

function sniffFile(bytes: Buffer, fileName: string): { mimeType: string; ext: string; kind: AttachmentKind } | null {
    const requestedExt = sanitizeExt(fileName);
    if (startsWith(bytes, [0xff, 0xd8, 0xff])) return { mimeType: "image/jpeg", ext: ".jpg", kind: "image" };
    if (startsWith(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return { mimeType: "image/png", ext: ".png", kind: "image" };
    if (bytes.subarray(0, 6).toString("ascii") === "GIF87a" || bytes.subarray(0, 6).toString("ascii") === "GIF89a") return { mimeType: "image/gif", ext: ".gif", kind: "image" };
    if (bytes.subarray(0, 4).toString("ascii") === "RIFF" && bytes.subarray(8, 12).toString("ascii") === "WEBP") return { mimeType: "image/webp", ext: ".webp", kind: "image" };
    if (bytes.subarray(0, 5).toString("ascii") === "%PDF-") return { mimeType: "application/pdf", ext: ".pdf", kind: "document" };
    if (startsWith(bytes, [0x50, 0x4b, 0x03, 0x04])) {
        const officeMime = EXT_TO_MIME[requestedExt];
        if ([".docx", ".xlsx", ".pptx"].includes(requestedExt) && officeMime) {
            return { mimeType: officeMime, ext: requestedExt, kind: "document" };
        }
        return { mimeType: "application/zip", ext: ".zip", kind: "document" };
    }
    if (startsWith(bytes, [0x1a, 0x45, 0xdf, 0xa3])) return { mimeType: "video/webm", ext: ".webm", kind: "video" };
    if (bytes.subarray(4, 8).toString("ascii") === "ftyp") return { mimeType: "video/mp4", ext: ".mp4", kind: "video" };
    if (requestedExt === ".txt" && !bytes.includes(0)) return { mimeType: "text/plain", ext: ".txt", kind: "document" };
    return null;
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

    const bytes = Buffer.from(await uploadedFile.arrayBuffer());
    const originalName = sanitizeName(uploadedFile.name || "attachment");
    const detected = sniffFile(bytes, originalName);
    if (!detected) {
        return c.json({ error: "File contents do not match a supported file type." }, 400);
    }
    const { ext, mimeType, kind } = detected;

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

    if (uploadedFile.size <= 0) {
        return c.json({ error: "File cannot be empty." }, 400);
    }

    if (uploadedFile.size > IMAGE_MAX_BYTES) {
        return c.json(
            { error: `Image exceeds limit of ${Math.floor(IMAGE_MAX_BYTES / (1024 * 1024))}MB.` },
            413
        );
    }

    const bytes = Buffer.from(await uploadedFile.arrayBuffer());
    const detected = sniffFile(bytes, uploadedFile.name || "");
    if (!detected || detected.kind !== "image") {
        return c.json({ error: "File contents must be a supported raster image." }, 400);
    }

    const url = await uploadObject({
        bucket,
        key: generateObjectKey(detected.ext),
        data: bytes,
        contentType: detected.mimeType,
    });

    return c.json({ url }, 201);
}

attachments.post("/uploads/avatar", authMiddleware, (c) => handleImageUpload(c, STORAGE_BUCKETS.avatars));
attachments.post("/uploads/icon", authMiddleware, (c) => handleImageUpload(c, STORAGE_BUCKETS.serverIcons));

export default attachments;
