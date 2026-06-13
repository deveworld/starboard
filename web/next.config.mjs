/** @type {import('next').NextConfig} */
const nextConfig = {
  // Fully static HTML export -> ./out
  output: "export",
  images: { unoptimized: true },
  trailingSlash: true,
};

export default nextConfig;
