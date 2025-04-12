### Dockerfile for Bun + Next.js (Standalone Output)
### Build from monorepo root

# --- Base Dependencies Stage ---
FROM oven/bun:alpine AS deps
WORKDIR /monorepo

COPY ./package.json ./bun.lock ./
COPY ./apps/web/package.json ./apps/web/package.json
COPY ./packages ./packages

RUN bun install --frozen-lockfile

# --- Builder Stage ---
FROM oven/bun:alpine AS builder
WORKDIR /monorepo

# ビルドに必要な最小限の環境変数のみ設定
ENV NEXT_TELEMETRY_DISABLED=1

COPY --from=deps /monorepo/package.json ./package.json
COPY --from=deps /monorepo/bun.lock ./bun.lock
COPY --from=deps /monorepo/node_modules ./node_modules
COPY --from=deps /monorepo/packages ./packages

COPY ./apps/web ./apps/web
COPY ./turbo.json ./turbo.json

# Next.jsのビルドを実行（NODE_ENV=productionを明示的に指定）
RUN NODE_ENV=production bun run build

# --- Runner Stage ---
FROM oven/bun:alpine AS runner

# 実行時の環境変数を設定
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000

RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Next.jsのstandaloneビルド出力をコピー
WORKDIR /monorepo
COPY --from=builder --chown=nextjs:nodejs /monorepo/apps/web/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /monorepo/apps/web/.next/static ./apps/web/.next/static
COPY --from=builder --chown=nextjs:nodejs /monorepo/apps/web/public ./apps/web/public

USER nextjs
EXPOSE 3000

CMD ["bun", "apps/web/server.js"]
