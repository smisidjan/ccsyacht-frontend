# Docker Deployment Fix - Root Cause Analysis

## Issue Summary
Docker builds were failing with "@parcel/watcher not found" errors when using Next.js 16 with TypeScript configuration files.

## Root Cause
Next.js 16.x introduced a regression where TypeScript config files (`next.config.ts`) require @parcel/watcher for file watching, even in production builds. This package has platform-specific native bindings that are incompatible with Alpine Linux (musl libc) used in most Docker Node images.

## Timeline
- **January 27, 2026**: Next.js 16.1.6 released with the regression
- **May 22, 2026**: Issue first appeared in production deployments
- **Solution**: Updated to Next.js 16.2.6 and converted config to CommonJS

## Applied Fixes

### 1. Updated Next.js Version
- Upgraded from `16.1.6` to `^16.2.6` which includes partial fixes
- Run: `npm install next@latest --save`

### 2. Converted TypeScript Config to CommonJS
- Renamed `next.config.ts` to `next.config.js`
- Changed from ES modules (`import`/`export`) to CommonJS (`require`/`module.exports`)
- This bypasses the @parcel/watcher requirement entirely

### 3. Updated Docker Base Image
- Changed from `node:20-alpine` to `node:20-slim` (Debian-based)
- Alpine's musl libc is incompatible with many native Node modules
- Debian's glibc provides better compatibility

### 4. Stability Hardening
- Added Docker healthcheck for container monitoring
- Optimized dependencies with `npm dedupe`
- Verified `.dockerignore` excludes `.next` cache
- Added lightningcss as explicit dependency
- Configured standalone output mode for production

## Configuration Changes

### next.config.js (CommonJS format)
```javascript
const createNextIntlPlugin = require("next-intl/plugin");
const withNextIntl = createNextIntlPlugin("./i18n/request.ts");

const nextConfig = {
  ...(process.env.NODE_ENV === "production" && { output: "standalone" }),
  experimental: {
    optimizePackageImports: [
      "@heroicons/react",
      "@dnd-kit/core",
      // ... other packages
    ],
  },
  // ... rest of config
};

module.exports = withNextIntl(nextConfig);
```

### Dockerfile Updates
```dockerfile
# Use Debian-based image instead of Alpine
FROM node:20-slim AS base

# Add healthcheck
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').request({path: '/', port: 3000, timeout: 2000}, (r) => {process.exit(r.statusCode === 200 ? 0 : 1)}).on('error', () => process.exit(1)).end()"
```

## Verification Steps
1. ✅ No duplicate @parcel/watcher versions
2. ✅ Dependencies optimized with npm dedupe
3. ✅ No deprecated native watcher packages
4. ✅ Docker image optimized (using slim base)
5. ✅ Production startup validated
6. ✅ Turbopack flags checked (optimizePackageImports enabled)
7. ✅ .next cache excluded from Docker layers
8. ✅ Healthcheck added to container
9. ✅ Standalone output mode configured

## Deployment Commands

### Option 1: Server-Side Build (Recommended)
Builds the Docker image on the server to avoid cross-platform compilation issues:
```bash
./deploy-server-build.sh
```

### Option 2: Local Build (ARM64/M1/M2 Macs)
If building locally on Apple Silicon, the image will be ARM64 and won't run on AMD64 servers:
```bash
# Build locally (native platform)
docker build -t ccsyacht-frontend:latest --target production .
```

### Option 3: Direct Deployment (No Docker)
Deploy without Docker containerization:
```bash
./deploy-direct.sh
```

## Known Issues
- Next.js 16.x with TypeScript configs has compatibility issues in containerized environments
- Consider migrating to Next.js 17+ when available for better Docker support
- **Cross-platform Docker builds with native modules**: Building linux/amd64 images on Apple Silicon (ARM64) fails due to:
  - Tailwind CSS v4 oxide native bindings incompatibility with QEMU emulation
  - Next.js Turbopack native dependencies
  - Solution: Build Docker images on the target platform (use `deploy-server-build.sh`)

## Prevention
1. Always use CommonJS format for Next.js config in Docker deployments
2. Prefer Debian-based Docker images over Alpine for Node.js applications
3. Test Docker builds in CI/CD pipeline before production deployment
4. Monitor Next.js release notes for Docker-related regressions