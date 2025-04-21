# インフラ構成監査レポート

## 1. 現状の構成

### 1.1. リソース管理の方式

| リソース種別 | 管理方法 | 備考 |
|------------|---------|------|
| Firebase Hosting | Firebase CLI（GitHub Actions経由） | GitHub Actionsで自動デプロイ |
| Cloud Functions | 混在（Terraform + firebase.json） | 一部がTerraformで管理、一部がFirebase CLIで管理 |
| Firestore Database | Terraform | terraform/firebase.tfで管理 |
| Secret Manager | Terraform | terraform/secrets.tfで管理 |
| Pub/Sub | Terraform | terraform/pubsub.tfで管理 |
| Scheduler | Terraform | terraform/scheduler.tfで管理 |
| IAM権限 | Terraform | terraform/iam.tfで管理 |
| Storage | Terraform | terraform/storage.tfで管理 |

### 1.2. Cloud Functionsの現状

現在、以下の2つのCloud Functions（v2）が実装・デプロイされています：

1. **discordAuthCallback**: HTTPトリガー、Discord認証のコールバック処理
   - 管理: Terraformで管理 (terraform/functions.tf)
   - トリガー: HTTPSエンドポイント
   - 環境変数: Secret Managerから取得

2. **fetchYouTubeVideos**: Pub/Subトリガー、YouTube動画情報取得
   - 管理: Terraformで管理 (terraform/functions.tf)
   - トリガー: Pub/Subトピック
   - 環境変数: Secret Managerから取得

### 1.3. デプロイパイプライン

#### GitHub Actions

- **firebase-hosting-merge.yml**: mainブランチへのプッシュ時に本番環境へデプロイ
- **firebase-hosting-pull-request.yml**: プルリクエスト時にプレビュー環境へデプロイ
- **reusable-deploy.yml**: 共通のデプロイステップ（pnpm, Node.js設定、ビルド、Firebase Hostingへのデプロイ）

現在のGitHub ActionsはFirebase Hostingのデプロイのみをカバーしており、Cloud Functionsのデプロイは明示的に含まれていません。

#### デプロイ環境

- **本番環境**: Firebase Hostingの`live`チャネル（デフォルト）
- **プレビュー環境**: Firebase Hostingのプレビューチャネル（Pull Request時に自動生成）

## 2. 課題点

### 2.1. 管理方法の不統一

- Cloud Functionsのデプロイが`firebase.json`（Firebase CLI）とTerraformで混在
- Firebase CLIによるデプロイとTerraformによるデプロイが個別に行われており、一貫性がない

### 2.2. デプロイプロセスの自動化不足

- Cloud Functionsのデプロイがテラフォームでは手動、Firebase CLIも明示的なGitHub Actionsワークフローがない
- プレビュー環境でのFunctions動作確認が容易でない
- Cloud Functionsデプロイの手順が標準化されていない

### 2.3. 環境分離の課題

- 本番環境とプレビュー環境の分離がHostingのみで、Functions側の分離が不明確
- Terraformの状態管理がローカルで行われており、チーム開発時に課題になる可能性がある

## 3. 解決の方向性

### 3.1. Terraformによる一元管理の強化

- すべてのCloud FunctionsをTerraformで管理する
- 環境変数管理をSecret Managerで統一し、Terraformから制御する
- `firebase.json`からFunctions設定を移行または連携方法を明確化する

### 3.2. GitHub Actionsワークフローの拡充

- Terraformを実行するGitHub Actionsワークフローを追加
- プレビュー環境と本番環境の両方に対応するワークフローを構築
- Firebase HostingとCloud Functionsのデプロイを統合するパイプラインを確立

### 3.3. 環境分離の明確化

- Terraformワークスペースや変数を活用して環境（プレビュー/本番）を分離
- プレビュー環境のFunctionsエンドポイントをフロントエンドから容易に利用できる仕組みを構築
- 状態ファイルをリモートバックエンド（GCS）で管理し、チーム開発を容易にする

## 4. 次のステップ

1. **Terraformの構成見直し**:
   - 環境分離のためのワークスペース設定またはモジュール化
   - リモート状態管理の導入
   - 既存のFirebase CLI管理のFunctionsをTerraformに移行

2. **GitHub Actionsワークフローの再構築**:
   - Terraform実行のためのワークフロー追加
   - プレビュー/本番環境に応じた条件分岐
   - シークレット管理とアクセス権限の整理

3. **開発フローのドキュメント化**:
   - 新しいデプロイフローのドキュメント作成
   - 開発者向けガイドラインの更新
   - 運用手順の明確化

## 5. Cloud Run移行計画

現状のFirebase Hosting + Terraformの混在管理による課題を解決するため、Cloud Runへの移行を計画しています。この移行によりインフラをTerraformで一元管理し、デプロイプロセスをシンプル化します。

### 5.1. Cloud Code・Cloud Buildを活用した構成

ローカル環境のDockerに依存せず、以下の構成でGCP上でビルド・デプロイを完結させます：

- **Cloud Build**: コンテナイメージのビルドとCloud Runへのデプロイを自動化
- **Cloud Code**: VS Code拡張機能として開発環境から直接Cloud Buildやデプロイを操作
- **Cloud Run**: Next.jsアプリケーション（App Router対応）のホスティング
- **Terraform**: これらのリソースを一元管理

### 5.2. 主要な導入コンポーネント

1. **skaffold.yaml**: ローカル開発とCloud Buildの連携を支援
2. **cloudbuild.yaml**: ビルドとデプロイのステップを定義
3. **Terraform定義**: Cloud Build TriggerとCloud Runリソースの管理

### 5.3. 評価環境デプロイフロー

1. 指定された担当者のみがデプロイを実行可能
2. GitHub Actionsからトリガーし、任意のブランチから評価環境へデプロイ
3. Cloud Build上でNext.jsアプリケーションをビルド・コンテナ化
4. 自動的にCloud Runにデプロイ

### 5.4. 利点

- **管理の一元化**: Terraformによる一貫したインフラ管理
- **デプロイの簡素化**: ローカルDockerなしでビルド・デプロイが可能
- **開発体験の向上**: Cloud Codeによる統合開発環境
- **スケーラビリティ**: Cloud Runによる柔軟なスケーリング
- **コスト効率**: 使用量に応じた料金体系