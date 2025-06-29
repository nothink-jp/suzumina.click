# Admin app Dockerfile
FROM node:22-alpine AS base

# pnpm インストール
RUN corepack enable

FROM base AS deps
WORKDIR /app

# pnpm workspace設定をコピー
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/admin/package.json ./apps/admin/
COPY packages/shared-types/package.json ./packages/shared-types/
COPY packages/ui/package.json ./packages/ui/
COPY packages/typescript-config/package.json ./packages/typescript-config/

# 依存関係インストール
RUN pnpm install --frozen-lockfile

FROM base AS builder
WORKDIR /app

# 依存関係をコピー
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/packages/shared-types/node_modules ./packages/shared-types/node_modules
COPY --from=deps /app/packages/ui/node_modules ./packages/ui/node_modules
COPY --from=deps /app/packages/typescript-config/node_modules ./packages/typescript-config/node_modules
COPY --from=deps /app/apps/admin/node_modules ./apps/admin/node_modules

# ソースコードをコピー
COPY . .

# 共有パッケージをビルド
RUN cd packages/shared-types && pnpm build

# admin appをビルド
RUN cd apps/admin && pnpm build

FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# 実行ユーザー作成
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# public フォルダをコピー
COPY --from=builder /app/apps/admin/public ./public

# standalone 出力をコピー
COPY --from=builder --chown=nextjs:nodejs /app/apps/admin/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/apps/admin/.next/static ./apps/admin/.next/static

USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Next.js standalone サーバーを起動
CMD ["node", "apps/admin/server.js"]