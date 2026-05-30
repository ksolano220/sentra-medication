import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Static export so the dashboard can ship to Azure Static Web Apps
  // (and any other static host). All state is client-side; the dashboard
  // fetches /events from the supervisor at runtime via NEXT_PUBLIC_SENTRA_URL.
  output: "export",
  trailingSlash: true,
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
