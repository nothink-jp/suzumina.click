# ビルドステージ: Node.jsとpnpmを使用してアプリケーションをビルド
FROM node:22-alpine AS builder

# pnpmをインストール
RUN corepack enable && corepack prepare pnpm@latest --activate

# 作業ディレクトリを設定
WORKDIR /app

# ビルド時に必要な環境変数を定義
ARG FIREBASE_SERVICE_ACCOUNT_KEY
ENV FIREBASE_SERVICE_ACCOUNT_KEY=$FIREBASE_SERVICE_ACCOUNT_KEY

# モノレポ全体の依存関係ファイルをコピー
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/web/package.json ./apps/web/

# 依存関係をインストール
RUN pnpm install --frozen-lockfile

# ソースコードをコピー
COPY . .

# publicディレクトリが存在しない場合は作成する
RUN mkdir -p /app/apps/web/public

# Next.jsアプリケーションをビルド
WORKDIR /app/apps/web
RUN pnpm build

# 実行ステージ: ビルド済みアプリケーションを最小限の環境で実行
FROM node:22-alpine AS runner
WORKDIR /app

# 実行時に必要な環境変数を定義
ARG FIREBASE_SERVICE_ACCOUNT_KEY
ENV FIREBASE_SERVICE_ACCOUNT_KEY=$FIREBASE_SERVICE_ACCOUNT_KEY

# 非ルートユーザーでアプリケーションを実行
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs && \
    chown -R nextjs:nodejs /app

# 環境変数を設定
ENV NODE_ENV=production
ENV PORT=8080

# ビルドステージからstandaloneビルドをコピー
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/.next/static ./apps/web/.next/static

# publicディレクトリをコピーする（ビルド時に作成済みなのでエラーにならない）
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/public ./apps/web/public

# ポートを公開
EXPOSE 8080

# 非ルートユーザーに切り替え
USER nextjs

# サーバーの起動
CMD ["node", "apps/web/server.js"]
