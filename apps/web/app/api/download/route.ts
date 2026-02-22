import { NextResponse } from "next/server";

// This is a proxy to your centralized storage (like GitHub Releases or Amazon S3)
// For now, these are placeholder links where your GitHub Actions will publish binaries.
const REPO = "Humayun-glitch/Veyra"; // Change to your actual repository
const GITHUB_RELEASE_BASE = `https://github.com/${REPO}/releases/latest/download`;

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const os = searchParams.get("os");

    let downloadUrl = "";

    switch (os) {
        case "windows":
            // Usually building to MSI or NSIS .exe setup format via Tauri
            downloadUrl = `${GITHUB_RELEASE_BASE}/Veyra_0.0.1_x64_en-US.msi`;
            break;
        case "mac":
            // Usually building to .dmg or .app.tar.gz
            downloadUrl = `${GITHUB_RELEASE_BASE}/Veyra_0.0.1_aarch64.dmg`;
            break;
        case "linux":
            downloadUrl = `${GITHUB_RELEASE_BASE}/veyra_0.0.1_amd64.AppImage`;
            break;
        default:
            // Fallback to a general "Download Page" or Windows default if OS is unknown
            downloadUrl = `https://github.com/${REPO}/releases/latest`;
            break;
    }

    // Redirect the user to the actual binary file hosted on GitHub Releases/S3
    return NextResponse.redirect(downloadUrl);
}
