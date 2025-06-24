# GitHub Actions CI/CD デプロイメントガイド

## 概要

suzumina.clickプロジェクトは、完全にGitHub ActionsベースのCI/CDパイプラインを使用してデプロイされます。デプロイスクリプトを使用せず、すべてのデプロイ処理をソースコードベースで管理します。

## CI/CDパイプライン構成

### 1. **Web Application (Cloud Run)**

#### ファイル: `.github/workflows/deploy-cloud-run.yml`

**トリガー条件:**
- `main`ブランチへのpush（Web関連ファイル変更時）
- 手動実行（`workflow_dispatch`）

**デプロイフロー:**
1. **品質チェック**
   - pnpm依存関係インストール
   - TypeScript型チェック
   - ESLintによるコード品質チェック
   - テスト実行

2. **イメージビルド & プッシュ**
   - Docker イメージビルド（`apps/web/Dockerfile`使用）
   - Artifact Registry へプッシュ
   - タグ: `{sha}` と `latest`

3. **Cloud Run デプロイ**
   - 環境変数とSecret Manager連携
   - サービスアカウント設定
   - リソース制限（CPU: 1, Memory: 2Gi）
   - 自動スケーリング（0-10インスタンス）

4. **デプロイ後処理**
   - パブリックアクセス設定
   - ヘルスチェック（10回リトライ）
   - 古いイメージのクリーンアップ

### 2. **Cloud Functions (データ収集)**

#### ファイル: `.github/workflows/deploy-functions.yml`

**機能:**
- YouTube動画データ収集（`fetchYouTubeVideos`）
- DLsite作品データ収集（`fetchDLsiteWorks`）

### 3. **セキュリティ・品質管理**

#### ファイル: `.github/workflows/security-scan.yml`
- 定期的なセキュリティスキャン（毎日実行）
- 依存関係の脆弱性チェック

#### ファイル: `.github/workflows/dependency-update-check.yml`
- 依存関係更新の検証

## 認証・権限管理

### Workload Identity Federation

```
GitHub Repository → OIDC Token → Workload Identity Pool → Service Account
```

**設定値:**
- Pool: `projects/{PROJECT_NUMBER}/locations/global/workloadIdentityPools/github-pool`
- Provider: `github-provider`
- Repository制限: `nothink-jp/suzumina.click`

### サービスアカウント

1. **GitHub Actions メイン SA**: `github-actions-sa@{PROJECT_ID}.iam.gserviceaccount.com`
   - Cloud Run デプロイ権限
   - Artifact Registry書き込み権限
   - IAMサービスアカウント使用権限

2. **Cloud Functions専用 SA**: `cloud-functions-deployer-sa@{PROJECT_ID}.iam.gserviceaccount.com`
   - Cloud Functions開発者権限（最小権限）

3. **Cloud Run実行用 SA**: `cloud-run-nextjs@{PROJECT_ID}.iam.gserviceaccount.com`
   - Firestore アクセス権限
   - Secret Manager アクセス権限

## 環境変数・シークレット管理

### GitHub Secrets（リポジトリ設定）

必要なシークレット:
```
GCP_PROJECT_ID=suzumina-click
GCP_PROJECT_NUMBER=340304800893
```

### Cloud Run環境変数

**直接設定:**
```
NODE_ENV=production
NEXT_TELEMETRY_DISABLED=1
GOOGLE_CLOUD_PROJECT={PROJECT_ID}
NEXTAUTH_URL=https://suzumina.click
AUTH_TRUST_HOST=true
```

**Secret Manager連携:**
```
DISCORD_CLIENT_ID=DISCORD_CLIENT_ID:latest
DISCORD_CLIENT_SECRET=DISCORD_CLIENT_SECRET:latest
DISCORD_BOT_TOKEN=DISCORD_BOT_TOKEN:latest
NEXTAUTH_SECRET=NEXTAUTH_SECRET:latest
YOUTUBE_API_KEY=YOUTUBE_API_KEY:latest
```

## デプロイ実行方法

### 1. 自動デプロイ（推奨）

```bash
# メイン開発
git add .
git commit -m "feat: 新機能追加"
git push origin main  # 自動デプロイが開始
```

### 2. 手動デプロイ

GitHub Web UI:
1. リポジトリの「Actions」タブを開く
2. 「Deploy to Cloud Run」ワークフローを選択
3. 「Run workflow」ボタンをクリック
4. `main`ブランチを選択して実行

### 3. デプロイ状況確認

```bash
# Cloud Run サービス状況確認
gcloud run services describe suzumina-click-web --region=asia-northeast1

# ログ確認
gcloud logging read "resource.type=cloud_run_revision" --limit=50
```

## トラブルシューティング

### よくある問題と解決方法

1. **Secret Manager権限エラー**
   ```
   Permission denied on secret: ...
   ```
   → Terraformで権限設定が完了していることを確認

2. **イメージビルド失敗**
   → `packages/shared-types`のビルドが完了しているか確認

3. **ヘルスチェック失敗**
   → `/api/health`エンドポイントの実装を確認

4. **認証エラー**
   → `NEXTAUTH_URL`と`AUTH_TRUST_HOST`の設定を確認

### ワークフロー失敗時の対処

1. **GitHub Actions ログ確認**
   - リポジトリの「Actions」タブで詳細ログを確認

2. **リトライ実行**
   - 一時的なネットワークエラーの場合は再実行

3. **ロールバック**
   ```bash
   # 前のリビジョンに戻す
   gcloud run services update-traffic suzumina-click-web \
     --to-revisions=PREVIOUS_REVISION=100 \
     --region=asia-northeast1
   ```

## セキュリティ考慮事項

1. **最小権限の原則**
   - 各サービスアカウントは必要最小限の権限のみ付与

2. **シークレット管理**
   - 認証情報はSecret Managerで暗号化保存
   - GitHubリポジトリに平文で保存しない

3. **アクセス制限**
   - Workload Identity FederationでリポジトリとブランチをIP制限

4. **監査ログ**
   - すべてのデプロイ操作がGitHub Actionsで記録

## メンテナンス

### 定期実行タスク

- **セキュリティスキャン**: 毎日2:00 AM UTC
- **依存関係チェック**: プルリクエスト時
- **古いイメージクリーンアップ**: デプロイ時に自動実行

### 手動メンテナンス

```bash
# 全てのワークフローログ確認
gh workflow list

# 失敗したワークフローの詳細確認
gh workflow view deploy-cloud-run

# 手動でのSecret更新
gcloud secrets versions add DISCORD_CLIENT_SECRET --data-file=-
```

このCI/CDパイプラインにより、コードプッシュからデプロイまでが完全自動化され、品質とセキュリティが保証された安全なデプロイメントが実現されています。