type HttpMethod = "GET" | "POST" | "PATCH" | "PUT" | "DELETE";

interface EndpointDoc {
    method: HttpMethod;
    path: string;
    summary: string;
    auth?: boolean;
    body?: string;
    query?: string;
}

interface SectionDoc {
    id: string;
    title: string;
    description: string;
    accent: string;
    endpoints: EndpointDoc[];
}

const methodColors: Record<HttpMethod, string> = {
    GET: "get",
    POST: "post",
    PATCH: "patch",
    PUT: "put",
    DELETE: "delete",
};

export const apiSections: SectionDoc[] = [
    {
        id: "auth",
        title: "Authentication",
        description: "Exchange Supabase sessions, inspect users, and manage account state.",
        accent: "#6d5dfc",
        endpoints: [
            {
                method: "POST",
                path: "/auth/session/exchange",
                summary: "Exchange a Supabase bearer token for a Corvus API token.",
                body: "{ preferredDisplayName?, preferredUsername? }",
            },
            {
                method: "GET",
                path: "/auth/me",
                summary: "Return the authenticated user.",
                auth: true,
            },
            {
                method: "PATCH",
                path: "/auth/profile",
                summary: "Update display name, username, bio, avatar, status, or onboarding flag.",
                auth: true,
                body: "{ displayName?, username?, bio?, avatarUrl?, status?, onboardingCompleted? }",
            },
            {
                method: "POST",
                path: "/auth/logout",
                summary: "Persist offline status for explicit logout.",
                auth: true,
            },
            {
                method: "DELETE",
                path: "/auth/account",
                summary: "Delete the authenticated account and owned servers.",
                auth: true,
                body: "{ password }",
            },
            {
                method: "GET",
                path: "/auth/check-username",
                summary: "Check whether a username is available.",
                query: "username",
            },
        ],
    },
    {
        id: "servers",
        title: "Servers, Channels, Members",
        description:
            "Create communities, manage channels, members, invites, roles, and permissions.",
        accent: "#12b981",
        endpoints: [
            {
                method: "GET",
                path: "/servers",
                summary: "List servers the user belongs to.",
                auth: true,
            },
            {
                method: "POST",
                path: "/servers",
                summary: "Create a server with starter channels and default roles.",
                auth: true,
                body: "{ name, iconUrl?, description?, channels? }",
            },
            {
                method: "GET",
                path: "/servers/:id",
                summary: "Fetch server details, channels, and unread counts.",
                auth: true,
            },
            {
                method: "PATCH",
                path: "/servers/:id",
                summary: "Update server name, icon, or description.",
                auth: true,
            },
            {
                method: "DELETE",
                path: "/servers/:id",
                summary: "Delete a server owned by the user.",
                auth: true,
            },
            {
                method: "GET",
                path: "/servers/:serverId/channels",
                summary: "List channels in a server.",
                auth: true,
            },
            {
                method: "POST",
                path: "/servers/:serverId/channels",
                summary: "Create a text, voice, announcement, forum, or stage channel.",
                auth: true,
            },
            {
                method: "PATCH",
                path: "/channels/:id",
                summary: "Update channel metadata and ordering.",
                auth: true,
            },
            { method: "DELETE", path: "/channels/:id", summary: "Delete a channel.", auth: true },
            {
                method: "POST",
                path: "/channels/:id/read",
                summary: "Mark a channel as read.",
                auth: true,
            },
            {
                method: "GET",
                path: "/servers/:serverId/members",
                summary: "List server members.",
                auth: true,
            },
            {
                method: "PATCH",
                path: "/servers/:serverId/members/:userId",
                summary: "Change a member role.",
                auth: true,
            },
            {
                method: "DELETE",
                path: "/servers/:serverId/members/:userId",
                summary: "Kick or leave a server.",
                auth: true,
            },
            {
                method: "GET",
                path: "/servers/:serverId/invites",
                summary: "List active invites.",
                auth: true,
            },
            {
                method: "POST",
                path: "/servers/:serverId/invites",
                summary: "Create an invite link.",
                auth: true,
            },
            { method: "DELETE", path: "/invites/:id", summary: "Revoke an invite.", auth: true },
            {
                method: "POST",
                path: "/invites/:code/join",
                summary: "Join a server through an invite code.",
                auth: true,
            },
            {
                method: "GET",
                path: "/servers/:serverId/roles",
                summary: "List roles and member counts.",
                auth: true,
            },
            {
                method: "POST",
                path: "/servers/:serverId/roles",
                summary: "Create a role.",
                auth: true,
            },
            { method: "PATCH", path: "/roles/:id", summary: "Edit a role.", auth: true },
            { method: "DELETE", path: "/roles/:id", summary: "Delete a role.", auth: true },
            {
                method: "POST",
                path: "/roles/:id/members/:userId",
                summary: "Assign a role.",
                auth: true,
            },
            {
                method: "DELETE",
                path: "/roles/:id/members/:userId",
                summary: "Remove a role.",
                auth: true,
            },
            {
                method: "GET",
                path: "/channels/:channelId/permissions",
                summary: "List channel permission overwrites.",
                auth: true,
            },
            {
                method: "PUT",
                path: "/channels/:channelId/permissions/:roleId",
                summary: "Upsert channel permissions.",
                auth: true,
            },
            {
                method: "DELETE",
                path: "/channels/:channelId/permissions/:roleId",
                summary: "Delete channel permissions.",
                auth: true,
            },
        ],
    },
    {
        id: "messages",
        title: "Messages",
        description: "Read, send, edit, delete, search, pin, react, and unfurl links in channels.",
        accent: "#2ea7ff",
        endpoints: [
            {
                method: "GET",
                path: "/channels/:channelId/messages",
                summary: "List channel messages with cursor pagination.",
                auth: true,
                query: "cursor?, limit?",
            },
            {
                method: "POST",
                path: "/channels/:channelId/messages",
                summary: "Create a message or slash-command response.",
                auth: true,
                body: "{ content, type?, replyToId? }",
            },
            {
                method: "GET",
                path: "/channels/:channelId/messages/search",
                summary: "Search channel messages.",
                auth: true,
                query: "q",
            },
            {
                method: "GET",
                path: "/channels/:channelId/pins",
                summary: "List pinned channel messages.",
                auth: true,
            },
            {
                method: "POST",
                path: "/channels/:channelId/messages/:messageId/pin",
                summary: "Pin a channel message.",
                auth: true,
            },
            {
                method: "DELETE",
                path: "/channels/:channelId/messages/:messageId/pin",
                summary: "Unpin a channel message.",
                auth: true,
            },
            {
                method: "PATCH",
                path: "/messages/:id",
                summary: "Edit a message authored by the user.",
                auth: true,
            },
            { method: "DELETE", path: "/messages/:id", summary: "Delete a message.", auth: true },
            {
                method: "POST",
                path: "/messages/:id/reactions",
                summary: "Add a reaction.",
                auth: true,
                body: "{ emoji }",
            },
            {
                method: "DELETE",
                path: "/messages/:id/reactions/:emoji",
                summary: "Remove a reaction.",
                auth: true,
            },
            {
                method: "GET",
                path: "/unfurl",
                summary: "Preview Open Graph metadata for a URL.",
                auth: true,
                query: "url",
            },
        ],
    },
    {
        id: "dms",
        title: "Direct Messages",
        description:
            "One-to-one and group conversations with unread state, search, pins, and reactions.",
        accent: "#f59e0b",
        endpoints: [
            {
                method: "GET",
                path: "/dms",
                summary: "List DM conversations and unread counts.",
                auth: true,
            },
            {
                method: "POST",
                path: "/dms",
                summary: "Create or return a direct/group conversation.",
                auth: true,
                body: "{ participantIds, name? }",
            },
            {
                method: "GET",
                path: "/dms/:id/messages",
                summary: "List DM messages with cursor pagination.",
                auth: true,
                query: "cursor?, limit?",
            },
            {
                method: "POST",
                path: "/dms/:id/messages",
                summary: "Send a DM message.",
                auth: true,
                body: "{ content, replyToId? }",
            },
            {
                method: "PATCH",
                path: "/dms/:conversationId/messages/:messageId",
                summary: "Edit a DM message.",
                auth: true,
            },
            {
                method: "DELETE",
                path: "/dms/:conversationId/messages/:messageId",
                summary: "Delete a DM message.",
                auth: true,
            },
            {
                method: "POST",
                path: "/dms/:conversationId/messages/:messageId/reactions",
                summary: "Add a DM reaction.",
                auth: true,
            },
            {
                method: "DELETE",
                path: "/dms/:conversationId/messages/:messageId/reactions/:emoji",
                summary: "Remove a DM reaction.",
                auth: true,
            },
            {
                method: "GET",
                path: "/dms/:conversationId/pins",
                summary: "List pinned DM messages.",
                auth: true,
            },
            {
                method: "POST",
                path: "/dms/:conversationId/messages/:messageId/pin",
                summary: "Pin a DM message.",
                auth: true,
            },
            {
                method: "DELETE",
                path: "/dms/:conversationId/messages/:messageId/pin",
                summary: "Unpin a DM message.",
                auth: true,
            },
            {
                method: "POST",
                path: "/dms/:conversationId/read",
                summary: "Mark a DM as read.",
                auth: true,
            },
            {
                method: "GET",
                path: "/dms/:conversationId/messages/search",
                summary: "Search a DM conversation.",
                auth: true,
                query: "q",
            },
        ],
    },
    {
        id: "social",
        title: "Friends, Blocks, Stickers, Uploads",
        description: "Social graph operations and user-owned media assets.",
        accent: "#ec4899",
        endpoints: [
            {
                method: "GET",
                path: "/friends",
                summary: "Fetch friends, pending requests, and blocked users.",
                auth: true,
            },
            {
                method: "GET",
                path: "/friends/search",
                summary: "Search users by username or email.",
                auth: true,
                query: "query or q",
            },
            {
                method: "POST",
                path: "/friends/requests",
                summary: "Send or auto-accept a friend request.",
                auth: true,
                body: "{ target }",
            },
            {
                method: "POST",
                path: "/friends/requests/:id/accept",
                summary: "Accept an incoming request.",
                auth: true,
            },
            {
                method: "POST",
                path: "/friends/requests/:id/decline",
                summary: "Decline an incoming request.",
                auth: true,
            },
            {
                method: "DELETE",
                path: "/friends/requests/:id",
                summary: "Cancel an outgoing request.",
                auth: true,
            },
            {
                method: "POST",
                path: "/friends/block",
                summary: "Block a user.",
                auth: true,
                body: "{ userId }",
            },
            {
                method: "DELETE",
                path: "/friends/block/:userId",
                summary: "Unblock a user.",
                auth: true,
            },
            {
                method: "DELETE",
                path: "/friends/:friendUserId",
                summary: "Remove a friend.",
                auth: true,
            },
            { method: "GET", path: "/stickers", summary: "List user stickers.", auth: true },
            { method: "GET", path: "/stickers/:id", summary: "Get a sticker by ID.", auth: true },
            {
                method: "POST",
                path: "/stickers",
                summary: "Create a sticker from an image data URI.",
                auth: true,
            },
            { method: "DELETE", path: "/stickers/:id", summary: "Delete a sticker.", auth: true },
            {
                method: "POST",
                path: "/attachments",
                summary: "Upload a message attachment with multipart form-data.",
                auth: true,
            },
            {
                method: "POST",
                path: "/uploads/avatar",
                summary: "Upload a user avatar image.",
                auth: true,
            },
            {
                method: "POST",
                path: "/uploads/icon",
                summary: "Upload a server icon image.",
                auth: true,
            },
        ],
    },
    {
        id: "voice",
        title: "Voice, Calls, Stage",
        description: "LiveKit token issuance, call lifecycle, voice states, and stage moderation.",
        accent: "#14b8a6",
        endpoints: [
            {
                method: "POST",
                path: "/channels/:channelId/voice/join",
                summary: "Join a voice or stage channel and receive a LiveKit token.",
                auth: true,
            },
            {
                method: "POST",
                path: "/channels/:channelId/voice/leave",
                summary: "Leave a voice channel.",
                auth: true,
            },
            {
                method: "GET",
                path: "/channels/:channelId/voice/participants",
                summary: "List active voice participants.",
                auth: true,
            },
            {
                method: "GET",
                path: "/servers/:serverId/voice/states",
                summary: "List active voice states for a server.",
                auth: true,
            },
            {
                method: "POST",
                path: "/dms/:conversationId/call/start",
                summary: "Start a DM call.",
                auth: true,
            },
            {
                method: "POST",
                path: "/dms/:conversationId/call/join",
                summary: "Join a DM call.",
                auth: true,
            },
            {
                method: "POST",
                path: "/dms/:conversationId/call/leave",
                summary: "Leave a DM call.",
                auth: true,
            },
            {
                method: "POST",
                path: "/dms/:conversationId/call/decline",
                summary: "Decline a DM call.",
                auth: true,
            },
            {
                method: "POST",
                path: "/dms/:conversationId/call/end",
                summary: "End a DM call.",
                auth: true,
            },
            {
                method: "POST",
                path: "/channels/:channelId/stage/request-speak",
                summary: "Request speaker access in a stage channel.",
                auth: true,
            },
            {
                method: "POST",
                path: "/channels/:channelId/stage/grant-speak",
                summary: "Grant stage speaker access.",
                auth: true,
            },
            {
                method: "POST",
                path: "/channels/:channelId/stage/revoke-speak",
                summary: "Revoke stage speaker access.",
                auth: true,
            },
            {
                method: "GET",
                path: "/channels/:channelId/stage/state",
                summary: "Read current stage state.",
                auth: true,
            },
        ],
    },
];

function escapeHtml(value: string) {
    return value
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");
}

function endpointCount() {
    return apiSections.reduce((count, section) => count + section.endpoints.length, 0);
}

function renderEndpoint(endpoint: EndpointDoc) {
    const meta = [endpoint.auth ? "Bearer token" : "Public"];
    if (endpoint.query) meta.push(`Query: ${endpoint.query}`);
    if (endpoint.body) meta.push(`Body: ${endpoint.body}`);

    return `
        <article class="endpoint-row">
            <div class="endpoint-main">
                <span class="method ${methodColors[endpoint.method]}">${endpoint.method}</span>
                <code>${escapeHtml(endpoint.path)}</code>
            </div>
            <p>${escapeHtml(endpoint.summary)}</p>
            <div class="meta-row">
                ${meta.map((item) => `<span>${escapeHtml(item)}</span>`).join("")}
            </div>
        </article>`;
}

function renderSection(section: SectionDoc) {
    return `
        <section class="docs-section" id="${section.id}" style="--accent:${section.accent}">
            <div class="section-heading">
                <div>
                    <span class="section-kicker">${section.endpoints.length} endpoints</span>
                    <h2>${escapeHtml(section.title)}</h2>
                    <p>${escapeHtml(section.description)}</p>
                </div>
                <div class="section-mark" aria-hidden="true"></div>
            </div>
            <div class="endpoint-list">
                ${section.endpoints.map(renderEndpoint).join("")}
            </div>
        </section>`;
}

export function renderApiDocs(baseUrl: string) {
    const escapedBaseUrl = escapeHtml(baseUrl);
    const sections = apiSections.map(renderSection).join("");
    const nav = apiSections
        .map((section) => `<a href="#${section.id}">${escapeHtml(section.title)}</a>`)
        .join("");

    return `<!doctype html>
<html lang="en">
<head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Corvus API Documentation</title>
    <style>
        :root {
            color-scheme: dark;
            --bg: #0b0d12;
            --panel: #121620;
            --panel-2: #171c28;
            --line: #273042;
            --text: #eef2ff;
            --muted: #9aa4b8;
            --faint: #6f7b91;
            --violet: #7c6cff;
            --green: #12b981;
            --blue: #2ea7ff;
            --amber: #f59e0b;
            --red: #ef4444;
        }
        * { box-sizing: border-box; }
        html { scroll-behavior: smooth; }
        body {
            margin: 0;
            background:
                radial-gradient(circle at 18% 8%, rgba(124,108,255,.22), transparent 26rem),
                radial-gradient(circle at 88% 18%, rgba(20,184,166,.16), transparent 24rem),
                linear-gradient(180deg, #0b0d12 0%, #0f1219 52%, #0b0d12 100%);
            color: var(--text);
            font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
            line-height: 1.5;
        }
        a { color: inherit; text-decoration: none; }
        .shell { max-width: 1180px; margin: 0 auto; padding: 28px; }
        .topbar {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 18px;
            padding: 14px 0 26px;
        }
        .brand { display: flex; align-items: center; gap: 12px; min-width: 0; }
        .logo {
            width: 42px;
            height: 42px;
            border-radius: 10px;
            background:
                linear-gradient(135deg, rgba(124,108,255,.95), rgba(20,184,166,.95));
            display: grid;
            place-items: center;
            font-weight: 800;
            letter-spacing: 0;
            color: white;
            box-shadow: 0 12px 32px rgba(0,0,0,.3);
        }
        .brand h1 { margin: 0; font-size: 17px; line-height: 1.1; }
        .brand span { display: block; color: var(--muted); font-size: 12px; margin-top: 3px; }
        .nav {
            display: flex;
            flex-wrap: wrap;
            justify-content: flex-end;
            gap: 8px;
        }
        .nav a {
            color: var(--muted);
            border: 1px solid rgba(255,255,255,.08);
            background: rgba(255,255,255,.04);
            padding: 7px 10px;
            border-radius: 7px;
            font-size: 12px;
        }
        .nav a:hover { color: var(--text); border-color: rgba(255,255,255,.18); }
        .hero {
            display: grid;
            grid-template-columns: minmax(0, 1.1fr) minmax(320px, .9fr);
            gap: 22px;
            align-items: stretch;
            padding: 18px 0 26px;
        }
        .hero-copy, .flow-card, .quick-card, .docs-section {
            border: 1px solid rgba(255,255,255,.09);
            background: linear-gradient(180deg, rgba(18,22,32,.94), rgba(15,19,28,.92));
            box-shadow: 0 20px 60px rgba(0,0,0,.25);
        }
        .hero-copy { padding: 30px; border-radius: 8px; }
        .eyebrow {
            display: inline-flex;
            align-items: center;
            gap: 8px;
            color: #b9c2ff;
            font-size: 12px;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: .08em;
        }
        .pulse {
            width: 9px;
            height: 9px;
            border-radius: 99px;
            background: var(--green);
            box-shadow: 0 0 0 6px rgba(18,185,129,.12);
        }
        .hero h2 {
            margin: 16px 0 12px;
            max-width: 760px;
            font-size: clamp(34px, 6vw, 68px);
            line-height: .95;
            letter-spacing: 0;
        }
        .hero p { margin: 0; max-width: 690px; color: var(--muted); font-size: 16px; }
        .stats {
            display: grid;
            grid-template-columns: repeat(3, minmax(0, 1fr));
            gap: 10px;
            margin-top: 26px;
        }
        .stat {
            border: 1px solid rgba(255,255,255,.08);
            background: rgba(255,255,255,.04);
            border-radius: 8px;
            padding: 13px;
        }
        .stat strong { display: block; font-size: 22px; }
        .stat span { color: var(--muted); font-size: 12px; }
        .flow-card { border-radius: 8px; padding: 22px; }
        .flow-card h3, .quick-card h3 { margin: 0 0 14px; font-size: 15px; }
        .flow {
            display: grid;
            gap: 10px;
        }
        .flow-step {
            display: grid;
            grid-template-columns: 34px 1fr;
            gap: 10px;
            align-items: start;
            padding: 12px;
            border-radius: 8px;
            background: rgba(255,255,255,.04);
            border: 1px solid rgba(255,255,255,.07);
        }
        .flow-step b {
            width: 34px;
            height: 34px;
            border-radius: 8px;
            display: grid;
            place-items: center;
            background: rgba(124,108,255,.18);
            color: #c9c4ff;
        }
        .flow-step strong { display: block; font-size: 13px; }
        .flow-step span { display: block; color: var(--muted); font-size: 12px; margin-top: 2px; }
        .quick-grid {
            display: grid;
            grid-template-columns: 1.05fr .95fr;
            gap: 18px;
            margin: 6px 0 26px;
        }
        .quick-card { border-radius: 8px; padding: 20px; }
        .code {
            overflow: auto;
            margin: 0;
            border-radius: 8px;
            border: 1px solid rgba(255,255,255,.08);
            background: #080a0f;
            color: #d8e2ff;
            padding: 15px;
            font: 12px/1.55 ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
        }
        .base-url {
            display: flex;
            align-items: center;
            gap: 10px;
            border: 1px solid rgba(255,255,255,.08);
            background: rgba(255,255,255,.04);
            border-radius: 8px;
            padding: 12px;
            margin-bottom: 12px;
            min-width: 0;
        }
        .base-url span { color: var(--faint); font-size: 12px; flex: none; }
        .base-url code { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .docs-section {
            border-radius: 8px;
            margin: 18px 0;
            overflow: hidden;
        }
        .section-heading {
            display: flex;
            justify-content: space-between;
            gap: 16px;
            padding: 22px;
            border-bottom: 1px solid rgba(255,255,255,.08);
            background:
                linear-gradient(90deg, color-mix(in srgb, var(--accent) 18%, transparent), transparent 58%),
                rgba(255,255,255,.02);
        }
        .section-kicker {
            color: var(--accent);
            font-size: 12px;
            font-weight: 800;
            text-transform: uppercase;
            letter-spacing: .08em;
        }
        .section-heading h2 { margin: 6px 0 4px; font-size: 24px; }
        .section-heading p { margin: 0; color: var(--muted); max-width: 680px; }
        .section-mark {
            width: 72px;
            height: 72px;
            border-radius: 18px;
            border: 1px solid color-mix(in srgb, var(--accent) 35%, transparent);
            background:
                linear-gradient(135deg, color-mix(in srgb, var(--accent) 40%, transparent), transparent),
                rgba(255,255,255,.04);
            flex: none;
        }
        .endpoint-list { display: grid; }
        .endpoint-row {
            display: grid;
            grid-template-columns: minmax(280px, .9fr) minmax(280px, 1fr) minmax(220px, .9fr);
            gap: 14px;
            align-items: center;
            padding: 14px 18px;
            border-top: 1px solid rgba(255,255,255,.06);
        }
        .endpoint-row:first-child { border-top: 0; }
        .endpoint-row:hover { background: rgba(255,255,255,.025); }
        .endpoint-main {
            display: flex;
            align-items: center;
            gap: 10px;
            min-width: 0;
        }
        .endpoint-main code {
            color: #e9edff;
            overflow-wrap: anywhere;
            font: 13px/1.4 ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
        }
        .endpoint-row p { margin: 0; color: var(--muted); font-size: 13px; }
        .method {
            width: 58px;
            text-align: center;
            flex: none;
            border-radius: 6px;
            padding: 5px 0;
            color: #061018;
            font-size: 11px;
            font-weight: 900;
        }
        .method.get { background: #7dd3fc; }
        .method.post { background: #86efac; }
        .method.patch { background: #fde68a; }
        .method.put { background: #c4b5fd; }
        .method.delete { background: #fca5a5; }
        .meta-row {
            display: flex;
            flex-wrap: wrap;
            justify-content: flex-end;
            gap: 6px;
        }
        .meta-row span {
            border: 1px solid rgba(255,255,255,.08);
            background: rgba(255,255,255,.04);
            border-radius: 999px;
            color: var(--muted);
            padding: 4px 8px;
            font-size: 11px;
        }
        .footer {
            color: var(--faint);
            font-size: 12px;
            padding: 26px 0 8px;
            text-align: center;
        }
        @supports not (background: color-mix(in srgb, red, transparent)) {
            .section-heading { background: rgba(255,255,255,.03); }
            .section-mark { background: rgba(255,255,255,.05); }
        }
        @media (max-width: 920px) {
            .shell { padding: 18px; }
            .topbar, .hero, .quick-grid { grid-template-columns: 1fr; display: grid; }
            .nav { justify-content: start; }
            .stats { grid-template-columns: 1fr; }
            .endpoint-row { grid-template-columns: 1fr; align-items: start; }
            .meta-row { justify-content: flex-start; }
            .section-mark { display: none; }
        }
    </style>
</head>
<body>
    <main class="shell">
        <header class="topbar">
            <a class="brand" href="/">
                <div class="logo">C</div>
                <div>
                    <h1>Corvus API</h1>
                    <span>Developer documentation</span>
                </div>
            </a>
            <nav class="nav" aria-label="Documentation sections">
                ${nav}
            </nav>
        </header>

        <section class="hero">
            <div class="hero-copy">
                <div class="eyebrow"><span class="pulse"></span> JSON API for Corvus clients</div>
                <h2>Build against chat, servers, voice, friends, and media endpoints.</h2>
                <p>
                    This page documents the live API surface exposed by the Corvus backend.
                    Use the route groups below to understand authentication, payload shape,
                    realtime side effects, and the main workflow from sign-in to messaging.
                </p>
                <div class="stats">
                    <div class="stat"><strong>${endpointCount()}</strong><span>documented endpoints</span></div>
                    <div class="stat"><strong>${apiSections.length}</strong><span>route groups</span></div>
                    <div class="stat"><strong>JWT</strong><span>Bearer auth after exchange</span></div>
                </div>
            </div>
            <aside class="flow-card">
                <h3>Request Flow</h3>
                <div class="flow">
                    <div class="flow-step"><b>1</b><div><strong>Supabase session</strong><span>Client signs in with Supabase Auth.</span></div></div>
                    <div class="flow-step"><b>2</b><div><strong>Token exchange</strong><span>POST /auth/session/exchange returns a Corvus JWT.</span></div></div>
                    <div class="flow-step"><b>3</b><div><strong>API calls</strong><span>Send Authorization: Bearer &lt;token&gt; to protected endpoints.</span></div></div>
                    <div class="flow-step"><b>4</b><div><strong>Realtime updates</strong><span>Mutating routes broadcast through Supabase Realtime channels.</span></div></div>
                </div>
            </aside>
        </section>

        <section class="quick-grid">
            <article class="quick-card">
                <h3>Base URL</h3>
                <div class="base-url"><span>Current origin</span><code>${escapedBaseUrl}</code></div>
                <pre class="code">Authorization: Bearer &lt;corvus-jwt&gt;
Content-Type: application/json</pre>
            </article>
            <article class="quick-card">
                <h3>Start Here</h3>
                <pre class="code">curl -X POST ${escapedBaseUrl}/auth/session/exchange \\
  -H "Authorization: Bearer &lt;supabase-token&gt;" \\
  -H "Content-Type: application/json" \\
  -d '{"preferredUsername":"nova"}'</pre>
            </article>
        </section>

        ${sections}

        <footer class="footer">
            Machine-readable endpoint summary: <a href="/openapi.json">/openapi.json</a>.
            Health check: <a href="/healthz">/healthz</a>.
        </footer>
    </main>
</body>
</html>`;
}

export function buildOpenApiSummary(baseUrl: string) {
    const paths: Record<string, Record<string, unknown>> = {};

    for (const section of apiSections) {
        for (const endpoint of section.endpoints) {
            const path = endpoint.path.replace(/:([A-Za-z0-9_]+)/g, "{$1}");
            const method = endpoint.method.toLowerCase();
            paths[path] ??= {};
            paths[path][method] = {
                tags: [section.title],
                summary: endpoint.summary,
                security: endpoint.auth ? [{ bearerAuth: [] }] : [],
                parameters: endpoint.query
                    ? [
                          {
                              name: endpoint.query,
                              in: "query",
                              required: !endpoint.query.includes("?"),
                              schema: { type: "string" },
                          },
                      ]
                    : [],
            };
        }
    }

    return {
        openapi: "3.1.0",
        info: {
            title: "Corvus API",
            version: "0.1.0",
            description: "Endpoint summary for the Corvus chat, voice, server, and social API.",
        },
        servers: [{ url: baseUrl }],
        components: {
            securitySchemes: {
                bearerAuth: {
                    type: "http",
                    scheme: "bearer",
                    bearerFormat: "JWT",
                },
            },
        },
        paths,
    };
}
