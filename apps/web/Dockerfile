# suzumina.click Web Application Dockerfile for Cloud Run
# Optimized for Next.js 15 with standalone output and monorepo structure

FROM node:22-alpine AS base
RUN apk add --no-cache libc6-compat tini

# Install dependencies only when needed
FROM base AS deps
WORKDIR /app

# Install pnpm (use latest version 10 to match engines)
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable pnpm && corepack use pnpm@10
# Ensure yarn is disabled to prevent conflicts
RUN npm config delete prefix 2>/dev/null || true

# Copy package files from project root
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./

# Copy workspace packages
COPY packages/shared-types/package.json ./packages/shared-types/
COPY packages/ui/package.json ./packages/ui/
COPY apps/web/package.json ./apps/web/

# Install all dependencies
RUN pnpm install --frozen-lockfile

# Rebuild the source code only when needed
FROM base AS builder
WORKDIR /app

# Install pnpm
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable pnpm && corepack use pnpm@10
# Ensure yarn is disabled to prevent conflicts
RUN npm config delete prefix 2>/dev/null || true

COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/packages ./packages
COPY --from=deps /app/apps ./apps
COPY . .

# Build shared-types first (dependency for web)
WORKDIR /app/packages/shared-types
RUN pnpm build

# UI package doesn't need build - it exports TypeScript/React components directly

# Build web application
WORKDIR /app/apps/web

# Disable telemetry during build
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production

# Build the application
RUN pnpm build

# Production image, copy all the files and run next
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Create app user for security
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy built application (standalone includes all dependencies)
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/.next/static ./apps/web/.next/static

# Copy public directory (create if empty)
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/public ./apps/web/public

# Switch to app user
USER nextjs

# Cloud Run default port
EXPOSE 8080

ENV PORT=8080
ENV HOSTNAME="0.0.0.0"

# Health check optimized for Cloud Run (no curl dependency)
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:8080/api/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1) })"

# Use tini as init system for proper signal handling
ENTRYPOINT ["/sbin/tini", "--"]

# Start the application
CMD ["node", "apps/web/server.js"]