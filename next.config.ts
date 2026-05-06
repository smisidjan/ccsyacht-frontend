import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./i18n/request.ts");

// Backend URL for API proxying in development
// In production, nginx handles this
const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:9000";

const nextConfig: NextConfig = {
  ...(process.env.NODE_ENV === "production" && { output: "standalone" as const }),
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

export default withNextIntl(nextConfig);
