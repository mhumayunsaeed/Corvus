import "dotenv/config";
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
import { setupWebSocket } from "./ws.js";

const app = new Hono();

// ─── Middleware ──────────────────────────────────────────────────

app.use("*", logger());

app.use(
    "*",
    cors({
        origin: [
            "http://localhost:3000", // Next.js dev
            "http://localhost:1420", // Tauri dev
            "tauri://localhost", // Tauri production
            "https://tauri.localhost", // Tauri production (Windows)
        ],
        allowHeaders: ["Content-Type", "Authorization"],
        allowMethods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
        credentials: true,
    })
);

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

app.route("/auth", auth);
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

// Health check
app.get("/", (c) => {
    return c.json({
        name: "Veyra API",
        version: "0.1.0",
        status: "running",
    });
});

// ─── Start Server ───────────────────────────────────────────────

const port = parseInt(process.env.PORT || "3001", 10);

// Use Node.js native serve
const { serve } = await import("@hono/node-server");

const server = serve({ fetch: app.fetch, port }, (info) => {
    console.log("");
    console.log("  ┌─────────────────────────────────────┐");
    console.log("  │                                     │");
    console.log(`  │   Veyra API running on :${info.port}        │`);
    console.log("  │                                     │");
    console.log("  └─────────────────────────────────────┘");
    console.log("");
});

// Attach WebSocket server to the same HTTP server
setupWebSocket(server);

export default app;
