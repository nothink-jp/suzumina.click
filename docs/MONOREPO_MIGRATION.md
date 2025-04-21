# モノレポ構成とCloud Run移行計画

本ドキュメントは、現行のプロジェクト構成からモノレポ構成への移行とホスティングをFirebase HostingからCloud Runへ移行する計画の詳細を記録したものです。

## 1. 背景と目的

現在のプロジェクト構成では、以下の課題があります：

- Webアプリケーションコードがプロジェクトルートにあるためワークスペースとアプリケーションの操作が混同する
- Firebase CLIとTerraformの混在により、デプロイやテストに混乱が発生している
- プレビューチャネルなど不要な機能を含む複雑な構成になっている

これらの課題を解決するため、以下を目標とした移行を行います：

1. **モノレポ構成への再編成**：Webアプリコードを`apps/web`に分離
2. **Cloud Runへのホスティング移行**：Firebase Hostingからの移行
3. **Terraformでのインフラ一元管理**：混在状態の解消

## 2. モノレポ構成の設計

### 2.1 新しいディレクトリ構造

```
suzumina.click/
├── apps/
│   ├── web/              # Next.jsアプリケーション（現在のルートから移動）
│   │   ├── public/
│   │   ├── src/
│   │   ├── next.config.ts
│   │   ├── package.json
│   │   └── ...その他アプリ固有のファイル
│   └── functions/        # Firebase Functions（今後移動予定）
├── packages/             # 共有コード用（必要に応じて）
├── terraform/            # インフラコード（現状のまま）
├── docs/                 # ドキュメント（現状のまま）
├── pnpm-workspace.yaml   # ワークスペース定義（更新）
├── package.json          # ルートpackage.json（更新）
└── ...その他ワークスペース共通のファイル
```

### 2.2 主要設定ファイルの変更

#### pnpm-workspace.yaml
```yaml
packages:
  - apps/*
  - packages/*
  - functions

onlyBuiltDependencies:
  - '@biomejs/biome'
  - '@firebase/util'
  - esbuild
  - protobufjs
  - sharp
```

#### ルートpackage.json
```json
{
  "name": "suzumina.click",
  "version": "0.1.1",
  "private": true,
  "scripts": {
    "dev": "pnpm --filter @suzumina.click/web dev",
    "build": "pnpm --filter @suzumina.click/web build",
    "start": "pnpm --filter @suzumina.click/web start",
    "lint": "biome lint .",
    "format": "biome format --write .",
    "check": "biome check --apply .",
    "clean": "rimraf .next node_modules/.cache coverage .firebase functions/lib/* terraform/.terraform terraform/terraform.tfstate*",
    "test": "vitest run",
    "test:web": "pnpm --filter @suzumina.click/web test",
    "storybook": "pnpm --filter @suzumina.click/web storybook"
  },
  "devDependencies": {
    "@biomejs/biome": "^1.9.4",
    "rimraf": "^6.0.1",
    "typescript": "^5.8.3",
    "vitest": "^3.1.1"
  }
}
```

#### apps/web/package.json
```json
{
  "name": "@suzumina.click/web",
  "version": "0.1.1",
  "private": true,
  "scripts": {
    "dev": "next dev --turbopack",
    "build": "next build",
    "start": "next start",
    "lint": "biome lint ./src",
    "format": "biome format --write ./src",
    "check": "biome check --apply ./src",
    "test": "vitest run",
    "test:watch": "vitest",
    "test:coverage": "vitest run --coverage",
    "storybook": "storybook dev -p 6006",
    "build-storybook": "storybook build"
  },
  "dependencies": {
    "@headlessui/react": "^2.2.2",
    "@heroicons/react": "^2.2.0",
    "firebase": "^11.6.0",
    "next": "15.3.1",
    "react": "^19.1.0",
    "react-dom": "^19.1.0"
  },
  "devDependencies": {
    // ...（既存の開発依存関係）
  }
}
```

## 3. Cloud Run移行計画

### 3.1 構成概要

- **ビルド**：Cloud Build（GCP上でのコンテナビルド）
- **デプロイ**：Cloud Run（コンテナホスティング）
- **開発体験**：Cloud Code（VS Code拡張）
- **管理**：Terraform（インフラ管理）

### 3.2 主要コンポーネント

#### apps/web/Dockerfile
```dockerfile
FROM node:18-alpine AS runner
WORKDIR /app
ENV NODE_ENV production

# Next.jsのstandaloneモードで生成されたファイルをコピー
COPY .next/standalone ./
COPY .next/static ./.next/static
COPY public ./public

# アプリケーションのポートを設定
EXPOSE 8080
ENV PORT 8080

# サーバーを起動
CMD ["node", "server.js"]
```

#### apps/web/next.config.ts
```typescript
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'standalone',  // Cloud Run用にstandaloneモードを有効化
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'cdn.discordapp.com',
      },
    ],
  },
};

export default nextConfig;
```

#### cloudbuild.yaml
```yaml
# Next.jsアプリケーション用のCloud Buildファイル
steps:
  # ワーキングディレクトリの設定
  - name: 'bash'
    args: ['echo', 'Working directory: /workspace/apps/web']
  
  # pnpmのインストール
  - name: 'gcr.io/cloud-builders/npm'
    args: ['install', '-g', 'pnpm']
    
  # ルートの依存関係のインストール
  - name: 'gcr.io/cloud-builders/npm'
    entrypoint: 'pnpm'
    args: ['install', '--frozen-lockfile']
  
  # Next.jsアプリケーションのビルド
  - name: 'gcr.io/cloud-builders/npm'
    entrypoint: 'pnpm'
    args: ['--filter', '@suzumina.click/web', 'build']
  
  # ...他のビルドステップ
  
  # Cloud Runへのデプロイ
  - name: 'gcr.io/google.com/cloudsdktool/cloud-sdk'
    entrypoint: 'gcloud'
    args: [
      'run', 'deploy', 'suzumina-click-nextjs-app',
      '--image', 'gcr.io/$PROJECT_ID/suzumina-click-nextjs-app:$COMMIT_SHA',
      '--region', 'asia-northeast1',
      '--platform', 'managed',
      '--allow-unauthenticated'
    ]
```

#### skaffold.yaml
```yaml
apiVersion: skaffold/v4beta6
kind: Config
metadata:
  name: suzumina-click
build:
  artifacts:
    - image: gcr.io/PROJECT_ID/suzumina-click-nextjs-app
      context: apps/web
      buildpacks:
        builder: gcr.io/buildpacks/builder:v1
        env:
          - GOOGLE_NODEJS_VERSION=18
  # ...残りの設定
```

### 3.3 Terraform設定

#### terraform/cloudrun.tf
```hcl
# Cloud Run サービスの定義
resource "google_cloud_run_service" "nextjs_app" {
  name     = "suzumina-click-nextjs-app"
  location = var.region

  template {
    spec {
      containers {
        image = "gcr.io/${var.project_id}/suzumina-click-nextjs-app:latest"
        
        # リソース制限を設定
        resources {
          limits = {
            cpu    = "1000m"
            memory = "512Mi"
          }
        }
        
        # 環境変数の設定
        dynamic "env" {
          for_each = var.firebase_config
          content {
            name  = "FIREBASE_${env.key}"
            value = env.value
          }
        }
        
        # その他の環境変数やポート設定
        # ...
      }
    }
  }

  # トラフィック設定
  traffic {
    percent         = 100
    latest_revision = true
  }
}

# 公開アクセス設定
resource "google_cloud_run_service_iam_member" "public_access" {
  service  = google_cloud_run_service.nextjs_app.name
  location = google_cloud_run_service.nextjs_app.location
  role     = "roles/run.invoker"
  member   = "allUsers"  # 評価環境用
}
```

#### terraform/cloudbuild.tf
```hcl
# Cloud Build Triggerの定義
resource "google_cloudbuild_trigger" "manual_deploy_trigger" {
  name        = "suzumina-click-manual-deploy-trigger"
  description = "手動で評価環境へのデプロイをトリガーする"
  
  # GitHub連携設定
  github {
    owner = "nothink-jp"
    name  = "suzumina.click"
    push {
      branch = ".*"  # 全ブランチ対象（手動トリガー）
    }
  }
  
  # Cloud Build設定ファイルの指定
  filename = "cloudbuild.yaml"
  
  # ...その他の設定
}

# Cloud BuildサービスアカウントにCloud Run管理権限を付与
resource "google_project_iam_member" "cloudbuild_cloudrun_admin" {
  project = var.project_id
  role    = "roles/run.admin"
  member  = "serviceAccount:${var.project_number}@cloudbuild.gserviceaccount.com"
}

# ...他のIAM設定
```

## 4. デプロイフロー

### 4.1 評価環境への手動デプロイ

GitHub Actionsワークフローで特定担当者だけが任意のブランチからCloud Build経由で評価環境にデプロイする仕組み：

```yaml
# .github/workflows/trigger-evaluation-deploy.yml

name: 評価環境へのデプロイトリガー

on:
  workflow_dispatch:
    inputs:
      branch:
        description: 'デプロイするブランチ'
        required: true
        default: 'main'

jobs:
  trigger-build:
    runs-on: ubuntu-latest
    # 特定の担当者だけが実行可能
    if: github.actor == 'designated-deployer-username'
    steps:
      - name: Google Cloud認証
        uses: google-github-actions/auth@v1
        with:
          credentials_json: ${{ secrets.GCP_SA_KEY }}
      
      - name: Cloud Buildトリガー実行
        id: cloudbuild
        uses: google-github-actions/trigger-cloud-build@v0
        with:
          project_id: ${{ secrets.GCP_PROJECT_ID }}
          trigger_id: 'suzumina-click-manual-deploy-trigger'
          branch: ${{ github.event.inputs.branch }}
```

### 4.2 想定されるデプロイフロー

1. 指定された担当者がGitHub UIから「評価環境へのデプロイトリガー」ワークフローを実行
2. デプロイするブランチを選択
3. GitHub ActionsがCloud Buildトリガーを起動
4. Cloud BuildがNext.jsアプリをビルドし、コンテナ化
5. ビルドされたコンテナをCloud Runにデプロイ

## 5. 実装計画

### 5.1 実装手順

1. **基盤準備**（4月22日〜23日）
   - モノレポ構成の基盤設定
   - ディレクトリ構造の作成
   - 設定ファイルの更新

2. **コード移行**（4月24日）
   - ソースコードとリソースの移動
   - 依存関係の調整
   - テスト実行確認

3. **Cloud Run対応**（4月25日〜26日）
   - Dockerfileなどの設定作成
   - Terraformリソース定義
   - Cloud Build構成の設定

4. **CI/CD更新**（4月27日）
   - GitHub Actionsワークフローの作成
   - 権限設定
   - デプロイテスト

5. **移行完了**（4月28日）
   - 最終テスト
   - ドキュメント更新
   - 古いリソースのクリーンアップ

### 5.2 注意点

- **テスト環境への影響**: 移行中も既存のテスト環境は維持
- **認証設定の引継ぎ**: Firebase認証は変更せず、環境変数経由で連携
- **パフォーマンス確認**: Cloud Run環境での応答性能を検証
- **コスト監視**: 使用量ベースの課金になるため、使用状況を監視

## 6. 参考リソース

- [Next.js on Cloud Run](https://cloud.google.com/run/docs/quickstarts/build-and-deploy/nodejs)
- [Cloud Code for VS Code](https://cloud.google.com/code/docs/vscode)
- [Terraform Google Provider](https://registry.terraform.io/providers/hashicorp/google/latest/docs)
- [pnpm Workspaces](https://pnpm.io/workspaces)