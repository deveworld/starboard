/** @type {import('next').NextConfig} */
// basePath is empty for local dev; set to "/starboard" in CI for GitHub Pages
// (a project site is served from https://<user>.github.io/<repo>/).
const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";

const nextConfig = {
  output: "export",
  images: { unoptimized: true },
  trailingSlash: true,
  basePath,
};

export default nextConfig;
