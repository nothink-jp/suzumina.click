FROM node:18-alpine AS runner
WORKDIR /app
ENV NODE_ENV production

# Next.jsのstandaloneモードで生成されたファイルをコピー
COPY .next/standalone ./
COPY .next/static ./.next/static
COPY public ./public

# アプリケーションのポートを設定
EXPOSE 8080
ENV PORT 8080

# サーバーを起動
CMD ["node", "server.js"]