import { NextResponse } from "next/server";

const REPO = "Humayun-glitch/Veyra";
const GITHUB_RELEASE_LATEST = `https://github.com/${REPO}/releases/latest`;

export const dynamic = "force-dynamic";

type GitHubAsset = {
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

        return NextResponse.redirect(asset.browser_download_url);
    } catch (error) {
        console.error("Download API error:", error);
        return NextResponse.redirect(GITHUB_RELEASE_LATEST);
    }
}
