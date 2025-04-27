# ローカル環境でのTerraform実行ガイド

このドキュメントでは、ローカル環境でTerraformを使用してインフラを管理する手順を説明します。2025年4月22日の方針変更により、インフラ管理（Terraform）はローカル環境でのみ実行し、アプリケーションデプロイ（Cloud Functions、Cloud Run）はGitHub Actionsで行うことになりました。

## 前提条件

以下のツールとアカウントが必要です：

- Terraform v1.11.4以上
- Google Cloud CLI（gcloud）最新版
- Node.js 20.x以上
- pnpm 8.x以上
- suzumina-click-firebaseプロジェクトへの適切なIAM権限
- GitHubリポジトリへのアクセス権限

## 1. セットアップ手順

### 1.1 Google Cloud認証設定

```bash
# Google Cloudにログイン
gcloud auth login

# アプリケーションデフォルト認証情報を設定
gcloud auth application-default login

# プロジェクトを設定
gcloud config set project suzumina-click-firebase
```

### 1.2 アプリケーションのビルド準備

Terraformを実行する前に、Cloud Functions用のアプリケーションをビルドする必要があります：

```bash
# プロジェクトルートディレクトリに移動
cd /path/to/suzumina.click

# 依存関係をインストール
pnpm install

# Cloud Functions用のビルドを実行
pnpm --filter @suzumina.click/functions build
```

### 1.3 Terraformの準備

```bash
# リポジトリのクローンまたは最新化
git clone https://github.com/nothink-jp/suzumina.click.git
# または
git pull origin main

# Terraformディレクトリに移動
cd suzumina.click/terraform

# Terraformの初期化
terraform init
```

## 2. 一般的なワークフロー

### 2.1 変更の計画

インフラ変更を行う前に、常に変更内容をプレビューしてください：

```bash
terraform plan -out=tfplan
```

このコマンドは以下を実行します：

- 現在の状態と設定を比較
- 変更内容を表示
- 変更計画をtfplanファイルに保存

**注意**: ファイルパスエラーが発生した場合は次のトラブルシューティングセクションを参照してください。

### 2.2 変更の適用

変更内容を確認し、問題がなければ適用します：

```bash
# プラン結果を使用して適用
terraform apply tfplan

# またはプランと適用を一度に行う
terraform apply
```

**重要**: 変更を適用する前に、内容を慎重に確認してください。特に、`destroy`操作や重要なリソースの再作成が含まれる場合は注意が必要です。

### 2.3 状態ファイルの管理

Terraform実行後は、`terraform.tfstate`ファイルが更新されます。このファイルはインフラの現在の状態を表しており、チームで共有する必要があります：

```bash
# 変更をコミット
git add terraform/terraform.tfstate terraform/terraform.tfstate.backup
git commit -m "インフラ更新: 変更内容の説明"
git push origin main
```

## 3. リソースタイプ別の操作手順

### 3.1 Cloud Runサービス更新（基本設定のみ）

```terraform
# cloudrun.tf の例
resource "google_cloud_run_service" "web_service" {
  name     = "web-service"
  location = var.region

  template {
    spec {
      containers {
        # 初期イメージを設定（GitHub Actionsから更新される）
        image = "gcr.io/${var.gcp_project_id}/web-service-initial:latest"
      }
    }
  }

  # イメージの変更を無視する設定
  lifecycle {
    ignore_changes = [
      template[0].spec[0].containers[0].image
    ]
  }
}
```

### 3.2 Cloud Functions更新（基本設定のみ）

```terraform
# functions.tf の例
resource "google_cloudfunctions_function" "discord_auth" {
  name        = "discord-auth"
  runtime     = "nodejs20"
  
  # ソースコードの変更を無視する設定
  lifecycle {
    ignore_changes = [
      source_archive_bucket,
      source_archive_object
    ]
  }
}
```

### 3.3 シークレット管理

```bash
# シークレット値の設定（Terraformの外部で行う）
echo -n "実際の値" | gcloud secrets versions add DISCORD_CLIENT_ID --data-file=- --project=suzumina-click-firebase
```

## 4. よくある操作とコマンド

### 4.1 状態の確認

```bash
# 現在管理されているリソースの一覧表示
terraform state list

# 特定リソースの状態詳細表示
terraform state show google_cloud_run_service.web_service
```

### 4.2 既存リソースのインポート

すでに存在するGCPリソースをTerraform管理下に置く場合：

```bash
# 既存のCloud Runサービスをインポートする例
terraform import google_cloud_run_service.web_service projects/suzumina-click-firebase/locations/asia-northeast1/services/web-service
```

### 4.3 リソース操作の注意点

- **削除操作**: `terraform destroy` は慎重に使用してください
- **リソース置換**: `terraform apply -replace=RESOURCE` で特定リソースを強制的に再作成できます
- **出力確認**: `terraform output` で設定されている出力変数を確認できます

## 5. トラブルシューティング

### 5.1 認証エラー

```
Error: googleapi: Error 403: Access Not Configured...
```

- IAM権限が不足しています
- 必要な権限を確認し、適切なロールを割り当ててください

### 5.2 状態ファイルの競合

```
Error: Error retrieving state: ... conflict
```

- 別のユーザーが同時に変更を行っている可能性があります
- チーム内で変更タイミングを調整してください

### 5.3 APIの有効化

```
Error: Error creating Service: googleapi: Error 403: Service ... has not been used in project ... before
```

- 必要なGCP APIを有効化してください
- `gcloud services enable SERVICE_NAME --project=suzumina-click-firebase`

### 5.4 ビルドファイルが見つからないエラー

以下のようなエラーが表示された場合：

```
Error: Error in function call
  
on functions.tf line 28, in resource "google_storage_bucket_object" "function_source_archive":
28:   name   = "source-${filesha256("../apps/functions/lib/index.js")}.zip"
Call to function "filesha256" failed: open ../apps/functions/lib/index.js: no such file or directory.
```

次の手順で解決してください：

1. Cloud Functions用のアプリケーションがビルドされていることを確認

```bash
# プロジェクトルートディレクトリに移動
cd /path/to/suzumina.click

# Cloud Functions用のビルドを再実行
pnpm --filter @suzumina.click/functions build
```

2. ビルド後にファイルが存在するか確認

```bash
ls -la apps/functions/lib/
```

3. ビルドが成功してもエラーが続く場合は、`functions.tf`ファイルを修正

```bash
cd terraform/
```

以下のように`functions.tf`の該当行（28行目付近）を修正：

```terraform
# 修正前
name = "source-${filesha256("../apps/functions/lib/index.js")}.zip"terr

# 修正後（タイムスタンプベース）
name = "source-${formatdate("YYYYMMDDhhmmss", timestamp())}.zip"
```

### 5.5 構文エラーとリソース参照エラー

以下のようなエラーが表示された場合：

```
Error: Unsupported attribute

  on cloudrun.tf line 81, in resource "google_cloud_run_service" "nextjs_app":
  81:       client,

This object has no argument, nested block, or exported attribute named "client".
```

または

```
Error: Reference to undeclared resource

  on cloudrun.tf line 88, in resource "google_cloud_run_service" "nextjs_app":
  88:     google_project_service.cloudrun,

A managed resource "google_project_service" "cloudrun" has not been declared in the root module.
```

これらは一般的にTerraformコードの構文エラーや参照エラーです。以下の手順で対処してください：

1. **構文エラーの修正**

   不正な属性参照（例：`client`, `labels`など）を含む`lifecycle`ブロックを修正します：

   ```terraform
   # 修正前
   lifecycle {
     ignore_changes = [
       template[0].spec[0].containers[0].image,
       template[0].spec[0].containers[0].env,
       metadata[0].annotations,
       template[0].metadata[0].annotations,
       client,  # エラー: この属性は存在しない
       labels,  # エラー: この属性は存在しない
     ]
   }

   # 修正後
   lifecycle {
     ignore_changes = [
       template[0].spec[0].containers[0].image,
       template[0].spec[0].containers[0].env,
       metadata[0].annotations,
       template[0].metadata[0].annotations
       # 不正な属性参照を削除
     ]
   }
   ```

2. **未宣言リソースエラーの解決**

   ```
   Error: Reference to undeclared resource "google_project_service" "cloudrun"
   ```

   このエラーが出る場合、以下のいずれかの対策を取ります：

   a. 参照先のリソースが正しく定義されているか確認します：

      ```bash
      # 依存するAPIサービスの有効化リソースがapi_services.tfで宣言されているか確認
      grep -r "google_project_service" terraform/
      ```

   b. 存在しない依存関係を削除します：

      ```terraform
      # 修正前
      depends_on = [
        google_project_service.cloudrun,  # 未宣言のリソース
        google_project_service.artifactregistry,  # 未宣言のリソース
      ]

      # 修正後
      # 依存関係の指定を削除するか、正しいリソースを参照
      depends_on = []
      ```

   c. 必要なAPIを手動で有効化して依存関係を解決：

      ```bash
      # 必要なサービスを手動で有効化
      gcloud services enable run.googleapis.com --project=suzumina-click-firebase
      gcloud services enable artifactregistry.googleapis.com --project=suzumina-click-firebase
      ```

### 5.6 Secret Managerリソース参照エラー

```
Error: Reference to undeclared resource

  on iam.tf line 231, in resource "google_secret_manager_secret_iam_member" "discord_client_id_accessor":
  231:   project   = google_secret_manager_secret.discord_client_id.project
```

Secret Managerのリソース参照エラーが発生した場合、以下の手順で対処してください：

1. **シークレットの存在確認**

   ```bash
   # 実際にシークレットが存在するか確認
   gcloud secrets list --project=suzumina-click-firebase
   ```

2. **リソース定義を確認**

   ```bash
   # secrets.tf ファイルを確認
   cat terraform/secrets.tf
   ```

3. **解決方法**:

   a. もしシークレットがGCP上に既に存在し、Terraform管理下に置きたい場合は、既存リソースをインポート：

      ```bash
      terraform import google_secret_manager_secret.discord_client_id projects/suzumina-click-firebase/secrets/DISCORD_CLIENT_ID
      ```

   b. 必要なシークレットリソース定義を追加：

      ```terraform
      # secrets.tf に追加
      resource "google_secret_manager_secret" "discord_client_id" {
        project   = var.gcp_project_id
        secret_id = "DISCORD_CLIENT_ID"
        
        replication {
          auto {}
        }
      }
      ```

   c. IAMポリシーのみを管理したい場合は、データソースを使用：

      ```terraform
      # シークレットを参照するだけのデータソース
      data "google_secret_manager_secret" "discord_client_id" {
        project   = var.gcp_project_id
        secret_id = "DISCORD_CLIENT_ID"
      }
      
      # IAMポリシーの設定（データソース参照）
      resource "google_secret_manager_secret_iam_member" "discord_client_id_accessor" {
        project   = data.google_secret_manager_secret.discord_client_id.project
        secret_id = data.google_secret_manager_secret.discord_client_id.secret_id
        role      = "roles/secretmanager.secretAccessor"
        member    = "serviceAccount:YOUR_SERVICE_ACCOUNT"
      }
      ```

### 5.7 エラー修正のベストプラクティス

1. **段階的な適用**: エラーがたくさんある場合は、ファイルごとに分けて適用を試みる
2. **最小変更**: 問題を特定するために最小限の変更から始める（例：1つのリソースだけをコメントアウト）
3. **モジュール化**: 関連するリソースをモジュールに分けることで、依存関係を明確にする
4. **計画のみ実行**: 特定のリソースに対してのみ計画を実行して問題を特定

```bash
# 特定のリソースのみを対象に計画を実行
terraform plan -target=google_cloud_run_service.nextjs_app
```

5. **状態の確認**: 現在の状態を確認して依存関係の問題を特定

```bash
terraform state list
```

### 5.8 特定のリソース削除のトラブルシューティング

#### 5.8.1 デフォルトのFirebaseホスティングサイト削除エラー

```
Error: Error when reading or editing Site: googleapi: Error 400: Cannot delete default Hosting Site `suzumina-click-firebase`.
```

このエラーはCloud Runへの移行後、デフォルトのFirebaseホスティングサイトをTerraformが削除しようとしていることが原因です。デフォルトのホスティングサイトは削除できないため、以下の手順でステートから削除する必要があります：

```bash
# Terraformステートからホスティングサイトリソースを削除
terraform state rm google_firebase_hosting_site.default

# もし上記のコマンドでリソースが見つからない場合は、以下のコマンドで現在のステート内の全リソースを確認
terraform state list | grep hosting
```

#### 5.8.2 バケット削除エラー

```
Error: Error trying to delete bucket suzumina-click-firebase-functions-source containing objects without `force_destroy` set to true
```

このエラーは、オブジェクトが含まれているバケットを削除しようとする際に発生します。以下のいずれかの方法で対処してください：

1. **バケット定義に`force_destroy = true`を追加：**

```terraform
resource "google_storage_bucket" "functions_source" {
  name     = "${var.gcp_project_id}-functions-source"
  location = var.region
  
  # オブジェクトが含まれていても強制削除を許可
  force_destroy = true
  
  # その他の設定...
}
```

2. **既存のバケットをステートにインポートして管理：**

```bash
# バケットをTerraformステートにインポート
terraform import google_storage_bucket.functions_source suzumina-click-firebase-functions-source
```

3. **削除予定のない既存バケットはステートから削除：**

```bash
# バケットの定義がない場合、ステートから削除
terraform state rm google_storage_bucket.functions_source
```

#### 5.8.3 ステート管理のベストプラクティス

1. **ステート確認**: `terraform state list`で現在管理されているリソースを確認
2. **選択的なステート操作**: `terraform state rm`で意図しないリソースをステートから削除
3. **既存リソースの取り込み**: `terraform import`で既存のGCPリソースをTerraformの管理下へ
4. **ステートリソースの詳細確認**: `terraform state show RESOURCE_NAME`で特定リソースの詳細を確認

※ 注意：ステート操作は慎重に行ってください。バックアップを取ることをお勧めします。

### 5.9 Secret Managerの値が見つからないエラー

```
Error: Error waiting to create function: Error waiting for Creating function: Error code 9, message: Could not create or update Cloud Run service. Accessing secret failed: Revision is not ready and cannot serve traffic. Secret projects/suzumina-click-firebase/secrets/DISCORD_CLIENT_ID/versions/latest was not found
```

このエラーは、Cloud Functions V2がSecret Managerのシークレット値を参照しようとしたが、シークレットのバージョン（値）が存在しないために発生します。

#### 5.9.1 シークレット値を追加する

シークレットは作成されているが、値（バージョン）がないためエラーになっています。次のコマンドでダミー値を設定できます：

```bash
# Discord関連のシークレットにダミー値を設定
echo -n "dummy-value" | gcloud secrets versions add DISCORD_CLIENT_ID --data-file=- --project=suzumina-click-firebase
echo -n "dummy-value" | gcloud secrets versions add DISCORD_CLIENT_SECRET --data-file=- --project=suzumina-click-firebase
echo -n "dummy-value" | gcloud secrets versions add DISCORD_REDIRECT_URI --data-file=- --project=suzumina-click-firebase
echo -n "dummy-value" | gcloud secrets versions add DISCORD_TARGET_GUILD_ID --data-file=- --project=suzumina-click-firebase

# YouTube API関連のシークレットにダミー値を設定
echo -n "dummy-value" | gcloud secrets versions add YOUTUBE_API_KEY --data-file=- --project=suzumina-click-firebase
```

後で実際の値に更新できます：

```bash
# 実際の値に更新する例
echo -n "actual-discord-client-id" | gcloud secrets versions add DISCORD_CLIENT_ID --data-file=- --project=suzumina-click-firebase
```

#### 5.9.2 Cloud Functionsのデプロイを段階的に行う

問題を回避するために、次の順序でデプロイすることをお勧めします：

1. Secret Managerリソースのみをデプロイ：

   ```bash
   terraform apply -target=google_secret_manager_secret.secrets
   ```

2. シークレット値を設定（上記のgcloudコマンドを使用）

3. Cloud Functionsをデプロイ：

   ```bash
   terraform apply -target=google_cloudfunctions2_function.discord_auth_callback
   terraform apply -target=google_cloudfunctions2_function.fetch_youtube_videos
   ```

4. 残りのリソースをデプロイ：

   ```bash
   terraform apply
   ```

## 6. ベストプラクティス

1. **変更は小さく**: 一度の変更は小さくし、検証しやすくしてください
2. **コメントを追加**: Terraformコードには日本語コメントを追加し、意図を明確にしてください
3. **変数を使用**: ハードコードされた値は避け、変数を使用してください
4. **Module化**: 繰り返し使用するリソースはモジュール化を検討してください
5. **命名規則**: リソース名は一貫性のある命名規則を使用してください

## 7. 権限の最小化について

GitHub Actionsで使用するサービスアカウントには、必要最小限の権限のみを付与します。以下の権限が基本セットです：

- `roles/cloudfunctions.developer`: Cloud Functions更新用
- `roles/run.admin`: Cloud Run更新用
- `roles/storage.objectAdmin`: ソースコードアップロード用
- `roles/iam.serviceAccountUser`: サービスアカウント使用権限

追加の権限が必要な場合は、本ドキュメントを更新してください。

## 8. 今後の改善計画

1. **リモート状態管理**: Google Cloud Storageを使用した状態ファイルの共有
2. **ワークスペース分離**: 環境ごとのワークスペース分離（開発/ステージング/本番）
3. **自動化テスト**: インフラテスト自動化の導入

## 参考リンク

- [Terraform Google Provider Documentation](https://registry.terraform.io/providers/hashicorp/google/latest/docs)
- [Google Cloud ドキュメント](https://cloud.google.com/docs?hl=ja)
- [Terraformベストプラクティス](https://www.terraform-best-practices.com/)
