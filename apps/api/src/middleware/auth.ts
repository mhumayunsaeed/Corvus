import { createMiddleware } from "hono/factory";
import { verifyToken } from "../lib/jwt.js";

export type AuthEnv = {
    Variables: {
        userId: string;
        userEmail: string;
        username: string;
    };
};

export const authMiddleware = createMiddleware<AuthEnv>(async (c, next) => {
    const authHeader = c.req.header("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
        return c.json({ error: "Unauthorized." }, 401);
    }

    try {
        const payload = await verifyToken(authHeader.slice(7));
        c.set("userId", payload.userId);
        c.set("userEmail", payload.email);
        c.set("username", payload.username);
        await next();
    } catch {
        return c.json({ error: "Invalid or expired token." }, 401);
    }
});
