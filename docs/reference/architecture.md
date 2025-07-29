# suzumina.click インフラストラクチャアーキテクチャ

> **📅 最終更新**: 2025年7月10日  
> **📝 ステータス**: v11.0 タイムアウト最適化 + コスト最適化 + 時系列データ基盤実装完了  
> **🔧 対象**: Terraformで管理されているGoogle Cloud Platform (GCP) インフラストラクチャ

## 関連ドキュメント

- [Architecture Decision Records](../decisions/README.md) - アーキテクチャ決定記録
- [ADR-001: DDD実装ガイドライン](../decisions/architecture/ADR-001-ddd-implementation-guidelines.md) - Entity実装の判断基準
- [ADR-002: Entity実装の教訓](../decisions/architecture/ADR-002-entity-implementation-lessons.md) - 実装の試みと学習事項

## 概要

suzumina.clickは、声優「涼花みなせ」のファンサイトとして、YouTubeビデオとDLsite作品情報を自動収集し、音声ボタン機能を提供するWebプラットフォームです。v11.0では、タイムアウト最適化による100%処理成功保証、コスト最適化システム、時系列データ基盤を実装し、Terraformで管理されているGoogle Cloud Platform (GCP) インフラストラクチャの全体像を図解します。

## システム全体アーキテクチャ図

```mermaid
graph TD
    subgraph "開発・CI/CD フロー"
        DEV[ローカル開発<br/>feature/* ブランチ]
        MAIN[main ブランチ<br/>開発統合]
        GHA[GitHub Actions<br/>CI/CDパイプライン]
        STAGING[Staging環境<br/>自動テスト・QA]
        TAG[Git Tag<br/>v1.x.x リリース]
        PROD[Production環境<br/>本番サービス]
    end

    subgraph "外部API"
        YT[YouTube Data API v3]
        DL[DLsite Web Scraping]
    end

    subgraph "スケジュール・メッセージング (v11.0最適化)"
        CS1[Cloud Scheduler<br/>YouTube収集]
        CS2[Cloud Scheduler<br/>DLsite統合収集<br/>15分間隔実行]
        CS3[GitHub Actions<br/>自動クリーンアップ<br/>毎日11:00 JST]
        PS1[Pub/Sub Topic<br/>youtube-video-fetch-trigger]
        PS2[Pub/Sub Topic<br/>dlsite-works-fetch-trigger]
        PS3[Pub/Sub Topic<br/>budget-alerts]
    end

    subgraph "データ収集 (Cloud Functions v2 - v11.0統合最適化)"
        CF1[fetchYouTubeVideos<br/>本番のみ有効]
        CF2[fetchDLsiteWorksIndividualAPI<br/>統合データ収集Function<br/>タイムアウト最適化済み]
        CF3[時系列データ処理<br/>日次集計システム<br/>価格履歴分析]
    end

    subgraph "Webアプリケーション"
        WEB_STAGING[Cloud Run<br/>Staging環境<br/>軽量構成]
        WEB_PROD[Cloud Run<br/>Production環境<br/>本番構成]
    end

    subgraph "ネットワーク (VPC)"
        VPC[VPC<br/>${PROJECT_ID}-vpc]
        SUBNET[Subnet<br/>${PROJECT_ID}-subnet]
        NAT[Cloud NAT]
        DNS[Cloud DNS<br/>suzumina.click]
    end

    subgraph "ストレージ (v11.0時系列データ対応)"
        FS[(Cloud Firestore<br/>Native Mode<br/>時系列データ基盤)]
        TS_RAW[(dlsite_timeseries_raw<br/>7日間保持)]
        TS_DAILY[(dlsite_timeseries_daily<br/>永続保存)]
        CS_TFSTATE[Cloud Storage<br/>${PROJECT_ID}-tfstate]
        AR[Artifact Registry<br/>Docker Images<br/>自動ライフサイクル管理]
    end

    subgraph "セキュリティ・シークレット"
        SM[Secret Manager<br/>YOUTUBE_API_KEY]
        FR[Cloud Firestore Rules]
        WIF[Workload Identity Federation]
    end

    subgraph "監視・アラート・予算管理 (v11.0コスト最適化)"
        MD[Monitoring Dashboard]
        AP[Alert Policies]
        NC[Email Notification]
        BUDGET[Budget Alerts<br/>月5000円制限]
        COST_OPT[コスト最適化<br/>自動クリーンアップ]
    end

    %% Development Flow
    DEV --> MAIN
    MAIN --> GHA
    GHA -->|自動デプロイ| STAGING
    GHA -->|自動テスト| STAGING
    STAGING -->|QA完了| TAG
    TAG --> GHA
    GHA -->|手動承認| PROD

    %% Data Collection Flow (Production only - v11.0最適化)
    CS1 -->|トリガー| PS1
    CS2 -->|15分間隔トリガー| PS2
    CS3 -->|自動クリーンアップ| AR
    PS1 -->|イベント| CF1
    PS2 -->|イベント| CF2

    CF1 -->|データ取得| YT
    CF1 -->|データ保存| FS
    CF2 -->|データ取得| DL
    CF2 -->|基本データ保存| FS
    CF2 -->|時系列データ保存| TS_RAW
    CF3 -->|日次集計| TS_RAW
    CF3 -->|永続保存| TS_DAILY

    %% Application Data Flow
    WEB_STAGING -->|データ読み書き| FS
    WEB_STAGING -->|音声ファイル| CS_AUDIO
    WEB_PROD -->|データ読み書き| FS
    WEB_PROD -->|音声ファイル| CS_AUDIO

    %% Network Flow
    CF1 -- VPC --> SUBNET
    CF2 -- VPC --> SUBNET
    WEB_STAGING -- VPC --> SUBNET
    WEB_PROD -- VPC --> SUBNET
    SUBNET -- VPC --> VPC
    VPC --> NAT
    DNS --> WEB_PROD

    %% Security & CI/CD
    CF1 -.->|APIキー| SM
    WIF -.->|CI/CD| AR
    GHA -.->|認証| WIF

    %% Monitoring & Budget (v11.0最適化)
    MD -->|メトリクス| CF1
    MD -->|メトリクス| CF2
    MD -->|メトリクス| CF3
    MD -->|メトリクス| WEB_STAGING
    MD -->|メトリクス| WEB_PROD
    AP -->|アラート| NC
    BUDGET -->|予算アラート| PS3
    PS3 -->|通知| NC
    COST_OPT -->|クリーンアップ| AR

    classDef external fill:#ffcc99
    classDef compute fill:#99ccff
    classDef storage fill:#99ff99
    classDef security fill:#ffb3ba
    classDef monitoring fill:#bfa3ff
    classDef messaging fill:#ffd700
    classDef network fill:#e6e6fa
    classDef cicd fill:#f0f4ff

    class YT,DL external
    class CF1,CF2,CF3,WEB_STAGING,WEB_PROD compute
    class FS,TS_RAW,TS_DAILY,CS_AUDIO,CS_TFSTATE,AR storage
    class SM,FR,WIF security
    class MD,AP,NC,BUDGET,COST_OPT monitoring
    class CS1,CS2,CS3,PS1,PS2,PS3 messaging
    class VPC,SUBNET,NAT,DNS network
    class DEV,MAIN,GHA,STAGING,TAG,PROD cicd
```

## データフロー詳細

### 1. 開発・CI/CDフロー（新設計）
`ローカル開発 → main統合 → Staging自動デプロイ・テスト → Git Tag → Production手動承認デプロイ`

**開発統合フロー:**
1. **feature/* ブランチ開発**: ローカル環境（pnpm dev + Firestore Emulator）で機能開発
2. **main ブランチ統合**: Pull Request承認後、mainブランチにマージ
3. **Staging自動デプロイ**: GitHub Actionsが即座にStaging環境にデプロイ
4. **自動テスト実行**: Unit/E2E/Performance/Security テストの包括実行
5. **手動QA**: Staging環境での機能・UI/UX確認
6. **Git Tag作成**: セマンティックバージョニング（v1.x.x）でリリースタグ作成
7. **Production承認デプロイ**: 手動承認後、Production環境に安全デプロイ

### 2. 自動データ収集フロー（Production環境のみ - v11.0統合最適化）
`Cloud Scheduler → Pub/Sub → Cloud Functions → External APIs → Cloud Firestore + 時系列データ基盤`
- **YouTube動画収集**: Production環境でのみ有効。Cloud Schedulerが定刻にPub/Subトピックへメッセージを送信し、`fetchYouTubeVideos`関数をトリガーします。関数はYouTube Data APIから動画情報を取得し、Cloud Firestoreに保存します。
- **DLsite統合データ収集**: `fetchDLsiteWorksIndividualAPI`関数が15分間隔でトリガーされ、Individual Info APIから作品情報を取得し、基本データと時系列データを同時処理します。
- **時系列データ処理**: 取得したデータは即座に基本データとしてFirestoreに保存され、同時に時系列生データとして`dlsite_timeseries_raw`に保存されます。日次集計処理により`dlsite_timeseries_daily`に永続保存されます。
- **タイムアウト最適化**: 並列処理パラメータ最適化により、全1,484件の100%処理完了を保証します。
- **コスト最適化**: Staging環境ではCloud Functions無効化により、データ収集コストを削減します。

### 3. 2環境構成Webアプリケーションフロー

**Staging環境:**
`GitHub Actions → Cloud Run (軽量) → Cloud Firestore / Cloud Storage`
- **目的**: 自動テスト・QA・プレビュー確認
- **構成**: 最小インスタンス、512MBメモリ、Functions無効
- **アクセス**: Staging専用URL（https://staging-${PROJECT_ID}.run.app）

**Production環境:**
`ユーザー → Cloud DNS → Cloud Run (本番) → Cloud Firestore / Cloud Storage`
1. ユーザーが `suzumina.click` にアクセスすると、Cloud DNSがリクエストをCloud RunでホストされているNext.jsアプリケーションにルーティングします。
2. アプリケーションはCloud Firestoreから必要なデータを取得し、ユーザーに表示します。
3. 音声ファイルの再生やアップロードは、Cloud Storageとの間で直接行われます。
4. 外部へのアウトバウンド通信は、VPC内のCloud NATを経由して行われます。

### 4. 予算管理・監視・コスト最適化フロー（v11.0強化）
`リソース使用量 → Budget Alerts → Pub/Sub → Email通知 + 自動コスト最適化`
- **予算監視**: 月次予算（Staging: 1000円、Production: 4000円）を設定
- **自動アラート**: 予算の50%、80%、100%時点でアラート発信
- **通知システム**: 予算超過時のPub/Sub経由での即座通知
- **自動コスト最適化**: GitHub Actions による Artifact Registry イメージライフサイクル管理（毎日11:00 JST）
- **継続的クリーンアップ**: Docker Build Cache即座削除、Cloud Run Revision管理、未使用リソース自動削除

## リソース詳細分析

### ネットワーク（共通インフラ）
| リソース | 用途 | 管理ファイル | 両環境共有 |
|---|---|---|---|
| **VPC** | プロジェクト専用の仮想ネットワーク | `network.tf` | ✅ |
| **Subnet** | Cloud RunやFunctionsが配置されるサブネットワーク | `network.tf` | ✅ |
| **Cloud NAT** | プライベートなリソースからのアウトバウンド通信を許可 | `network.tf` | ✅ |
| **Cloud DNS** | `suzumina.click`ドメインの名前解決（Production のみ） | `dns.tf` | ❌ |

### コンピュートリソース（環境別構成 - v11.0最適化）
| リソース | Staging環境 | Production環境 | 実行トリガー | v11.0更新内容 |
|---|---|---|---|---|
| **fetchYouTubeVideos** | ❌ 無効（コスト削減） | ✅ 有効 | Pub/Sub | - |
| **fetchDLsiteWorksIndividualAPI** | ❌ 無効（コスト削減） | ✅ 有効・15分間隔 | Pub/Sub | タイムアウト最適化・100%成功保証 |
| **時系列データ処理** | ❌ 無効 | ✅ 統合実行 | 自動トリガー | 日次集計・永続保存システム |
| **Cloud Run (Web App)** | 軽量構成（512MB/1インスタンス） | 本番構成（1GB/2インスタンス） | HTTP リクエスト | - |

### ストレージシステム（共有リソース - v11.0時系列データ対応）
| ストレージ | 用途 | 特徴 | 管理ファイル | 両環境共有 | v11.0更新内容 |
|---|---|---|---|---|---|
| **Cloud Firestore** | アプリケーション・時系列データ | ネイティブモード, 複合インデックス | `firestore_database.tf` | ✅ | 時系列データコレクション追加 |
| **dlsite_timeseries_raw** | 時系列生データ | 7日間自動削除 | `firestore_indexes.tf` | ✅ | v11.0新規追加 |
| **dlsite_timeseries_daily** | 日次集計データ | 永続保存・高速検索 | `firestore_indexes.tf` | ✅ | v11.0新規追加 |
| **Cloud Storage (デプロイ)** | Terraform状態・アーティファクト | バージョニング, ライフサイクル管理 | `storage.tf` | ✅ | - |
| **Cloud Storage (tfstate)** | Terraformの状態ファイル | バージョニング有効, 削除保護 | `gcs.tf` | ✅ | - |
| **Artifact Registry** | Dockerコンテナイメージ | GitHub Actions連携・自動クリーンアップ | `artifact_registry.tf` | ✅ | 自動ライフサイクル管理 |

### CI/CD・デプロイメント（v11.0コスト最適化対応）
| コンポーネント | 役割 | トリガー | 対象環境 | v11.0更新内容 |
|---|---|---|---|---|
| **GitHub Actions (Staging)** | 自動デプロイ・テスト | main ブランチ push | Staging | - |
| **GitHub Actions (Production)** | 本番デプロイ | Git Tag push (v*) | Production | - |
| **GitHub Actions (Cleanup)** | 自動コスト最適化 | 毎日11:00 JST | 全環境 | v11.0新規追加 |
| **Workload Identity Federation** | 安全なGCP認証 | CI/CD実行時 | 両環境 | - |
| **Terraform Workspace** | 環境分離管理 | Manual/CI/CD | 両環境 | - |

### 予算・監視システム（v11.0コスト最適化強化）
| リソース | Staging | Production | 管理ファイル | v11.0更新内容 |
|---|---|---|---|---|
| **予算アラート** | 月1000円制限 | 月4000円制限 | `billing.tf` | - |
| **監視ダッシュボード** | 基本監視 | 完全監視・時系列データ監視 | `monitoring*.tf` | 時系列データメトリクス追加 |
| **アラートポリシー** | 重要アラートのみ | 包括的アラート | `monitoring.tf` | - |
| **ログ集約** | 基本ログ | 詳細ログ | `logging.tf` | - |
| **コスト最適化自動化** | 軽量クリーンアップ | 完全ライフサイクル管理 | `GitHub Actions` | v11.0新規追加 |

### セキュリティ・IAMアーキテクチャ
- **Workload Identity Federation**: サービスアカウントキーを使わずに、GitHub ActionsからGCPリソースを安全に認証します。
- **最小権限の原則**: 各サービスアカウントには、その役割に必要な最小限の権限のみが付与されています。
- **ネットワークセキュリティ**: すべてのコンピュートリソースは専用VPC内に配置され、外部との通信はCloud NATを経由することでセキュリティを強化しています。

## Terraformファイル構成（個人開発最適化）

### **環境管理の簡素化**
個人開発・個人運用向けに2環境構成（Staging + Production）を採用し、以下のファイル構成で管理します：

**コア設定ファイル:**
- **`variables.tf`**: 環境別変数定義（staging/production バリデーション付き）
- **`locals.tf`**: 環境別リソース設定（コスト最適化パラメータ）
- **`backend.tf`**: Terraform状態管理（GCS バックエンド）
- **`providers.tf`**: GCP プロバイダー設定

**インフラリソースファイル:**
- **`network.tf`**: 共有VPC・サブネット・Cloud NAT
- **`dns.tf`**: Production専用カスタムドメイン（条件付き作成）
- **`cloud_run.tf`**: 環境別Cloud Run設定（軽量 vs 本番構成）
- **`function_*.tf`**: Production専用Cloud Functions（Staging無効化）
- **`storage.tf`**: 共有ストレージ（Firestore・Cloud Storage）
- **`billing.tf`**: 環境別予算管理（1000円 vs 4000円制限）

**セキュリティ・監視ファイル:**
- **`iam.tf`**: 最小権限IAM・Workload Identity Federation
- **`secrets.tf`**: Secret Manager・APIキー管理
- **`monitoring*.tf`**: 環境別監視・アラート設定

### **個人開発向け設計原則**

**1. コスト最適化:**
```hcl
# Staging: 超軽量構成
staging = {
  cloud_run_max_instances = 1
  cloud_run_memory       = "512Mi"  
  functions_enabled      = false    # コスト削減
  budget_amount         = 1000     # 月1000円制限
}

# Production: 個人利用レベル
production = {
  cloud_run_max_instances = 2
  cloud_run_memory       = "1Gi"
  functions_enabled      = true
  budget_amount         = 4000     # 月4000円制限
}
```

**2. 環境分離:**
- 同一GCPプロジェクト内での論理分離
- Terraform workspace による状態管理分離
- 環境別リソース名プレフィックス

**3. CI/CD統合:**
- GitHub Actions によるTerraform自動実行
- 環境変数による動的設定切り替え
- Workload Identity Federation による安全認証

**4. 運用性重視:**
- 予算アラートによる自動コスト管理
- 環境別監視・ログ設定
- 緊急時対応のための柔軟な設定

### **デプロイ戦略との統合**

このTerraform構成は、[リリースプロセス](./RELEASE_PROCESS.md)と[デプロイ戦略](./DEPLOYMENT_STRATEGY.md)と完全に統合されており、以下の自動化を実現します：

1. **main ブランチ統合** → Staging環境自動デプロイ
2. **Git Tag作成** → Production環境手動承認デプロイ  
3. **環境別設定自動適用** → コスト・パフォーマンス最適化
4. **予算監視自動実行** → コスト超過時の即座アラート

このインフラストラクチャは、**個人開発・個人運用に最適化**された、**コスト効率と運用性を両立**した設計となっています。v11.0では、**時系列データ基盤、タイムアウト最適化、コスト最適化**を実装し、純粋なGCPサービスで構成された**自動化、品質担保、セキュリティ**を重視した堅牢な基盤を提供します。

## 🚀 v11.0アーキテクチャ強化ポイント

### 1. 時系列データ基盤アーキテクチャ
```
DLsite Individual Info API → fetchDLsiteWorksIndividualAPI (15分間隔)
                                         ↓
                           基本データ + 時系列データ同時処理
                                         ↓
                           ┌─ Cloud Firestore (基本データ)
                           └─ dlsite_timeseries_raw (生データ・7日保持)
                                         ↓
                              日次集計処理 (自動実行)
                                         ↓
                           dlsite_timeseries_daily (永続保存)
                                         ↓
                              価格履歴API (/api/timeseries/[workId])
```

### 2. タイムアウト最適化アーキテクチャ
- **並列処理最適化**: 3→5並列 (67%増)
- **API間隔短縮**: 1000ms→600ms (40%短縮)
- **処理成功率**: 77.1%→100% (完全改善)
- **全作品処理保証**: 1,484件完全処理

### 3. コスト最適化アーキテクチャ
```
GitHub Actions (毎日11:00 JST) → Artifact Registry Cleanup
                                         ↓
                              ┌─ Docker Image 世代管理 (10→5世代)
                              ├─ Cloud Run Revision管理 (5→3世代)
                              ├─ Build Cache 即座削除
                              └─ 未使用リソース自動削除
                                         ↓
                              継続的コスト最適化 (月額約$300削減見込み)
```

### 4. v11.0インフラ統計
| 指標 | v10.1 | v11.0 | 改善 |
|------|-------|-------|------|
| データ処理成功率 | 77.1% | 100% | +22.9pt |
| 実行頻度 | 60分間隔 | 15分間隔 | 4倍高頻度 |
| 時系列データ保持 | 7日間 | 永続保存 | 長期分析対応 |
| コスト最適化 | 手動 | 自動化 | 運用効率化 |
| インフラ可視性 | 基本監視 | 包括的監視 | 完全監視 |

## ⚙️ 音声ボタン機能詳細設定

### **Cloud Storage設定（音声ファイル）**

| リソース | 説明 | 設定値 |
|---------|------|--------|
| **バケット名** | `${project_id}-audio-files` | `suzumina-click-audio-files` |
| **ライフサイクル** | 1年後自動削除 | 365日 |
| **ストレージクラス** | 30日→Nearline, 90日→Coldline | コスト最適化 |
| **CORS** | Web再生用クロスオリジン設定 | `*.suzumina.click` |

### **セキュリティ・権限設定**

| サービスアカウント | 用途 | 権限 |
|------------------|------|------|
| **audio-processor** | Cloud Run Jobs実行 | Storage Admin, Firestore User |
| **web-app-audio** | Web App音声アクセス | Storage Object Viewer |
| **task-enqueuer** | タスク送信 | Cloud Tasks Enqueuer, Run Invoker |

### **コスト最適化戦略**

**Cloud Storage:**
- **ライフサイクル管理**: 30日後Nearline（50%削減）→90日後Coldline（75%削減）
- **自動削除**: 1年後完全削除
- **リージョン**: us-central1（標準料金）

**Next.js Server Actions:**
- **ユーザーアップロード**: ブラウザ直接アップロード（サーバー処理最小化）
- **ファイルサイズ制限**: 10MB（音声ファイル適正サイズ）

## 🔧 環境設定・認証ガイド

### **Application Default Credentials (ADC) 設定**

**開発環境セットアップ:**
```bash
# Google Cloud SDK インストール
brew install google-cloud-sdk

# ADC 設定
gcloud auth application-default login

# プロジェクト設定
gcloud config set project YOUR_PROJECT_ID

# 設定確認
gcloud auth application-default print-access-token
gcloud config get-value project
```

**本番環境:**
- Cloud Run/Cloud Functions: サービスアカウント自動認証
- GitHub Actions: Workload Identity Federation による安全認証

### **Discord OAuth設定**

#### Discord OAuth Application作成

1. [Discord Developer Portal](https://discord.com/developers/applications) にアクセス
2. 「New Application」をクリックしてアプリケーション作成
3. OAuth2 > General から以下を取得:
   - **Client ID** (`discord_client_id`)
   - **Client Secret** (`discord_client_secret`)

#### Redirect URIs設定

OAuth2 > General > Redirects で以下を追加:

```
# 開発環境
http://localhost:3000/api/auth/callback/discord

# 本番環境
https://suzumina.click/api/auth/callback/discord
```

#### Discord Bot Token取得（オプション）

高度なGuild管理機能を使用する場合:

1. Discord Developer Portal > Bot
2. 「Reset Token」で新しいトークンを生成
3. 必要な権限を設定（Guild読み取り権限）

#### NextAuth Secret生成

```bash
# ランダムなシークレット生成
openssl rand -base64 32
```

### **terraform.tfvars設定**

```bash
# terraform.tfvarsファイル作成
cp terraform.tfvars.example terraform.tfvars

# セキュリティ設定
chmod 600 terraform.tfvars

# 基本設定
echo 'gcp_project_id = "your-gcp-project-id"' >> terraform.tfvars
echo 'project_number = "123456789012"' >> terraform.tfvars
echo 'region = "asia-northeast1"' >> terraform.tfvars
echo 'environment = "staging"' >> terraform.tfvars

# Discord OAuth設定（必須）
echo 'discord_client_id = "1357640432196255874"' >> terraform.tfvars      # あなたのClient ID
echo 'discord_client_secret = "your-secret-here"' >> terraform.tfvars     # あなたのClient Secret
echo 'nextauth_secret = "your-generated-secret"' >> terraform.tfvars      # 上記で生成したシークレット

# オプション設定
echo 'discord_bot_token = "MTxxxxx.xxxxx.xxxxxxxxxxxx"' >> terraform.tfvars  # Bot Token（オプション）
echo 'suzumina_guild_id = "959095494456537158"' >> terraform.tfvars          # すずみなふぁみりー（通常変更不要）
```

### **環境変数設定**

**Next.js Application (環境別):**
```bash
# Staging環境
NEXT_PUBLIC_ENVIRONMENT=staging
GOOGLE_CLOUD_PROJECT=${GCP_PROJECT_ID}

# Production環境  
NEXT_PUBLIC_ENVIRONMENT=production
GOOGLE_CLOUD_PROJECT=${GCP_PROJECT_ID}
```

**Cloud Functions:**
```bash
# 環境変数は Secret Manager から自動注入
# YOUTUBE_API_KEY: Secret Manager で管理
NODE_ENV=production
FUNCTION_TARGET=fetchYouTubeVideos
```

### **セキュリティ設定**

**Firestore Security Rules:**
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // 音声ボタン - 公開分のみ読み取り可能
    match /audioButtons/{buttonId} {
      allow read: if resource.data.isPublic == true;
      allow write: if false; // ユーザー認証により管理
    }
    
    // 動画・作品データ - 読み取りのみ
    match /{collection}/{document} {
      allow read: if collection in ['videos', 'dlsiteWorks'];
      allow write: if false;
    }
  }
}
```

**Cloud Storage IAM:**
- Service Account: objectAdmin (デプロイ・アーティファクト管理用)

### **運用・監視コマンド**

```bash
# 認証関連の確認
# Secret Manager確認
gcloud secrets versions access latest --secret="DISCORD_CLIENT_ID"
gcloud secrets versions access latest --secret="NEXTAUTH_SECRET" | head -c 20  # 一部のみ表示

# Cloud Runログ確認
gcloud logging read "resource.type=cloud_run_revision" --limit=50

# 認証エラー監視
gcloud logging read 'severity="ERROR" AND textPayload=~"auth"' --limit=20

# Cloud Run サービス確認
gcloud run services list --region=asia-northeast1

# Cloud Functions 確認  
gcloud functions list --region=asia-northeast1

# Firestore データベース確認
gcloud firestore databases list

# 予算アラート確認
gcloud billing budgets list

# 音声ファイル容量確認
gsutil du -sh gs://suzumina-click-audio-files

# 音声ファイルアップロード統計
gcloud logging read 'protoPayload.methodName="storage.objects.insert" AND protoPayload.resourceName=~"audio-files"' --limit=20
```

## 🛠️ トラブルシューティング

### **認証関連の問題**

1. **Redirect URI Mismatch**
   - Discord Developer Portalの設定を確認
   - 本番ドメインが正しく設定されているか確認

2. **Secret Manager Access Error**
   - Cloud RunサービスアカウントのIAM権限を確認
   - Secret Managerでシークレットが作成されているか確認

3. **Guild認証エラー**
   - Guild ID (`959095494456537158`) が正しいか確認
   - ユーザーがGuildのメンバーかDiscordで確認

### **音声関連の問題**

4. **音声ファイルアップロード権限エラー**
   ```bash
   # IAM権限確認
   gcloud projects get-iam-policy suzumina-click
   ```

5. **Cloud Storage CORS設定**
   ```bash
   # CORS設定確認
   gsutil cors get gs://suzumina-click-audio-files
   ```

### **緊急時手順**

1. **音声アップロード一時停止**
   ```bash
   # メンテナンスモード設定
   gcloud run services update suzumina-click-web --set-env-vars MAINTENANCE_MODE=true
   ```

2. **サービス復旧**
   ```bash
   # メンテナンスモード解除
   gcloud run services update suzumina-click-web --remove-env-vars MAINTENANCE_MODE
   ```

## 📋 デプロイチェックリスト

### **初回デプロイ前**
- [ ] Discord OAuth Application作成完了
- [ ] terraform.tfvars設定完了（認証情報含む）
- [ ] terraform.tfvars権限設定（chmod 600）
- [ ] GCP認証設定完了
- [ ] 既存インフラへの影響確認

### **デプロイ後確認**
- [ ] Secret Manager シークレット作成確認
- [ ] Discord OAuth Redirect URI設定確認
- [ ] Cloud Run環境変数設定確認
- [ ] 認証機能テスト（ログイン・ログアウト・Guild認証）
- [ ] Cloud Storage バケット作成確認
- [ ] IAM権限設定確認
- [ ] Web App音声アップロード機能テスト

### **本番移行**
- [ ] 段階的デプロイ（開発→ステージング→本番）
- [ ] 認証・セキュリティテスト
- [ ] パフォーマンステスト
- [ ] 監視・アラート設定
- [ ] ドキュメント更新