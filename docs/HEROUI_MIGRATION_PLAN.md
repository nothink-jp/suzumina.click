# HeroUI 導入計画

## 背景

現在の `packages/ui` で利用している `shadcn/ui` は、コンポーネントコードを直接プロジェクトにコピー＆ペーストする方式であり、管理や一貫性の維持が難しいという課題がある。
この課題を解決するため、依存関係として管理でき、かつ Tailwind CSS との親和性が高い HeroUI (旧 NextUI) を導入する。

## Rationale

* **管理容易性**: npm 依存関係として HeroUI を管理し、バージョンアップや一貫性の維持が容易になる。
* **Tailwind 親和性**: HeroUI は Tailwind CSS プラグインを提供し、既存の `packages/tailwind-config` とスムーズに統合できる。
* **開発効率**: スタイル付きのコンポーネントが提供されるため、開発効率が向上する可能性がある。
* **モダン**: React Aria を基盤としており、アクセシビリティやモダンな機能が考慮されている。

## 計画ステップ

1. **HeroUI 依存関係の追加**:
    * `packages/ui` ワークスペースに `@heroui/react`, `@heroui/theme`, `framer-motion` をインストールする。
    * コマンド: `cd packages/ui && bun add @heroui/react @heroui/theme framer-motion`
2. **Tailwind 設定の更新 (`packages/tailwind-config`)**:
    * `packages/tailwind-config/tailwind.config.mjs` を編集する。
    * `@heroui/theme` から `heroui` プラグインを import し、`plugins` 配列に追加する。
    * `content` 配列に HeroUI のコンポーネントパス (`../../node_modules/@heroui/theme/dist/**/*.{js,ts,jsx,tsx}`) と `packages/ui/src/**/*.{js,ts,jsx,tsx}` が含まれていることを確認する。
3. **アプリケーションのセットアップ (`apps/web`)**:
    * `apps/web/tailwind.config.mjs` が `packages/tailwind-config` を `preset` として読み込んでいることを確認する。
    * アプリケーションのエントリーポイント付近（例: `apps/web/src/app/providers.tsx`）で、全体を `<HeroUIProvider>` でラップする。
4. **コンポーネントの移行 (`packages/ui`)**:
    * `packages/ui/src/components` 内の `shadcn/ui` ベースのコンポーネント（`alert.tsx`, `avatar.tsx`, `button.tsx`, `card.tsx` など）を特定する。
    * これらを、対応する HeroUI コンポーネント (`@heroui/react` から import) を利用するように書き換える。
5. **アプリケーション側の更新 (`apps/web`)**:
    * `apps/web` 内で `packages/ui` のコンポーネントを使用している箇所を、新しい HeroUI ベースのコンポーネントを利用するように修正する。
6. **クリーンアップ**:
    * 古い `shadcn/ui` の実装ファイル、ヘルパー関数 (`packages/ui/src/lib/utils.ts` など)、`packages/ui/components.json` を削除する。
    * 不要になった `shadcn/ui` 関連の依存関係を `package.json` から削除する。
7. **テストと確認**:
    * UI が意図通りに表示・動作することを確認する。
    * 既存のテストを修正・実行する。

## 構成イメージ

```mermaid
graph TD
    subgraph Monorepo
        subgraph packages
            UI[packages/ui (HeroUIベース)]
            TailwindConfig[packages/tailwind-config]
        end
        subgraph apps
            WebApp[apps/web]
        end
    end

    subgraph External Dependencies
        HeroUI[HeroUI (@heroui/react)]
        HeroUITheme[HeroUI Theme (@heroui/theme)]
        TailwindCSS[Tailwind CSS]
        FramerMotion[Framer Motion]
    end

    TailwindConfig -- Provides config --> TailwindCSS
    HeroUITheme -- Provides plugin & styles --> TailwindCSS
    HeroUI -- Provides components --> UI
    FramerMotion -- Peer dependency --> HeroUI
    TailwindCSS -- Used for styling --> UI & WebApp
    UI -- Exports components --> WebApp
    TailwindConfig -- Shared config used by --> WebApp

    WebApp -- Wraps with HeroUIProvider --> HeroUI
