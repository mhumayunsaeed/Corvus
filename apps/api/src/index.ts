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
import googleAuth from "./routes/google-auth.js";
import { setupWebSocket } from "./ws.js";

const currentDir = dirname(fileURLToPath(import.meta.url));
const envDir = resolve(currentDir, "..");
const isProduction = process.env.NODE_ENV === "production";

// Load API env files from apps/api regardless of process cwd.
// In non-production we intentionally override shell vars to avoid stale DATABASE_URL values.
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
    ...(process.env.CORS_ORIGINS ?? "")
        .split(",")
        .map((value) => value.trim()),
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
        allowMethods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
        credentials: true,
    })
);

// Security headers
app.use("*", async (c, next) => {
    await next();
    c.header("X-Content-Type-Options", "nosniff");
    c.header("X-Frame-Options", "DENY");
    c.header("Referrer-Policy", "strict-origin-when-cross-origin");
});

app.onError((err, c) => {
    console.error("Unhandled API error:", err);
    return c.json(
        {
            error: "Internal Server Error",
            details: process.env.NODE_ENV === "production" ? undefined : err.message,
        },
        500
    );
});

// ─── Routes ─────────────────────────────────────────────────────

// Public health check used by Render
app.get("/healthz", (c) => {
    return c.json({
        name: "Corvus API",
        version: "0.1.0",
        status: "ok",
    });
});
app.route("/auth", auth);
app.route("/auth", googleAuth);
app.route("/", attachmentRoutes); // routes are /attachments and /uploads/*
app.route("/servers", servers);
app.route("/", channels); // routes are /servers/:serverId/channels and /channels/:id
app.route("/", messages);  // routes are /channels/:channelId/messages and /messages/:id
app.route("/", invites);   // routes are /servers/:serverId/invites and /invites/:code/join
app.route("/", members);   // routes are /servers/:serverId/members
app.route("/", friends);   // routes are /friends/*
app.route("/", dms);       // routes are /dms and /dms/:id/messages
app.route("/", voice);     // routes are /channels/:channelId/voice/* and /servers/:serverId/voice/*
app.route("/", calls);     // routes are /dms/:conversationId/call/*
app.route("/", stage);     // routes are /channels/:channelId/stage/*
app.route("/", stickerRoutes); // routes are /stickers/*
app.route("/", roles);              // routes are /servers/:serverId/roles and /roles/:id
app.route("/", channelPermissions); // routes are /channels/:channelId/permissions

// Health check
app.get("/", (c) => {
    return c.json({
        name: "Corvus API",
        version: "0.1.0",
        status: "running",
    });
});

// ─── Start Server ───────────────────────────────────────────────

const port = parseInt(process.env.PORT || "3001", 10);

// Use Node.js native serve
const { serve } = await import("@hono/node-server");

const server = serve({ fetch: app.fetch, port }, (info) => {
    const smtpOk = !!(process.env.SMTP_USER && process.env.SMTP_PASS);
    const googleOk = !!process.env.GOOGLE_CLIENT_ID;
    console.log("");
    console.log("  ┌─────────────────────────────────────┐");
    console.log("  │                                     │");
    console.log(`  │   Corvus API running on :${info.port}        │`);
    console.log("  │                                     │");
    console.log(`  │   SMTP: ${smtpOk ? "✓ configured" : "✗ not set (auto-verify)"}     │`);
    console.log(`  │   Google OAuth: ${googleOk ? "✓ configured" : "✗ not set"}  │`);
    console.log("  │                                     │");
    console.log("  └─────────────────────────────────────┘");
    console.log("");
});

// Attach WebSocket server to the same HTTP server
setupWebSocket(server);

export default app;
