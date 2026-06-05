/**
 * Server → client realtime, via Supabase Realtime's HTTP Broadcast API.
 *
 * This replaces the old always-on `ws` server. Because it's a stateless HTTP
 * call (service-role authenticated), it works from serverless functions:
 * routes write to the DB and then push an event to a topic; clients subscribe
 * to the matching Supabase Realtime channel.
 *
 * Topics:
 *   channel:<channelId>      — server text/voice/stage channel events
 *   dm:<conversationId>      — DM conversation events
 *   user:<userId>            — per-user events (incoming call, friend events…)
 *
 * Events keep the legacy `{ type, data }` envelope: `event` = type, `payload` = data.
 */

export interface RealtimeEvent {
    type: string;
    data: unknown;
}

interface BroadcastMessage {
    topic: string;
    event: string;
    payload: unknown;
    private: boolean;
}

// Broadcast channel privacy. Public is functional out-of-the-box (topics use
// unguessable cuids). Set REALTIME_PRIVATE_CHANNELS=true once the Realtime
// Authorization RLS policies (see supabase/realtime-policies.sql) are applied.
const USE_PRIVATE_CHANNELS = process.env.REALTIME_PRIVATE_CHANNELS === "true";

function getConfig(): { url: string; serviceRoleKey: string } | null {
    const url = process.env.SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !serviceRoleKey) return null;
    return { url: url.replace(/\/+$/, ""), serviceRoleKey };
}

async function sendBroadcast(messages: BroadcastMessage[]): Promise<void> {
    const config = getConfig();
    if (!config) {
        // Realtime disabled (e.g. local dev without Supabase). No-op.
        return;
    }

    try {
        const res = await fetch(`${config.url}/realtime/v1/api/broadcast`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                apikey: config.serviceRoleKey,
                Authorization: `Bearer ${config.serviceRoleKey}`,
            },
            body: JSON.stringify({ messages }),
        });

        if (!res.ok) {
            const body = await res.text().catch(() => "");
            console.error(`Realtime broadcast failed (${res.status}): ${body}`);
        }
    } catch (error) {
        // Never let a realtime failure break the API response.
        console.error("Realtime broadcast error:", error);
    }
}

function toMessage(topic: string, event: RealtimeEvent): BroadcastMessage {
    return { topic, event: event.type, payload: event.data, private: USE_PRIVATE_CHANNELS };
}

export function broadcastToChannel(channelId: string, event: RealtimeEvent): void {
    void sendBroadcast([toMessage(`channel:${channelId}`, event)]);
}

export function broadcastToDMConversation(conversationId: string, event: RealtimeEvent): void {
    void sendBroadcast([toMessage(`dm:${conversationId}`, event)]);
}

export function broadcastToUsers(userIds: Iterable<string>, event: RealtimeEvent): void {
    const messages = Array.from(userIds, (userId) => toMessage(`user:${userId}`, event));
    if (messages.length > 0) {
        void sendBroadcast(messages);
    }
}
