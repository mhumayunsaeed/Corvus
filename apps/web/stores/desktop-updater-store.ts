import { create } from "zustand";
import type { DownloadEvent, Update } from "@tauri-apps/plugin-updater";

type DesktopUpdaterStatus =
    | "idle"
    | "checking"
    | "available"
    | "not_available"
    | "downloading"
    | "installing"
    | "error";

interface DesktopUpdateInfo {
    version: string;
    currentVersion: string;
    body?: string;
    date?: string;
}

interface DesktopUpdaterState {
    isDesktop: boolean;
    status: DesktopUpdaterStatus;
    update: DesktopUpdateInfo | null;
    downloadedBytes: number;
    contentLength: number | null;
    lastCheckedAt: number | null;
    lastError: string | null;
    setDesktop: (isDesktop: boolean) => void;
    checkForUpdates: () => Promise<Update | null>;
    installUpdate: () => Promise<void>;
}

let pendingUpdate: Update | null = null;

function isDesktopRuntime() {
    return typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
}

function normalizeError(err: unknown) {
    return err instanceof Error ? err.message : String(err);
}

export function isExpectedDesktopUpdaterError(err: unknown) {
    return normalizeError(err).includes("Could not fetch a valid release JSON from the remote");
}

function toUpdateInfo(update: Update): DesktopUpdateInfo {
    return {
        version: update.version,
        currentVersion: update.currentVersion,
        body: update.body,
        date: update.date,
    };
}

function applyDownloadEvent(event: DownloadEvent) {
    if (event.event === "Started") {
        useDesktopUpdaterStore.setState({
            downloadedBytes: 0,
            contentLength: event.data.contentLength ?? null,
        });
        return;
    }

    if (event.event === "Progress") {
        useDesktopUpdaterStore.setState((state) => ({
            downloadedBytes: state.downloadedBytes + event.data.chunkLength,
        }));
        return;
    }

    useDesktopUpdaterStore.setState((state) => ({
        downloadedBytes: state.contentLength ?? state.downloadedBytes,
    }));
}

export async function checkForDesktopUpdate(options: { silent?: boolean } = {}) {
    if (!isDesktopRuntime()) {
        useDesktopUpdaterStore.setState({ isDesktop: false });
        return null;
    }

    const currentStatus = useDesktopUpdaterStore.getState().status;
    if (currentStatus === "downloading" || currentStatus === "installing") {
        return pendingUpdate;
    }

    useDesktopUpdaterStore.setState({
        isDesktop: true,
        status: options.silent ? currentStatus : "checking",
        lastError: null,
    });

    try {
        const { check } = await import("@tauri-apps/plugin-updater");
        const update = await check();

        pendingUpdate = update;
        useDesktopUpdaterStore.setState({
            status: update ? "available" : "not_available",
            update: update ? toUpdateInfo(update) : null,
            downloadedBytes: 0,
            contentLength: null,
            lastCheckedAt: Date.now(),
            lastError: null,
        });

        return update;
    } catch (err) {
        if (!options.silent) {
            useDesktopUpdaterStore.setState({
                status: "error",
                lastError: normalizeError(err),
                lastCheckedAt: Date.now(),
            });
        }
        throw err;
    }
}

export async function installDesktopUpdate() {
    if (!isDesktopRuntime()) {
        return;
    }

    let update = pendingUpdate;
    if (!update) {
        update = await checkForDesktopUpdate();
    }

    if (!update) {
        return;
    }

    useDesktopUpdaterStore.setState({
        status: "downloading",
        update: toUpdateInfo(update),
        downloadedBytes: 0,
        contentLength: null,
        lastError: null,
    });

    try {
        await update.downloadAndInstall(applyDownloadEvent);
        useDesktopUpdaterStore.setState({ status: "installing" });

        const { relaunch } = await import("@tauri-apps/plugin-process");
        await relaunch();
    } catch (err) {
        useDesktopUpdaterStore.setState({
            status: "error",
            lastError: normalizeError(err),
        });
        throw err;
    }
}

export const useDesktopUpdaterStore = create<DesktopUpdaterState>((set) => ({
    isDesktop: false,
    status: "idle",
    update: null,
    downloadedBytes: 0,
    contentLength: null,
    lastCheckedAt: null,
    lastError: null,
    setDesktop: (isDesktop) => set({ isDesktop }),
    checkForUpdates: () => checkForDesktopUpdate(),
    installUpdate: () => installDesktopUpdate(),
}));
