"use client";

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAppStore } from "@/stores/app-store";
import { useAuthStore } from "@/stores/auth-store";
import { useChatStore } from "@/stores/chat-store";
import { fetchChannels, fetchMessages, fetchServers } from "@/lib/api";
import { AppShell } from "./AppShell";
import { useShellData } from "./useShellData";

/**
 * URL-driven shell mounted at /spaces/[[...slug]]. The URL is the source of
 * truth for the active space/channel; the Corvus stores hold the data, lazily
 * filled by the loaders below. Falls back to sample data when logged out.
 */
export function RoutedAppShell() {
  const params = useParams();
  const router = useRouter();

  const slug = (params?.slug as string[] | undefined) ?? [];
  const spaceFromUrl = slug[0];
  const channelFromUrl = slug[1];

  const { data } = useShellData();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const setServers = useAppStore((s) => s.setServers);
  const setChannels = useAppStore((s) => s.setChannels);
  const channelsByServer = useAppStore((s) => s.channelsByServer);
  const setMessages = useChatStore((s) => s.setMessages);
  const messages = useChatStore((s) => s.messages);

  const activeSpaceId = spaceFromUrl ?? data.spaces[0]?.id;

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

  // Load the active channel's messages on first open.
  useEffect(() => {
    if (!isAuthenticated || !channelFromUrl) return;
    if (messages[channelFromUrl]) return;
    let cancelled = false;
    fetchMessages(channelFromUrl)
      .then((r) => {
        if (!cancelled) setMessages(channelFromUrl, r.messages, r.nextCursor, r.hasMore);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, channelFromUrl, messages, setMessages]);

  return (
    <AppShell
      data={data}
      control={{
        activeSpaceId,
        activeChannelId: channelFromUrl,
        onSelectSpace: (id) => router.push(`/spaces/${id}`),
        onSelectChannel: (id) =>
          router.push(activeSpaceId ? `/spaces/${activeSpaceId}/${id}` : `/spaces`),
      }}
    />
  );
}
