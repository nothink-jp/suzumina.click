# Changelog

## [Unreleased]

### Added

- Discord OAuth2認証システム
  - Discord OAuth2によるユーザー認証
  - サーバーメンバーシップの確認
  - セッション管理とルート保護
  - ユーザーデータのFirestore保存
- 共有TypeScript設定パッケージ (`@suzumina/typescript-config`) を追加

### Changed

- App Routerの構造を改善
  - クライアント/サーバーコンポーネントの分離
  - レイアウト構造の最適化
  - セッション管理の実装
- `apps/web/tsconfig.json` を共有設定を継承するようにリファクタリング
- `docs/TODO.md` を更新・クリーンアップ

### Fixed

- GitHub Actionsのビルド問題を修正
  - 環境変数ハンドリングの改善
  - ビルド時とランタイム時の処理を分離
  - 本番環境での未設定環境変数チェックを追加

### Security

- 認証・認可システムの導入
  - JWTベースのセッション管理
  - 保護されたルートの実装
  - セキュアなクッキー設定
  - 環境変数のバリデーション強化

## [0.1.0] - 2024-04-03

### Added

- プロジェクトの初期設定
  - Next.js App Router
  - Tailwind CSS
  - TypeScript
  - Biome
  - Bun
