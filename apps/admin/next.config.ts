import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // The workspace runs `bun run lint` as a dedicated, stricter gate. Next 15's
  // legacy in-build ESLint loader cannot resolve Bun's isolated transitive peers.
  eslint: {
    ignoreDuringBuilds: true,
  },
  transpilePackages: ["@babascamera/db", "@babascamera/ui"],
  serverExternalPackages: ["postgres"],
  experimental: {
    optimizePackageImports: ["lucide-react"],
    serverActions: {
      bodySizeLimit: "31mb",
    },
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=(), payment=(self)",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
