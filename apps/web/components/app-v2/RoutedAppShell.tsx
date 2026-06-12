"use client";

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAppStore } from "@/stores/app-store";
import { useAuthStore } from "@/stores/auth-store";
import { useChatStore } from "@/stores/chat-store";
import { fetchChannels, fetchMessages, fetchServers, fetchWorkspaceModules } from "@/lib/api";
import { AppShell } from "./AppShell";
import { useShellData } from "./useShellData";

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
  const setServers = useAppStore((s) => s.setServers);
  const setChannels = useAppStore((s) => s.setChannels);
  const setWorkspaceModules = useAppStore((s) => s.setWorkspaceModules);
  const channelsByServer = useAppStore((s) => s.channelsByServer);
  const setMessages = useChatStore((s) => s.setMessages);
  const messages = useChatStore((s) => s.messages);

  const spaceIdFromUrl = spaceFromUrl
    ? (data.spaces.find((s) => slugify(s.name) === spaceFromUrl || s.id === spaceFromUrl)?.id ??
      spaceFromUrl)
    : undefined;
  const activeSpaceId = spaceIdFromUrl ?? data.spaces[0]?.id;
  const channelIdFromUrl =
    channelFromUrl && activeSpaceId
      ? (channelsOf(activeSpaceId).find(
          (c) => slugify(c.name) === channelFromUrl || c.id === channelFromUrl
        )?.id ?? channelFromUrl)
      : channelFromUrl;
  const dmIdFromUrl = dmFromUrl
    ? (data.dmConversations?.find((c) => slugify(c.name) === dmFromUrl || c.id === dmFromUrl)?.id ??
      dmFromUrl)
    : undefined;

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
    fetchMessages(channelIdFromUrl)
      .then((r) => {
        if (!cancelled) setMessages(channelIdFromUrl, r.messages, r.nextCursor, r.hasMore);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, channelIdFromUrl, messages, setMessages]);

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
          router.push(space ? `${prefix}/${spaceSlug(space)}/${channelSlug(space, id)}` : prefix);
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
