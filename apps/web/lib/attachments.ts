export type AttachmentKind = "image" | "video" | "document";

export interface SharedAttachment {
    url: string;
    name: string;
    size: number;
    mimeType: string;
    kind: AttachmentKind;
}

export const ATTACHMENT_CONTENT_PREFIX = "attachment:";
export const FREE_ATTACHMENT_MAX_BYTES = 10 * 1024 * 1024;
export const FREE_ATTACHMENT_MAX_LABEL = "10MB";

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

export const ATTACHMENT_INPUT_ACCEPT =
    "image/*,video/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.zip";

export function isAttachmentFileAllowed(file: File): boolean {
    const mimeType = (file.type || "").toLowerCase();
    const ext = file.name.includes(".")
        ? `.${file.name.split(".").pop()?.toLowerCase()}`
        : "";

    if (mimeType.startsWith("image/") || mimeType.startsWith("video/")) return true;
    if (DOCUMENT_MIME_TYPES.has(mimeType)) return true;
    if (DOCUMENT_EXTENSIONS.has(ext)) return true;

    return false;
}

export function validateAttachmentFile(file: File): string | null {
    if (!isAttachmentFileAllowed(file)) {
        return "Unsupported file type. Allowed: images, videos, and common documents.";
    }

    if (file.size > FREE_ATTACHMENT_MAX_BYTES) {
        return `Free plan upload limit is ${FREE_ATTACHMENT_MAX_LABEL} per file.`;
    }

    return null;
}

export function encodeAttachmentContent(attachment: SharedAttachment): string {
    return `${ATTACHMENT_CONTENT_PREFIX}${encodeURIComponent(JSON.stringify(attachment))}`;
}

export function parseAttachmentContent(content: string): SharedAttachment | null {
    const trimmed = content.trim();
    if (!trimmed.startsWith(ATTACHMENT_CONTENT_PREFIX)) return null;

    const raw = trimmed.slice(ATTACHMENT_CONTENT_PREFIX.length);
    if (!raw) return null;

    try {
        const decoded = decodeURIComponent(raw);
        const parsed = JSON.parse(decoded) as Partial<SharedAttachment>;
        if (
            !parsed ||
            typeof parsed.url !== "string" ||
            typeof parsed.name !== "string" ||
            typeof parsed.size !== "number" ||
            typeof parsed.mimeType !== "string" ||
            (parsed.kind !== "image" && parsed.kind !== "video" && parsed.kind !== "document")
        ) {
            return null;
        }
        return parsed as SharedAttachment;
    } catch {
        return null;
    }
}

export function formatAttachmentSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
