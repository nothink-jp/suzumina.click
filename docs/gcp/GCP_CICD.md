# Google Cloud Platform CI/CD設計

このドキュメントでは、suzumina.clickのCI/CD（継続的インテグレーション/継続的デリバリー）設計を説明します。

## アーキテクチャ概要

suzumina.clickのCI/CDパイプラインはGitHub Actionsを使用し、コードのプッシュやPRをトリガーに自動テスト・ビルド・デプロイを行います。

**処理フロー**:

1. GitHubリポジトリへのプッシュ/PR (`main` ブランチ)
2. GitHub Actionsワークフロー (`deploy.yml` -> `reusable-deploy.yml`) 起動
3. コードチェックアウト、依存関係インストール
4. Dockerイメージのビルドと Artifact Registry へのプッシュ
5. Terraform による GCP リソース (Cloud Run サービス等) の適用

## GitHub Actions構成

### 検証ジョブ (`ci.yml`)

- PRや `main` へのプッシュ時に実行
- コードチェックアウト
- Bun依存関係インストール
- リント・型チェック・テスト実行

### デプロイジョブ (`deploy.yml` -> `reusable-deploy.yml`)

- `main` ブランチへのプッシュ時に実行
- Google Cloud への認証 (Workload Identity Federation)
- Dockerイメージのビルドと Artifact Registry へのプッシュ
- Terraform のセットアップ (`terraform init`)
- Terraform によるインフラ構成の適用 (`terraform apply`)
  - Cloud Run サービスの更新 (新しいイメージタグ、環境変数、シークレット参照など)

## 認証と権限

### Workload Identity Federation

GitHub Actions から GCP への認証には、サービスアカウントキーを使用せず、より安全な Workload Identity Federation を利用します。

- **GCP 設定:**
  - Workload Identity Pool (`github-actions-pool`) と Provider (`github-provider`) を作成。
  - GitHub リポジトリ (`nothink-jp/suzumina.click`) からのアクセスのみを許可。
  - デプロイ用サービスアカウント (`github-actions-deployer@...`) に Workload Identity User (`roles/iam.workloadIdentityUser`) ロールを付与。
- **サービスアカウント権限:**
  - デプロイ用SA (`github-actions-deployer@...`) には、Terraform がリソースを管理するために必要なロール (例: `roles/run.admin`, `roles/storage.admin`, `roles/artifactregistry.writer`, `roles/iam.serviceAccountUser` など) を付与します。
  - Cloud Run 実行時SA (`app-runtime@...`) には、アプリケーションが必要とする権限 (例: `roles/secretmanager.secretAccessor`) を付与します。

### GitHub Actions Variables/Secrets 設定

以下の Variables と Secrets を GitHub リポジトリに設定する必要があります。

- **Variables:** (アルファベット順)
  - `ARTIFACT_REGISTRY_REPO`: Artifact Registry のリポジトリ名 (例: `suzumina-click-docker-repo`)
  - `GCP_PROJECT_ID`: GCPプロジェクトID
  - `GCP_REGION`: リソースをデプロイするリージョン (例: `asia-northeast1`)
  - `GCP_SA_EMAIL`: デプロイ用サービスアカウントのメールアドレス (`github-actions-deployer@...`)
  - `GCP_WORKLOAD_IDENTITY_PROVIDER`: Terraform で作成された Workload Identity Provider のフルネーム (Terraform output `workload_identity_provider_name` の値)
- **Secrets:**
  - (現在は Terraform 内で Secret Manager を参照するため、CI/CD 用のアプリケーションシークレットは不要)

## デプロイプロセス

### 1. コード検証（CI）

- `ci.yml` ワークフローが実行され、リントチェック、型チェック、ユニットテストが行われます。

### 2. ビルドとデプロイ（CD）

- `main` ブランチへのプッシュをトリガーに `deploy.yml` -> `reusable-deploy.yml` ワークフローが実行されます。
- アプリケーションの Docker イメージがビルドされ、バージョン情報とタイムスタンプを含むタグが付与されて Artifact Registry にプッシュされます。
- `terraform apply` が実行されます。
  - Terraform は `iac/environments/dev/main.tf` に定義されたインフラ構成を GCP に適用します。
  - Cloud Run サービスは、プッシュされた新しい Docker イメージを使用するように更新されます。
  - 環境変数やマウントされたシークレットは、Terraform の定義（主に Secret Manager 参照）に基づいて設定されます。

## 事前準備: Secret Manager の設定

Terraform は Cloud Run サービスに必要なシークレットや設定値を GCP Secret Manager から取得します。デプロイを実行する前に、以下のシークレットが **dev 環境** の Secret Manager に存在し、適切な値が設定されていることを確認してください。(アルファベット順)

- `discord-client-id-dev`: Discord OAuth アプリケーションの Client ID
- `discord-client-secret-dev`: Discord OAuth アプリケーションの Client Secret
- `discord-guild-id-dev`: Discord サーバーの Guild ID
- `nextauth-secret-dev`: NextAuth.js 用のランダムなシークレット文字列
- `nextauth-url-dev`: アプリケーションの完全な公開URL (例: `https://your-app-....a.run.app`)

これらのシークレットが存在しない、または値が正しくない場合、Terraform の適用やアプリケーションの起動に失敗する可能性があります。

## 関連ドキュメント

- [全体概要](GCP_OVERVIEW.md)
- [IaC設計 (Terraform)](GCP_IAC_DESIGN_MINIMAL.md)
- [認証設計 (Auth)](../auth/AUTH_DESIGN.md)

最終更新日: 2025年4月6日
