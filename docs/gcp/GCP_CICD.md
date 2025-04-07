# Google Cloud Platform CI/CD設計

このドキュメントでは、suzumina.clickのCI/CD（継続的インテグレーション/継続的デリバリー）パイプラインと Terraform によるインフラ管理の連携について説明します。

## アーキテクチャ概要

CI/CD パイプラインは GitHub Actions を使用し、コードのプッシュや PR をトリガーに自動テスト・ビルド・デプロイ（イメージ更新）を行います。インフラストラクチャの構成管理には Terraform を使用します。

**役割分担:**

- **Terraform:** Cloud Run サービス定義 (イメージ除く)、IAM、Secret Manager 参照、Workload Identity Federation など、インフラの基本構成を管理します。構成変更が必要な場合に手動または専用のワークフローで `terraform apply` を実行します。
- **GitHub Actions (CI/CD):** アプリケーションコードの変更を検知し、テスト、Docker イメージのビルド＆プッシュ、`gcloud run deploy` コマンドによる Cloud Run サービスの**イメージ更新**を行います。

**通常デプロイフロー (コード変更時):**

1. GitHub リポジトリへのプッシュ/PR (`main` ブランチ)
2. GitHub Actions ワークフロー (`deploy.yml` -> `reusable-deploy.yml`) 起動
3. コードチェックアウト、依存関係インストール
4. Docker イメージのビルドと Artifact Registry へのプッシュ
5. `gcloud run deploy` コマンド (または対応 Action) で Cloud Run サービスのイメージを更新

**インフラ構成変更フロー:**

1. `iac/` ディレクトリ以下の Terraform コードを修正 (例: 環境変数追加、スケーリング設定変更)
2. ローカルまたは専用のワークフローで `terraform plan` を実行し、変更内容を確認
3. 確認後、`terraform apply` を実行してインフラに変更を適用 (※ CI/CD 用のサービスアカウントとは別の、適切な権限を持つアカウント/方法で実行)

## GitHub Actions構成

### 検証ジョブ (`ci.yml`)

- PR や `main` へのプッシュ時に実行
- コードチェックアウト
- Bun 依存関係インストール
- リント・型チェック・テスト実行

### デプロイジョブ (`deploy.yml` -> `reusable-deploy.yml`)

- `main` ブランチへのプッシュ時に実行 (アプリケーションコード変更時)
- Google Cloud への認証 (Workload Identity Federation)
- Docker イメージのビルドと Artifact Registry へのプッシュ
- `google-github-actions/deploy-cloudrun` アクション (または `gcloud run deploy` コマンド) を使用して、指定されたイメージタグで Cloud Run サービス (`web`) を更新
  - **注意:** このステップではイメージのみが更新され、Terraform で管理されている他の設定 (環境変数など) は変更されません。

## Terraform によるインフラ管理

- **管理対象:** `iac/environments/dev/main.tf` に定義されたリソース (Cloud Run サービス定義、IAM、Secret Manager 参照など)。ただし、Cloud Run のコンテナイメージは `lifecycle { ignore_changes }` によって Terraform の管理対象外とします。
- **実行タイミング:**
  - **初回構築時:** `terraform apply` を実行してインフラ全体を作成します。
  - **構成変更時:** 環境変数の追加、CPU/メモリ割り当ての変更、スケーリング設定の変更など、`main.tf` に記述された構成を変更する場合に `terraform apply` を実行します。
  - **アプリケーションデプロイ時:** 通常のコード変更に伴うデプロイでは `terraform apply` は**実行しません**。

## 認証と権限

### Workload Identity Federation

GitHub Actions から GCP への認証には Workload Identity Federation を利用します。

- **GCP 設定:** (Terraform で管理)
  - Workload Identity Pool (`github-actions-pool`) と Provider (`github-provider`)
  - GitHub リポジトリ (`nothink-jp/suzumina.click`) からのアクセスのみ許可
  - デプロイ用 SA (`github-actions-deployer@...`) への Workload Identity User ロール付与
- **サービスアカウント権限:**
  - **デプロイ用SA (`github-actions-deployer@...`):**
    - **CI/CD パイプライン実行に必要な最小限の権限:**
      - `roles/run.developer` (Cloud Run サービスのデプロイ権限)
      - `roles/iam.serviceAccountUser` (Cloud Run 実行 SA を指定するために必要)
      - `roles/artifactregistry.writer` (イメージのプッシュに必要)
      - `roles/iam.serviceAccountTokenCreator` (Workload Identity Federation でのトークン生成に必要)
    - **注意:** Terraform を使用してインフラ構成を変更する場合は、このサービスアカウントではなく、別途適切な管理者権限 (例: `roles/secretmanager.admin`, `roles/iam.serviceAccountAdmin`, `roles/serviceusage.serviceUsageAdmin`, `roles/iam.workloadIdentityPoolAdmin` など) を持つアカウント/方法で `terraform apply` を実行する必要があります。
  - **Cloud Run 実行時SA (`app-runtime@...`):** (Terraform で管理)
    - アプリケーションが必要とする権限 (例: `roles/secretmanager.secretAccessor`, `roles/datastore.user`)

### GitHub Actions Variables/Secrets 設定

以下の Variables と Secrets を GitHub リポジトリに設定する必要があります。

- **Variables:** (アルファベット順)
  - `ARTIFACT_REGISTRY_REPO`: Artifact Registry のリポジトリ名 (例: `suzumina-click-docker-repo`)
  - `GCP_PROJECT_ID`: GCPプロジェクトID
  - `GCP_REGION`: リソースをデプロイするリージョン (例: `asia-northeast1`)
  - `GCP_SA_EMAIL`: デプロイ用サービスアカウントのメールアドレス (`github-actions-deployer@...`)
  - `GCP_WORKLOAD_IDENTITY_PROVIDER`: Terraform で作成された Workload Identity Provider のフルネーム (Terraform output `workload_identity_provider_name` の値)
- **Secrets:**
  - (アプリケーションシークレットは Secret Manager で管理)

## デプロイプロセス詳細

### 1. コード検証（CI）

- `ci.yml` ワークフローが実行され、リントチェック、型チェック、ユニットテストが行われます。

### 2. ビルドとイメージ更新（CD）

- `main` ブランチへのプッシュをトリガーに `deploy.yml` -> `reusable-deploy.yml` ワークフローが実行されます。
- Docker イメージがビルドされ、タグ付けされて Artifact Registry にプッシュされます。
- `google-github-actions/deploy-cloudrun` アクション (または `gcloud run deploy`) が実行され、Cloud Run サービス (`web`) が新しいイメージを使用するように更新されます。

### 3. インフラ構成変更時の適用

- 開発者が `iac/` ディレクトリ以下の Terraform コードを変更した場合、手動または専用のワークフローで `terraform plan` および `terraform apply` を実行します (※ 適切な権限を持つアカウント/方法で実行)。
- CI/CD パイプラインはこのプロセスには関与しません。

## 事前準備: Secret Manager の設定

Terraform は Cloud Run サービスに必要なシークレットや設定値を GCP Secret Manager から取得します。Terraform を初めて適用する前や、新しいシークレットを追加する際には、以下のシークレットが **dev 環境** の Secret Manager に存在し、適切な値が設定されていることを確認してください。(アルファベット順)

- `auth-trust-host-dev`: `true` (Auth.js の UntrustedHost エラー回避用)
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

最終更新日: 2025年4月7日
