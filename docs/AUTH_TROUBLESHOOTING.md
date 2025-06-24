# NextAuth.js 認証トラブルシューティングガイド

## UntrustedHost エラーの解決方法

### 問題の症状

```
[auth][error] UntrustedHost: Host must be trusted. URL was: https://suzumina.click/api/auth/session
```

このエラーは、NextAuth.js がリバースプロキシ（Cloud Run）経由でリクエストを受け取る際に、ホストの信頼性を確認できない場合に発生します。

### 解決方法

#### 1. auth.ts に trustHost 設定を追加

```typescript
export const { handlers, auth, signIn, signOut } = NextAuth({
  // 本番環境でのリバースプロキシ対応
  trustHost: true,
  
  // 既存の設定...
})
```

#### 2. Cloud Run デプロイ時の環境変数設定

```bash
# scripts/deploy-cloud-run.sh で以下を設定
--set-env-vars="NEXTAUTH_URL=https://suzumina.click,AUTH_TRUST_HOST=true"
```

#### 3. Discord OAuth アプリケーション設定

Discord Developer Portal で以下のリダイレクトURLを設定：

```
https://suzumina.click/api/auth/callback/discord
```

**注意**: `0.0.0.0:8080` や `localhost` などの開発用URLは削除してください。

### SSL エラーの解決方法

```
SSL routines:ssl3_get_record:wrong version number
```

このエラーは、HTTPSとHTTPの混在や、ポート設定の不一致で発生します。

#### 解決策

1. **ポート設定の統一**
   - Dockerfile: `EXPOSE 8080`
   - deploy-cloud-run.sh: `--port 8080`

2. **プロトコルの一貫性**
   - すべてのURLでHTTPSを使用
   - リダイレクトURLも同様

### 環境変数チェックリスト

本番環境で必要な環境変数：

- [ ] `NODE_ENV=production`
- [ ] `NEXTAUTH_URL=https://suzumina.click`
- [ ] `AUTH_TRUST_HOST=true`
- [ ] `DISCORD_CLIENT_ID` (Secret Manager経由)
- [ ] `DISCORD_CLIENT_SECRET` (Secret Manager経由)
- [ ] `DISCORD_BOT_TOKEN` (Secret Manager経由)
- [ ] `NEXTAUTH_SECRET` (Secret Manager経由)
- [ ] `YOUTUBE_API_KEY` (Secret Manager経由)
- [ ] `GOOGLE_CLOUD_PROJECT`

### デプロイ手順

1. 上記の修正を適用
2. コミット＆プッシュ
3. デプロイスクリプトを実行：

```bash
./scripts/deploy-cloud-run.sh production
```

4. ヘルスチェックで確認：

```bash
curl https://suzumina.click/api/health
```

### トラブルシューティング

ログの確認方法：

```bash
# Cloud Run ログを確認
gcloud logging read "resource.type=cloud_run_revision AND resource.labels.service_name=suzumina-click-web" --limit 50

# エラーログのみ表示
gcloud logging read "resource.type=cloud_run_revision AND severity>=ERROR" --limit 50
```

### 関連ドキュメント

- [AUTH_DEPLOYMENT_GUIDE.md](./AUTH_DEPLOYMENT_GUIDE.md) - Discord認証の初期セットアップ
- [WEB_DEPLOYMENT.md](./WEB_DEPLOYMENT.md) - Web App デプロイ手順
- [TERRAFORM_GUIDE.md](./TERRAFORM_GUIDE.md) - インフラ構築ガイド