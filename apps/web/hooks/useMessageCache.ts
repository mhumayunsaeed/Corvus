"use client";

import { useEffect, useRef } from "react";
import { useChatStore } from "@/stores/chat-store";
import { useDMStore } from "@/stores/dm-store";
import type { MessageData, DMMessageData } from "@/lib/api";

const DB_NAME = "corvuscache.db";

type MessageMap<T extends { id: string }> = Record<string, T[]>;

function getChangedKeys<T extends { id: string }>(
    next: MessageMap<T>,
    prev: MessageMap<T>
): string[] {
    const keys = new Set([...Object.keys(next), ...Object.keys(prev)]);
    const changed: string[] = [];

    for (const key of keys) {
        if ((next[key] || []) !== (prev[key] || [])) {
            changed.push(key);
        }
    }

    return changed;
}

function getAddedMessages<T extends { id: string }>(
    next: T[],
    prev: T[]
): T[] {
    if (next.length === 0) return [];
    if (prev.length === 0) return next;
    if (next.length <= prev.length) return [];

    const prevIds = new Set(prev.map((msg) => msg.id));
    const added: T[] = [];
    for (const msg of next) {
        if (!prevIds.has(msg.id)) {
            added.push(msg);
        }
    }
    return added;
}

export function useMessageCache() {
    const initialized = useRef(false);
    const isPermissionError = (err: unknown) => {
        const text = err instanceof Error ? err.message : String(err);
        return (
            text.includes("not allowed") ||
            text.includes("sql.execute not allowed") ||
            text.includes("Permissions associated with this command")
        );
    };

    // We subscribe to the zustand stores and save newly added messages to the DB
    useEffect(() => {
        if (typeof window === "undefined" || !("__TAURI_INTERNALS__" in window)) {
            return;
        }

        let dbInstance: any = null;
        let writeQueue = Promise.resolve();

        const setupSqlite = async () => {
            if (initialized.current) return;

            try {
                const Database = (await import("@tauri-apps/plugin-sql")).default;
                dbInstance = await Database.load(`sqlite:${DB_NAME}`);

                // Ensure tables exist
                await dbInstance.execute(
                    `CREATE TABLE IF NOT EXISTS messages (
                        id TEXT PRIMARY KEY,
                        channel_id TEXT NOT NULL,
                        content TEXT NOT NULL,
                        payload_json TEXT NOT NULL,
                        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
                    )`
                );

                await dbInstance.execute(
                    `CREATE TABLE IF NOT EXISTS dm_messages (
                        id TEXT PRIMARY KEY,
                        conversation_id TEXT NOT NULL,
                        content TEXT NOT NULL,
                        payload_json TEXT NOT NULL,
                        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
                    )`
                );

                const queueWrite = (query: string, values: unknown[]) => {
                    writeQueue = writeQueue
                        .then(() => dbInstance.execute(query, values))
                        .catch((err: unknown) => {
                            console.error("Failed to persist message cache write", err);
                        });
                };

                const persistAddedChatMessages = (
                    channelId: string,
                    messages: MessageData[]
                ) => {
                    for (const msg of messages) {
                        queueWrite(
                            "INSERT OR REPLACE INTO messages (id, channel_id, content, payload_json) VALUES ($1, $2, $3, $4)",
                            [msg.id, channelId, msg.content, JSON.stringify(msg)]
                        );
                    }
                };

                const persistAddedDMMessages = (
                    conversationId: string,
                    messages: DMMessageData[]
                ) => {
                    for (const msg of messages) {
                        queueWrite(
                            "INSERT OR REPLACE INTO dm_messages (id, conversation_id, content, payload_json) VALUES ($1, $2, $3, $4)",
                            [msg.id, conversationId, msg.content, JSON.stringify(msg)]
                        );
                    }
                };

                // Add store subscriptions to react only to new message entries.
                const unsubChat = useChatStore.subscribe((state, prevState) => {
                    if (state.messages === prevState.messages) return;

                    for (const channelId of getChangedKeys(state.messages, prevState.messages)) {
                        const nextMessages = state.messages[channelId] || [];
                        const prevMessages = prevState.messages[channelId] || [];
                        persistAddedChatMessages(
                            channelId,
                            getAddedMessages(nextMessages, prevMessages)
                        );
                    }
                });

                const unsubDM = useDMStore.subscribe((state, prevState) => {
                    if (state.messages === prevState.messages) return;

                    for (const conversationId of getChangedKeys(
                        state.messages,
                        prevState.messages
                    )) {
                        const nextMessages = state.messages[conversationId] || [];
                        const prevMessages = prevState.messages[conversationId] || [];
                        persistAddedDMMessages(
                            conversationId,
                            getAddedMessages(nextMessages, prevMessages)
                        );
                    }
                });

                // Ideally we'd also provide functions to LOAD messages from DB on initial mount
                // but for this phase we focus on the caching architecture.
                initialized.current = true;
                return () => {
                    unsubChat();
                    unsubDM();
                };
            } catch (err) {
                initialized.current = true;
                if (!isPermissionError(err)) {
                    console.error("Failed to initialize SQLite cache", err);
                }
            }
        };

        const cleanupPromise = setupSqlite();

        return () => {
            cleanupPromise.then(cleanup => cleanup && cleanup());
        };
    }, []);
}
