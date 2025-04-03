# ドキュメント改善計画

## 目的

設計ドキュメント間の一貫性を向上させ、誤解を防ぐことを目的とします。

## 修正対象と内容

### 1. 表記揺れ: Cloud Functions / Cloud Run Functions

- **対象ファイル (例):**
  - `PR_YOUTUBE_API_PLAN.md`
  - `GCP_OVERVIEW.md`
  - `GCP_FUNCTIONS.md`
  - (必要に応じて `search_files` で他のファイルも確認)
- **修正内容:**
  - 「Cloud Run Functions」という表記、および文脈から Cloud Functions (2nd gen) を指すことが明らかな箇所を、「Cloud Functions (2nd gen)」または単に「Cloud Functions」に統一します。（例: `GCP_FUNCTIONS.md` の記述に合わせる）

### 2. 表記揺れ: Dockerリポジトリ (GCR vs Artifact Registry)

- **対象ファイル:**
  - `DEVELOPMENT_SETUP.md` (開発フローのコマンド例)
  - `WEB_APP_SETUP.md` (開発スクリプト例)
- **修正内容:**
  - Dockerイメージのプッシュ先として `gcr.io/...` と記載されている箇所を、プロジェクトで採用している Artifact Registry の形式 (`asia-northeast1-docker.pkg.dev/suzumina-click-dev/...`) に統一します。

### 3. ドキュメント重複: Webアプリ設定 (`WEB_APP_SETUP.md` vs `GCP_WEB_APP.md`)

- **対象ファイル:**
  - `WEB_APP_SETUP.md`
  - `GCP_WEB_APP.md`
- **修正方針 (案):**
  - 各ドキュメントの役割を明確化します。
  - `GCP_WEB_APP.md`: 主に**設計思想**や**アーキテクチャ**、Cloud Run の**設定概要**を記述するドキュメントとします。詳細なセットアップ手順やコマンド例は `WEB_APP_SETUP.md` への参照に置き換えるか、削除します。
  - `WEB_APP_SETUP.md`: 主に**具体的なセットアップ手順**、**テスト手順**、**デプロイコマンド例**を記述するドキュメントとします。設計思想に関する記述は `GCP_WEB_APP.md` への参照に置き換えます。
  - これにより、情報の重複を減らし、各ドキュメントの焦点を明確にします。

## 作業手順 (Codeモード移行後)

1. `search_files` ツールを使用し、上記修正対象箇所を正確に特定します。
2. `apply_diff` または `search_and_replace` ツールを使用し、各ファイルの該当箇所を修正計画に従って修正します。
3. 修正内容を確認し、`attempt_completion` で作業完了を報告します。
