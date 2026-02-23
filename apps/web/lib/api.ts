import { ensureApiUrl } from "@/lib/endpoints";
import type { SharedAttachment } from "@/lib/attachments";

function getToken(): string | null {
    if (typeof window === "undefined") return null;
    try {
        const stored = localStorage.getItem("veyra-auth");
        if (!stored) return null;
        const parsed = JSON.parse(stored);
        return parsed?.state?.token || null;
    } catch {
        return null;
    }
}

export async function api<T>(
    path: string,
    options: RequestInit = {}
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

    let res: Response;
    const maxRetries = 2;

    for (let attempt = 0; ; attempt++) {
        try {
            res = await fetch(`${baseUrl}${path}`, {
                ...options,
                headers,
            });
            break;
        } catch {
            if (attempt < maxRetries) {
                await new Promise((r) => setTimeout(r, 2000 * (attempt + 1)));
                continue;
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

export interface DMMessageData {
    id: string;
    conversationId: string;
    content: string;
    type?: string;
    metadata?: string | null;
    createdAt: string;
    editedAt: string | null;
    author: DMParticipantData;
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

// ─── Server API ─────────────────────────────────────────────────

export function fetchServers() {
    return api<{ servers: ServerData[] }>("/servers");
}

export function createServer(data: { name: string; iconUrl?: string; description?: string }) {
    return api<{ server: ServerData & { channels: ChannelData[] } }>("/servers", {
        method: "POST",
        body: JSON.stringify(data),
    });
}

export function fetchServer(id: string) {
    return api<{ server: ServerData & { channels: ChannelData[] } }>(`/servers/${id}`);
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

export function editMessage(id: string, content: string) {
    return api<{ message: MessageData }>(`/messages/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ content }),
    });
}

export function deleteMessageApi(id: string) {
    return api<{ message: string }>(`/messages/${id}`, { method: "DELETE" });
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
    return api<{ conversations: DMConversationData[] }>("/dms");
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

export function sendDMMessage(conversationId: string, content: string) {
    return api<{ message: DMMessageData }>(`/dms/${conversationId}/messages`, {
        method: "POST",
        body: JSON.stringify({ content }),
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

export function endDMCall(conversationId: string) {
    return api<{ message: string }>(`/dms/${conversationId}/call/end`, {
        method: "POST",
    });
}

// ─── Stickers API ───────────────────────────────────────────────────────────────

export interface StickerData {
    id: string;
    name: string;
    imageData: string;
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
