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
# ビルド時専用の環境を示すフラグ
ENV BUILD_TIME_MODE=true
# データベースとアプリケーションの基本設定
ENV DATABASE_URL=postgresql://nextjs:nextjs@localhost:5432/nextjs_build
ENV NEXTAUTH_URL=http://build.local:3000
# ビルド時のプレースホルダー値
ENV BUILD_APP=local_app
ENV BUILD_ORG=local_org
ENV BUILD_HOST=build.local

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
# ビルド時フラグをリセット
ENV BUILD_TIME_MODE=

RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

COPY --from=builder --chown=nextjs:nodejs /monorepo/apps/web/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /monorepo/apps/web/public ./apps/web/public
COPY --from=builder --chown=nextjs:nodejs /monorepo/apps/web/.next/static ./apps/web/.next/static

USER nextjs
EXPOSE 3000

CMD ["bun", "apps/web/server.js"]
