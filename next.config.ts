import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  agentRules: false,
  // Pages are shell-only; never let a CDN keep an old copy after a redeploy. Hashed assets and API routes set their own headers.
  async headers() {
    return [{ source: "/((?!_next/|api/|.*\\.(?:jpg|webp|png|ico|svg)$).*)", headers: [{ key: "Cache-Control", value: "private, no-store" }] }];
  },
};

export default nextConfig;
