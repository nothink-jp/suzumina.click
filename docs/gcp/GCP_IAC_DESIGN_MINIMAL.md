# GCP IaC 設計書 (Cloud Run管理版)

## 1. 目的

このドキュメントは、`suzumina-click-dev` GCPプロジェクトにおいて、Next.jsアプリケーションを実行するCloud Runサービスとその関連設定（API有効化, Workload Identity Federation, 環境変数, シークレット参照, IAM）をInfrastructure as Code (IaC) で構築・管理するための設計を定義します。Artifact Registryリポジトリとサービスアカウントは**事前に作成されている前提**とします。

## 2. IaCツール

- **Terraform** を使用します。

## 3. IaC管理対象リソース

以下のGCPリソースをTerraformで管理します。

- **GCPプロジェクト設定:**
  - 有効化するAPI:
    - `run.googleapis.com` (Cloud Run API)
    - `artifactregistry.googleapis.com` (Artifact Registry API)
    - `iamcredentials.googleapis.com` (IAM Credentials API - WIFに必要)
    - `secretmanager.googleapis.com` (Secret Manager API)
- **Cloud Run:**
  - サービス定義 (`web`)
    - 実行サービスアカウント (`app-runtime`) の指定
    - 環境変数 (`NODE_ENV`) の設定
    - Secret Managerからのシークレット参照 (`NEXTAUTH_URL`, `DISCORD_GUILD_ID`, `NEXTAUTH_SECRET`, `DISCORD_CLIENT_ID`, `DISCORD_CLIENT_SECRET`, `AUTH_TRUST_HOST`) の設定
    - 公開アクセス設定 (`ingress`)
    - **注意:** コンテナイメージはCI/CDで更新されるため、Terraformのライフサイクルで `ignore_changes` を設定。
- **IAM:**
  - **Workload Identity Federation (WIF) for GitHub Actions:**
    - Workload Identity Pool (`github-actions-pool`)
    - Workload Identity Pool Provider (`github-provider`)
    - IAM Binding: Deployerサービスアカウント (`github-actions-deployer`) に `roles/iam.workloadIdentityUser` ロールを付与。
  - **Secret Manager Access:**
    - IAM Binding: Runtimeサービスアカウント (`app-runtime`) に、参照する各シークレット (`nextauth-secret-dev`, `discord-client-id-dev`, `discord-client-secret-dev`, `nextauth-url-dev`, `discord-guild-id-dev`, `auth-trust-host-dev`) に対する `roles/secretmanager.secretAccessor` ロールを付与。

## 4. Terraform参照対象リソース (事前作成前提)

以下のリソースはTerraformの `data` ソースで参照します。

- **IAM:**
  - サービスアカウント:
    - `github-actions-deployer@...` (CI/CD用)
    - `app-runtime@...` (Cloud Run実行用)
- **Artifact Registry:**
  - Dockerイメージ用リポジトリ (例: `suzumina-click-docker-repo`)
- **Secret Manager:**
  - シークレット自体 (例: `nextauth-secret-dev`, `discord-client-id-dev`, `discord-client-secret-dev`, `nextauth-url-dev`, `discord-guild-id-dev`, `auth-trust-host-dev`)
    - シークレットの値はTerraform管理外。

## 5. Terraform構成案

`environments/dev` ディレクトリ内にリソース定義を記述します。

```plaintext
iac/
├── environments/
│   └── dev/
│       ├── main.tf         # リソース定義 (API, Cloud Run, WIF, IAM Bindings, dataソース)
│       ├── variables.tf    # dev環境用変数 (project_id, region, etc.)
│       └── terraform.tfvars # dev環境用変数ファイル (Git管理外推奨)
├── backend.tf          # Terraform状態管理バックエンド設定 (GCS)
└── variables.tf        # 共通変数 (もしあれば)
```

## 6. Terraform状態管理

- Terraformの状態ファイル (`.tfstate`) は、GCPプロジェクト内に作成した専用の **Cloud Storageバケット** で管理します (`backend.tf` で設定)。

## 7. Mermaid図による構成イメージ

```mermaid
graph TD
    subgraph "IaC (Terraform)"
        direction LR
        T_Backend["backend.tf (GCS Backend)"]
        T_EnvDev["environments/dev/main.tf"]
        T_Vars["environments/dev/variables.tf"]
    end

    subgraph "GCP Resources (Managed by Terraform)"
        GCP_Project_APIs["Project Settings (APIs: Run, AR, IAMCreds, SecretMgr)"]
        GCP_CR_Service["Cloud Run Service (web definition, env vars, secret refs)"]
        GCP_WIF_Pool["WIF Pool"]
        GCP_WIF_Provider["WIF Provider"]
        GCP_IAM_WIF_Binding["IAM Binding (Deployer SA <- WIF User Role)"]
        GCP_IAM_Secret_Bindings["IAM Bindings (Runtime SA <- Secret Accessor Role)"]
    end

    subgraph "GCP Resources (Referenced by Terraform - Pre-existing)"
        GCP_IAM_SA_Deployer["IAM SA (deployer)"]
        GCP_IAM_SA_Runtime["IAM SA (runtime)"]
        GCP_AR["Artifact Registry Repo"]
        GCP_Secrets["Secrets (nextauth-secret, discord-id, discord-secret, nextauth-url, discord-guild, auth-trust-host)"]
    end

    subgraph "CI/CD (GitHub Actions - Conceptual)"
        CICD_Pipeline["Pipeline"]
    end

    subgraph "External"
        GCS_TFState["GCS Bucket (Terraform State)"]
        Developer["Developer"]
    end

    Developer -- "terraform apply" --> T_EnvDev

    T_EnvDev -- "Creates/Updates" --> GCP_Project_APIs
    T_EnvDev -- "Creates/Updates" --> GCP_CR_Service
    T_EnvDev -- "Creates/Updates" --> GCP_WIF_Pool
    T_EnvDev -- "Creates/Updates" --> GCP_WIF_Provider
    T_EnvDev -- "Creates/Updates" --> GCP_IAM_WIF_Binding
    T_EnvDev -- "Creates/Updates" --> GCP_IAM_Secret_Bindings

    T_EnvDev -- "References" --> GCP_IAM_SA_Deployer
    T_EnvDev -- "References" --> GCP_IAM_SA_Runtime
    T_EnvDev -- "References" --> GCP_AR
    T_EnvDev -- "References" --> GCP_Secrets

    GCP_CR_Service -- "Uses Runtime SA" --> GCP_IAM_SA_Runtime
    GCP_CR_Service -- "References Secrets" --> GCP_Secrets
    GCP_IAM_Secret_Bindings -- "Grants Access To Secrets For" --> GCP_IAM_SA_Runtime

    T_Backend -- "Configures Backend" --> GCS_TFState
    T_EnvDev -- "Reads/Writes State" --> GCS_TFState

    GCP_IAM_WIF_Binding -- "Allows Auth for" --> GCP_IAM_SA_Deployer # Via WIF

    CICD_Pipeline -- "Authenticates via WIF using" ---> GCP_WIF_Provider
    CICD_Pipeline -- "Acts as" ---> GCP_IAM_SA_Deployer
    CICD_Pipeline -- "Builds & Pushes Image to" --> GCP_AR
    CICD_Pipeline -- "Updates Service IMAGE ONLY" --> GCP_CR_Service # Image update only
```

## 8. 次のステップ

1. このドキュメントは、Cloud Runサービス設定をTerraformで管理する構成を反映しています。
2. Secret Managerに `nextauth-secret-dev`, `discord-client-id-dev`, `discord-client-secret-dev`, `nextauth-url-dev`, `discord-guild-id-dev`, `auth-trust-host-dev` が存在し、適切な値が設定されていることを確認してください。
3. `terraform apply` を実行して変更を適用します。
