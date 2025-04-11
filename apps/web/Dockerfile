### Dockerfile for Bun + Next.js (Standalone Output)
### Build from monorepo root

# --- Base Dependencies Stage ---
FROM oven/bun:alpine AS deps
WORKDIR /monorepo

COPY ./package.json ./bun.lock ./turbo.json ./
COPY ./apps/web/package.json ./apps/web/package.json
COPY ./packages ./packages

RUN bun install --frozen-lockfile

# --- Builder Stage ---
FROM oven/bun:alpine AS builder
WORKDIR /monorepo

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
# ビルド時に必要な環境変数を設定
ENV DATABASE_URL="postgresql://dummy:dummy@localhost:5432/dummy"
ENV NEXTAUTH_URL="http://localhost:3000"
ENV NEXTAUTH_SECRET="dummy-secret-for-build"
ENV DISCORD_CLIENT_ID="dummy-client-id"
ENV DISCORD_CLIENT_SECRET="dummy-secret"
ENV DISCORD_GUILD_ID="dummy-guild-id"
ENV AUTH_TRUST_HOST="localhost"

COPY --from=deps /monorepo/node_modules ./node_modules
COPY --from=deps /monorepo/packages ./packages

COPY package.json package.json
COPY bun.lock bun.lock
COPY turbo.json turbo.json
COPY biome.json biome.json

COPY ./apps/web ./apps/web
COPY ./packages ./packages

# Turboでビルド実行時に環境変数を明示的に渡す
RUN NODE_ENV=production bun run turbo run build --filter=@suzumina.click/web...

# --- Runner Stage ---
FROM oven/bun:alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000

RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

COPY --from=builder --chown=nextjs:nodejs /monorepo/apps/web/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /monorepo/apps/web/public ./apps/web/public
COPY --from=builder --chown=nextjs:nodejs /monorepo/apps/web/.next/static ./apps/web/.next/static

USER nextjs
EXPOSE 3000

CMD ["bun", "apps/web/server.js"]
