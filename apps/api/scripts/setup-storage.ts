/**
 * Idempotent Supabase Storage bucket setup.
 *
 * Creates every bucket the app needs, with public-read access. Safe to run on
 * every deploy — existing buckets are left untouched (and their config updated
 * to match the desired settings).
 *
 * Usage:
 *   pnpm --filter @corvus/api setup:storage
 *
 * Requires SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in the environment.
 */
import dotenv from "dotenv";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { ALL_BUCKETS } from "../src/services/storage.js";
import { getSupabaseAdmin } from "../src/lib/supabase.js";

const currentDir = dirname(fileURLToPath(import.meta.url));
const envDir = resolve(currentDir, "..");
dotenv.config({ path: resolve(envDir, ".env") });
dotenv.config({ path: resolve(envDir, ".env.local") });

// Per-bucket upload constraints (mirrors the validation in the upload routes).
const BUCKET_OPTIONS: Record<string, { fileSizeLimit: string; allowedMimeTypes?: string[] }> = {
    avatars: { fileSizeLimit: "5MB", allowedMimeTypes: ["image/*"] },
    "server-icons": { fileSizeLimit: "5MB", allowedMimeTypes: ["image/*"] },
    stickers: { fileSizeLimit: "2MB", allowedMimeTypes: ["image/*"] },
    // Attachments allow images, video, and documents — no mime restriction here;
    // the route validates types explicitly.
    attachments: { fileSizeLimit: "25MB" },
    // Desktop installers (.exe/.msi/.dmg/.AppImage). Any type. Kept within the
    // project's global upload limit (default 50 MB); raise the global limit in
    // Supabase settings first if your installers are larger.
    releases: { fileSizeLimit: "50MB" },
};

async function main() {
    const supabase = getSupabaseAdmin();

    for (const bucket of ALL_BUCKETS) {
        const options = BUCKET_OPTIONS[bucket] ?? { fileSizeLimit: "10MB" };
        const config = {
            public: true,
            fileSizeLimit: options.fileSizeLimit,
            ...(options.allowedMimeTypes ? { allowedMimeTypes: options.allowedMimeTypes } : {}),
        };

        const { error: createError } = await supabase.storage.createBucket(bucket, config);

        if (!createError) {
            console.log(`✓ Created bucket "${bucket}"`);
            continue;
        }

        // Already exists → update its config to the desired state (idempotent).
        const alreadyExists =
            createError.message?.toLowerCase().includes("already exists") ||
            (createError as { statusCode?: string }).statusCode === "409";

        if (alreadyExists) {
            const { error: updateError } = await supabase.storage.updateBucket(bucket, config);
            if (updateError) {
                console.error(`✗ Bucket "${bucket}" exists but could not be updated: ${updateError.message}`);
            } else {
                console.log(`✓ Bucket "${bucket}" already exists (config synced)`);
            }
            continue;
        }

        console.error(`✗ Failed to create bucket "${bucket}": ${createError.message}`);
        process.exitCode = 1;
    }
}

main().catch((err) => {
    console.error("Storage setup failed:", err);
    process.exit(1);
});
