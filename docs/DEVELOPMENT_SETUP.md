# 開発環境セットアップ計画

## 1. 前提条件

| 必要なツール | バージョン |
|------------|----------|
| Node.js | v22 |
| Bun | 最新版 |
| Docker Desktop | 最新版 |
| Google Cloud SDK | 最新版 |
| Git | 最新版 |

**GCPプロジェクト設定**:

- プロジェクトID: `suzumina-click-dev`
- リージョン: `asia-northeast1`

## 2. 開発環境セットアップ状況

| コンポーネント | 状態 | 詳細 |
|--------------|-----|------|
| **基本環境** | ✅ 完了 | ・Turborepo構成確立<br>・TypeScript共通設定<br>・開発ツール(Biome, markdownlint)設定済み |
| **Web アプリ** | ✅ 完了 | ・Next.js 15.x + React 19.x<br>・Dockerfile作成済み<br>・ローカル/Docker動作確認済み<br>・ページレイアウト実装中 |
| **API (Python)** | ✅ 完了 | ・Python 3.12環境<br>・YouTube API連携機能実装<br>・Firestore連携実装<br>・エラーハンドリング実装 |
| **バッチ処理** | ❌ 未着手 | ・TypeScript環境準備<br>・Dockerfile作成<br>・サンプルジョブ実装 |

## 3. 開発フロー

### 3.1 主要コマンド

```bash
# 依存関係インストール
bun install

# Webアプリ開発
cd apps/web && bun run dev  # localhost:3000で起動

# API開発 (Python)
cd apps/functions-python
functions-framework --target main --debug

# テスト実行
cd apps/web && bun run test  # Webアプリテスト
cd apps/functions-python && python -m pytest  # Python APIテスト
```

### 3.2 ビルド & デプロイ

```bash
# Webアプリケーション
cd apps/web
docker build -t asia-northeast1-docker.pkg.dev/suzumina-click-dev/web .
docker push asia-northeast1-docker.pkg.dev/suzumina-click-dev/web

# Functions
cd apps/functions-python
gcloud functions deploy main --runtime python312 --trigger-http --region asia-northeast1
```

## 4. 次のステップ（優先順位順）

| 優先度 | タスク | 詳細 |
|-------|------|------|
| 1 | Web UI実装 | コンポーネント構造設計、基本レイアウト実装 |
| 2 | API拡張 | YouTube API関連機能のテスト強化、追加エンドポイント |
| 3 | CI/CD構築 | GitHub Actions設定、自動テスト・デプロイ |
| 4 | バッチ実装 | ジョブ処理フロー実装 |
| 5 | GCP設定強化 | 認証、監視、セキュリティ設定 |
