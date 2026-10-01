# @suzumina.click/functions

Cloud Functions（Gen2）。関数は `fetchYouTubeVideos` / `fetchDLsiteUnifiedData` / `checkDataIntegrity` の 3 つで、
エントリは [src/endpoints/index.ts](src/endpoints/index.ts)。デプロイ設定（メモリ・timeout・トピック）の正本は
[deploy-functions.yml](../../.github/workflows/deploy-functions.yml)、手順は [deployment.md](../../docs/guides/deployment.md)。

`build` は esbuild で `lib/` に bundle する（[scripts/build.mjs](scripts/build.mjs)）。`@suzumina.click/shared-types` は
inline されるので devDependencies に置いている。

## ローカルツール

コマンドの一覧は [package.json](package.json) の `scripts`。`lint` / `test` 等の自明なもの以外で、知っておくべき点だけ書く。

**接続先**: `tools:*` / `check:*` / `metrics` / `seed:dump` は `dotenv -e .env` 経由で起動し、Firestore には
**ADC（`gcloud auth application-default login`）で本番に直結**する。`FIRESTORE_EMULATOR_HOST` を設定すれば Emulator を向く
（`seed:dump` だけは逆に Emulator 設定時に実行を拒否する。`tools:capture` は Firestore に触れない）。

| script | 用途 | 本番への書き込み |
| --- | --- | --- |
| `seed:dump` / `seed:load` | Emulator 用フィクスチャの再取得 / 投入（root の `pnpm seed:dump` / `pnpm seed` から呼ぶ。CLAUDE.md §2） | なし（`seed:load` は Emulator 固定） |
| `check:integrity` | `checkDataIntegrity` を手動実行。`-- --dry-run` で検出のみ | **あり**（既定） |
| `check:region-equivalence` | ローカル（日本）scrape と本番 `works` の突合（region 制限の取りこぼし観測） | なし |
| `tools:capture` | 日本 IP から DLsite API を叩く dry-run + raw 捕捉（スキーマ drift・地域制限の観測）。実 API なので `-- --limit 20` 等で絞る | なし |
| `metrics` | 成功指標レポート（SPR-298）を Markdown で標準出力 | なし |
| `tools:backfill-creators` / `tools:backfill-video-status` / `tools:backfill-missing-videos` | 一回限りの backfill（それぞれの背景はファイル冒頭コメント） | **あり** |
| `test:integration` | 整合性チェックの Emulator 実機テスト。**root の `pnpm test:integration`** から呼ぶ（専用ポートで Emulator を起動。直接叩くとスキップされる） | なし |
