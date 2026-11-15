import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  devIndicators: false,
  // /api/analyze reads the plot images from disk to send them to the model; on a serverless host
  // the function only ships files it is told about.
  // Tiles and plot pictures change only when a script is re-run: let browsers and the CDN keep them.
  async headers() {
    const cache = [{ key: "Cache-Control", value: "public, max-age=86400, stale-while-revalidate=604800" }];
    return [
      { source: "/flight/:path*", headers: cache },
      { source: "/imagery/:path*", headers: cache },
    ];
  },
  outputFileTracingIncludes: {
    "/api/analyze": ["./public/imagery/**/*", "./data/**/*"],
  },
};

export default nextConfig;
