/**
 * Upload desktop release artifacts to the public Supabase `releases` bucket.
 *
 * Usage:
 *   pnpm --filter @corvus/api release:upload -- <path-to-installer> [windows|mac|linux] [version]
 *
 * The installer is uploaded to the fixed key used by `/api/download`.
 * When a matching Tauri updater bundle and `.sig` file are found, this also
 * uploads the updater bundle and writes `latest.json` for Tauri's updater.
 *
 * Requires SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in the environment.
 */
import dotenv from "dotenv";
import { access, readdir, readFile, stat } from "node:fs/promises";
import { basename, dirname, extname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { STORAGE_BUCKETS } from "../src/services/storage.js";
import { getSupabaseAdmin } from "../src/lib/supabase.js";

const currentDir = dirname(fileURLToPath(import.meta.url));
const apiDir = resolve(currentDir, "..");
dotenv.config({ path: resolve(apiDir, ".env") });
dotenv.config({ path: resolve(apiDir, ".env.local") });

const RELEASE_KEYS: Record<string, string> = {
    windows: process.env.RELEASE_WINDOWS || "Corvus-Setup.exe",
    mac: process.env.RELEASE_MAC || "Corvus.dmg",
    linux: process.env.RELEASE_LINUX || "Corvus.AppImage",
};

const UPDATER_KEYS: Record<string, string> = {
    windows: process.env.RELEASE_WINDOWS_UPDATER || "Corvus-windows-x86_64.nsis.zip",
    mac: process.env.RELEASE_MAC_UPDATER || "Corvus-darwin-aarch64.app.tar.gz",
    linux: process.env.RELEASE_LINUX_UPDATER || "Corvus-linux-x86_64.AppImage.tar.gz",
};

const PLATFORM_KEYS: Record<string, string> = {
    windows: "windows-x86_64",
    mac: "darwin-aarch64",
    linux: "linux-x86_64",
};

const LATEST_JSON_KEY = process.env.RELEASE_LATEST_JSON || "latest.json";

const CONTENT_TYPES: Record<string, string> = {
    ".exe": "application/x-msdownload",
    ".msi": "application/x-msi",
    ".dmg": "application/x-apple-diskimage",
    ".appimage": "application/octet-stream",
    ".zip": "application/zip",
    ".gz": "application/gzip",
    ".json": "application/json",
};

function getContentType(fileName: string) {
    const lower = fileName.toLowerCase();
    if (lower.endsWith(".appimage")) return CONTENT_TYPES[".appimage"];
    if (lower.endsWith(".tar.gz")) return CONTENT_TYPES[".gz"];
    return CONTENT_TYPES[extname(lower)] || "application/octet-stream";
}

function getPublicUrl(key: string) {
    const supabase = getSupabaseAdmin();
    const { data } = supabase.storage.from(STORAGE_BUCKETS.releases).getPublicUrl(key);
    return data.publicUrl;
}

function exists(filePath: string) {
    return access(filePath).then(
        () => true,
        () => false,
    );
}

async function uploadFile(localPath: string, key: string) {
    const data = await readFile(localPath);
    const supabase = getSupabaseAdmin();
    const { error } = await supabase.storage.from(STORAGE_BUCKETS.releases).upload(key, data, {
        contentType: getContentType(localPath),
        upsert: true,
        cacheControl: "300",
    });

    if (error) {
        throw new Error(`Upload failed for ${key}: ${error.message}`);
    }

    return getPublicUrl(key);
}

async function uploadJson(key: string, value: unknown) {
    const data = Buffer.from(`${JSON.stringify(value, null, 2)}\n`, "utf8");
    const supabase = getSupabaseAdmin();
    const { error } = await supabase.storage.from(STORAGE_BUCKETS.releases).upload(key, data, {
        contentType: CONTENT_TYPES[".json"],
        upsert: true,
        cacheControl: "60",
    });

    if (error) {
        throw new Error(`Upload failed for ${key}: ${error.message}`);
    }

    return getPublicUrl(key);
}

async function readDesktopVersion() {
    const packageJsonPath = resolve(currentDir, "../../desktop/package.json");
    const raw = await readFile(packageJsonPath, "utf8");
    const parsed = JSON.parse(raw) as { version?: string };
    return parsed.version;
}

function sortNewestFirst(
    a: { name: string; mtimeMs: number },
    b: { name: string; mtimeMs: number },
) {
    return b.mtimeMs - a.mtimeMs;
}

async function findUpdaterBundle(installerPath: string, os: string) {
    const releaseDir = dirname(installerPath);
    const entries = await readdir(releaseDir, { withFileTypes: true });
    const files = await Promise.all(
        entries
            .filter((entry) => entry.isFile())
            .map(async (entry) => {
                const fullPath = resolve(releaseDir, entry.name);
                const info = await stat(fullPath);
                return { name: entry.name, fullPath, mtimeMs: info.mtimeMs };
            }),
    );

    const preferredMatchers: Record<string, RegExp[]> = {
        windows: [/\.nsis\.zip$/i, /\.msi\.zip$/i, /\.zip$/i],
        mac: [/\.app\.tar\.gz$/i, /\.tar\.gz$/i],
        linux: [/\.appimage\.tar\.gz$/i, /\.tar\.gz$/i],
    };

    const candidates = files
        .filter((file) => {
            if (file.name.endsWith(".sig")) return false;
            return (preferredMatchers[os] ?? preferredMatchers.windows).some((matcher) =>
                matcher.test(file.name),
            );
        })
        .filter((file) => files.some((other) => other.name === `${file.name}.sig`))
        .sort(sortNewestFirst);

    return candidates[0] ?? null;
}

async function main() {
    const [filePath, osArg, versionArg] = process.argv.slice(2);
    if (!filePath) {
        console.error("Usage: release:upload -- <path-to-installer> [windows|mac|linux] [version]");
        process.exit(1);
    }

    const os = (osArg || "windows").toLowerCase();
    const installerKey = RELEASE_KEYS[os] ?? RELEASE_KEYS.windows;
    const updaterKey = UPDATER_KEYS[os] ?? UPDATER_KEYS.windows;
    const platformKey = PLATFORM_KEYS[os] ?? PLATFORM_KEYS.windows;
    const installerPath = resolve(process.cwd(), filePath);
    const version = versionArg || process.env.RELEASE_VERSION || (await readDesktopVersion());

    if (!version) {
        throw new Error("Could not determine release version.");
    }

    const installerUrl = await uploadFile(installerPath, installerKey);
    console.log(`Uploaded ${basename(installerPath)} -> releases/${installerKey}`);
    console.log(`Public URL: ${installerUrl}`);

    const updaterBundle = await findUpdaterBundle(installerPath, os);
    const installerSignaturePath = `${installerPath}.sig`;
    if (!updaterBundle && !(await exists(installerSignaturePath))) {
        console.warn(
            "No signed Tauri updater bundle or installer signature found; latest.json was not updated.",
        );
        return;
    }

    const signaturePath = updaterBundle ? `${updaterBundle.fullPath}.sig` : installerSignaturePath;
    const signature = (await readFile(signaturePath, "utf8")).trim();
    if (!signature) {
        throw new Error(`Signature file is empty: ${signaturePath}`);
    }

    const updaterUrl = updaterBundle
        ? await uploadFile(updaterBundle.fullPath, updaterKey)
        : installerUrl;
    const signatureKey = updaterBundle ? `${updaterKey}.sig` : `${installerKey}.sig`;
    await uploadFile(signaturePath, signatureKey);

    const metadata = {
        version,
        notes: process.env.RELEASE_NOTES || `Corvus desktop ${version}`,
        pub_date: new Date().toISOString(),
        platforms: {
            [platformKey]: {
                signature,
                url: updaterUrl,
            },
        },
    };

    const metadataUrl = await uploadJson(LATEST_JSON_KEY, metadata);
    if (updaterBundle) {
        console.log(`Uploaded ${updaterBundle.name} -> releases/${updaterKey}`);
    } else {
        console.log(`Using ${basename(installerPath)} as the updater payload`);
    }
    console.log(`Uploaded ${basename(signaturePath)} -> releases/${signatureKey}`);
    console.log(`Updated releases/${LATEST_JSON_KEY}`);
    console.log(`Updater metadata: ${metadataUrl}`);
}

main().catch((err) => {
    console.error("Release upload failed:", err);
    process.exit(1);
});
