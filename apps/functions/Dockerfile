# apps/functions を Cloud Run Jobs として動かすためのイメージ（SPR-415 / 設計は SPR-358）
#
# 中身は `lib/job.js`（esbuild のバンドル。入口は src/jobs/main.ts）と、本番依存の node_modules だけ。
# 起動は `node lib/job.js <mode>`。mode（dlsite / dlsite-full-sweep / integrity）は、ジョブの定義（Terraform）が
# 引数で渡す。Functions（lib/index.js）はこのイメージを使わない（zip のソースデプロイのまま）。
#
# ビルドコンテキストはリポジトリのルート（apps/web/Dockerfile と同じ）。

# Node の版の正本はルート package.json の devEngines.runtime.version。ここは写しで、
# 一致は pnpm lint:node-version が強制する（apps/web/Dockerfile と同じ扱い＝SPR-405）。
FROM node:26.13.1-alpine AS base
# base image は patch まで pin しているので中身が凍結される。次の bump までに出る Alpine 側の修正を拾う
RUN apk upgrade --no-cache && apk add --no-cache tini

# pnpm v11 以降は非対話環境での node_modules purge が abort されるため、非対話モードにする
ENV CI=true

FROM base AS builder
WORKDIR /app

ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
# pnpm の版の正本はルート package.json の packageManager。corepack install はそれを入れる。
# 初回起動時のバイナリ取得は 30 秒で打ち切られて再試行しないので、ここで再試行付きで取りきる（web と同じ）
COPY package.json ./
RUN corepack enable pnpm && corepack install \
    && for attempt in 1 2 3; do \
         pnpm --version && break; \
         [ "$attempt" = 3 ] && exit 1; \
         sleep 5; \
       done

# 依存の解決に要るものだけを先に入れる（ソースの変更で install のレイヤーを捨てないため）
COPY pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages/shared-types/package.json ./packages/shared-types/
COPY packages/typescript-config/package.json ./packages/typescript-config/
COPY apps/functions/package.json ./apps/functions/
RUN --mount=type=cache,id=pnpm,target=/pnpm \
    pnpm install --frozen-lockfile --filter "@suzumina.click/functions..."

COPY packages/shared-types ./packages/shared-types
COPY packages/typescript-config ./packages/typescript-config
COPY apps/functions ./apps/functions

# shared-types は esbuild がバンドルに取り込む（ビルド不要）
RUN pnpm --filter @suzumina.click/functions build

# 本番依存だけの node_modules を切り出す（lockfile どおりの版。deploy-functions.yml の zip と同じ手順）
RUN --mount=type=cache,id=pnpm,target=/pnpm \
    pnpm --filter @suzumina.click/functions deploy --prod /out

FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production

RUN addgroup --system --gid 1001 nodejs && adduser --system --uid 1001 jobs

# 実行時に npm は要らない。同梱の npm の既知の脆弱性を持ち込まない
RUN rm -rf /usr/local/lib/node_modules/npm /usr/local/bin/npm /usr/local/bin/npx

COPY --from=builder --chown=jobs:nodejs /out/node_modules ./node_modules
COPY --from=builder --chown=jobs:nodejs /out/package.json ./package.json
COPY --from=builder --chown=jobs:nodejs /app/apps/functions/lib/job.js /app/apps/functions/lib/job.js.map ./lib/

USER jobs

# tini を挟むのは、シグナル（Jobs のタイムアウト時の SIGTERM）を node に正しく渡すため
ENTRYPOINT ["/sbin/tini", "--", "node", "lib/job.js"]
