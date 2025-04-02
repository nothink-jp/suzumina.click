# Google Cloud Platform CI/CD設計

このドキュメントでは、suzumina.clickのCI/CD（継続的インテグレーション/継続的デリバリー）設計を説明します。

## アーキテクチャ概要

suzumina.clickのCI/CDパイプラインはGitHub Actionsを使用し、コードのプッシュやPRをトリガーに自動テスト・ビルド・デプロイを行います。

**処理フロー**:

1. GitHubリポジトリへのプッシュ/PR
2. GitHub Actionsワークフロー起動
3. テスト・リント実行
4. ビルド処理
5. GCPへのデプロイ

## GitHub Actions構成

### 検証ジョブ

- コードチェックアウト
- Bun依存関係インストール
- リント・型チェック・スペルチェック実行

### デプロイジョブ

- Google Cloud SDK設定と認証
- Dockerビルドと認証
- 各コンポーネントのデプロイ（Web/Functions/Jobs）

## 認証と権限

### サービスアカウント設定

- 名前: `github-actions-deployer@suzumina-click-dev.iam.gserviceaccount.com`
- 主な権限: Cloud Run Admin、Cloud Functions Admin、Cloud Storage Admin、Artifact Registry Writer

### GitHub Secrets設定

- `GCP_SA_KEY`: サービスアカウントキーJSON
- `GCP_SA_EMAIL`: サービスアカウントメールアドレス
- `GCP_PROJECT_ID`: GCPプロジェクトID

## デプロイプロセス

### 1. コード検証（CI）

- リントチェック、型チェック、ユニットテスト、スペルチェック

### 2. ビルド

- アプリケーションのビルド
- Dockerイメージのビルドとレジストリへのプッシュ

### 3. デプロイ（CD）

- Cloud Run、Functions、Jobs、Schedulerのデプロイ
- メインブランチへのプッシュ時のみ実行

## 関連ドキュメント

- [全体概要](GCP_OVERVIEW.md)
- [プロジェクト設定](GCP_PROJECT_SETUP.md)
- [セキュリティ設計](GCP_SECURITY.md)

最終更新日: 2025年4月3日
