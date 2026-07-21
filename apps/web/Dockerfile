# suzumina.click Web Application Dockerfile for Cloud Run
# Optimized for Next.js with advanced caching and monorepo structure

FROM node:24.18.0-alpine AS base
# ベースイメージ同梱の OS パッケージ(openssl libssl3/libcrypto3 等)に既知 CVE が出るため
# Alpine の security backport を取り込んでから必要パッケージを追加する
RUN apk upgrade --no-cache && apk add --no-cache libc6-compat tini

# pnpm v11 では非対話環境での node_modules purge が abort されるため
# CI=true を設定して非対話モードで自動承認させる
# https://pnpm.io/errors#err_pnpm_aborted_remove_modules_dir_no_tty
ENV CI=true

# Install dependencies only when needed
FROM base AS deps
WORKDIR /app

# Install pnpm (use latest version 11 to match engines)
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable pnpm && corepack use pnpm@11
# Ensure yarn is disabled to prevent conflicts
RUN npm config delete prefix 2>/dev/null || true

# Copy package files from project root
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./

# Copy workspace packages
COPY packages/shared-types/package.json ./packages/shared-types/
COPY packages/ui/package.json ./packages/ui/
COPY apps/web/package.json ./apps/web/

# Install all dependencies with cache optimization
RUN --mount=type=cache,id=pnpm,target=/pnpm \
    pnpm install --frozen-lockfile

# Rebuild the source code only when needed
FROM base AS builder
WORKDIR /app

# Install pnpm
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable pnpm && corepack use pnpm@11
# Ensure yarn is disabled to prevent conflicts
RUN npm config delete prefix 2>/dev/null || true

COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/packages ./packages
COPY --from=deps /app/apps ./apps
COPY . .

# shared-types / ui packages don't need build - they export TypeScript/React sources directly
# (Next.js transpiles them via transpilePackages)

# Build web application with Next.js cache
WORKDIR /app/apps/web

# Disable telemetry during build
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production

# Build the application with Next.js cache optimization
RUN --mount=type=cache,id=nextjs,target=/app/apps/web/.next/cache \
    pnpm build

# Production image, copy all the files and run next
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Create app user for security
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# 実行時に npm は不要(node server.js で起動)。ベースイメージ同梱 npm の既知脆弱性
# (brace-expansion / ip-address 等)を除去し、攻撃面も削減する
RUN rm -rf /usr/local/lib/node_modules/npm /usr/local/bin/npm /usr/local/bin/npx

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