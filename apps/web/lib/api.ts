import { ensureApiUrl } from "@/lib/endpoints";
import type { SharedAttachment } from "@/lib/attachments";

function getToken(): string | null {
    if (typeof window === "undefined") return null;
    try {
        const stored = localStorage.getItem("corvus-auth");
        if (!stored) return null;
        const parsed = JSON.parse(stored);
        return parsed?.state?.token || null;
    } catch {
        return null;
    }
}

export interface CustomRequestInit extends RequestInit {
    timeoutMs?: number;
    maxRetries?: number;
}

export async function api<T>(
    path: string,
    options: CustomRequestInit = {}
): Promise<T> {
    const baseUrl = ensureApiUrl();
    const token = getToken();
    const headers: Record<string, string> = {
        "Content-Type": "application/json",
        ...(options.headers as Record<string, string> || {}),
    };

    if (token) {
        headers.Authorization = `Bearer ${token}`;
    }

    let res!: Response;
    const maxRetries = options.maxRetries !== undefined ? options.maxRetries : 2;
    const timeoutMs = options.timeoutMs !== undefined ? options.timeoutMs : 15000;
    const outerSignal = options.signal;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

        if (outerSignal) {
            if (outerSignal.aborted) {
                controller.abort();
            } else {
                outerSignal.addEventListener("abort", () => controller.abort());
            }
        }

        try {
            res = await fetch(`${baseUrl}${path}`, {
                ...options,
                headers,
                signal: controller.signal,
            });
            clearTimeout(timeoutId);
            break;
        } catch (err) {
            clearTimeout(timeoutId);

            if (attempt < maxRetries) {
                await new Promise((r) => setTimeout(r, 750 * (attempt + 1)));
                continue;
            }

            if (err instanceof Error && err.name === "AbortError") {
                throw new Error(
                    `Request to ${baseUrl}${path} timed out. ` +
                    "Please check your connection and try again."
                );
            }

            throw new Error(
                `Failed to reach API at ${baseUrl}. ` +
                "The server may be waking up — please try again in a moment."
            );
        }
    }

    const contentType = res.headers.get("content-type") || "";
    let data: unknown = null;

    if (contentType.includes("application/json")) {
        try {
            data = await res.json();
        } catch {
            data = null;
        }
    } else {
        const text = await res.text();
        data = text ? { error: text } : null;
    }

    if (!res.ok) {
        const errObj = data as { error?: string; message?: string; details?: string } | null;
        const baseMessage =
            errObj?.error ||
            errObj?.message ||
            `Request failed (${res.status})`;

        throw new Error(
            errObj?.details ? `${baseMessage}: ${errObj.details}` : baseMessage
        );
    }

    return (data ?? ({} as T)) as T;
}

// ─── Server Types ───────────────────────────────────────────────

export interface ServerData {
    id: string;
    name: string;
    iconUrl: string | null;
    description: string | null;
    ownerId: string;
    memberCount: number;
    role: string;
}

export interface ChannelData {
    id: string;
    serverId: string;
    name: string;
    type: string;
    category: string;
    topic: string | null;
    position: number;
    createdAt: string;
}

export interface MessageAuthor {
    id: string;
    displayName: string;
    username: string;
    avatarUrl: string | null;
    status: string;
}

export interface MessageReaction {
    emoji: string;
    count: number;
    reacted: boolean;
}

export interface MessageReplyTo {
    id: string;
    content: string;
    author: {
        id: string;
        displayName: string;
        username: string;
    };
}

export interface MessageEmbedData {
    id: string;
    url: string;
    siteName: string | null;
    title: string | null;
    description: string | null;
    imageUrl: string | null;
    faviconUrl: string | null;
}

export interface UnfurledEmbedData {
    url: string;
    siteName: string | null;
    title: string | null;
    description: string | null;
    imageUrl: string | null;
    faviconUrl: string | null;
}

export interface MessageData {
    id: string;
    channelId: string;
    content: string;
    type: string;
    editedAt: string | null;
    createdAt: string;
    author: MessageAuthor;
    replyTo: MessageReplyTo | null;
    reactions: MessageReaction[];
    embeds: MessageEmbedData[];
}

export interface MemberData {
    id: string;
    userId: string;
    role: string;
    nickname: string | null;
    joinedAt: string;
    user: {
        id: string;
        displayName: string;
        username: string;
        avatarUrl: string | null;
        status: string;
        bio: string | null;
    };
}

export interface InviteData {
    id: string;
    serverId: string;
    creatorId: string;
    code: string;
    maxUses: number | null;
    uses: number;
    expiresAt: string | null;
    createdAt: string;
}

export type FriendRelationStatus =
    | "none"
    | "friends"
    | "incoming_request"
    | "outgoing_request"
    | "blocked_by_you"
    | "blocked_you";

export interface FriendUserData {
    id: string;
    email: string;
    username: string;
    displayName: string;
    avatarUrl: string | null;
    status: string;
    bio: string | null;
}

export interface FriendListEntry {
    user: FriendUserData;
    createdAt: string;
}

export interface FriendRequestEntry {
    id: string;
    user: FriendUserData;
    createdAt: string;
}

export interface FriendDashboardData {
    friends: FriendListEntry[];
    pendingIncoming: FriendRequestEntry[];
    pendingOutgoing: FriendRequestEntry[];
    blocked: FriendListEntry[];
}

export interface FriendSearchResult extends FriendUserData {
    relationStatus: FriendRelationStatus;
    pendingRequestId: string | null;
}

export interface DMParticipantData {
    id: string;
    displayName: string;
    username: string;
    avatarUrl: string | null;
    status: string;
}

export interface DMMessageReaction {
    emoji: string;
    count: number;
    reacted: boolean;
}

export interface DMMessageData {
    id: string;
    conversationId: string;
    content: string;
    type?: string;
    metadata?: string | null;
    reactions: DMMessageReaction[];
    createdAt: string;
    editedAt: string | null;
    author: DMParticipantData;
    replyTo?: {
        id: string;
        content: string;
        author: DMParticipantData;
    } | null;
}

export interface PinnedDMMessageData {
    id: string;
    pinnedAt: string;
    pinnedBy: DMParticipantData;
    message: DMMessageData;
}

export interface DMConversationData {
    id: string;
    type: "direct" | "group";
    name: string | null;
    createdAt: string;
    updatedAt: string;
    participants: DMParticipantData[];
    lastMessage: {
        id: string;
        content: string;
        type?: string;
        metadata?: string | null;
        createdAt: string;
        author: DMParticipantData;
    } | null;
}

export interface UploadAttachmentResponse {
    attachment: SharedAttachment;
    maxSizeBytes: number;
}

export interface WorkspaceModulesData {
    boardsByChannel: Record<string, unknown>;
    docsByChannel: Record<string, unknown>;
    incidentsByChannel: Record<string, unknown>;
    canvasByChannel: Record<string, unknown>;
    prsByChannel: Record<string, unknown>;
    githubConfigByChannel: Record<string, unknown>;
}

// ─── Server API ─────────────────────────────────────────────────

export function fetchServers() {
    return api<{ servers: ServerData[] }>("/servers");
}

export function createServer(data: {
    name: string;
    iconUrl?: string;
    description?: string;
    channels?: { name: string; type: string; category: string }[];
}) {
    return api<{ server: ServerData & { channels: ChannelData[] } }>("/servers", {
        method: "POST",
        body: JSON.stringify(data),
    });
}

export function fetchServer(id: string) {
    return api<{ server: ServerData & { channels: ChannelData[] }; unreadCounts?: Record<string, number> }>(`/servers/${id}`);
}

export function updateServer(id: string, data: { name?: string; iconUrl?: string | null; description?: string | null }) {
    return api<{ server: ServerData }>(`/servers/${id}`, {
        method: "PATCH",
        body: JSON.stringify(data),
    });
}

export function deleteServer(id: string) {
    return api<{ message: string }>(`/servers/${id}`, { method: "DELETE" });
}

// ─── Channel API ────────────────────────────────────────────────

export function fetchChannels(serverId: string) {
    return api<{ channels: ChannelData[] }>(`/servers/${serverId}/channels`);
}

export function createChannel(serverId: string, data: { name: string; type?: string; category?: string; topic?: string }) {
    return api<{ channel: ChannelData }>(`/servers/${serverId}/channels`, {
        method: "POST",
        body: JSON.stringify(data),
    });
}

export function updateChannel(id: string, data: { name?: string; topic?: string | null; category?: string; position?: number }) {
    return api<{ channel: ChannelData }>(`/channels/${id}`, {
        method: "PATCH",
        body: JSON.stringify(data),
    });
}

export function deleteChannel(id: string) {
    return api<{ message: string }>(`/channels/${id}`, { method: "DELETE" });
}

export function fetchWorkspaceModules(serverId: string) {
    return api<WorkspaceModulesData>(`/servers/${serverId}/modules`);
}

export function saveBoardState(channelId: string, board: unknown) {
    return api<{ board: unknown }>(`/channels/${channelId}/board`, {
        method: "PUT",
        body: JSON.stringify({ board }),
    });
}

export function saveDocsState(channelId: string, docs: unknown) {
    return api<{ docs: unknown }>(`/channels/${channelId}/docs`, {
        method: "PUT",
        body: JSON.stringify({ docs }),
    });
}

export function saveIncidentState(channelId: string, incident: unknown) {
    return api<{ incident: unknown }>(`/channels/${channelId}/incident`, {
        method: "PUT",
        body: JSON.stringify({ incident }),
    });
}

export function saveCanvasState(channelId: string, data: unknown) {
    return api<{ data: unknown }>(`/channels/${channelId}/canvas`, {
        method: "PUT",
        body: JSON.stringify({ data }),
    });
}

export function saveGitHubState(channelId: string, data: { config?: unknown; pullRequests?: unknown }) {
    return api<{ config: unknown; pullRequests: unknown }>(`/channels/${channelId}/github`, {
        method: "PUT",
        body: JSON.stringify(data),
    });
}

export function fetchUserSettings() {
    return api<{ settings: Record<string, unknown> }>("/users/me/settings");
}

export function saveUserSettings(settings: Record<string, unknown>) {
    return api<{ settings: Record<string, unknown> }>("/users/me/settings", {
        method: "PUT",
        body: JSON.stringify({ settings }),
    });
}

export function fetchServerSettings(serverId: string) {
    return api<{ settings: Record<string, unknown> }>(`/servers/${serverId}/settings`);
}

export function saveServerSettings(serverId: string, settings: Record<string, unknown>) {
    return api<{ settings: Record<string, unknown> }>(`/servers/${serverId}/settings`, {
        method: "PUT",
        body: JSON.stringify({ settings }),
    });
}

// ─── Message API ────────────────────────────────────────────────

export function fetchMessages(channelId: string, cursor?: string) {
    const params = cursor ? `?cursor=${cursor}&limit=50` : "?limit=50";
    return api<{ messages: MessageData[]; nextCursor: string | null; hasMore: boolean }>(
        `/channels/${channelId}/messages${params}`
    );
}

export function sendMessage(channelId: string, data: { content: string; replyToId?: string }) {
    return api<{ message: MessageData }>(`/channels/${channelId}/messages`, {
        method: "POST",
        body: JSON.stringify(data),
    });
}

export interface ChannelSearchResult {
    id: string;
    channelId: string;
    content: string;
    createdAt: string;
    author: MessageAuthor;
}

export function searchChannelMessages(channelId: string, query: string) {
    return api<{ results: ChannelSearchResult[] }>(
        `/channels/${channelId}/messages/search?q=${encodeURIComponent(query)}`
    );
}

export interface ChannelPinnedMessage {
    id: string;
    pinnedAt: string;
    pinnedBy: MessageAuthor;
    message: {
        id: string;
        channelId: string;
        content: string;
        type: string;
        createdAt: string;
        editedAt: string | null;
        author: MessageAuthor;
    };
}

export function fetchChannelPins(channelId: string) {
    return api<{ pins: ChannelPinnedMessage[] }>(`/channels/${channelId}/pins`);
}

export function pinChannelMessage(channelId: string, messageId: string) {
    return api<{ message: string }>(
        `/channels/${channelId}/messages/${messageId}/pin`,
        { method: "POST" }
    );
}

export function unpinChannelMessage(channelId: string, messageId: string) {
    return api<{ message: string }>(
        `/channels/${channelId}/messages/${messageId}/pin`,
        { method: "DELETE" }
    );
}

export function editMessage(id: string, content: string) {
    return api<{ message: MessageData }>(`/messages/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ content }),
    });
}

export function deleteMessageApi(id: string) {
    return api<{ message: string }>(`/messages/${id}`, { method: "DELETE" });
}

export function fetchLinkPreview(url: string) {
    return api<{ embed: UnfurledEmbedData | null }>(
        `/unfurl?url=${encodeURIComponent(url)}`
    );
}

// ─── Reaction API ───────────────────────────────────────────────

export function addReaction(messageId: string, emoji: string) {
    return api<{ message: string }>(`/messages/${messageId}/reactions`, {
        method: "POST",
        body: JSON.stringify({ emoji }),
    });
}

export function removeReaction(messageId: string, emoji: string) {
    return api<{ message: string }>(`/messages/${messageId}/reactions/${encodeURIComponent(emoji)}`, {
        method: "DELETE",
    });
}

// ─── Invite API ─────────────────────────────────────────────────

export function createInvite(serverId: string, data?: { maxUses?: number; expiresInHours?: number }) {
    return api<{ invite: InviteData }>(`/servers/${serverId}/invites`, {
        method: "POST",
        body: JSON.stringify(data || {}),
    });
}

export function fetchInvites(serverId: string) {
    return api<{ invites: InviteData[] }>(`/servers/${serverId}/invites`);
}

export function revokeInvite(id: string) {
    return api<{ message: string }>(`/invites/${id}`, { method: "DELETE" });
}

export function joinInvite(code: string) {
    return api<{ message: string; server: { id: string; name: string; iconUrl: string | null } }>(
        `/invites/${code}/join`,
        { method: "POST" }
    );
}

// ─── Member API ─────────────────────────────────────────────────

export function fetchMembers(serverId: string) {
    return api<{ members: MemberData[] }>(`/servers/${serverId}/members`);
}

export function updateMemberRole(serverId: string, userId: string, role: string) {
    return api<{ member: unknown }>(`/servers/${serverId}/members/${userId}`, {
        method: "PATCH",
        body: JSON.stringify({ role }),
    });
}

export function kickMember(serverId: string, userId: string) {
    return api<{ message: string }>(`/servers/${serverId}/members/${userId}`, {
        method: "DELETE",
    });
}

export function leaveServer(serverId: string, userId: string) {
    return api<{ message: string }>(`/servers/${serverId}/members/${userId}`, {
        method: "DELETE",
    });
}

// ─── Read State API ───────────────────────────────────────────────────────────

export function markChannelReadApi(channelId: string) {
    return api<{ success: boolean }>(`/channels/${channelId}/read`, {
        method: "POST",
    });
}

export function markDMReadApi(conversationId: string) {
    return api<{ success: boolean }>(`/dms/${conversationId}/read`, {
        method: "POST",
    });
}

// ─── Friend API ───────────────────────────────────────────────────────────────

export function fetchFriendDashboard() {
    return api<FriendDashboardData>("/friends");
}

export function searchFriendUsers(query: string) {
    return api<{ users: FriendSearchResult[] }>(
        `/friends/search?query=${encodeURIComponent(query)}`
    );
}

export function sendFriendRequest(target: string) {
    return api<{
        message: string;
        status: "pending" | "accepted";
        user: FriendUserData;
        request?: { id: string; createdAt: string };
    }>("/friends/requests", {
        method: "POST",
        body: JSON.stringify({ target }),
    });
}

export function acceptFriendRequest(requestId: string) {
    return api<{ message: string; user: FriendUserData }>(
        `/friends/requests/${requestId}/accept`,
        {
            method: "POST",
        }
    );
}

export function declineFriendRequest(requestId: string) {
    return api<{ message: string }>(`/friends/requests/${requestId}/decline`, {
        method: "POST",
    });
}

export function cancelFriendRequest(requestId: string) {
    return api<{ message: string }>(`/friends/requests/${requestId}`, {
        method: "DELETE",
    });
}

export function removeFriend(friendUserId: string) {
    return api<{ message: string }>(`/friends/${friendUserId}`, {
        method: "DELETE",
    });
}

export function blockUser(userId: string) {
    return api<{ message: string; user: FriendUserData }>("/friends/block", {
        method: "POST",
        body: JSON.stringify({ userId }),
    });
}

export function unblockUser(userId: string) {
    return api<{ message: string }>(`/friends/block/${userId}`, {
        method: "DELETE",
    });
}

// ─── DM API ───────────────────────────────────────────────────────────────────

export function fetchDMConversations() {
    return api<{ conversations: DMConversationData[]; dmUnreadCounts?: Record<string, number> }>("/dms");
}

export function createDMConversation(data: { participantIds: string[]; name?: string }) {
    return api<{ conversation: DMConversationData; created: boolean }>("/dms", {
        method: "POST",
        body: JSON.stringify(data),
    });
}

export function fetchDMMessages(conversationId: string, cursor?: string) {
    const params = cursor ? `?cursor=${cursor}&limit=50` : "?limit=50";
    return api<{ messages: DMMessageData[]; nextCursor: string | null; hasMore: boolean }>(
        `/dms/${conversationId}/messages${params}`
    );
}

export function sendDMMessage(conversationId: string, content: string, replyToId?: string) {
    return api<{ message: DMMessageData }>(`/dms/${conversationId}/messages`, {
        method: "POST",
        body: JSON.stringify({ content, replyToId }),
    });
}

export interface DMSearchResult {
    id: string;
    conversationId: string;
    content: string;
    createdAt: string;
    author: DMParticipantData;
}

export function searchDMMessages(conversationId: string, query: string) {
    return api<{ results: DMSearchResult[] }>(
        `/dms/${conversationId}/messages/search?q=${encodeURIComponent(query)}`
    );
}

export function fetchDMPins(conversationId: string) {
    return api<{ pins: PinnedDMMessageData[] }>(`/dms/${conversationId}/pins`);
}

export function pinDMMessage(conversationId: string, messageId: string) {
    return api<{ message: string }>(`/dms/${conversationId}/messages/${messageId}/pin`, {
        method: "POST",
    });
}

export function unpinDMMessage(conversationId: string, messageId: string) {
    return api<{ message: string }>(`/dms/${conversationId}/messages/${messageId}/pin`, {
        method: "DELETE",
    });
}

export async function uploadAttachment(file: File) {
    const baseUrl = ensureApiUrl();
    const token = getToken();
    const formData = new FormData();
    formData.append("file", file);

    const headers: Record<string, string> = {};
    if (token) {
        headers.Authorization = `Bearer ${token}`;
    }

    const res = await fetch(`${baseUrl}/attachments`, {
        method: "POST",
        headers,
        body: formData,
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
        const errObj = data as { error?: string; message?: string; details?: string };
        const baseMessage =
            errObj?.error ||
            errObj?.message ||
            `Request failed (${res.status})`;
        throw new Error(errObj?.details ? `${baseMessage}: ${errObj.details}` : baseMessage);
    }

    return data as UploadAttachmentResponse;
}

/**
 * Upload an image (avatar or server icon) to Supabase Storage via the API and
 * return its public URL.
 */
export async function uploadImage(file: File | Blob, target: "avatar" | "icon"): Promise<string> {
    const baseUrl = ensureApiUrl();
    const token = getToken();
    const formData = new FormData();
    formData.append("file", file, file instanceof File ? file.name : "image.webp");

    const headers: Record<string, string> = {};
    if (token) {
        headers.Authorization = `Bearer ${token}`;
    }

    const endpoint = target === "avatar" ? "/uploads/avatar" : "/uploads/icon";
    const res = await fetch(`${baseUrl}${endpoint}`, {
        method: "POST",
        headers,
        body: formData,
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
        const errObj = data as { error?: string; message?: string; details?: string };
        const baseMessage = errObj?.error || errObj?.message || `Request failed (${res.status})`;
        throw new Error(errObj?.details ? `${baseMessage}: ${errObj.details}` : baseMessage);
    }

    return (data as { url: string }).url;
}

export function editDMMessage(conversationId: string, messageId: string, content: string) {
    return api<{ message: DMMessageData }>(`/dms/${conversationId}/messages/${messageId}`, {
        method: "PATCH",
        body: JSON.stringify({ content }),
    });
}

export function deleteDMMessage(conversationId: string, messageId: string) {
    return api<{ message: string }>(`/dms/${conversationId}/messages/${messageId}`, {
        method: "DELETE",
    });
}

export function addDMReaction(conversationId: string, messageId: string, emoji: string) {
    return api<{ message: string }>(
        `/dms/${conversationId}/messages/${messageId}/reactions`,
        {
            method: "POST",
            body: JSON.stringify({ emoji }),
        }
    );
}

export function removeDMReaction(conversationId: string, messageId: string, emoji: string) {
    return api<{ message: string }>(
        `/dms/${conversationId}/messages/${messageId}/reactions/${encodeURIComponent(emoji)}`,
        {
            method: "DELETE",
        }
    );
}

// ─── Voice API ──────────────────────────────────────────────────────────────────

export interface VoiceJoinResponse {
    token: string;
    url: string;
    roomName: string;
    channelName: string;
    serverName: string;
    serverId: string;
    channelType: string;
    participants: Array<{
        userId: string;
        username: string;
        displayName: string;
        avatarUrl: string | null;
    }>;
}

export function joinVoiceChannel(channelId: string) {
    return api<VoiceJoinResponse>(`/channels/${channelId}/voice/join`, {
        method: "POST",
    });
}

export function leaveVoiceChannel(channelId: string) {
    return api<{ message: string }>(`/channels/${channelId}/voice/leave`, {
        method: "POST",
    });
}

export function fetchVoiceParticipants(channelId: string) {
    return api<{
        participants: Array<{
            userId: string;
            username: string;
            displayName: string;
            avatarUrl: string | null;
        }>;
    }>(`/channels/${channelId}/voice/participants`);
}

export function fetchServerVoiceStates(serverId: string) {
    return api<{
        voiceStates: Record<
            string,
            Array<{
                userId: string;
                username: string;
                displayName: string;
                avatarUrl: string | null;
            }>
        >;
    }>(`/servers/${serverId}/voice/states`);
}

// ─── Stage API ──────────────────────────────────────────────────────────────────

export function requestStageSpeak(channelId: string) {
    return api<{ message: string }>(`/channels/${channelId}/stage/request-speak`, {
        method: "POST",
    });
}

export function grantStageSpeak(channelId: string, userId: string) {
    return api<{ message: string }>(`/channels/${channelId}/stage/grant-speak`, {
        method: "POST",
        body: JSON.stringify({ userId }),
    });
}

export function revokeStageSpeak(channelId: string, userId: string) {
    return api<{ message: string }>(`/channels/${channelId}/stage/revoke-speak`, {
        method: "POST",
        body: JSON.stringify({ userId }),
    });
}

export function fetchStageState(channelId: string) {
    return api<{ speakers: string[]; raisedHands: string[] }>(
        `/channels/${channelId}/stage/state`
    );
}

// ─── Call API ───────────────────────────────────────────────────────────────────

export function startDMCall(conversationId: string) {
    return api<{ token: string; url: string; roomName: string }>(
        `/dms/${conversationId}/call/start`,
        { method: "POST" }
    );
}

export function joinDMCall(conversationId: string) {
    return api<{ token: string; url: string; roomName: string }>(
        `/dms/${conversationId}/call/join`,
        { method: "POST" }
    );
}

export function leaveDMCall(conversationId: string) {
    return api<{ message: string }>(`/dms/${conversationId}/call/leave`, {
        method: "POST",
    });
}

export function endDMCall(conversationId: string) {
    return leaveDMCall(conversationId);
}

export function declineDMCall(conversationId: string) {
    return api<{ message: string }>(`/dms/${conversationId}/call/decline`, {
        method: "POST",
    });
}

// ─── Stickers API ───────────────────────────────────────────────────────────────

export interface StickerData {
    id: string;
    name: string;
    imageUrl: string;
    createdAt: string;
}

export function fetchStickers() {
    return api<{ stickers: StickerData[] }>("/stickers");
}

export function fetchStickerById(id: string) {
    return api<{ sticker: StickerData }>(`/stickers/${id}`);
}

export function createSticker(data: { name: string; imageData: string }) {
    return api<{ sticker: StickerData }>("/stickers", {
        method: "POST",
        body: JSON.stringify(data),
    });
}

export function deleteSticker(id: string) {
    return api<{ message: string }>(`/stickers/${id}`, {
        method: "DELETE",
    });
}

// ─── Roles API ──────────────────────────────────────────────────────────────────

export interface RoleData {
    id: string;
    name: string;
    color: string | null;
    position: number;
    permissions: number;
    isDefault: boolean;
    memberCount: number;
    createdAt: string;
}

export interface ChannelPermissionOverrideData {
    id: string;
    channelId: string;
    roleId: string;
    roleName: string;
    roleColor: string | null;
    allow: number;
    deny: number;
}

export function fetchRoles(serverId: string) {
    return api<{ roles: RoleData[] }>(`/servers/${serverId}/roles`);
}

export function createRole(serverId: string, data: { name: string; color?: string; permissions?: number }) {
    return api<{ role: RoleData }>(`/servers/${serverId}/roles`, {
        method: "POST",
        body: JSON.stringify(data),
    });
}

export function updateRole(roleId: string, data: { name?: string; color?: string | null; permissions?: number; position?: number }) {
    return api<{ role: RoleData }>(`/roles/${roleId}`, {
        method: "PATCH",
        body: JSON.stringify(data),
    });
}

export function deleteRole(roleId: string) {
    return api<{ message: string }>(`/roles/${roleId}`, {
        method: "DELETE",
    });
}

export function assignRole(roleId: string, userId: string) {
    return api<{ message: string }>(`/roles/${roleId}/members/${userId}`, {
        method: "POST",
    });
}

export function removeRoleFromMember(roleId: string, userId: string) {
    return api<{ message: string }>(`/roles/${roleId}/members/${userId}`, {
        method: "DELETE",
    });
}

export function fetchChannelPermissions(channelId: string) {
    return api<{ overrides: ChannelPermissionOverrideData[] }>(`/channels/${channelId}/permissions`);
}

export function updateChannelPermission(channelId: string, roleId: string, data: { allow: number; deny: number }) {
    return api<{ override: ChannelPermissionOverrideData }>(`/channels/${channelId}/permissions/${roleId}`, {
        method: "PUT",
        body: JSON.stringify(data),
    });
}

export function deleteChannelPermission(channelId: string, roleId: string) {
    return api<{ message: string }>(`/channels/${channelId}/permissions/${roleId}`, {
        method: "DELETE",
    });
}
