# suzumina.click Admin App

管理者専用のNext.jsアプリケーション（0インスタンス運用）

## 概要

本アプリケーションは、suzumina.clickプロジェクトの管理者専用機能を提供する独立したNext.jsアプリです。

### 主要特徴

- **0インスタンス運用**: 通常時はインスタンス数0、必要時のみスケールアップ
- **管理者専用認証**: Discord OAuth + 管理者ID一覧による厳格な認証
- **コスト最適化**: 使用時のみ課金、待機コストなし
- **セキュリティ強化**: 管理者のみアクセス可能

## 技術仕様

- **Framework**: Next.js 15 (App Router)
- **Authentication**: NextAuth.js 5.0 + Discord OAuth
- **Styling**: Tailwind CSS v4 + suzuka/minase ブランドカラー
- **Infrastructure**: Google Cloud Run (asia-northeast1)
- **Container**: Node.js 22 + standalone output

## 環境変数

| Variable | Description | Required |
|----------|-------------|----------|
| `NODE_ENV` | 環境識別子 | Yes |
| `GCP_PROJECT_ID` | Google Cloud プロジェクトID | Yes |
| `NEXTAUTH_URL` | 認証用ベースURL | Yes |
| `NEXTAUTH_SECRET` | NextAuth暗号化シークレット | Yes |
| `DISCORD_CLIENT_ID` | Discord OAuth Client ID | Yes |
| `DISCORD_CLIENT_SECRET` | Discord OAuth Client Secret | Yes |
| `ADMIN_DISCORD_IDS` | 管理者Discord ID（カンマ区切り） | Yes |

## 開発

```bash
# 依存関係インストール
pnpm install

# 開発サーバー起動
cd apps/admin && pnpm dev

# ビルド
pnpm build

# 型チェック
pnpm typecheck

# リント
pnpm lint
```

## デプロイ

### 自動デプロイ（推奨）

1. `main`ブランチに変更をプッシュ
2. GitHub Actions が自動実行
3. Google Cloud Run にデプロイ

### 手動デプロイ

```bash
# Docker イメージビルド
docker build -f apps/admin/Dockerfile -t admin-app .

# Google Cloud 認証
gcloud auth configure-docker asia-northeast1-docker.pkg.dev

# イメージプッシュ
docker tag admin-app asia-northeast1-docker.pkg.dev/$PROJECT_ID/suzumina-click/suzumina-admin:latest
docker push asia-northeast1-docker.pkg.dev/$PROJECT_ID/suzumina-click/suzumina-admin:latest

# Cloud Run デプロイ
gcloud run deploy suzumina-admin \
  --image asia-northeast1-docker.pkg.dev/$PROJECT_ID/suzumina-click/suzumina-admin:latest \
  --region asia-northeast1 \
  --min-instances 0 \
  --max-instances 1
```

## アクセス

- **URL**: https://admin.suzumina.click
- **認証**: Discord OAuth（管理者のみ）
- **アクセス制御**: IAM + 環境変数による二重認証

## セキュリティ

- NextAuth.js による安全な認証
- 管理者ID一覧による厳格なアクセス制御
- Cloud Run IAM による追加保護
- CSP ヘッダーによるセキュリティ強化

## 監視

- Cloud Logging による構造化ログ
- Cloud Monitoring によるメトリクス監視
- 0インスタンス運用時のコールドスタート対応

## トラブルシューティング

### よくある問題

1. **ログインできない**
   - Discord ID が `ADMIN_DISCORD_IDS` に含まれているか確認
   - Cloud Run IAM 設定を確認

2. **Cold Start が遅い**
   - 0インスタンス運用の仕様
   - 必要に応じて min-instances を 1 に設定

3. **環境変数が読み込まれない**
   - Secret Manager の設定を確認
   - Cloud Run の環境変数設定を確認