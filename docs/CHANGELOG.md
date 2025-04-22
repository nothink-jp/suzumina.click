# Changelog

## [0.2.0] - 2025-04-28 (予定)

### 追加
- モノレポ構成への移行
- Cloud Run環境へのホスティング移行
- Cloud Build連携によるビルドパイプライン
- 評価環境への手動デプロイワークフロー

### 変更
- プロジェクト構造を `apps/web` 形式のモノレポ構造に再編成
- Firebase HostingからCloud Runへのホスティング変更
- デプロイパイプラインをCloud BuildとGitHub Actions連携方式に変更

### 修正
- Firebase CLIとTerraformの混在管理問題を解決
- インフラ管理をTerraformで一元化

## [0.1.1] - 2025-04-21

### 追加
- YouTube動画情報取得バッチ機能
- Firestore データモデルの実装
- Cloud Functions `fetchYouTubeVideos` の実装
- YouTube API クォータ制限対応
- ドキュメント更新 (`SCHEMA.md`, `AUDIO_BUTTON_PLAN.md`, 他)

### 変更
- テストカバレッジの拡充

### 修正
- 認証関連のバグ修正
- UI表示の微調整

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

## [0.1.1] - 2025-04-15

### Added

- 設計ドキュメント (`README.md`, `POLICY.md`, `COMPONENT_DESIGN.md`, `STYLING.md`, `AUTH_DESIGN.md`, `ENVIRONMENT_VARIABLES.md`) 作成
- 初期セットアップ (`globals.css`, `layout.tsx`, `page.tsx`, `components/`, `lib/`, Biome, Vitest/RTL, Storybook)
- ヘッダーコンポーネント (`src/components/layout/Header.tsx`)
- フッターコンポーネント (`src/components/layout/Footer.tsx`)
- プロフィール表示ページ (`/profile`)
- Discord ギルドメンバー限定認証機能 (Cloud Functions, Firebase Client SDK, AuthProvider, AuthButton, Callback Page)
- `Header` コンポーネントのテストと Story
- `Footer` コンポーネントのテストと Story
- `HeadlessUiDisclosureExample` コンポーネントのテスト
- `HomePage` のテスト
- `ProfilePage` のテスト
- Firebase Hosting / Functions の初期設定とデプロイ
- GitHub Actions CI/CD ワークフロー修正 (pnpm 対応、環境変数設定)

### Changed

- `docs/AUTH_DESIGN.md` を簡略化 (実装完了後の整理)

### Fixed

- (修正点は TODO リストからは直接読み取れないため、必要に応じて追記してください)

### Removed

- `docs/PLAN.md` の削除
