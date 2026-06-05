/**
 * Upload a desktop installer to the Supabase `releases` bucket under the fixed
 * key the download endpoint expects, so the landing-page download button serves
 * it directly.
 *
 * Usage:
 *   pnpm --filter @corvus/api release:upload -- <path-to-installer> [os]
 *
 * Examples:
 *   pnpm --filter @corvus/api release:upload -- ./Corvus_0.1.0_x64-setup.exe windows
 *   pnpm --filter @corvus/api release:upload -- ./Corvus.dmg mac
 *
 * `os` defaults to "windows". Keys: windows→Corvus-Setup.exe, mac→Corvus.dmg,
 * linux→Corvus.AppImage (override via RELEASE_* env vars to match the download route).
 *
 * Requires SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in the environment.
 */
import dotenv from "dotenv";
import { readFile } from "node:fs/promises";
import { basename, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { STORAGE_BUCKETS } from "../src/services/storage.js";
import { getSupabaseAdmin } from "../src/lib/supabase.js";

const currentDir = dirname(fileURLToPath(import.meta.url));
const envDir = resolve(currentDir, "..");
dotenv.config({ path: resolve(envDir, ".env") });
dotenv.config({ path: resolve(envDir, ".env.local") });

const RELEASE_KEYS: Record<string, string> = {
    windows: process.env.RELEASE_WINDOWS || "Corvus-Setup.exe",
    mac: process.env.RELEASE_MAC || "Corvus.dmg",
    linux: process.env.RELEASE_LINUX || "Corvus.AppImage",
};

const CONTENT_TYPES: Record<string, string> = {
    ".exe": "application/x-msdownload",
    ".msi": "application/x-msi",
    ".dmg": "application/x-apple-diskimage",
    ".appimage": "application/octet-stream",
    ".zip": "application/zip",
    ".gz": "application/gzip",
};

async function main() {
    const [filePath, osArg] = process.argv.slice(2);
    if (!filePath) {
        console.error("Usage: release:upload -- <path-to-installer> [windows|mac|linux]");
        process.exit(1);
    }

    const os = (osArg || "windows").toLowerCase();
    const key = RELEASE_KEYS[os] ?? RELEASE_KEYS.windows;

    const data = await readFile(resolve(process.cwd(), filePath));
    const ext = (basename(filePath).match(/\.[a-z0-9]+$/i)?.[0] || "").toLowerCase();
    const contentType = CONTENT_TYPES[ext] || "application/octet-stream";

    const supabase = getSupabaseAdmin();
    const { error } = await supabase.storage
        .from(STORAGE_BUCKETS.releases)
        .upload(key, data, { contentType, upsert: true, cacheControl: "300" });

    if (error) {
        console.error(`✗ Upload failed: ${error.message}`);
        process.exit(1);
    }

    const { data: pub } = supabase.storage.from(STORAGE_BUCKETS.releases).getPublicUrl(key);
    console.log(`✓ Uploaded ${filePath} → releases/${key}`);
    console.log(`  Public URL: ${pub.publicUrl}`);
}

main().catch((err) => {
    console.error("Release upload failed:", err);
    process.exit(1);
});
