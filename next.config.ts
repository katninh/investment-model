import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Composite pages fan out to all five models over a remote DB; give static
  // generation room so the build doesn't time out (default 60s).
  staticPageGenerationTimeout: 240,
};

export default nextConfig;
