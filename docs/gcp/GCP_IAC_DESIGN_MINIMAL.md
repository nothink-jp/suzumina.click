# GCP IaC 設計書 (最小構成)

## 1. 目的

このドキュメントは、`suzumina-click-dev` GCPプロジェクトにおいて、Next.jsアプリケーションをCloud Runで実行するための最小限のインフラストラクチャをInfrastructure as Code (IaC) で構築するための設計を定義します。

## 2. IaCツール

- **Terraform** を使用します。

## 3. IaC管理対象リソース (最小構成)

以下のGCPリソースをTerraformで管理します。

- **GCPプロジェクト設定:**
  - 有効化するAPI:
    - `run.googleapis.com` (Cloud Run API)
    - `artifactregistry.googleapis.com` (Artifact Registry API)
- **IAM:**
  - サービスアカウント:
    - `github-actions-deployer@suzumina-click-dev.iam.gserviceaccount.com` (CI/CD用)
      - 役割: `roles/run.admin`, `roles/artifactregistry.writer`, `roles/iam.serviceAccountUser`
    - `app-runtime@suzumina-click-dev.iam.gserviceaccount.com` (Cloud Run実行用)
      - 役割: (初期段階では特定の役割は不要。必要に応じて追加)
- **Artifact Registry:**
  - Dockerイメージ用リポジトリ (例: `suzumina-click-dev-docker-repo`)
- **Cloud Run:**
  - サービス定義 (`web`)
    - 使用するコンテナイメージ (Artifact Registryのリポジトリを指定)
    - 実行用サービスアカウント (`app-runtime`)
    - 基本的なスケーリング設定 (最小/最大インスタンスなど)
    - 公開アクセス許可 (初期設定として)

## 4. Terraform構成案 (シンプル版)

初期段階ではモジュール化せず、`environments/dev` ディレクトリ内に直接リソース定義を記述します。

```plaintext
iac/
├── environments/
│   └── dev/
│       ├── main.tf         # リソース定義 (API有効化, IAM, Artifact Registry, Cloud Run)
│       ├── variables.tf    # dev環境用変数 (project_id, region など)
│       └── terraform.tfvars # dev環境用変数ファイル (Git管理外推奨)
├── backend.tf          # Terraform状態管理バックエンド設定 (GCS)
└── variables.tf        # 共通変数 (もしあれば)
```

## 5. Terraform状態管理

- Terraformの状態ファイル (`.tfstate`) は、GCPプロジェクト内に作成した専用の **Cloud Storageバケット** で管理します (`backend.tf` で設定)。

## 6. Mermaid図による構成イメージ (最小構成)

```mermaid
graph TD
    subgraph "IaC (Terraform)"
        direction LR
        T_Backend["backend.tf (GCS Backend)"]
        T_EnvDev["environments/dev/main.tf"]
        T_Vars["environments/dev/variables.tf"]
    end

    subgraph "GCP Resources (Managed by Terraform - Minimal)"
        GCP_Project_APIs["Project Settings (APIs: Run, ArtifactRegistry)"]
        GCP_IAM["IAM (Service Accounts: deployer, runtime; Roles)"]
        GCP_AR["Artifact Registry Repo"]
        GCP_CR_Service["Cloud Run Service (web definition)"]
    end

    subgraph "CI/CD (GitHub Actions - Conceptual)"
        CICD_Pipeline["Pipeline"]
    end

    subgraph "External"
        GCS_TFState["GCS Bucket (Terraform State)"]
        Developer["Developer (nothink@nothink.jp)"]
    end

    Developer -- "terraform apply" --> T_EnvDev
    T_EnvDev -- "Creates/Updates" --> GCP_Project_APIs
    T_EnvDev -- "Creates/Updates" --> GCP_IAM
    T_EnvDev -- "Creates/Updates" --> GCP_AR
    T_EnvDev -- "Creates/Updates Definition" --> GCP_CR_Service

    T_Backend -- "Configures Backend" --> GCS_TFState
    T_EnvDev -- "Reads/Writes State" --> GCS_TFState

    GCP_IAM -- "Grants Permissions to" --> CICD_Pipeline # Conceptual link
    CICD_Pipeline -- "Builds & Pushes Image to" --> GCP_AR # Conceptual link
    CICD_Pipeline -- "Deploys Image to" --> GCP_CR_Service # Conceptual link
```

## 7. 次のステップ

1. この計画に基づき、`docs/TODO.md` に具体的なIaC構築タスクを追加します。
2. IaCの実装は、別のモード（例: `code` モード）で行います。
