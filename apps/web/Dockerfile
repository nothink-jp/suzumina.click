### Dockerfile for Bun + Next.js (Standalone Output)
### 必ずmonorepoのルートからビルドしてください
# --------------
# パッケージのインストールを行うためのステージ
FROM oven/bun:alpine AS deps

WORKDIR /monorepo

# ルートと各ワークスペースの package.json 等をコピー
COPY ./package.json ./bun.lock ./turbo.json ./bunfig.toml* ./

# ワークスペースのディレクトリを作成
RUN mkdir -p apps/web packages/ui packages/tailwind-config packages/typescript-config

# 各ワークスペースの package.json を対応するディレクトリにコピー
COPY ./apps/web/package.json ./apps/web/
COPY ./packages/ui/package.json ./packages/ui/
COPY ./packages/tailwind-config/package.json ./packages/tailwind-config/
COPY ./packages/typescript-config/package.json ./packages/typescript-config/

# 依存関係をインストール
# Bun はコピーされた package.json と bun.lockb を基に依存関係を解決するはず
RUN bun install --frozen-lockfile

# --------------
# アプリケーションをビルドするステージ
FROM oven/bun:alpine AS builder

WORKDIR /monorepo

# deps ステージから node_modules をコピー
COPY --from=deps /monorepo/node_modules ./node_modules
# deps ステージからインストール済みの package.json 等もコピー (ビルド時に必要になる場合がある)
COPY --from=deps /monorepo/package.json ./
COPY --from=deps /monorepo/apps/web/package.json ./apps/web/

# モノレポ全体のソースコードをコピー (node_modules は除く)
# .dockerignore で node_modules を除外していることを確認してください
COPY . .

# web アプリをビルド (standalone output を生成)
# turbo を使ってビルドすることも可能: RUN bun run turbo run build --filter=web...
RUN bun run --cwd ./apps/web build

# --------------
# プロダクションイメージ
# Use an Alpine base image for the smallest size (check compatibility)
FROM oven/bun:alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
# Uncomment the following line in case you want to disable telemetry during runtime.
# ENV NEXT_TELEMETRY_DISABLED 1

# Combine RUN commands to reduce layers
# Alpine uses 'addgroup -S' and 'adduser -S' for system users/groups
RUN addgroup -S --gid 1001 nodejs && adduser -S --uid 1001 -G nodejs nextjs

# standalone ディレクトリに必要なファイルをコピー
COPY --from=builder --chown=nextjs:nodejs /monorepo/apps/web/.next/standalone ./

# public フォルダと static ファイルをコピー
COPY --from=builder --chown=nextjs:nodejs /monorepo/apps/web/public ./public
COPY --from=builder --chown=nextjs:nodejs /monorepo/apps/web/.next/static ./.next/static

USER nextjs

EXPOSE 3000
ENV PORT=3000

# server.js を実行してアプリケーションを起動
# standalone output では server.js はルートに配置される
CMD ["bun", "server.js"]
