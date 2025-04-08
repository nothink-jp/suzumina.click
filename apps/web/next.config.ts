import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  typescript: {
    // !! WARN !!
    // Dangerously allow production builds to successfully complete even if
    // your project has type errors.
    // !! WARN !!
    // Only enable this if you are running type checking separately in your CI pipeline.
    ignoreBuildErrors: process.env.CI === "true",
  },
};

export default nextConfig;
