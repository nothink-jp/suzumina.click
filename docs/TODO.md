# TODOリスト

## GCP IaC 最小構成構築 (Terraform)

- [ ] `iac/` ディレクトリを作成する
- [ ] `iac/environments/dev/` ディレクトリを作成する
- [ ] Terraform状態管理用のGCSバケットを作成する (手動 or Terraform)
- [ ] `iac/backend.tf` を作成し、GCSバックエンドを設定する
- [ ] `iac/environments/dev/variables.tf` を作成し、必要な変数 (project_id, region など) を定義する
- [ ] `iac/environments/dev/terraform.tfvars` を作成し、変数に値を設定する (Git管理外)
- [ ] `iac/environments/dev/main.tf` を作成する
- [ ] `main.tf` に Terraform Google Provider を設定する
- [ ] `main.tf` に 必要なGCP API (`run.googleapis.com`, `artifactregistry.googleapis.com`) を有効化するリソース (`google_project_service`) を定義する
- [ ] `main.tf` に CI/CD用サービスアカウント (`github-actions-deployer`) を作成するリソース (`google_service_account`) を定義する
- [ ] `main.tf` に Cloud Run実行用サービスアカウント (`app-runtime`) を作成するリソース (`google_service_account`) を定義する
- [ ] `main.tf` に CI/CD用サービスアカウントに必要なIAMロール (`roles/run.admin`, `roles/artifactregistry.writer`, `roles/iam.serviceAccountUser`) を付与するリソース (`google_project_iam_binding` 等) を定義する
- [ ] `main.tf` に Artifact Registry Dockerリポジトリを作成するリソース (`google_artifact_registry_repository`) を定義する
- [ ] `main.tf` に Cloud Runサービス (`web`) を定義するリソース (`google_cloud_run_v2_service`) を定義する (実行SA、公開アクセス設定を含む)
- [ ] `iac/environments/dev` ディレクトリで `terraform init` を実行する
- [ ] `terraform plan` を実行し、計画を確認する
- [ ] `terraform apply` を実行し、リソースを作成する
