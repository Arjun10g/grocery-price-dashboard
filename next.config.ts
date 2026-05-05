import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Standalone output collapses the deployment to one /node_modules-
  // free server.js + the app's chunks. Required for the slim Docker
  // image that Hugging Face Spaces hosts.
  output: "standalone",
};

export default nextConfig;
