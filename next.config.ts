import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  devIndicators: false,
  // /api/analyze reads the plot images from disk to send them to the model; on a serverless host
  // the function only ships files it is told about.
  outputFileTracingIncludes: {
    "/api/analyze": ["./public/imagery/**/*", "./data/**/*"],
  },
};

export default nextConfig;
