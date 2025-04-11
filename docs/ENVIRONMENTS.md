# 環境定義

## 概要

本プロジェクトでは、以下の3つの環境を定義します：

1. ローカル開発環境
2. GCP開発環境（suzumina-click-dev）
3. GCP本番環境（suzumina-click）

## 環境の詳細

### 1. ローカル開発環境

- **用途**: 個人の開発作業、ローカルテスト
- **データベース**: PostgreSQL (Docker)
- **接続情報**:

  ```env
  DATABASE_URL=postgresql://postgres:postgres@localhost:5432/suzumina_dev
  NODE_ENV=development
  ```

- **特徴**:
  - Docker Composeによるローカル環境構築
  - 本番環境と同じPostgreSQLを使用
  - 迅速な開発とテストが可能

### 2. GCP開発環境（suzumina-click-dev）

- **用途**: 開発版のデプロイ、統合テスト
- **データベース**: Cloud SQL (PostgreSQL)
- **接続情報**:

  ```env
  DATABASE_URL=postgres://user:password@host:5432/database
  NODE_ENV=production
  ```

- **特徴**:
  - 本番環境と同じインフラ構成
  - データベースはCloud SQLで管理
  - 新機能のテストとデバッグ

### 3. GCP本番環境（suzumina-click）

- **用途**: 本番サービスの運用
- **データベース**: Cloud SQL (PostgreSQL)
- **接続情報**:

  ```env
  DATABASE_URL=postgres://user:password@host:5432/database
  NODE_ENV=production
  ```

- **特徴**:
  - 実際のユーザーへのサービス提供
  - 高可用性と信頼性を重視
  - 厳格なセキュリティ管理

## 環境ごとのリソース

### ローカル開発環境

- PostgreSQLコンテナ
- ローカル開発サーバー
- Docker Compose設定

### GCP開発環境（suzumina-click-dev）

- Cloud Run
- Cloud SQL (PostgreSQL)
- Secret Manager
- VPCネットワーク
- その他GCPリソース

### GCP本番環境（suzumina-click）

- Cloud Run
- Cloud SQL (PostgreSQL)
- Secret Manager
- VPCネットワーク
- その他GCPリソース

## 環境変数の管理

各環境での環境変数の管理方法：

### ローカル開発環境

- `.env.local`ファイルで管理
- Dockerの環境変数
- 開発者個人の設定に応じて調整可能

### GCP開発環境（suzumina-click-dev）

- Secret Managerで管理
- Terraformで設定
- Cloud RunのIAM設定

### GCP本番環境（suzumina-click）

- Secret Managerで管理
- Terraformで設定
- 厳格なアクセス制御

## 開発フロー

1. ローカル開発環境でDocker Composeを使用して開発とテスト
2. GCP開発環境（suzumina-click-dev）でテストと検証
3. GCP本番環境（suzumina-click）にデプロイ

## データベースマイグレーション

### ローカル開発環境

```bash
# マイグレーション実行
bun run db:migrate

# マイグレーションの生成
bun run db:generate
```

### GCP環境（開発・本番共通）

```bash
# Cloud SQL Proxyを使用したマイグレーション
./scripts/staging-migration.sh
```

## 注意事項

- 全環境でPostgreSQLを使用し、環境間の差異を最小化
- Cloud SQLへの接続はCloud SQL Proxyを使用
- 環境変数は各環境で適切に管理する必要あり

最終更新日: 2025年4月12日
