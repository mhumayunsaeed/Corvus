import { spawn } from "node:child_process";
import { access, readFile, rename, rm } from "node:fs/promises";
import path from "node:path";

function exists(filePath) {
  return access(filePath).then(
    () => true,
    () => false,
  );
}

function isLocalhostUrl(url) {
  return /localhost|127\.0\.0\.1|0\.0\.0\.0/i.test(url);
}

/** Read NEXT_PUBLIC_API_URL from a dotenv file if present. */
async function readApiUrlFromEnvFile(filePath) {
  if (!(await exists(filePath))) return "";
  const contents = await readFile(filePath, "utf8");
  const match = contents.match(/^\s*NEXT_PUBLIC_API_URL\s*=\s*(.+)\s*$/m);
  return match ? match[1].trim().replace(/^["']|["']$/g, "") : "";
}

/**
 * The desktop app is a static bundle — `NEXT_PUBLIC_API_URL` is baked in at build
 * time. If it points at localhost (the dev default), the installed app can't
 * reach the server and every request fails with "Failed to fetch". Resolve the
 * effective value the same way Next will, and refuse to produce a broken build.
 */
async function resolveApiUrl(root) {
  const fromProcess = process.env.NEXT_PUBLIC_API_URL?.trim();
  if (fromProcess) return fromProcess;
  // Next precedence for a production build: .env.production.local > .env.local.
  return (
    (await readApiUrlFromEnvFile(path.join(root, ".env.production.local"))) ||
    (await readApiUrlFromEnvFile(path.join(root, ".env.local"))) ||
    (await readApiUrlFromEnvFile(path.join(root, ".env.production"))) ||
    ""
  );
}

function run(command, args, env) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      stdio: "inherit",
      env,
      shell: process.platform === "win32",
    });

    child.on("exit", (code) => {
      if (code === 0) {
        resolve();
        return;
      }
      reject(new Error(`${command} ${args.join(" ")} failed with exit code ${code ?? 1}`));
    });

    child.on("error", reject);
  });
}

async function main() {
  const root = process.cwd();

  // Guard against shipping a desktop build that points at a dev/localhost API.
  const apiUrl = await resolveApiUrl(root);
  if (!apiUrl || isLocalhostUrl(apiUrl)) {
    throw new Error(
      [
        "Refusing to build the desktop app: NEXT_PUBLIC_API_URL is " +
          (apiUrl ? `\"${apiUrl}\" (localhost)` : "not set") + ".",
        "The desktop bundle bakes this URL in, so a localhost value makes every",
        "request fail with \"Failed to fetch\" once installed.",
        "",
        "Set your production API URL before building, e.g.:",
        "  • CI:    NEXT_PUBLIC_API_URL=https://api.example.com pnpm build:tauri",
        "  • Local: add NEXT_PUBLIC_API_URL to apps/web/.env.production.local",
      ].join("\n"),
    );
  }
  console.log(`[build-tauri] Using API URL: ${apiUrl}`);

  const apiDir = path.join(root, "app", "api");
  const apiBackupDir = path.join(root, ".tauri-build-api-backup");
  const pnpmCmd = process.platform === "win32" ? "pnpm.cmd" : "pnpm";
  const hadApiDir = await exists(apiDir);

  if (await exists(apiBackupDir)) {
    await rm(apiBackupDir, { recursive: true, force: true });
  }

  if (hadApiDir) {
    await rename(apiDir, apiBackupDir);
  }

  try {
    await run(pnpmCmd, ["exec", "next", "build"], {
      ...process.env,
      NEXT_PUBLIC_API_URL: apiUrl,
      TAURI_BUILD: "true",
    });
  } finally {
    if (hadApiDir) {
      if (await exists(apiDir)) {
        await rm(apiDir, { recursive: true, force: true });
      }
      await rename(apiBackupDir, apiDir);
    }
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
