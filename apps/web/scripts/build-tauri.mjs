import { spawn } from "node:child_process";
import { access, rename, rm } from "node:fs/promises";
import path from "node:path";

function exists(filePath) {
  return access(filePath).then(
    () => true,
    () => false,
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
