import dotenv from "dotenv";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { z } from "zod";

const currentDir = dirname(fileURLToPath(import.meta.url));
const envDir = resolve(currentDir, "..");
const production = process.env.NODE_ENV === "production";

// This module is imported before routes that read environment variables.
dotenv.config({ path: resolve(envDir, ".env"), override: !production });
dotenv.config({ path: resolve(envDir, ".env.local"), override: !production });

const schema = z.object({
    NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
    DATABASE_URL: z.string().min(1),
    DIRECT_URL: z.string().min(1),
    JWT_SECRET: z.string().min(32, "JWT_SECRET must contain at least 32 characters"),
    SUPABASE_URL: z.string().url(),
    SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
    LIVEKIT_URL: z.string().url().optional(),
    LIVEKIT_API_KEY: z.string().min(1).optional(),
    LIVEKIT_API_SECRET: z.string().min(1).optional(),
});

export const env = schema.parse(process.env);
export const isProduction = env.NODE_ENV === "production";
