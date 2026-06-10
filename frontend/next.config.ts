import type { NextConfig } from "next";

// Static export so the dashboard can ship to GitHub Pages or any static host.
// Served from GitHub Pages at https://ksolano220.github.io/sentra-medication/,
// so the production build needs a basePath; dev stays at root. All state is
// client-side; the dashboard fetches /events from the supervisor at runtime
// via NEXT_PUBLIC_SENTRA_URL and falls back to seeded demo events when no
// live supervisor is reachable.
const isProd = process.env.NODE_ENV === "production";

const nextConfig: NextConfig = {
  output: "export",
  trailingSlash: true,
  basePath: isProd ? "/sentra-medication" : undefined,
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
