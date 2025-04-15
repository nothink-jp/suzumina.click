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
- [ ] `docs/AUTH_DESIGN.md` の簡略化 (実装完了後の整理)

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
- [ ] (TODO) 認証ユーザー情報の表示改善 (例: Header のユーザー名表示)
- [ ] (TODO) プロフィールページの内容拡充

## テスト / Storybook

- [x] `Header` コンポーネントのテスト作成
- [x] `Footer` コンポーネントのテスト作成
- [x] `HeadlessUiDisclosureExample` コンポーネントのテスト作成
- [x] `HomePage` のテスト作成
- [x] `ProfilePage` のテスト作成
- [x] `Header` コンポーネントの Story 作成
- [x] `Footer` コンポーネントの Story 作成

## デプロイ / CI/CD

- [x] Firebase Hosting / Functions の初期設定とデプロイ
- [x] GitHub Actions CI/CD ワークフロー修正 (pnpm 対応、環境変数設定)
