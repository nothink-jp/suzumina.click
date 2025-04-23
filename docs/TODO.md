# TODOリスト

## 設計ドキュメント (初期)

- [x] `docs/README.md` 作成 (プロジェクト概要、ディレクトリ構成)
- [x] `docs/POLICY.md` 作成 (設計思想、規約、Git方針など)
- [x] `docs/COMPONENT_DESIGN.md` 作成 (RSC/RCC 使い分け、命名規則など)
- [x] `docs/STYLING.md` 作成 (Tailwind/DaisyUI 方針)
- [x] 設計ドキュメント (`README.md`, `POLICY.md`, `COMPONENT_DESIGN.md`, `STYLING.md`) のレビューと最終調整
- [x] `docs/PLAN.md` の削除 (上記ドキュメント確定後)
- [x] `docs/AUTH_DESIGN.md` 作成 (認証設計)
- [x] `docs/ENVIRONMENT_VARIABLES.md` 作成 (環境変数設定ガイド)
- [x] `docs/AUTH_DESIGN.md` の簡略化 (実装完了後の整理)
- [x] `docs/` 以下のドキュメント全体を現状の実装に合わせてレビュー・更新 (2025-04-21)
- [x] **移行計画のトラブルを反映したドキュメント更新** (Firebase認証のみ使用、ステージング環境のみの開発体制)

## 初期セットアップ

- [x] `src/app/globals.css` の設定:
  - [x] `@plugin "daisyui"` で使用する DaisyUI テーマの選定と設定 (`themes: light --default;`)
- [x] `src/app/layout.tsx` の基本的な実装 (HTML構造、フォント設定、`globals.css` 読み込み確認など)
- [x] `src/app/page.tsx` の基本的な実装 (初期表示コンテンツ)
- [x] 共通コンポーネント用ディレクトリ `src/components/` の作成
- [x] ユーティリティ関数用ディレクトリ `src/lib/` の作成
- [x] Biome (フォーマッター/リンター) の導入と設定 (`biome.json`, `package.json`)
- [x] Vitest / RTL の導入と設定
- [x] Storybook の導入と設定

## 機能実装

- [x] ヘッダーコンポーネント作成 (`src/components/layout/Header.tsx`)
- [x] フッターコンポーネント作成 (`src/components/layout/Footer.tsx`)
- [x] プロフィール表示ページ作成 (`/profile`)
- [x] Discord ギルドメンバー限定認証機能の実装
  - [x] Cloud Functions (`discordAuthCallback`) 実装
  - [x] Firebase Client SDK 初期化 (`src/lib/firebase/client.ts`)
  - [x] AuthProvider 実装 (`src/lib/firebase/AuthProvider.tsx`)
  - [x] AuthButton 実装 (`src/components/ui/AuthButton.tsx`)
  - [x] 認証コールバックページ実装 (`/auth/discord/callback`)
- [x] 認証ユーザー情報の表示改善 (Header のユーザー名表示)
- [x] プロフィールページの内容拡充 (Discord情報表示)

## 音声ボタンサービス

- [x] **YouTube動画情報取得バッチ 設計・計画 (`docs/AUDIO_BUTTON_PLAN.md`)** (実装に合わせて更新済)
- [x] **インフラ設定 (Terraform)**
  - [x] Firestoreデータベース作成
  - [x] YouTube APIキー用 Secret Manager シークレット作成
  - [x] `fetchYouTubeVideos` 関数用サービスアカウント作成と権限付与 (Firestore, Secret Manager, Logging, Run Invoker)
  - [x] Pub/Subトピック (`youtube-video-fetch-trigger`) 作成
  - [x] Cloud Schedulerジョブ作成 (1時間に1回 Pub/Subトピックをトリガー)
  - [x] Cloud SchedulerサービスエージェントへのPub/Sub発行権限付与
  - [x] Pub/Sub, Eventarc サービスエージェントへの関連権限付与 (Token Creator, Event Receiver, Run Invoker)
- [x] **Cloud Functions 実装 (`fetchYouTubeVideos`)**
  - [x] 必要なライブラリ (`googleapis`, `@google-cloud/firestore`, `@google-cloud/functions-framework`) 追加
  - [x] Pub/Subトリガーで起動する関数ロジック実装 (YouTube API呼び出し、Firestore書き込み)
  - [x] イベント形式の互換性問題のため、Raw CloudEvent ハンドラ形式で実装
- [x] **Cloud Functions デプロイ (`fetchYouTubeVideos`)**
  - [x] Terraform でのデプロイと動作確認完了
- [x] **YouTube API クォータ制限対応**
  - [x] メタデータによる状態管理機構の実装
  - [x] 段階的なデータ取得（ページング制限）の実装
  - [x] リトライ機能の追加
  - [x] エラーハンドリングの強化
  - [x] テストケースの更新
- [x] **データモデルドキュメント作成**
  - [x] `docs/SCHEMA.md` 作成 (Firestoreデータモデル、ER図) (実装に合わせて更新済)
- [x] `docs/ENVIRONMENT_VARIABLES.md`: `YOUTUBE_API_KEY` について追記
- [x] `docs/README.md`: 音声ボタンサービス機能の概要と関連ドキュメントへの参照を記載

## テスト / Storybook

- [x] `Header` コンポーネントのテスト作成
- [x] `Footer` コンポーネントのテスト作成
- [x] `HeadlessUiDisclosureExample` コンポーネントのテスト作成
- [x] `HomePage` のテスト作成
- [x] `ProfilePage` のテスト作成
- [x] `Header` コンポーネントの Story 作成
- [x] `Footer` コンポーネントの Story 作成

## デプロイ / CI/CD

- [x] ~~Firebase Hosting / Functions の初期設定とデプロイ~~ → Cloud Run移行により廃止
- [x] GitHub Actions CI/CD ワークフロー修正 (pnpm 対応、環境変数設定)

## モノレポ構成リファクタリングと Cloud Run 移行

### モノレポ構成改善

- [x] **基盤準備 (2025-04-22 ~ 2025-04-23)**
  - [x] `pnpm-workspace.yaml` の更新（`apps/*`, `packages/*`, `functions` 形式に変更）
  - [x] ルート `package.json` の更新（monorepo管理用スクリプト設定）
  - [x] Webアプリ用 `apps/web/package.json` の作成（`@suzumina.click/web` 名前空間設定）
  - [x] biome設定ファイルのモノレポ対応化

### リソース移行

- [x] **ソースコードとリソース移行 (2025-04-24)**
  - [x] `src` ディレクトリを `apps/web/src` へ移動
  - [x] `public` ディレクトリを `apps/web/public` へ移動
  - [x] 各種設定ファイル（`next.config.ts`, `postcss.config.mjs`, `tsconfig.json` など）を `apps/web` に移動
  - [x] テスト関連ファイル（`vitest.config.ts` など）を `apps/web` に移動
  - [x] 不要になったルートディレクトリのファイルを削除（`src`, `public`, `.storybook`, 設定ファイル類）
  - [x] `package.json`の`clean`スクリプトを更新（モノレポ構造に対応）

### Cloud Run 移行

- [x] **Cloud Run用の設定とインフラ構築 (2025-04-25 ~ 2025-04-26)**
  - [x] `apps/web/Dockerfile` の作成（Next.js standalone モード対応）
  - [x] `cloudbuild.yaml` の更新（モノレポ構成対応）
  - [x] `skaffold.yaml` の更新（`apps/web` コンテキスト対応）
  - [x] `terraform/cloudrun.tf` の作成（Cloud Runサービス定義）
  - [x] `terraform/cloudbuild.tf` の作成（Cloud Buildトリガー定義）

### CI/CD パイプライン更新

- [x] **デプロイパイプラインの更新 (2025-04-27)**
  - [x] GitHub Actions評価環境デプロイワークフローの作成（`.github/workflows/trigger-evaluation-deploy.yml`）
  - [x] Cloud Build連携の設定
  - [x] IAM権限の構成
  - [x] 手動デプロイテスト実施

### ~~最終確認と本番移行~~ → ステージング環境のみの運用体制へ変更

- [x] **実装方針の変更 (2025-04-28)**
  - [x] ステージング環境のみでの開発体制に変更
  - [x] Firebase Hostingからの移行完了
  - [ ] ~~DNSとSSL設定変更（独自ドメイン設定）~~ → 当面の間保留
  - [x] 旧設定のクリーンアップ
  - [x] ステージング環境でのパフォーマンス検証
- [x] **移行計画のトラブルを反映したドキュメント更新** (Firebase認証のみ使用、ステージング環境のみの開発体制)

## インフラ管理体制見直し

- [x] **インフラ管理方法の検討 (2025-04-22)**
  - [x] GitHub ActionsとTerraformの責務分離
  - [x] ローカル実行Terraformとクラウド実行GitHubへの変更
  - [x] セキュリティリスク低減のためのサービスアカウント権限見直し

- [x] **Terraform管理方法の改善** (2025-04-29)
  - [x] ローカル環境でのTerraform実行手順書作成 (`docs/TERRAFORM_LOCAL.md`)
  - [x] Terraform実行結果の共有方法の確立（状態ファイル管理）
  - [x] リソース情報の可視化方法の検討（ダッシュボード、ドキュメント）
  
- [x] **GitHub Actions権限最小化** (2025-04-30)
  - [x] アプリケーションデプロイ用サービスアカウントの作成
  - [x] 最小権限設定の実装と検証
  - [x] Cloud FunctionsとCloud Runアップデート専用ワークフローの整備

- [x] **インフラコード更新と改善** (2025-05-01)
  - [x] Terraformコードの更新（Cloud Run、Cloud Functionsの分離）
  - [x] lifecycle設定による変更監視対象の除外設定
  - [x] デプロイプロセスと環境変数管理の改善

- [x] **CI/CD改善計画** (2025-05-02)
  - [x] Cloud Buildの廃止とGitHub Actionsへの統合
  - [x] コンテナビルドとデプロイプロセスの一元化
  - [x] ワークフローの最適化と実行時間の短縮
  - [x] ビルド・デプロイの責務を明確化したドキュメントの更新（`docs/CI_CD.md`）

## 今後のタスク

### 開発環境改善

- [ ] **Cloud Code (VS Code拡張) の導入検討**
  - [ ] ローカル開発環境でのGCPエミュレーション
  - [ ] リモートデバッグの設定
  - [ ] クラウドデプロイ連携

### モニタリングと運用

- [ ] **Cloud Run メトリクス監視の設定**
  - [ ] ダッシュボード作成
  - [ ] アラート設定
- [ ] **コスト最適化**
  - [ ] コスト推移の追跡
  - [ ] 予算アラート設定
  - [ ] 自動スケーリング設定最適化

### ドキュメント整備

- [ ] **開発者向けセットアップガイド更新**
  - [ ] モノレポ対応の開発フロー説明
  - [ ] ローカル開発環境のセットアップ手順
  - [ ] テスト/デプロイの手順更新
- [ ] **アプリ実装ドキュメント更新**
  - [ ] 機能概要図の更新
  - [ ] API設計の再整理
  - [ ] 認証フローの最終化
