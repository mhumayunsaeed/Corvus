import dotenv from "dotenv";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import auth from "./routes/auth.js";
import servers from "./routes/servers.js";
import channels from "./routes/channels.js";
import messages from "./routes/messages.js";
import invites from "./routes/invites.js";
import members from "./routes/members.js";
import friends from "./routes/friends.js";
import dms from "./routes/dms.js";
import voice from "./routes/voice.js";
import calls from "./routes/calls.js";
import stage from "./routes/stage.js";
import stickerRoutes from "./routes/stickers.js";
import attachmentRoutes from "./routes/attachments.js";
import roles from "./routes/roles.js";
import channelPermissions from "./routes/channel-permissions.js";
import workspace from "./routes/workspace.js";
import { buildOpenApiSummary, renderApiDocs } from "./docs.js";

const currentDir = dirname(fileURLToPath(import.meta.url));
const envDir = resolve(currentDir, "..");
export const isProduction = process.env.NODE_ENV === "production";

// Load API env files from apps/api regardless of process cwd. On serverless
// platforms (Vercel) these files won't exist and env comes from the platform.
dotenv.config({ path: resolve(envDir, ".env"), override: !isProduction });
dotenv.config({ path: resolve(envDir, ".env.local"), override: !isProduction });

const app = new Hono();

// ─── Middleware ──────────────────────────────────────────────────

app.use("*", logger());

const localOrigins = [
    "http://localhost:3000", // Next.js dev
    "http://localhost:1420", // Tauri dev
    "tauri://localhost", // Tauri production (macOS/Linux)
    "http://tauri.localhost", // Tauri production (Windows)
    "https://tauri.localhost", // Tauri production (Windows HTTPS)
];

function normalizeOrigin(value: string) {
    return value.trim().replace(/\/+$/, "");
}

const envOrigins = [
    process.env.FRONTEND_URL ?? "",
    ...(process.env.CORS_ORIGINS ?? "").split(",").map((value) => value.trim()),
]
    .filter(Boolean)
    .map(normalizeOrigin);

const allowedOrigins = new Set([...localOrigins.map(normalizeOrigin), ...envOrigins]);

app.use(
    "*",
    cors({
        origin: (origin) => {
            if (!origin) return "";
            return allowedOrigins.has(normalizeOrigin(origin)) ? origin : "";
        },
        allowHeaders: ["Content-Type", "Authorization"],
        allowMethods: ["GET", "POST", "PATCH", "PUT", "DELETE", "OPTIONS"],
        credentials: true,
    }),
);

// Security headers
app.use("*", async (c, next) => {
    await next();
    c.header("X-Content-Type-Options", "nosniff");
    c.header("X-Frame-Options", "DENY");
    c.header("Referrer-Policy", "strict-origin-when-cross-origin");
});

app.onError((err, c) => {
    const message = err instanceof Error ? err.message : String(err);
    const stack = err instanceof Error ? err.stack : undefined;
    console.error("Unhandled API error:", message);
    if (stack) console.error(stack);
    // Never leak internal error details to clients in production.
    return c.json(
        {
            error: isProduction ? "Internal Server Error" : message || "Internal Server Error",
        },
        500,
    );
});

// ─── Routes ─────────────────────────────────────────────────────

// Public health check
app.get("/healthz", (c) => {
    return c.json({
        name: "Corvus API",
        version: "0.1.0",
        status: "ok",
    });
});

app.get("/docs", (c) => {
    const baseUrl = new URL(c.req.url).origin;
    return c.html(renderApiDocs(baseUrl));
});

app.get("/", (c) => {
    const baseUrl = new URL(c.req.url).origin;
    return c.html(renderApiDocs(baseUrl));
});

app.get("/openapi.json", (c) => {
    const baseUrl = new URL(c.req.url).origin;
    return c.json(buildOpenApiSummary(baseUrl));
});

app.route("/auth", auth);
app.route("/", attachmentRoutes); // routes are /attachments and /uploads/*
app.route("/servers", servers);
app.route("/", channels); // routes are /servers/:serverId/channels and /channels/:id
app.route("/", messages); // routes are /channels/:channelId/messages and /messages/:id
app.route("/", invites); // routes are /servers/:serverId/invites and /invites/:code/join
app.route("/", members); // routes are /servers/:serverId/members
app.route("/", friends); // routes are /friends/*
app.route("/", dms); // routes are /dms and /dms/:id/messages
app.route("/", voice); // routes are /channels/:channelId/voice/* and /servers/:serverId/voice/*
app.route("/", calls); // routes are /dms/:conversationId/call/*
app.route("/", stage); // routes are /channels/:channelId/stage/*
app.route("/", stickerRoutes); // routes are /stickers/*
app.route("/", roles); // routes are /servers/:serverId/roles and /roles/:id
app.route("/", channelPermissions); // routes are /channels/:channelId/permissions
app.route("/", workspace); // routes are /servers/:id/modules, /channels/:id/* module state, settings

export default app;
