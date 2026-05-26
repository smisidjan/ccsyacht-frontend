const createNextIntlPlugin = require("next-intl/plugin");

const withNextIntl = createNextIntlPlugin("./i18n/request.ts");

// Backend URL for API proxying in development
// In production, nginx handles this
const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:9000";

const nextConfig = {
  ...(process.env.NODE_ENV === "production" && { output: "standalone" }),
  experimental: {
    // Rewrite barrel imports to direct paths so unused exports don't get parsed.
    // Critical for @heroicons/react (96 import sites in this codebase).
    optimizePackageImports: [
      "@heroicons/react",
      "@heroicons/react/24/outline",
      "@heroicons/react/24/solid",
      "@dnd-kit/core",
      "@dnd-kit/sortable",
      "@dnd-kit/utilities",
    ],
  },
  // Proxy /api requests to the Laravel backend in development
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `${BACKEND_URL}/api/:path*`,
      },
    ];
  },
};

module.exports = withNextIntl(nextConfig);