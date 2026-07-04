# Firestore データベース構造

> **この doc の約束（SPR-205）**: ここはコレクションの**台帳**——「在処・用途・ドキュメント ID・アクセス制御・運用」を記す。
> **フィールド shape / 型定義は転記しない**（正本は `packages/shared-types` のコード、または書き込み元の Cloud Function）。
> **複合インデックスの正本は `terraform/firestore_indexes*.tf` + live（`gcloud … list`）**、
> **セキュリティルールの正本は `terraform/firestore_rules.tf`**。型・インデックスの実体はリンク先を直接読むこと。

## コレクション一覧

型 shape はリンク先が正本。ここはコレクションの台帳。

| コレクション | 用途 | ドキュメント ID | 型の正本 | 書き込み |
|---|---|---|---|---|
| `videos` | YouTube 動画メタデータ | 動画 ID（例 `dQw4w9WgXcQ`） | [video.ts](../../packages/shared-types/src/types/firestore/video.ts) `FirestoreServerVideoData` | Cloud Functions |
| `works` | DLsite 作品 | 商品 ID（例 `RJ236867`） | [work-document-schema.ts](../../packages/shared-types/src/entities/work/work-document-schema.ts) `WorkDocument` | Cloud Functions |
| `audioButtons` | 音声ボタン（動画区間参照） | 自動生成 ID | [audio-button.ts](../../packages/shared-types/src/types/audio-button.ts) `AudioButtonDocument` | Server Actions |
| `users` | ユーザープロファイル | Discord ユーザー ID | [user.ts](../../packages/shared-types/src/entities/user.ts) `FirestoreUserData` | Server Actions / 認証 |
| `evaluations` | 作品評価（top10 / star / ng は排他） | `{userId}_{workId}` | [work-evaluation.ts](../../packages/shared-types/src/entities/work-evaluation.ts) `FirestoreWorkEvaluation` | Server Actions |
| `circles` | DLsite サークル | サークル ID（例 `RG23954`） | [circle.ts](../../packages/shared-types/src/types/firestore/circle.ts) `CircleDocument` | Cloud Functions |
| `creators` | DLsite クリエイター（`workCount`/`types` は非正規化統計） | クリエイター ID（Individual Info API の `creater.id`） | [creator.ts](../../packages/shared-types/src/types/firestore/creator.ts) `CreatorDocument` | Cloud Functions |
| `contacts` | お問い合わせ（通知の正は Resend メール = [email.ts](../../apps/web/src/lib/email.ts)。Firestore は送信記録のアーカイブで読み手なし） | 自動生成 ID | [contact.ts](../../packages/shared-types/src/entities/contact.ts) `FirestoreContactData` | Server Actions |
| `ba_user` / `ba_session` / `ba_account` | better-auth の認証データ（認証の正本） | better-auth 採番 | 書き込み元 [firestore-adapter.ts](../../apps/web/src/lib/better-auth/firestore-adapter.ts)（better-auth 標準モデル・prefix `ba_`） | better-auth |
| `youtubeMetadata` | YouTube 取得処理のメタデータ | `fetch_metadata` | 書き込み元 [youtube.ts](../../apps/functions/src/endpoints/youtube.ts)（内部型 `FetchMetadata`・非 export） | Cloud Functions |
| `dlsiteMetadata` | DLsite 収集・整合性チェックのメタデータ | `unified_data_collection_metadata` / `dataIntegrityCheck` | 書き込み元 Cloud Function（[dlsite](../../apps/functions/src/endpoints/dlsite-individual-info-api.ts) / [integrity](../../apps/functions/src/endpoints/data-integrity-check.ts)） | Cloud Functions |

> **クリエイター ⇔ 作品の関連はルートコレクションではない**: 旧記載の `creatorWorkMappings` は存在せず、実体は `creators/{creatorId}/works` サブコレクション（下表）。
> **認証の正本は `ba_*`**: `users` はアプリプロファイル（Discord ID キー）。`ba_user` はログイン時に better-auth が作成するため `users` と件数は一致しない。`_firestore_rules` はシステム生成の内部コレクションで台帳管理外。

### サブコレクション

| パス | 用途 | ドキュメント ID | 型の正本 |
|---|---|---|---|
| `creators/{creatorId}/works` | クリエイター ⇔ 作品の非正規化関連（旧称 `creatorWorkMappings`） | 作品 ID（例 `RJ236867`） | [creator.ts](../../packages/shared-types/src/types/firestore/creator.ts) `CreatorWorkRelation` |
| `users/{userId}/favorites` | 音声ボタンのお気に入り | 音声ボタン ID | [favorite.ts](../../packages/shared-types/src/entities/favorite.ts) `FirestoreFavoriteData` |
| `users/{userId}/likes` / `…/dislikes` | 音声ボタンの高評価 / 低評価 | 音声ボタン ID | 書き込み元 [reaction-toggle.ts](../../apps/web/src/actions/reaction-toggle.ts)（`audioButtonId` + `createdAt` 最小スキーマ） |
| `users/{userId}/top10` | 10 選ランキング | `ranking` | [work-evaluation.ts](../../packages/shared-types/src/entities/work-evaluation.ts) `UserTop10List` |
| `works/{workId}/priceHistory` | 価格履歴（全履歴・多通貨） | `YYYY-MM-DD` | [price-history.ts](../../packages/shared-types/src/utilities/price-history.ts) `PriceHistoryDocument` |
| `dlsiteMetadata/dataIntegrityCheck/history` | 整合性チェック実行履歴（最大 10 件） | 実行日時 ISO | 書き込み元 [Cloud Function](../../apps/functions/src/endpoints/data-integrity-check.ts) |

> **削除済み**: `dlsite_timeseries_raw` / `dlsite_timeseries_daily`（統合アーキテクチャへ移行。価格履歴の後継は
> `works/{workId}/priceHistory`）。`favorites` は最小スキーマ（`audioButtonId` + `addedAt`）で、表示時に `audioButtons` を都度 join する。

## アクセス制御・運用上の制約

コードと Terraform に散る「振る舞い」の索引。**実効値はリンク先が正本**。

**権限境界**（セキュリティルールの正本: [firestore_rules.tf](../../terraform/firestore_rules.tf)）
- 公開読み取り: `videos` / `works` / 公開 `audioButtons` / `circles`
- Cloud Functions のみ書き込み（自動収集）: `videos` / `works` / `circles` / `creators`（+ `creators/{id}/works`） / `priceHistory`
- Server Actions のみ書き込み（認証済み）: `audioButtons` / `evaluations` / `favorites` / `top10` / `likes` / `dislikes` / `contacts`
- better-auth（サーバーのみ）: `ba_user` / `ba_session` / `ba_account`
- 本人のみ読み取り: `users` サブコレクション（`favorites` / `top10`）・`evaluations`

**主な product 制約**（実装が正本）
- `audioButtons`: 参照は最大 5 分 / タイトル 1–100 字 / 説明最大 500 字 / タグ最大 10・各 30 字 / 作成レート 1 日 20 件/ユーザー
- `evaluations`: 1 作品 1 ユーザー 1 評価・評価タイプ排他・10 選は最大 10
- `favorites`: ドキュメント ID = 音声ボタン ID により重複登録を構造的に防止
- `top10`: 1 ユーザー 1 リスト・最大 10・順位重複不可

## データ収集スケジュール（cron → Function → 書き込み先）

cron の正本は Terraform の Cloud Scheduler（[`scheduler.tf`](../../terraform/scheduler.tf) /
[`function_dlsite_individual_info_api.tf`](../../terraform/function_dlsite_individual_info_api.tf) /
[`function_data_integrity_check.tf`](../../terraform/function_data_integrity_check.tf)）。

- `30 * * * *` → [`fetchYouTubeVideos`](../../apps/functions/src/endpoints/youtube.ts) → `videos` / `youtubeMetadata`
- `3 */2 * * *`（2 時間ごと）→ [`fetchDLsiteUnifiedData`](../../apps/functions/src/endpoints/dlsite-individual-info-api.ts) → `works` / `circles` / `creators`（+ `creators/{id}/works`） / `works/{workId}/priceHistory` / `dlsiteMetadata`
- `0 3 * * 0`（日曜 3:00 JST）→ [`checkDataIntegrity`](../../apps/functions/src/endpoints/data-integrity-check.ts) → `dlsiteMetadata/dataIntegrityCheck`（+ `history`）
  - Circle workIds / 孤立 Creator マッピング / Work-Circle 整合を**事後修復**。
    非正規化を増やすとこの cron の負債が増える（CLAUDE.md 軸1）。
- 書き込みは Firestore の 500 件バッチ制限に従いチャンク分割する。

## 複合インデックス

> **インデックスの正本は Terraform + live。この doc は一覧表を持たない**
> （かつてここに置いた表は live と恒常的に乖離したため SPR-205 で撤去）。

- 定義の正本: [firestore_indexes.tf](../../terraform/firestore_indexes.tf)
  （+ [firestore_indexes_audiobuttons_update.tf](../../terraform/firestore_indexes_audiobuttons_update.tf)）
- 稼働実体（live）の確認:
  ```bash
  gcloud firestore indexes composite list \
    --format="table(name.segment(-3):label=COLLECTION,fields[].fieldPath,state)"
  ```
- **新しい `where` + `orderBy` を足すとき**: Emulator は複合インデックスを強制しないため、ローカルで通っても本番で
  `FAILED_PRECONDITION` になりうる。ADC 直結か本番で確認し、必要なら上記 Terraform に追加する
  （CLAUDE.md「ADC 直結に切り替える 3 条件」）。
- `works` 一覧は全件取得 + クライアントサイドフィルタのため複合インデックス不要。

## 型定義の場所

- ドメインの正本マップ: [domain-model.md](domain-model.md)（各概念の PlainObject / Firestore・Zod の在処）
- 共有型: [packages/shared-types/src/](../../packages/shared-types/src/) — `entities/` `plain-objects/` `types/` / 変換 `transformers/` / 検証 `utilities/`
- Cloud Functions 内部のメタ型: [apps/functions/src/](../../apps/functions/src/)（例 `endpoints/youtube.ts` の `FetchMetadata`）

---

最終更新: 2026-06-13（SPR-205: 型 shape の inline 転記・live と乖離したインデックス表・日付付き変更ログを撤去し、
正本——shared-types / Terraform / 書き込み元 Function——へのリンクに集約。1525 行 → 約 90 行）
