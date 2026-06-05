import { serve } from "@hono/node-server";
import app from "./app.js";

/**
 * Local-dev / persistent-host entrypoint (long-running Node server).
 *
 * On Vercel the app is served by the serverless function in `api/index.ts`
 * instead — realtime now runs through Supabase Realtime, so there is no
 * always-on WebSocket server to attach here.
 */

const port = parseInt(process.env.PORT || "3001", 10);

serve({ fetch: app.fetch, port }, (info) => {
    const supabaseOk = !!(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
    console.log("");
    console.log("  ┌─────────────────────────────────────┐");
    console.log("  │                                     │");
    console.log(`  │   Corvus API running on :${info.port}        │`);
    console.log("  │                                     │");
    console.log(`  │   Supabase: ${supabaseOk ? "✓ configured" : "✗ not set"}    │`);
    console.log("  │                                     │");
    console.log("  └─────────────────────────────────────┘");
    console.log("");
});

export default app;
