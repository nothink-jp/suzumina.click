# Changelog

## [Unreleased]

### Changed

- プロジェクトドキュメントを更新し、現状のコードベースや設定との整合性を向上 (`README.md`, `docs/README.md`, `docs/auth/AUTH_DESIGN.md`, `docs/PROJECT_ANALYSIS.md`, `docs/gcp/GCP_IAC_DESIGN_MINIMAL.md`)

## [0.1.2] - 2025-04-09

### Changed

- **UIライブラリ移行:** `packages/ui` の基盤を `shadcn/ui` から `HeroUI` に移行。
  - 関連する依存関係の追加・削除。
  - `packages/tailwind-config` を HeroUI プラグインを使用するように更新。
  - `apps/web` で `HeroUIProvider` を設定し、コンポーネント使用箇所を更新。
  - テストコードを HeroUI のコンポーネント構造に合わせて修正。
- **アーキテクチャ改善:** `packages/ui` にエントリーポイント (`src/index.ts`) を作成し、`package.json` の `exports` を更新してインポートパスを簡略化。
- **コード品質:**
  - DeepSource の指摘 (JS-0322: 空のインターフェース, JS-0437: インデックスキー, JS-C1003: ワイルドカードインポート, JS-0257: 無関係な依存関係) に対応。
  - Biome によるフォーマットとインポート順序を修正。
- **クリーンアップ:** 移行に伴い不要になったファイル、設定、依存関係を削除。
- 全パッケージのバージョンを `0.1.2` に更新。

## [0.1.1] - 2025-04-08

### Changed

- 全パッケージのバージョンを `0.1.1` に更新
- 全 `package.json` に `description` フィールドを追加

### Added

- Discord OAuth2認証システム
  - Discord OAuth2によるユーザー認証
  - サーバーメンバーシップの確認
  - セッション管理とルート保護
  - ユーザーデータのFirestore保存
- 共有TypeScript設定パッケージ (`@suzumina.click/typescript-config`) を追加

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
