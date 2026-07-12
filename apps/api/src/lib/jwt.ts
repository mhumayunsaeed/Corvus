import { SignJWT, jwtVerify } from "jose";

if (!process.env.JWT_SECRET) {
    throw new Error("JWT_SECRET environment variable is required");
}
const secret = new TextEncoder().encode(process.env.JWT_SECRET);

export interface TokenPayload {
    userId: string;
    email: string;
    username: string;
}

export async function signToken(payload: TokenPayload): Promise<string> {
    return new SignJWT(payload as unknown as Record<string, unknown>)
        .setProtectedHeader({ alg: "HS256" })
        .setIssuedAt()
        .setExpirationTime("7d")
        .sign(secret);
}

export async function verifyToken(token: string): Promise<TokenPayload> {
    const { payload } = await jwtVerify(token, secret, { algorithms: ["HS256"] });
    return payload as unknown as TokenPayload;
}

export function generateVerifyToken(): string {
    const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
    let token = "";
    const array = new Uint8Array(48);
    crypto.getRandomValues(array);
    for (let i = 0; i < 48; i++) {
        token += chars[array[i] % chars.length];
    }
    return token;
}
