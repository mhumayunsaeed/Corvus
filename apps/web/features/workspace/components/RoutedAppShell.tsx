"use client";

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAppStore } from "@/features/workspace/store/app-store";
import { useAuthStore } from "@/features/auth/store/auth-store";
import { useChatStore } from "@/features/workspace/store/chat-store";
import {
    fetchChannels,
    fetchDMConversations,
    fetchDMMessages,
    fetchMessages,
    fetchServers,
    fetchWorkspaceModules,
    fetchFriendDashboard,
    markChannelReadApi,
    markDMReadApi,
    type DMConversationData,
    type MessageData,
} from "@/shared/lib/api";
import {
    authorizeRealtimeClient,
    getSupabaseClient,
    isSupabaseConfigured,
    realtimeChannelOptions,
} from "@/shared/supabase/client";
import { notifyEvent } from "@/shared/lib/notify";
import { AppShell } from "./AppShell";
import { useShellData } from "./useShellData";
import { useToastStore } from "@/shared/stores/toast-store";
import type { RealtimeChannel } from "@supabase/supabase-js";

/** Readable URL segment from a display name — "voice-lounge", "design-crew". */
function slugify(name: string) {
    return name
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");
}

/**
 * URL-driven shell mounted at /spaces/[[...slug]]. The URL is the source of
 * truth for the active surface, using name slugs (raw ids also resolve):
 *   /spaces · /spaces/home          → Home
 *   /spaces/dm(/:conversation)      → Direct messages
 *   /spaces/:space(/:channel)       → Space / channel
 * The Corvus stores hold the data, lazily filled by the loaders below.
 * Falls back to sample data when logged out.
 */
export function RoutedAppShell({ isDemo = false }: { isDemo?: boolean }) {
    const params = useParams();
    const router = useRouter();

    const slug = (params?.slug as string[] | undefined) ?? [];
    const head = slug[0];
    const view: "home" | "dms" | "space" =
        !head || head === "home" ? "home" : head === "dm" ? "dms" : "space";
    const spaceFromUrl = view === "space" ? head : undefined;
    const channelFromUrl = view === "space" ? slug[1] : undefined;
    const dmFromUrl = view === "dms" ? slug[1] : undefined;

    const { data, live } = useShellData(isDemo);
    const prefix = isDemo ? "/spaces/demo" : "/spaces";

    // Slug ↔ id resolution. URLs carry slugified names; ids still work so old
    // links and entities without a loaded name don't break.
    const channelsOf = (spaceId: string) =>
        (data.sectionsBySpace[spaceId] ?? []).flatMap((s) => s.channels);

    const spaceSlug = (id: string) => {
        const name = data.spaces.find((s) => s.id === id)?.name;
        return (name && slugify(name)) || id;
    };
    const channelSlug = (spaceId: string, channelId: string) => {
        const name = channelsOf(spaceId).find((c) => c.id === channelId)?.name;
        return (name && slugify(name)) || channelId;
    };
    const dmSlug = (id: string) => {
        const name = data.dmConversations?.find((c) => c.id === id)?.name;
        return (name && slugify(name)) || id;
    };
    const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
    const user = useAuthStore((s) => s.user);
    const setServers = useAppStore((s) => s.setServers);
    const setChannels = useAppStore((s) => s.setChannels);
    const setDMConversations = useAppStore((s) => s.setDMConversations);
  const upsertDMConversation = useAppStore((s) => s.upsertDMConversation);
  const applyUserPresence = useAppStore((s) => s.applyUserPresence);
    const setWorkspaceModules = useAppStore((s) => s.setWorkspaceModules);
    const setFriends = useAppStore((s) => s.setFriends);
    const channelsByServer = useAppStore((s) => s.channelsByServer);
    const setMessages = useChatStore((s) => s.setMessages);
    const addMessage = useChatStore((s) => s.addMessage);
    const updateMessage = useChatStore((s) => s.updateMessage);
    const deleteMessage = useChatStore((s) => s.deleteMessage);
    const addReaction = useChatStore((s) => s.addReaction);
    const removeReaction = useChatStore((s) => s.removeReaction);
    const setLoading = useChatStore((s) => s.setLoading);
    const messages = useChatStore((s) => s.messages);

    const spaceIdFromUrl = spaceFromUrl
        ? (data.spaces.find((s) => slugify(s.name) === spaceFromUrl || s.id === spaceFromUrl)?.id ??
          spaceFromUrl)
        : undefined;
    const activeSpaceId = spaceIdFromUrl ?? data.spaces[0]?.id;
    const channelIdFromUrl =
        channelFromUrl && activeSpaceId
            ? (channelsOf(activeSpaceId).find(
                  (c) => slugify(c.name) === channelFromUrl || c.id === channelFromUrl,
              )?.id ?? channelFromUrl)
            : channelFromUrl;
    const dmIdFromUrl = dmFromUrl
        ? (data.dmConversations?.find((c) => slugify(c.name) === dmFromUrl || c.id === dmFromUrl)
              ?.id ?? dmFromUrl)
        : undefined;
    const activeChannelMessageCount = channelIdFromUrl
        ? messages[channelIdFromUrl]?.length
        : undefined;
    const activeDmMessageCount = dmIdFromUrl ? messages[dmIdFromUrl]?.length : undefined;
    const realtimeTargetKey = Array.from(
        new Set([
            ...Object.values(data.sectionsBySpace)
                .flatMap((section) => section)
                .flatMap((section) => section.channels)
                .map((channel) => `channel:${channel.id}`),
            ...(data.dmConversations ?? []).map((conversation) => `dm:${conversation.id}`),
        ]),
    )
        .sort()
        .join("|");

    // Load servers once when authenticated.
    useEffect(() => {
        if (!isAuthenticated) return;
        let cancelled = false;
        fetchServers()
            .then((r) => {
                if (!cancelled) setServers(r.servers);
            })
            .catch(() => {});
        return () => {
            cancelled = true;
        };
    }, [isAuthenticated, setServers]);

    // Load friends once when authenticated.
    useEffect(() => {
        if (!isAuthenticated) return;
        let cancelled = false;
        fetchFriendDashboard()
            .then((r) => {
                if (!cancelled) setFriends(r);
            })
            .catch(() => {});
        return () => {
            cancelled = true;
        };
    }, [isAuthenticated, setFriends]);

    useEffect(() => {
        if (!isAuthenticated) return;
        let cancelled = false;
        fetchDMConversations()
            .then((r) => {
                if (!cancelled) setDMConversations(r.conversations);
            })
            .catch(() => {});
        return () => {
            cancelled = true;
        };
    }, [isAuthenticated, setDMConversations]);

    useEffect(() => {
        if (!isAuthenticated || !user?.id || !isSupabaseConfigured()) return;

        const supabase = getSupabaseClient();
        let timeout: ReturnType<typeof setTimeout> | null = null;
        let cancelled = false;

        const refresh = () => {
            if (timeout) clearTimeout(timeout);
            timeout = setTimeout(() => {
                fetchFriendDashboard()
                    .then((r) => {
                        if (!cancelled) setFriends(r);
                    })
                    .catch(() => {});
            }, 150);
        };

        const channel = supabase
            .channel(`friend-dashboard:${user.id}`)
            .on(
                "postgres_changes",
                {
                    event: "*",
                    schema: "public",
                    table: "friend_requests",
                    filter: `sender_id=eq.${user.id}`,
                },
                refresh,
            )
            .on(
                "postgres_changes",
                {
                    event: "*",
                    schema: "public",
                    table: "friend_requests",
                    filter: `receiver_id=eq.${user.id}`,
                },
                refresh,
            )
            .on(
                "postgres_changes",
                { event: "*", schema: "public", table: "friends", filter: `user_id=eq.${user.id}` },
                refresh,
            )
            .on(
                "postgres_changes",
                {
                    event: "*",
                    schema: "public",
                    table: "friends",
                    filter: `friend_id=eq.${user.id}`,
                },
                refresh,
            )
            .subscribe();

        return () => {
            cancelled = true;
            if (timeout) clearTimeout(timeout);
            supabase.removeChannel(channel);
        };
    }, [isAuthenticated, setFriends, user?.id]);

    // Load the active space's channels when we don't have them cached.
    useEffect(() => {
        if (!isAuthenticated || !activeSpaceId) return;
        if (channelsByServer[activeSpaceId]?.length) return;
        let cancelled = false;
        fetchChannels(activeSpaceId)
            .then((r) => {
                if (!cancelled) setChannels(r.channels);
            })
            .catch(() => {});
        return () => {
            cancelled = true;
        };
    }, [isAuthenticated, activeSpaceId, channelsByServer, setChannels]);

    useEffect(() => {
        if (!isAuthenticated || !activeSpaceId) return;
        let cancelled = false;
        fetchWorkspaceModules(activeSpaceId)
            .then((modules) => {
                if (!cancelled) setWorkspaceModules(activeSpaceId, modules);
            })
            .catch(() => {});
        return () => {
            cancelled = true;
        };
    }, [isAuthenticated, activeSpaceId, setWorkspaceModules]);

    // Load the active channel's messages on first open.
    useEffect(() => {
        if (!isAuthenticated || !channelIdFromUrl) return;
        if (messages[channelIdFromUrl]) return;
        let cancelled = false;
        setLoading(channelIdFromUrl, true);
        fetchMessages(channelIdFromUrl)
            .then((r) => {
                if (!cancelled) setMessages(channelIdFromUrl, r.messages, r.nextCursor, r.hasMore);
            })
            .catch((error) =>
                useToastStore.getState().addToast({
                    title: "Messages failed to load",
                    body: error instanceof Error ? error.message : "Try opening the channel again.",
                    variant: "error",
                }),
            )
            .finally(() => setLoading(channelIdFromUrl, false));
        return () => {
            cancelled = true;
        };
    }, [isAuthenticated, channelIdFromUrl, messages, setMessages, setLoading]);

    useEffect(() => {
        if (!isAuthenticated || !dmIdFromUrl) return;
        if (messages[dmIdFromUrl]) return;
        let cancelled = false;
        setLoading(dmIdFromUrl, true);
        fetchDMMessages(dmIdFromUrl)
            .then((r) => {
                if (!cancelled)
                    setMessages(dmIdFromUrl, r.messages as never, r.nextCursor, r.hasMore);
            })
            .catch((error) =>
                useToastStore.getState().addToast({
                    title: "Messages failed to load",
                    body:
                        error instanceof Error
                            ? error.message
                            : "Try opening the conversation again.",
                    variant: "error",
                }),
            )
            .finally(() => setLoading(dmIdFromUrl, false));
        return () => {
            cancelled = true;
        };
    }, [isAuthenticated, dmIdFromUrl, messages, setMessages, setLoading]);

    // Keep one user subscription alive for notifications/calls, plus topic
    // subscriptions for every conversation currently known to this client. The
    // user topic covers messages from spaces that have not been opened yet.
    useEffect(() => {
        if (!isAuthenticated || !isSupabaseConfigured() || !user) return;

        const uniqueTargets = realtimeTargetKey
            ? realtimeTargetKey.split("|").map((topic) => {
                  const separator = topic.indexOf(":");
                  return {
                      kind: topic.slice(0, separator) as "channel" | "dm",
                      id: topic.slice(separator + 1),
                  };
              })
            : [];
        let cancelled = false;
        const subscriptions: RealtimeChannel[] = [];

        const applyEvent = (targetId: string, event: string, payload: unknown) => {
            const data = payload as Record<string, unknown>;
            if (event === "new_message") addMessage(targetId, data as unknown as MessageData);
            if (event === "new_dm_message") {
                const message = data.message as MessageData | undefined;
                const conversation = data.conversation as DMConversationData | null | undefined;
                if (message) addMessage(targetId, message);
                if (conversation) upsertDMConversation(conversation);
            }
            if (event === "message_update" || event === "dm_message_update") {
                const id = data.id as string | undefined;
                if (id) updateMessage(targetId, id, data as Partial<MessageData>);
            }
            if (event === "message_delete" || event === "dm_message_delete") {
                const id = data.id as string | undefined;
                if (id) deleteMessage(targetId, id);
            }
            if (event === "reaction_add" || event === "dm_reaction_add") {
                addReaction(
                    targetId,
                    data.messageId as string,
                    data.emoji as string,
                    data.userId as string,
                    user.id,
                );
            }
            if (event === "reaction_remove" || event === "dm_reaction_remove") {
                removeReaction(
                    targetId,
                    data.messageId as string,
                    data.emoji as string,
                    data.userId as string,
                    user.id,
                );
            }
        };

        void authorizeRealtimeClient()
            .then((supabase) => {
                if (cancelled) return;

                const userChannel = supabase
                    .channel(`user:${user.id}`, realtimeChannelOptions)
                    .on("broadcast", { event: "*" }, ({ event, payload }) => {
                        const data = payload as Record<string, unknown>;
                        if (event === "new_message") {
                            const message = data as unknown as MessageData;
                            if (message.channelId) {
                                applyEvent(message.channelId, event, payload);
                                if (
                                    message.author.id !== user.id &&
                                    message.channelId !== channelIdFromUrl
                                ) {
                                    notifyEvent({
                                        kind: "message",
                                        title:
                                            message.author.displayName || message.author.username,
                                        body: message.content,
                                    });
                                }
                            }
                            return;
                        }
                        if (event === "new_dm_message") {
                            const targetId = data.conversationId as string | undefined;
                            const message = data.message as MessageData | undefined;
                            if (targetId) applyEvent(targetId, event, payload);
                            if (
                                message &&
                                message.author.id !== user.id &&
                                targetId !== dmIdFromUrl
                            ) {
                                notifyEvent({
                                    kind: "message",
                                    title: message.author.displayName || message.author.username,
                                    body: message.content,
                                });
                            }
              return;
            }
            if (event === "presence_update") {
              const presenceUserId = data.userId as string | undefined;
              const status = data.status as string | undefined;
              if (presenceUserId && status) applyUserPresence(presenceUserId, status);
              return;
            }
            window.dispatchEvent(
                            new CustomEvent("corvus:realtime", { detail: { event, payload } }),
                        );
                    })
                    .subscribe();
                subscriptions.push(userChannel);

                for (const target of uniqueTargets) {
                    const channel = supabase
                        .channel(`${target.kind}:${target.id}`, realtimeChannelOptions)
                        .on("broadcast", { event: "*" }, ({ event, payload }) => {
                            applyEvent(target.id, event, payload);
                        })
                        .subscribe();
                    subscriptions.push(channel);
                }
            })
            .catch((error) => {
                useToastStore.getState().addToast({
                    title: "Realtime connection failed",
                    body:
                        error instanceof Error
                            ? error.message
                            : "Reconnect or refresh to try again.",
                    variant: "error",
                });
            });

        return () => {
            cancelled = true;
            const supabase = getSupabaseClient();
            for (const subscription of subscriptions) void supabase.removeChannel(subscription);
        };
    }, [
        isAuthenticated,
        user,
        realtimeTargetKey,
        channelIdFromUrl,
        dmIdFromUrl,
        addMessage,
        updateMessage,
        deleteMessage,
        addReaction,
        removeReaction,
    upsertDMConversation,
    applyUserPresence,
  ]);

    useEffect(() => {
        if (!isAuthenticated || !channelIdFromUrl) return;
        void markChannelReadApi(channelIdFromUrl).catch(() => {});
    }, [isAuthenticated, channelIdFromUrl, activeChannelMessageCount]);

    useEffect(() => {
        if (!isAuthenticated || !dmIdFromUrl) return;
        void markDMReadApi(dmIdFromUrl).catch(() => {});
    }, [isAuthenticated, dmIdFromUrl, activeDmMessageCount]);

    return (
        <AppShell
            data={data}
            demo={!live}
            control={{
                view,
                activeSpaceId,
                activeChannelId: channelIdFromUrl,
                activeDmId: dmIdFromUrl,
                onSelectSpace: (id) => router.push(`${prefix}/${spaceSlug(id)}`),
                onSelectChannel: (id, spaceId) => {
                    const space = spaceId ?? activeSpaceId;
                    router.push(
                        space ? `${prefix}/${spaceSlug(space)}/${channelSlug(space, id)}` : prefix,
                    );
                },
                onOpenHome: () => router.push(`${prefix}/home`),
                onOpenDMs: (id) => router.push(id ? `${prefix}/dm/${dmSlug(id)}` : `${prefix}/dm`),
                hrefs: {
                    home: `${prefix}/home`,
                    dms: `${prefix}/dm`,
                    space: (id) => `${prefix}/${spaceSlug(id)}`,
                    channel: (id) =>
                        activeSpaceId
                            ? `${prefix}/${spaceSlug(activeSpaceId)}/${channelSlug(activeSpaceId, id)}`
                            : prefix,
                    dm: (id) => `${prefix}/dm/${dmSlug(id)}`,
                },
            }}
        />
    );
}
