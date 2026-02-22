import { AccessToken } from "livekit-server-sdk";

const LIVEKIT_URL = process.env.LIVEKIT_URL || "";
const LIVEKIT_API_KEY = process.env.LIVEKIT_API_KEY || "";
const LIVEKIT_API_SECRET = process.env.LIVEKIT_API_SECRET || "";

export async function generateVoiceToken(
    roomName: string,
    participantIdentity: string,
    participantName: string,
    options?: { canPublish?: boolean; canSubscribe?: boolean }
): Promise<string> {
    const token = new AccessToken(LIVEKIT_API_KEY, LIVEKIT_API_SECRET, {
        identity: participantIdentity,
        name: participantName,
        ttl: "6h",
    });

    token.addGrant({
        roomJoin: true,
        room: roomName,
        canPublish: options?.canPublish ?? true,
        canSubscribe: options?.canSubscribe ?? true,
    });

    return await token.toJwt();
}

export function getLiveKitUrl(): string {
    return LIVEKIT_URL;
}
