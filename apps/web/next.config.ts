import path from "path";
import type { NextConfig } from "next";

const nextConfig = {
  // Standalone tracing walks the whole tree and stalls `next dev` on this machine.
  ...(process.env.NODE_ENV === "production" ? { output: "standalone" as const } : {}),
  experimental: {
    serverActions: {
      bodySizeLimit: "3mb",
    },
  },
  async redirects() {
    return [
      { source: "/c/mavi-nefes", destination: "/c/yeni-ufuklar-2", permanent: false },
      { source: "/c/mavi-nefes/:path*", destination: "/c/yeni-ufuklar-2/:path*", permanent: false },
      { source: "/c/kadikoy-atletik", destination: "/c/yeni-ufuklar", permanent: false },
      { source: "/c/kadikoy-atletik/:path*", destination: "/c/yeni-ufuklar/:path*", permanent: false },
    ];
  },
  turbopack: {
    root: path.join(__dirname, "../.."),
    resolveAlias: {
      "@skys/domain": "../../packages/domain/src/index.ts",
    },
  },
} as NextConfig;

export default nextConfig;
