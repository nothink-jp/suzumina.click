# ビルドステージ
FROM oven/bun:latest AS builder
WORKDIR /app

# 依存関係のインストールを最適化
COPY package.json bun.lock turbo.json ./
COPY apps/web/package.json ./apps/web/package.json
COPY packages/typescript-config/package.json ./packages/typescript-config/package.json

# パッケージをインストール
RUN bun install --frozen-lockfile

# ソースコードをコピー
COPY . .

# アプリをビルド
RUN bun run build

# 実行ステージ
FROM node:22-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=8080

# 必要なファイルのみをコピー
COPY --from=builder /app/apps/web/.next/standalone ./
COPY --from=builder /app/apps/web/.next/static ./apps/web/.next/static
COPY --from=builder /app/apps/web/public ./apps/web/public

# コンテナ起動時のコマンド
CMD ["node", "apps/web/server.js"]

# Cloud Runのヘルスチェック用に8080ポートを公開
EXPOSE 8080