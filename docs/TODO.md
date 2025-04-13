# TODOリスト

## 設計ドキュメント (初期)

- [x] `docs/README.md` 作成 (プロジェクト概要、ディレクトリ構成)
- [x] `docs/POLICY.md` 作成 (設計思想、規約、Git方針など)
- [x] `docs/COMPONENT_DESIGN.md` 作成 (RSC/RCC 使い分け、命名規則など)
- [x] `docs/STYLING.md` 作成 (Tailwind/DaisyUI 方針)
- [x] 設計ドキュメント (`README.md`, `POLICY.md`, `COMPONENT_DESIGN.md`, `STYLING.md`) のレビューと最終調整
- [x] `docs/PLAN.md` の削除 (上記ドキュメント確定後)

## 初期セットアップ

- [x] `src/app/globals.css` の設定:
    - [x] `@plugin "daisyui"` で使用する DaisyUI テーマの選定と設定 (`themes: light --default;`)
- [x] `src/app/layout.tsx` の基本的な実装 (HTML構造、フォント設定、`globals.css` 読み込み確認など)
- [x] `src/app/page.tsx` の基本的な実装 (初期表示コンテンツ)
- [x] 共通コンポーネント用ディレクトリ `src/components/` の作成
- [x] ユーティリティ関数用ディレクトリ `src/lib/` の作成
- [x] Biome (フォーマッター/リンター) の導入と設定 (`biome.json`, `package.json`)

## 機能実装 (例)

- [x] ヘッダーコンポーネント作成
- [x] フッターコンポーネント作成
- [x] プロフィール表示ページ作成 (`/profile`)
