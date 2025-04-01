# Web アプリケーション セットアップ手順

## 1. 実装タスク

### 1.1 Dockerfile作成

- `apps/web/Dockerfile`の作成
- マルチステージビルドの実装
  - ビルドステージ：依存関係のインストールとアプリケーションのビルド
  - 実行ステージ：最適化された実行環境の構築
- 必要な環境変数の設定
- ポート設定（8080）

### 1.2 Next.js設定の更新

`next.config.js`の更新：

```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  experimental: {
    serverActions: true,
  }
};

export default nextConfig;
```

### 1.3 開発スクリプトの追加

`package.json`に追加するスクリプト：

```json
{
  "scripts": {
    "docker:build": "docker build -t gcr.io/suzumina-click-dev/web .",
    "docker:run": "docker run -p 8080:8080 gcr.io/suzumina-click-dev/web"
  }
}
```

## 2. テスト手順

1. ローカルビルドのテスト

```bash
bun run build
```

2. Dockerビルドのテスト

```bash
bun run docker:build
bun run docker:run
```

3. 動作確認

- <http://localhost:8080> にアクセスして正常に表示されることを確認
- 環境変数が正しく設定されていることを確認
- ビルドサイズの最適化を確認

## 3. デプロイ手順

1. GCPの認証設定

```bash
gcloud auth configure-docker asia-northeast1-docker.pkg.dev
```

2. イメージのビルドとプッシュ

```bash
docker build -t asia-northeast1-docker.pkg.dev/suzumina-click-dev/web .
docker push asia-northeast1-docker.pkg.dev/suzumina-click-dev/web
```

3. Cloud Runへのデプロイ

```bash
gcloud run deploy web \
  --image asia-northeast1-docker.pkg.dev/suzumina-click-dev/web \
  --platform managed \
  --region asia-northeast1 \
  --allow-unauthenticated
```

## 4. 監視項目

- メモリ使用量
- CPU使用量
- レスポンスタイム
- エラーレート
- コンテナの再起動回数

## 5. 次のステップ

1. APIエンドポイントの実装（Cloud Run Functions）
2. 認証システムの導入
3. CDNの設定
4. カスタムドメインの設定

この計画に基づいて、Codeモードで実装を進めていきます。
