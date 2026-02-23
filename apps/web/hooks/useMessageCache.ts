"use client";

import { useEffect, useRef } from "react";
import { useChatStore } from "@/stores/chat-store";
import { useDMStore } from "@/stores/dm-store";

const DB_NAME = "veyracache.db";

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

                // Add store subscriptions to react to new messages
                const unsubChat = useChatStore.subscribe((state, prevState) => {
                    // Quick diff for newly added messages (simplified approach for demonstration)
                    Object.entries(state.messages).forEach(([channelId, messages]) => {
                        const prevMessages = prevState.messages[channelId] || [];
                        if (messages.length > prevMessages.length) {
                            const diff = messages.filter(m => !prevMessages.some(pm => pm.id === m.id));
                            diff.forEach(async msg => {
                                try {
                                    await dbInstance.execute(
                                        "INSERT OR REPLACE INTO messages (id, channel_id, content, payload_json) VALUES ($1, $2, $3, $4)",
                                        [msg.id, channelId, msg.content, JSON.stringify(msg)]
                                    );
                                } catch (e) {
                                    console.error("Failed to insert message into SQLite", e);
                                }
                            });
                        }
                    });
                });

                const unsubDM = useDMStore.subscribe((state, prevState) => {
                    Object.entries(state.messages).forEach(([convId, messages]) => {
                        const prevMessages = prevState.messages[convId] || [];
                        if (messages.length > prevMessages.length) {
                            const diff = messages.filter(m => !prevMessages.some(pm => pm.id === m.id));
                            diff.forEach(async msg => {
                                try {
                                    await dbInstance.execute(
                                        "INSERT OR REPLACE INTO dm_messages (id, conversation_id, content, payload_json) VALUES ($1, $2, $3, $4)",
                                        [msg.id, convId, msg.content, JSON.stringify(msg)]
                                    );
                                } catch (e) {
                                    console.error("Failed to insert DM message into SQLite", e);
                                }
                            });
                        }
                    });
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
