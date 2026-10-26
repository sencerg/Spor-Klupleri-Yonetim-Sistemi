import path from "path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
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
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
