/** @type {import('next').NextConfig} */
const nextConfig = {
  // Standalone output for Docker — produces self-contained .next/standalone
  output: "standalone",

  images: {
    domains: [],
  },

  // Trust reverse proxy for HTTPS termination
  poweredByHeader: false,

  // Production browser source maps disabled
  productionBrowserSourceMaps: false,

  experimental: {
    serverComponentsExternalPackages: ["@prisma/client"],
  },
};

export default nextConfig;
