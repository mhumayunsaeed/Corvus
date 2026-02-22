import { NextResponse } from "next/server";

// This is an example Tauri Updater Endpoint that you deploy on Vercel.
// It checks your latest GitHub release and constructs the JSON structure Tauri needs (`{{target}}/{{current_version}}`)
// Usually, you might host a static updater.json at S3 instead. Here is a dynamic fallback.

const REPO = "Humayun-glitch/Veyra"; // Change me

export async function GET(request: Request) {
    try {
        // Fetch the newest GitHub release from your repo
        // GitHub Actions builds & pushes the .exe/.msi & .sig files here
        const res = await fetch(`https://api.github.com/repos/${REPO}/releases/latest`, {
            headers: {
                "Accept": "application/vnd.github.v3+json",
                // "Authorization": `Bearer ${process.env.GITHUB_TOKEN}` // Optional: if private repo
            },
            next: { revalidate: 3600 } // Cache heavily to avoid rate limits
        });

        if (!res.ok) {
            return new NextResponse(null, { status: 204 }); // 204 means no updates
        }

        const release = await res.json();

        // Check if the current user needs an update. (Tauri parses SemVer natively)
        // If we strictly want to proxy the metadata down:
        const tauriUpdateJson = {
            version: release.tag_name.replace(/^v/, ""), // e.g. "0.0.2"
            notes: release.body || "New features and bug fixes.",
            pub_date: release.published_at,
            platforms: {
                // Tauri uses very specific target strings depending on OS architecture it is running on.
                "windows-x86_64": {
                    signature: "FETCHED_FROM_GITHUB_SIG_FILE_OR_CI", // In reality, you'd download the `.sig` release asset string or CI pushes it to a DB.
                    url: `https://github.com/${REPO}/releases/download/${release.tag_name}/Veyra_${release.tag_name}_x64_en-US.msi.zip`
                },
                "darwin-aarch64": {
                    signature: "MAC_SIG",
                    url: `https://github.com/${REPO}/releases/download/${release.tag_name}/Veyra_${release.tag_name}_aarch64.app.tar.gz`
                },
                "linux-x86_64": {
                    signature: "LINUX_SIG",
                    url: `https://github.com/${REPO}/releases/download/${release.tag_name}/veyra_${release.tag_name}_amd64.AppImage.tar.gz`
                }
            }
        };

        return NextResponse.json(tauriUpdateJson);
    } catch (err) {
        console.error("Updater API error:", err);
        return new NextResponse(null, { status: 500 }); // Gracefully handle fails
    }
}
