/** @type {import('next').NextConfig} */
const isTauriBuild = process.env.TAURI_BUILD === "true";

const nextConfig = {
  trailingSlash: true,
  images: { unoptimized: true },
  transpilePackages: ["@corvus/ui"],
  ...(isTauriBuild ? { output: "export" } : {}),
};

export default nextConfig;
