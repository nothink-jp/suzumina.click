# Web App デプロイ・運用ガイド

suzumina.click WebアプリケーションのCloud Run運用リファレンス

## 🚀 現在のデプロイ状況

**本番URL**: `https://suzumina-click-web-production-[hash]-an.a.run.app`  
**デプロイ方式**: GitHub Actions自動デプロイ (main ブランチ)  
**インフラ**: Google Cloud Run (asia-northeast1)

## 📊 ステータス確認

### サービス状態確認

```bash
# サービス稼働状況
gcloud run services describe suzumina-click-web --region=asia-northeast1

# 最新リビジョン確認
gcloud run revisions list --service=suzumina-click-web --region=asia-northeast1

# ログ確認（直近1時間）
gcloud logs read "resource.type=cloud_run_revision" --since="1h"
```

### ヘルスチェック

```bash
# アプリケーション応答確認
curl -I https://suzumina-click-web-production-[hash]-an.a.run.app/

# Firestore接続確認
curl https://suzumina-click-web-production-[hash]-an.a.run.app/api/health
```

## 🚨 緊急対応

### トラフィック制御

```bash
# トラフィック停止（緊急時）
gcloud run services update-traffic suzumina-click-web \
  --to-revisions=REVISION_NAME=0 --region=asia-northeast1

# 前リビジョンへの緊急ロールバック
gcloud run services update-traffic suzumina-click-web \
  --to-latest --region=asia-northeast1
```

### 手動デプロイ（緊急時のみ）

```bash
# イメージビルド・デプロイ
gcloud builds submit --config=apps/web/cloudbuild.yaml \
  --substitutions=_SERVICE_NAME=suzumina-click-web
```

## 📈 監視・メトリクス

### パフォーマンス監視

- **Cloud Console**: [Cloud Run メトリクス](https://console.cloud.google.com/run)
- **Cloud Monitoring**: CPU・メモリ・リクエスト数・エラー率
- **Cloud Logging**: アプリケーションログ・エラーログ

### 主要メトリクス

- **レスポンス時間**: < 2秒 (目標)
- **CPU使用率**: < 80% (通常時)
- **メモリ使用率**: < 512MB
- **エラー率**: < 1%

## 🔧 設定・環境変数

### 重要な環境変数

- `NEXTAUTH_URL`: アプリケーションのベースURL
- `NEXTAUTH_SECRET`: セッション暗号化キー (Secret Manager)
- `DISCORD_CLIENT_ID/SECRET`: Discord OAuth認証 (Secret Manager)
- `GOOGLE_CLOUD_PROJECT`: Firestoreプロジェクト設定

### 設定変更

環境変数・設定変更はTerraformで管理されています。  
詳細は `docs/TERRAFORM_GUIDE.md` を参照してください。

## 📚 関連ドキュメント

- `docs/TERRAFORM_GUIDE.md` - インフラ設定・変更
- `docs/AUTH_DEPLOYMENT_GUIDE.md` - Discord認証設定
- `docs/DEPLOYMENT_STRATEGY.md` - デプロイ戦略
- GitHub Actions - `.github/workflows/` でCI/CD設定確認

## 🆘 トラブルシューティング

### よくある問題

1. **Firestore接続エラー**: サービスアカウント権限を確認
2. **Discord認証失敗**: Secret Managerの認証情報を確認
3. **メモリ不足**: Cloud Run設定でメモリ上限を調整

詳細なトラブルシューティングは運用中の状況に応じて随時更新します。