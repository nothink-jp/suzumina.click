### Dockerfile for Bun + Next.js
### 必ずmonorepoのルートからビルドしてください
# パッケージのインストールとビルドを行うためのDockerfile
FROM oven/bun:latest AS deps

WORKDIR /monorepo

COPY ./package.json ./
COPY ./bun.lock ./
COPY ./turbo.json ./

# webアプリのpackage.jsonをコピー
COPY ./apps/web/package.json ./apps/web/package.json
RUN bun install --frozen-lockfile

# 必要な場合にのみソースコードを再ビルドする
FROM oven/bun:latest AS builder
WORKDIR /app
COPY --from=deps /monorepo/node_modules ./node_modules
COPY ./apps/web ./

RUN bun run build

# Production image, copy all the files and run next
FROM oven/bun:latest AS runner
WORKDIR /app

ENV NODE_ENV=production

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public

# Automatically leverage output traces to reduce image size
COPY --from=builder --chown=nextjs:nodejs /app/.next ./.next

USER nextjs

EXPOSE 3000

ENV PORT=3000

CMD ["bun", "run", "start"]
