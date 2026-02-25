import { WebSocketServer, WebSocket } from "ws";
import { verifyToken } from "./lib/jwt.js";
import { prisma } from "./lib/prisma.js";

interface WSClient {
    ws: WebSocket;
    userId: string;
    username: string;
    subscribedChannels: Set<string>;
    subscribedDMConversations: Set<string>;
}

const clients = new Map<WebSocket, WSClient>();
const userConnectionCounts = new Map<string, number>();

export type PresenceStatus =
    | "online"
    | "idle"
    | "dnd"
    | "invisible"
    | "offline";

// Channel → set of WebSocket connections subscribed to it
const channelSubscriptions = new Map<string, Set<WebSocket>>();
const dmSubscriptions = new Map<string, Set<WebSocket>>();

function normalizePresenceStatus(status: string | null | undefined): PresenceStatus {
    switch (status) {
        case "online":
        case "idle":
        case "dnd":
        case "invisible":
        case "offline":
            return status;
        default:
            return "offline";
    }
}

export function hasActiveUserConnections(userId: string) {
    return (userConnectionCounts.get(userId) || 0) > 0;
}

export function broadcastPresenceUpdate(userId: string, status: PresenceStatus) {
    const payload = JSON.stringify({
        type: "presence_update",
        data: { userId, status },
    });

    for (const ws of clients.keys()) {
        if (ws.readyState === WebSocket.OPEN) {
            ws.send(payload);
        }
    }
}

async function resolveConnectedPresence(userId: string): Promise<PresenceStatus> {
    const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { status: true },
    });
    const currentStatus = normalizePresenceStatus(user?.status);
    return currentStatus === "offline" ? "online" : currentStatus;
}

async function updateUserPresence(userId: string, status: PresenceStatus) {
    try {
        await prisma.user.update({
            where: { id: userId },
            data: { status },
        });
        broadcastPresenceUpdate(userId, status);
    } catch (error) {
        console.error(`Failed to set user ${userId} presence to ${status}:`, error);
    }
}

function incrementUserConnections(userId: string) {
    const next = (userConnectionCounts.get(userId) || 0) + 1;
    userConnectionCounts.set(userId, next);
    return next;
}

function decrementUserConnections(userId: string) {
    const current = userConnectionCounts.get(userId) || 0;
    const next = Math.max(0, current - 1);

    if (next === 0) {
        userConnectionCounts.delete(userId);
    } else {
        userConnectionCounts.set(userId, next);
    }

    return next;
}

// ─── Voice channel state tracking ───────────────────────────────

export interface VoiceParticipant {
    userId: string;
    username: string;
    displayName: string;
    avatarUrl: string | null;
}

// channelId → Map<userId, VoiceParticipant>
const voiceChannelParticipants = new Map<string, Map<string, VoiceParticipant>>();

export function addVoiceParticipant(channelId: string, participant: VoiceParticipant) {
    if (!voiceChannelParticipants.has(channelId)) {
        voiceChannelParticipants.set(channelId, new Map());
    }
    voiceChannelParticipants.get(channelId)!.set(participant.userId, participant);
}

export function removeVoiceParticipant(channelId: string, userId: string) {
    const participants = voiceChannelParticipants.get(channelId);
    if (participants) {
        participants.delete(userId);
        if (participants.size === 0) {
            voiceChannelParticipants.delete(channelId);
        }
    }
}

export function getVoiceParticipants(channelId: string): VoiceParticipant[] {
    const participants = voiceChannelParticipants.get(channelId);
    return participants ? Array.from(participants.values()) : [];
}

export function getUserVoiceChannel(userId: string): string | null {
    for (const [channelId, participants] of voiceChannelParticipants) {
        if (participants.has(userId)) return channelId;
    }
    return null;
}

export function getAllVoiceChannelStates(): Record<string, VoiceParticipant[]> {
    const states: Record<string, VoiceParticipant[]> = {};
    for (const [channelId, participants] of voiceChannelParticipants) {
        states[channelId] = Array.from(participants.values());
    }
    return states;
}

export function broadcastToChannel(channelId: string, event: { type: string; data: unknown }) {
    const subs = channelSubscriptions.get(channelId);
    if (!subs) return;

    const payload = JSON.stringify(event);
    for (const ws of subs) {
        if (ws.readyState === WebSocket.OPEN) {
            ws.send(payload);
        }
    }
}

export function broadcastToDMConversation(
    conversationId: string,
    event: { type: string; data: unknown }
) {
    const subs = dmSubscriptions.get(conversationId);
    if (!subs) return;

    const payload = JSON.stringify(event);
    for (const ws of subs) {
        if (ws.readyState === WebSocket.OPEN) {
            ws.send(payload);
        }
    }
}

export function broadcastToUsers(
    userIds: Iterable<string>,
    event: { type: string; data: unknown }
) {
    const targetUserIds = new Set(userIds);
    if (targetUserIds.size === 0) return;

    const payload = JSON.stringify(event);
    for (const [ws, client] of clients) {
        if (targetUserIds.has(client.userId) && ws.readyState === WebSocket.OPEN) {
            ws.send(payload);
        }
    }
}

function subscribeToChannel(ws: WebSocket, channelId: string) {
    const client = clients.get(ws);
    if (!client) return;

    client.subscribedChannels.add(channelId);

    if (!channelSubscriptions.has(channelId)) {
        channelSubscriptions.set(channelId, new Set());
    }
    channelSubscriptions.get(channelId)!.add(ws);
}

function unsubscribeFromChannel(ws: WebSocket, channelId: string) {
    const client = clients.get(ws);
    if (!client) return;

    client.subscribedChannels.delete(channelId);

    const subs = channelSubscriptions.get(channelId);
    if (subs) {
        subs.delete(ws);
        if (subs.size === 0) {
            channelSubscriptions.delete(channelId);
        }
    }
}

function subscribeToDMConversation(ws: WebSocket, conversationId: string) {
    const client = clients.get(ws);
    if (!client) return;

    client.subscribedDMConversations.add(conversationId);

    if (!dmSubscriptions.has(conversationId)) {
        dmSubscriptions.set(conversationId, new Set());
    }
    dmSubscriptions.get(conversationId)!.add(ws);
}

function unsubscribeFromDMConversation(ws: WebSocket, conversationId: string) {
    const client = clients.get(ws);
    if (!client) return;

    client.subscribedDMConversations.delete(conversationId);

    const subs = dmSubscriptions.get(conversationId);
    if (subs) {
        subs.delete(ws);
        if (subs.size === 0) {
            dmSubscriptions.delete(conversationId);
        }
    }
}

function removeClient(ws: WebSocket) {
    const client = clients.get(ws);
    if (!client) return;

    // Auto-leave voice channel on disconnect
    const voiceChannelId = getUserVoiceChannel(client.userId);
    if (voiceChannelId) {
        removeVoiceParticipant(voiceChannelId, client.userId);
        broadcastToChannel(voiceChannelId, {
            type: "voice_participant_leave",
            data: { channelId: voiceChannelId, userId: client.userId },
        });
    }

    // Unsubscribe from all channels
    for (const channelId of client.subscribedChannels) {
        const subs = channelSubscriptions.get(channelId);
        if (subs) {
            subs.delete(ws);
            if (subs.size === 0) {
                channelSubscriptions.delete(channelId);
            }
        }
    }

    for (const conversationId of client.subscribedDMConversations) {
        const subs = dmSubscriptions.get(conversationId);
        if (subs) {
            subs.delete(ws);
            if (subs.size === 0) {
                dmSubscriptions.delete(conversationId);
            }
        }
    }

    clients.delete(ws);

    const remainingConnections = decrementUserConnections(client.userId);
    if (remainingConnections === 0) {
        void updateUserPresence(client.userId, "offline");
    }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function setupWebSocket(server: any) {
    const wss = new WebSocketServer({ server, path: "/ws" });

    const heartbeatInterval = setInterval(() => {
        for (const rawSocket of wss.clients) {
            const socket = rawSocket as HeartbeatWebSocket;
            if (socket.isAlive === false) {
                socket.terminate();
                continue;
            }

            socket.isAlive = false;
            socket.ping();
        }
    }, 30000);

    wss.on("close", () => {
        clearInterval(heartbeatInterval);
    });

    wss.on("connection", async (ws, req) => {
        const socket = ws as HeartbeatWebSocket;
        socket.isAlive = true;
        socket.on("pong", () => {
            socket.isAlive = true;
        });

        // Authenticate via query param: ?token=xxx
        const url = new URL(req.url || "", `http://${req.headers.host}`);
        const token = url.searchParams.get("token");

        if (!token) {
            ws.close(4001, "Authentication required");
            return;
        }

        try {
            const payload = await verifyToken(token);

            const client: WSClient = {
                ws,
                userId: payload.userId,
                username: payload.username,
                subscribedChannels: new Set(),
                subscribedDMConversations: new Set(),
            };

            clients.set(ws, client);
            const activeConnections = incrementUserConnections(payload.userId);
            if (activeConnections === 1) {
                void resolveConnectedPresence(payload.userId)
                    .then((status) => updateUserPresence(payload.userId, status))
                    .catch((error) => {
                        console.error(
                            `Failed to resolve connected presence for ${payload.userId}:`,
                            error
                        );
                        void updateUserPresence(payload.userId, "online");
                    });
            }

            ws.send(JSON.stringify({ type: "connected", data: { userId: payload.userId } }));

            ws.on("message", (raw) => {
                try {
                    const msg = JSON.parse(raw.toString());
                    handleClientMessage(ws, client, msg);
                } catch {
                    // Ignore malformed messages
                }
            });

            ws.on("close", () => {
                removeClient(ws);
            });

            ws.on("error", () => {
                removeClient(ws);
            });
        } catch {
            ws.close(4001, "Invalid token");
        }
    });

    console.log("  WebSocket server attached at /ws");

    return wss;
}

function handleClientMessage(
    ws: WebSocket,
    client: WSClient,
    msg: { type: string; channelId?: string; conversationId?: string }
) {
    switch (msg.type) {
        case "subscribe_channel":
            if (msg.channelId) {
                subscribeToChannel(ws, msg.channelId);
            }
            break;

        case "subscribe_dm":
            if (msg.conversationId) {
                subscribeToDMConversation(ws, msg.conversationId);
            }
            break;

        case "unsubscribe_dm":
            if (msg.conversationId) {
                unsubscribeFromDMConversation(ws, msg.conversationId);
            }
            break;

        case "unsubscribe_channel":
            if (msg.channelId) {
                unsubscribeFromChannel(ws, msg.channelId);
            }
            break;

        case "typing_start":
            if (msg.channelId) {
                broadcastToChannel(msg.channelId, {
                    type: "typing",
                    data: {
                        userId: client.userId,
                        username: client.username,
                        channelId: msg.channelId,
                        isTyping: true,
                    },
                });
            }
            break;

        case "typing_stop":
            if (msg.channelId) {
                broadcastToChannel(msg.channelId, {
                    type: "typing",
                    data: {
                        userId: client.userId,
                        username: client.username,
                        channelId: msg.channelId,
                        isTyping: false,
                    },
                });
            }
            break;

        case "ping":
            ws.send(JSON.stringify({ type: "pong" }));
            break;
    }
}

type HeartbeatWebSocket = WebSocket & { isAlive?: boolean };
