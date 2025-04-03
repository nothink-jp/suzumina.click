# Web アプリケーション セットアップ手順

このドキュメントでは、suzumina.clickのWebアプリケーション（Next.js）の具体的なセットアップ、テスト、デプロイ手順を説明します。
全体的な設計思想やアーキテクチャについては、[Google Cloud Platform Webアプリケーション設計](GCP_WEB_APP.md)を参照してください。

## 実装タスク

### Dockerfile作成

- マルチステージビルド（ビルド→実行）による最適化
- 環境変数（NODE_ENV=production, PORT=8080）設定
- ポート公開（EXPOSE 8080）

### Next.js設定更新

```javascript
const nextConfig = {
  output: 'standalone', // Cloud Run用に最適化
  experimental: { serverActions: true }
};
export default nextConfig;
```

### 開発スクリプト追加 (`package.json`)

```json
"scripts": {
  "docker:build": "docker build -t asia-northeast1-docker.pkg.dev/suzumina-click-dev/web .",
  "docker:run": "docker run -p 8080:8080 asia-northeast1-docker.pkg.dev/suzumina-click-dev/web"
}
```

## テスト手順

```bash
# 1. ローカルビルド
bun run build

# 2. Dockerビルド・実行
bun run docker:build
bun run docker:run

# 3. 確認: http://localhost:8080 にアクセス
# - 画面表示、環境変数、ビルドサイズを確認
```

## デプロイ手順

```bash
# 1. GCP認証設定 (初回のみ)
gcloud auth configure-docker asia-northeast1-docker.pkg.dev

# 2. イメージビルド・プッシュ
docker build -t asia-northeast1-docker.pkg.dev/suzumina-click-dev/web:latest .
docker push asia-northeast1-docker.pkg.dev/suzumina-click-dev/web:latest

# 3. Cloud Runデプロイ
gcloud run deploy web \
  --image asia-northeast1-docker.pkg.dev/suzumina-click-dev/web:latest \
  --region asia-northeast1 \
  --allow-unauthenticated
```

## 監視項目

- メモリ・CPU使用量
- レスポンスタイム
- エラーレート
- コンテナ再起動回数

## 次のステップ

1. APIエンドポイント実装（Cloud Functions）
2. 認証システム導入
3. CDN・カスタムドメイン設定
