import { NextResponse } from "next/server";

const REPO = "Humayun-glitch/Corvus";
const GITHUB_RELEASE_LATEST = `https://github.com/${REPO}/releases/latest`;
const GITHUB_RELEASE_LATEST_DOWNLOAD = `https://github.com/${REPO}/releases/latest/download`;

export const dynamic = "force-dynamic";

type GitHubAsset = {
    id: number;
    name: string;
    browser_download_url: string;
};

function findAsset(assets: GitHubAsset[], os: string | null) {
    const downloadable = assets.filter((asset) => !asset.name.endsWith(".sig"));

    if (os === "windows") {
        return (
            downloadable.find((asset) => /setup\.exe$/i.test(asset.name)) ??
            downloadable.find((asset) => /\.msi(\.zip)?$/i.test(asset.name)) ??
            downloadable.find((asset) => /\.exe$/i.test(asset.name))
        );
    }

    if (os === "mac") {
        return (
            downloadable.find((asset) => /\.dmg$/i.test(asset.name)) ??
            downloadable.find((asset) => /\.app\.tar\.gz$/i.test(asset.name))
        );
    }

    if (os === "linux") {
        return (
            downloadable.find((asset) => /\.AppImage(\.tar\.gz)?$/i.test(asset.name)) ??
            downloadable.find((asset) => /\.deb$/i.test(asset.name)) ??
            downloadable.find((asset) => /\.rpm$/i.test(asset.name))
        );
    }

    return downloadable[0];
}

function sanitizeFilename(filename: string) {
    return filename.replace(/[^\w.\-()+ ]+/g, "_");
}

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const os = searchParams.get("os")?.toLowerCase() ?? null;

    try {
        const res = await fetch(`https://api.github.com/repos/${REPO}/releases/latest`, {
            headers: {
                Accept: "application/vnd.github+json",
            },
            next: { revalidate: 300 },
        });

        if (!res.ok) {
            return NextResponse.redirect(GITHUB_RELEASE_LATEST);
        }

        const release = (await res.json()) as { assets?: GitHubAsset[] };
        const asset = findAsset(release.assets ?? [], os);

        if (!asset) {
            return NextResponse.redirect(GITHUB_RELEASE_LATEST);
        }

        const assetDownloadUrl = `${GITHUB_RELEASE_LATEST_DOWNLOAD}/${encodeURIComponent(asset.name)}`;
        const downloadResponse = await fetch(asset.browser_download_url, {
            headers: {
                Accept: "application/octet-stream",
            },
            redirect: "follow",
            cache: "no-store",
        });

        if (!downloadResponse.ok || !downloadResponse.body) {
            return NextResponse.redirect(assetDownloadUrl);
        }

        const headers = new Headers();
        headers.set(
            "content-type",
            downloadResponse.headers.get("content-type") ?? "application/octet-stream"
        );
        headers.set(
            "content-disposition",
            downloadResponse.headers.get("content-disposition") ??
            `attachment; filename="${sanitizeFilename(asset.name)}"`
        );

        const contentLength = downloadResponse.headers.get("content-length");
        if (contentLength) {
            headers.set("content-length", contentLength);
        }

        headers.set("cache-control", "no-store");

        return new NextResponse(downloadResponse.body, {
            status: 200,
            headers,
        });
    } catch (error) {
        console.error("Download API error:", error);
        return NextResponse.redirect(GITHUB_RELEASE_LATEST);
    }
}
