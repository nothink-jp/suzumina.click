# Changelog

## [Unreleased]

### Added

- Discord OAuth2認証システム
  - Discord OAuth2によるユーザー認証
  - サーバーメンバーシップの確認
  - セッション管理とルート保護
  - ユーザーデータのFirestore保存

### Changed

- App Routerの構造を改善
  - クライアント/サーバーコンポーネントの分離
  - レイアウト構造の最適化
  - セッション管理の実装

### Security

- 認証・認可システムの導入
  - JWTベースのセッション管理
  - 保護されたルートの実装
  - セキュアなクッキー設定

## [0.1.0] - 2024-04-03

### Added

- プロジェクトの初期設定
  - Next.js App Router
  - Tailwind CSS
  - TypeScript
  - Biome
  - Bun
