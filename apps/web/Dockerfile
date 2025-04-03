### Dockerfile for Bun + Next.js (Standalone Output)
### 必ずmonorepoのルートからビルドしてください
# パッケージのインストールを行うためのステージ
FROM oven/bun:latest AS deps

WORKDIR /monorepo

# ルートと各ワークスペースの package.json をコピー
COPY ./package.json ./bun.lock ./turbo.json ./
COPY ./apps/web/package.json ./apps/web/package.json
# packages/ 内の package.json もコピー (存在する場合)
COPY ./packages/*/package.json ./packages/*/

# 依存関係をインストール
RUN bun install --frozen-lockfile

# アプリケーションをビルドするステージ
FROM oven/bun:latest AS builder

WORKDIR /monorepo

# deps ステージから node_modules をコピー
COPY --from=deps /monorepo/node_modules ./node_modules

# モノレポ全体のソースコードをコピー
COPY . .

# web アプリをビルド (standalone output を生成)
# turbo を使ってビルドすることも可能: RUN bun run turbo run build --filter=web...
RUN bun run --cwd ./apps/web build

# プロダクションイメージ
FROM oven/bun:latest AS runner
WORKDIR /app

ENV NODE_ENV=production
# Uncomment the following line in case you want to disable telemetry during runtime.
# ENV NEXT_TELEMETRY_DISABLED 1

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# standalone ディレクトリに必要なファイルをコピー
COPY --from=builder --chown=nextjs:nodejs /monorepo/apps/web/.next/standalone ./

# public フォルダと static ファイルをコピー
COPY --from=builder --chown=nextjs:nodejs /monorepo/apps/web/public ./apps/web/public
COPY --from=builder --chown=nextjs:nodejs /monorepo/apps/web/.next/static ./apps/web/.next/static

USER nextjs

EXPOSE 3000
ENV PORT=3000

# server.js を実行してアプリケーションを起動
CMD ["bun", "apps/web/server.js"]
