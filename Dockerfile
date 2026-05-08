# syntax=docker/dockerfile:1

FROM node:20-alpine AS base

# Install dependencies only when needed
FROM base AS deps
WORKDIR /app

# Copy package files
COPY package.json package-lock.json* ./

# Install dependencies
RUN npm ci

# Development image
FROM base AS development
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

ENV NODE_ENV=development
ENV NEXT_TELEMETRY_DISABLED=1

EXPOSE 3000
CMD ["npm", "run", "dev"]

# Build the application
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

ENV NEXT_TELEMETRY_DISABLED=1

# Set build-time environment variables for production
ENV NODE_ENV=production
ENV NEXT_PUBLIC_API_URL=https://api.papertrail.ccsyacht.com/api
ENV NEXT_PUBLIC_APP_NAME="Papertrail Marine by CCS Yacht"
ENV NEXT_PUBLIC_REVERB_APP_KEY=ccsyacht-production-key
ENV NEXT_PUBLIC_REVERB_HOST=papertrail.ccsyacht.com
ENV NEXT_PUBLIC_REVERB_PORT=443
ENV NEXT_PUBLIC_REVERB_SCHEME=https

RUN npm run build

# Production image
FROM base AS production
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Also set runtime environment variables
ENV NEXT_PUBLIC_API_URL=https://api.papertrail.ccsyacht.com/api
ENV NEXT_PUBLIC_APP_NAME="Papertrail Marine by CCS Yacht"
ENV NEXT_PUBLIC_REVERB_APP_KEY=ccsyacht-production-key
ENV NEXT_PUBLIC_REVERB_HOST=papertrail.ccsyacht.com
ENV NEXT_PUBLIC_REVERB_PORT=443
ENV NEXT_PUBLIC_REVERB_SCHEME=https

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public

# Automatically leverage output traces to reduce image size
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["node", "server.js"]
