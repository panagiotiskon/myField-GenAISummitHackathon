import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  devIndicators: false,
  // /api/analyze reads the plot images from disk to send them to the model; on a serverless host
  // the function only ships files it is told about.
  outputFileTracingIncludes: {
    "/api/analyze": ["./public/imagery/**/*", "./data/**/*"],
  },
  // the landing film: versioned by folder (public/film/vN), so it can be cached for good
  async headers() {
    return [{ source: "/film/:path*", headers: [{ key: "Cache-Control", value: "public, max-age=31536000, immutable" }] }];
  },
};

export default nextConfig;
