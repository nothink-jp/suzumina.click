# デプロイ Runbook

通常のデプロイは **main へのマージで自動**。この doc はワークフローから読み取れない手順
（リリース・緊急時・ロールバック）だけを置く。手順の正本は各 workflow で、ここに flag は転記しない。

| 対象 | 正本 | 起動条件 |
| --- | --- | --- |
| web（Cloud Run `suzumina-click-web`） | [deploy-web.yml](../../.github/workflows/deploy-web.yml) | main push（`apps/web` / `packages/shared-types` / `packages/ui` / 自 workflow の変更時）+ `workflow_dispatch` |
| functions（Cloud Functions v2） | [deploy-functions.yml](../../.github/workflows/deploy-functions.yml) | main push（`apps/functions` / `packages/shared-types` / 自 workflow の変更時）+ `workflow_dispatch` |
| インフラ | [terraform.yml](../../.github/workflows/terraform.yml)（背景は [ADR-010](../decisions/infrastructure/ADR-010-terraform-ci-plan-apply.md)） | PR で plan のみ → main マージで plan → Environment(production) 承認 → 暗号化した保存 plan を apply |

- いずれも `if: github.ref == 'refs/heads/main'` で main 以外は弾く。main は ruleset で PR 必須のため、
  デプロイ前の再検査は持たない（main に届くコードは pr-check 済み）。
- GCP 認証は Workload Identity Federation（SA キーは使わない）。
- Cloud Run の spec（cpu / memory / instances / timeout）と invoker は terraform（[locals.tf](../../terraform/locals.tf) / `cloud_run.tf`）が正本。
  deploy-web は image / env / secret だけを更新する（[ADR-009](../decisions/infrastructure/ADR-009-deploy-iac-responsibility-split.md)）。
- アプリの機密（Discord / better-auth / YouTube / Gemini / Resend 等）は Secret Manager。terraform はシークレットの器だけを持ち
  値は管理しない（`secrets.tf` の `ignore_changes=[secret_data]`）＝値の更新は out-of-band で `gcloud secrets versions add`。
- エッジ（DNS / キャッシュルール）は Cloudflare（`terraform/cloudflare*.tf`）。

## Functions とトピック

関数のメモリ・タイムアウト・max-instances・SA・環境変数の**正本は deploy-functions.yml**。
値を変えた理由（OOM 実測・タイムアウト超過）はその近接コメントにある。

| 関数 | トリガートピック | 役割 |
| --- | --- | --- |
| `fetchYouTubeVideos` | `youtube-video-fetch-trigger` | YouTube 動画の取得 |
| `fetchDLsiteUnifiedData` | `dlsite-individual-api-trigger` | DLsite Individual Info API から `works` を更新 |
| `checkDataIntegrity` | `data-integrity-check-trigger` | 整合性チェック（日曜 3:00 JST・ingress は internal-only） |

Gen2 のため実体は Cloud Run サービス（名前は小文字: `fetchyoutubevideos` 等）。ログもこのサービス名で引く。

## リリース手順（バージョン・タグは手動）

1. `pnpm verify` を通す（手元の完全版ゲート。CI の pr-check は変更パッケージ単位の差分実行で同一判定ではない＝CLAUDE.md §1）
2. **全 package.json の version を lockstep で揃える**: `package.json` / `apps/web` / `apps/functions` /
   `packages/shared-types` / `packages/ui` / `packages/typescript-config`
   ```bash
   perl -pi -e 's/"version": "0\.3\.13"/"version": "0.3.14"/' \
     package.json apps/*/package.json packages/*/package.json
   ```
   workspace パッケージの version は pnpm-lock.yaml に載らないため lockfile の更新は不要。
3. 変更履歴は git log（Conventional Commits）と Linear が正本（[changelog.md](../operations/changelog.md) は v0.3.13 で凍結）。
4. `chore: bump version to v0.3.x` を PR 経由で main にマージ。
5. マージ後、main で手動タグ: `git tag v0.3.x && git push origin v0.3.x`

## 緊急デプロイ

1. **まず workflow を手で再実行**する（Actions の `workflow_dispatch` を main で）。flag の取りこぼしが起きない。
2. Actions 自体が使えない場合のみ手動:
   - **web**: Artifact Registry に `:<commit sha>` タグで image が残っているので、既知の良い image を指して
     `gcloud run deploy suzumina-click-web --image <image> --region asia-northeast1`。
     `gcloud run deploy` は update セマンティクスで、指定しない flag（env / secret / spec）は現行 revision の値を保持する。
   - **functions**: `--source apps/functions` では**デプロイしない**。workflow は esbuild bundle + `pnpm deploy --prod` で
     lockfile 固定の zip を作って GCS 経由で渡している（shared-types は inline）。手動でも deploy-functions.yml の
     「Create deployment bundle」以降を同じ手順で再現する。
3. 復旧後は必ず workflow 経由で再デプロイして設定を揃える（手動デプロイは既存設定を上書きしうる）。

## ロールバック

- **web**: deploy-web はリビジョンを直近 3 つ残して掃除するので、それがロールバック先。
  ```bash
  gcloud run revisions list --service suzumina-click-web --region asia-northeast1
  gcloud run services update-traffic suzumina-click-web --region asia-northeast1 --to-revisions=<revision>=100
  ```
  次の通常デプロイでトラフィックは最新 revision に戻るため、恒久対応は revert PR で行う。
- **functions**: revert PR を main にマージして再デプロイするのが基本（各関数も直近 3 revision を保持）。
- **Firestore**: terraform にバックアップ / PITR の定義は無い（`firestore_database.tf`）。データの巻き戻し手段は用意されていない前提で、
  破壊的操作は Emulator で試す（CLAUDE.md §2）。

## デプロイ後の確認

deploy-web は公開 URL の `/api/health` が 200 を返さなければ job を落とす（手動確認は不要）。
アラートと閾値は [monitoring.md](../operations/monitoring.md) を参照。
