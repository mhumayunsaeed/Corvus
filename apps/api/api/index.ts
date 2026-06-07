import app from "../src/app.js";

/**
 * Vercel serverless entrypoint for the Hono API.
 *
 * `vercel.json` rewrites every path to this function, and Hono matches the
 * original URL. Runs on the Node.js runtime (Prisma + Supabase require Node).
 *
 * Realtime is handled by Supabase Realtime (see src/services/realtime.ts), so
 * there is no persistent WebSocket server — this function is fully stateless.
 */
export const config = {
    runtime: "nodejs",
};

export default app;
