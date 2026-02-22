/** @type {import('next').NextConfig} */
const nextConfig = {
  trailingSlash: true,
  images: { unoptimized: true },
  transpilePackages: ["@veyra/ui"],
};

export default nextConfig;
