import type { RealtimeChannel } from "@supabase/supabase-js";
import { getSupabaseClient, isSupabaseConfigured } from "./client";

/**
 * Client-side Supabase Realtime manager — the transport that replaced the old
 * custom WebSocket.
 *
 * - Server-pushed events arrive as Broadcast messages on per-topic channels
 *   (`channel:<id>`, `dm:<id>`, `user:<id>`) and are re-emitted to a single
 *   handler using the legacy `{ type, data }` envelope.
 * - Online presence is tracked via Supabase Presence on a shared `presence`
 *   channel (replacing server-side connection counting).
 * - Typing is sent as a client Broadcast on the relevant channel topic.
 */

// Realtime payloads are dynamic; the consuming switch narrows them.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type RealtimeMessage = { type: string; data: any };
export type RealtimeHandler = (msg: RealtimeMessage) => void;

type PresenceStatus = "online" | "idle" | "dnd" | "invisible" | "offline";

const PRESENCE_TOPIC = "presence";

let handler: RealtimeHandler | null = null;
const topicChannels = new Map<string, RealtimeChannel>();
let presenceChannel: RealtimeChannel | null = null;
let selfUserId: string | null = null;
let selfStatus: PresenceStatus = "online";

export function setRealtimeHandler(next: RealtimeHandler | null): void {
    handler = next;
}

function dispatch(type: string, data: unknown): void {
    handler?.({ type, data });
}

function subscribeTopic(topic: string): void {
    if (!isSupabaseConfigured() || topicChannels.has(topic)) return;

    const channel = getSupabaseClient()
        .channel(topic)
        .on("broadcast", { event: "*" }, (message) => {
            // message = { event, payload, type: "broadcast" }
            const event = (message as { event?: string }).event;
            const payload = (message as { payload?: unknown }).payload;
            if (event) dispatch(event, payload);
        });

    channel.subscribe();
    topicChannels.set(topic, channel);
}

function unsubscribeTopic(topic: string): void {
    const channel = topicChannels.get(topic);
    if (channel) {
        getSupabaseClient().removeChannel(channel);
        topicChannels.delete(topic);
    }
}

// ─── Channel / DM / user subscriptions ───────────────────────────

export function subscribeChannel(channelId: string): void {
    subscribeTopic(`channel:${channelId}`);
}
export function unsubscribeChannel(channelId: string): void {
    unsubscribeTopic(`channel:${channelId}`);
}
export function subscribeDM(conversationId: string): void {
    subscribeTopic(`dm:${conversationId}`);
}
export function unsubscribeDM(conversationId: string): void {
    unsubscribeTopic(`dm:${conversationId}`);
}
export function subscribeUser(userId: string): void {
    subscribeTopic(`user:${userId}`);
}

// ─── Typing (client → broadcast) ─────────────────────────────────

function sendTyping(topic: string, event: string, payload: Record<string, unknown>): void {
    const channel = topicChannels.get(topic);
    if (channel) {
        void channel.send({ type: "broadcast", event, payload });
    }
}

export function sendChannelTyping(
    channelId: string,
    userId: string,
    username: string,
    isTyping: boolean
): void {
    sendTyping(`channel:${channelId}`, "typing", { userId, username, channelId, isTyping });
}

export function sendDMTyping(
    conversationId: string,
    userId: string,
    username: string,
    isTyping: boolean
): void {
    sendTyping(`dm:${conversationId}`, "dm_typing", {
        userId,
        username,
        conversationId,
        isTyping,
    });
}

// ─── Presence ────────────────────────────────────────────────────

function emitPresenceFromState(): void {
    if (!presenceChannel) return;
    const state = presenceChannel.presenceState<{ userId: string; status: PresenceStatus }>();
    for (const entries of Object.values(state)) {
        const entry = entries[0];
        if (entry?.userId) {
            // "invisible" users appear offline to everyone else.
            const visible = entry.status === "invisible" ? "offline" : entry.status;
            dispatch("presence_update", { userId: entry.userId, status: visible });
        }
    }
}

export function initPresence(userId: string, status: PresenceStatus): void {
    if (!isSupabaseConfigured()) return;

    selfUserId = userId;
    selfStatus = status;

    if (presenceChannel) return;

    const channel = getSupabaseClient().channel(PRESENCE_TOPIC, {
        config: { presence: { key: userId } },
    });

    channel
        .on("presence", { event: "sync" }, () => emitPresenceFromState())
        .on("presence", { event: "join" }, () => emitPresenceFromState())
        .on("presence", { event: "leave" }, ({ leftPresences }) => {
            for (const p of leftPresences as Array<{ userId?: string }>) {
                if (p.userId) dispatch("presence_update", { userId: p.userId, status: "offline" });
            }
        })
        .subscribe((s) => {
            if (s === "SUBSCRIBED") {
                void channel.track({ userId: selfUserId, status: selfStatus });
            }
        });

    presenceChannel = channel;
}

export function updateSelfPresence(status: PresenceStatus): void {
    selfStatus = status;
    if (presenceChannel && selfUserId) {
        void presenceChannel.track({ userId: selfUserId, status });
    }
}

// ─── Teardown ────────────────────────────────────────────────────

export function teardownRealtime(): void {
    if (!isSupabaseConfigured()) {
        topicChannels.clear();
        presenceChannel = null;
        selfUserId = null;
        return;
    }

    const supabase = getSupabaseClient();
    for (const channel of topicChannels.values()) {
        supabase.removeChannel(channel);
    }
    topicChannels.clear();

    if (presenceChannel) {
        supabase.removeChannel(presenceChannel);
        presenceChannel = null;
    }
    selfUserId = null;
}
