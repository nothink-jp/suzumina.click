# アーキテクチャ設計: 関心の分離 (`packages/ui` vs `apps/web`)

## 目的

`packages/ui` と `apps/web` の間で関心事を明確に分離し、保守性、再利用性、スケーラビリティを向上させる。

## 現状の構成要素

* **`packages/ui`**: HeroUI ベースの UI コンポーネントライブラリ。
* **`packages/tailwind-config`**: 共有 Tailwind CSS 設定。
* **`apps/web`**: Next.js ウェブアプリケーション。

## 分離すべき関心事

1. **プレゼンテーション vs アプリケーションロジック:**
    * `packages/ui` は UI 要素の見た目と基本的な振る舞いに責任を持つ（プレゼンテーション層）。
    * `apps/web` はアプリケーション固有の機能、データフロー、状態、ビジネスロジックに責任を持つ（アプリケーション層）。
2. **汎用性 vs アプリケーション固有性:**
    * `packages/ui` は可能な限り汎用的で再利用可能なコンポーネントを提供する。
    * `apps/web` は `suzumina.click` 固有の要件を扱う。
3. **スタイリング:**
    * `packages/tailwind-config` がスタイリングの基盤。
    * `packages/ui` がコンポーネントのコアスタイルを定義。
    * `apps/web` が全体的な適用とレイアウト調整を行う。
4. **依存関係:**
    * `packages/ui` は UI 関連の依存関係に限定する。
    * `apps/web` はアプリケーションに必要な全ての依存関係を持つ。

## 設計方針

1. **`packages/ui` (Design System Core):**
    * **責務:**
        * 汎用的なプレゼンテーションコンポーネント (HeroUI ベース) の提供。
        * UI 関連のカスタムフック、ユーティリティの提供。
        * `packages/tailwind-config` を利用したスタイリング。
    * **原則:** アプリケーションの状態やビジネスロジックに依存しない。Props 経由でデータを受け取り、コールバックを実行する。
    * **依存関係:** React, HeroUI, スタイリング関連 (clsx, tailwind-merge), framer-motion などに限定。
    * **エクスポート:** `src/index.ts` をエントリーポイントとし、公開するコンポーネント/フック/ユーティリティを再エクスポートする。`package.json` の `exports` でルート (`.`) からのインポートを可能にする。

2. **`apps/web` (Web Application):**
    * **責務:**
        * アプリケーション固有の機能、ビジネスロジック、データフロー、状態管理。
        * ページルーティング、データフェッチ、認証 (NextAuth, GCP)。
        * `packages/ui` のコンポーネントを組み合わせてアプリケーション固有の複合コンポーネントやページを構築。
        * アイコンのレンダリング (`lucide-react` を直接利用)。
    * **原則:** アプリケーションの文脈に沿った実装を行う。
    * **依存関係:** Next.js, NextAuth, GCP クライアント, `packages/ui`, `packages/tailwind-config`, `lucide-react` など。
    * **インポート:** `import { Button } from "@suzumina.click/ui";` のように、`packages/ui` のエントリーポイントからインポートする。

3. **アイコンの扱い:**
    * 現状維持とし、`lucide-react` は `apps/web` の依存関係とする。必要に応じて将来的に `packages/ui` での抽象化を検討する。

4. **状態管理:**
    * UI 固有の状態 (例: ドロップダウン開閉) は `packages/ui` 内で管理可能。
    * アプリケーション全体のテーマ状態 (`next-themes`) などは `apps/web` で管理する。

## 構成図

```mermaid
graph LR
    subgraph Monorepo
        P_UI[packages/ui (Design System Core)]
        P_Tailwind[packages/tailwind-config (Shared Styling Foundation)]
        A_Web[apps/web (Web Application)]
    end

    subgraph Responsibilities
        UI_Comp[Generic Presentational Components (HeroUI based)]
        UI_Hooks[UI-related Hooks]
        UI_Utils[UI Utilities (cn)]

        Tailwind_Theme[Base Theme, Plugins, Globals]

        App_Logic[Business Logic, Data Flow]
        App_State[Global State (Auth, Theme, Data)]
        Data_Fetching[API Interaction, DB Access]
        Auth[Authentication/Authorization]
        Routing[Page Structure & Navigation]
        App_Components[App-specific Composite Components]
        Icons[Icon Rendering (lucide-react)]
    end

    %% Package Dependencies
    P_UI -- Consumes --> P_Tailwind
    A_Web -- Consumes --> P_UI
    A_Web -- Consumes --> P_Tailwind

    %% Responsibility Mapping
    P_UI --> UI_Comp
    P_UI --> UI_Hooks
    P_UI --> UI_Utils

    P_Tailwind --> Tailwind_Theme

    A_Web --> App_Logic
    A_Web --> App_State
    A_Web --> Data_Fetching
    A_Web --> Auth
    A_Web --> Routing
    A_Web --> App_Components
    A_Web --> Icons

    style P_UI fill:#f9f,stroke:#333,stroke-width:2px
    style P_Tailwind fill:#ccf,stroke:#333,stroke-width:2px
    style A_Web fill:#cfc,stroke:#333,stroke-width:2px
