# Changelog

## [0.1.3] - 2025-04-27

### 追加

- Cloud Codeによる開発環境の強化
  - ローカル開発環境でのGCPエミュレーション対応
  - リモートデバッグ機能の設定
  - クラウドデプロイ連携の最適化
- クラウド監視体制の整備
  - Cloud Runメトリクスダッシュボードの実装
  - パフォーマンスアラートの設定（高レイテンシ、エラー率）
  - メール通知チャネルの構成
- コスト最適化機能
  - 予算管理・アラート設定
  - 自動スケーリング最適化
  - 夜間自動スケールダウン（開発環境用）
- ドキュメントの充実
  - 開発環境セットアップガイドの大幅拡充
  - 新規開発者向け手順の最適化
  - デバッグフロー説明の追加

### 変更

- すべてのパッケージバージョンを0.1.3に統一
- 開発フロー手順の改善と最適化
- 環境変数関連の設定例の拡充
- Terraformの変数定義を拡張

### 修正

- TODOリストのクリーンアップ（完了項目の整理）
- Firebase関連の設定パラメータの標準化

## [0.1.2] - 2025-04-23

### 追加

- モノレポ構成への移行
- Cloud Run環境へのホスティング移行
- Cloud Build連携によるビルドパイプライン
- 評価環境への手動デプロイワークフロー
- ドキュメントの整備と更新
- TODOリストのクリーンアップ
- `pnpm-workspace.yaml` のモノレポ対応化

### 変更

- プロジェクト構造を `apps/web` 形式のモノレポ構造に再編成
- Firebase HostingからCloud Runへのホスティング変更
- デプロイパイプラインをCloud BuildとGitHub Actions連携方式に変更
- バージョン管理の統一 (0.1.2)
- READMEの更新（技術スタックと機能説明）

### 修正

- Firebase CLIとTerraformの混在管理問題を解決
- インフラ管理をTerraformで一元化
- CHANGELOGの重複エントリの統合
- パッケージ依存関係の整理

## [0.1.1] - 2025-04-21

### 追加

- YouTube動画情報取得バッチ機能
- Firestore データモデルの実装
- Cloud Functions `fetchYouTubeVideos` の実装
- YouTube API クォータ制限対応
- ドキュメント更新 (`SCHEMA.md`, `AUDIO_BUTTON_PLAN.md`, 他)
- 設計ドキュメント (`README.md`, `POLICY.md`, `COMPONENT_DESIGN.md`, `STYLING.md`, `AUTH_DESIGN.md`, `ENVIRONMENT_VARIABLES.md`) 作成
- 認証関連機能の拡充

### 変更

- テストカバレッジの拡充
- `docs/AUTH_DESIGN.md` の簡略化 (実装完了後の整理)

### 修正

- 認証関連のバグ修正
- UI表示の微調整

### 削除

- `docs/PLAN.md` の削除

## [0.1.0] - 2025-04-01

### 追加

- プロジェクト初期設定
- Next.js App Router セットアップ
- Discord認証機能
- Firebase連携
- プロフィール表示機能
- テスト環境設定
- Storybook設定
- CI/CDパイプライン
- 初期セットアップ (`globals.css`, `layout.tsx`, `page.tsx`, `components/`, `lib/`, Biome, Vitest/RTL, Storybook)
- ヘッダーコンポーネント (`src/components/layout/Header.tsx`)
- フッターコンポーネント (`src/components/layout/Footer.tsx`)
- プロフィール表示ページ (`/profile`)
- Discord ギルドメンバー限定認証機能 (Cloud Functions, Firebase Client SDK, AuthProvider, AuthButton, Callback Page)
- 主要コンポーネントのテストとStory
- Firebase Hosting / Functions の初期設定とデプロイ
- GitHub Actions CI/CD ワークフロー (pnpm 対応、環境変数設定)
