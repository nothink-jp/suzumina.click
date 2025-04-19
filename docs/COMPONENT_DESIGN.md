# コンポーネント設計ガイドライン

このドキュメントは、suzumina.click プロジェクトにおける React コンポーネントの設計方針を定めます。

## 1. サーバーコンポーネント (RSC) とクライアントコンポーネント (RCC)

Next.js App Router の主要な機能であるサーバーコンポーネント (RSC) とクライアントコンポーネント (RCC) を効果的に使い分けます。

### 1.1. 基本方針: RSC ファースト & インサイドアウト

- **デフォルトは RSC**: すべてのコンポーネントは、明示的に `"use client"` ディレクティブを指定しない限り、サーバーコンポーネントとして扱われます。データフェッチやサーバーサイドでのみ実行可能な処理は RSC で行います。
- **RCC の利用条件**: 以下のいずれかの要件を満たす場合に限り、クライアントコンポーネント (`"use client"` をファイルの先頭に記述) を使用します。
  - **インタラクティビティ**: `useState`, `useReducer`, `useEffect` などの React Hooks を使用する場合。
  - **イベントリスナー**: `onClick`, `onChange` などのイベントハンドラを要素に付与する場合。
  - **ブラウザ API**: `window`, `localStorage`, `navigator` などのブラウザ固有の API を使用する場合。
  - **特定のライブラリ**: クライアントサイドでの実行を前提とするライブラリ（例: **Headless UI**、状態管理ライブラリの一部、DOM操作ライブラリ）を使用する場合。
- **インサイドアウト・アプローチ**:
  - クライアントコンポーネントは、機能的に必要な最小限の範囲に留めます。
  - ページ全体やレイアウトのような大きな単位ではなく、ボタン、フォーム入力、インタラクティブなUI要素など、具体的な部品レベルで RCC を作成します。
  - RSC 内で RCC を子コンポーネントとしてインポートし、配置します。これにより、サーバーサイドレンダリングの利点を最大限に活かしつつ、必要な箇所にのみインタラクティビティを追加できます。

    ```tsx
    // RSC (例: src/app/some-page/page.tsx)
    import ClientButton from './_components/ClientButton'; // RCCをインポート

    export default function SomePage() {
      // サーバーサイドでのデータフェッチなど
      const data = await fetchData();

      return (
        <div>
          <h1>{data.title}</h1>
          <p>サーバーでレンダリングされたコンテンツ</p>
          {/* インタラクティブな部分はRCCに任せる */}
          <ClientButton />
        </div>
      );
    }

    // RCC (例: src/app/some-page/_components/ClientButton.tsx)
    "use client";

    import { useState } from 'react';

    export default function ClientButton() {
      const [count, setCount] = useState(0);

      return (
        <button type="button" onClick={() => setCount(count + 1)}> {/* type="button" を追加 */}
          Clicked {count} times
        </button>
      );
    }
    ```

### 1.2. データフェッチ

- **RSC でのフェッチ**: ページやレイアウトに必要なデータの取得は、原則として RSC 内で `async/await` を用いて行います。これにより、データ取得のレイテンシをサーバーサイドで吸収できます。
- **RCC でのフェッチ**: クライアント操作に応じて追加データを取得する場合（例: 無限スクロール、検索候補表示）は、原則として **SWR** ライブラリを用いて行います。SWR はキャッシュ、再検証、フォーカス時の再取得などの機能を提供し、効率的なデータフェッチを実現します。

### 1.3. Headless UI の利用

- **クライアントコンポーネント必須**: Headless UI のコンポーネントは内部で React Hooks (useState, useEffect など) を使用しているため、**必ずクライアントコンポーネント (`"use client"`) 内で使用する必要があります**。
- **スタイリング**: Headless UI はスタイルを提供しません。DaisyUI や Tailwind CSS のクラスを適用して見た目を構築します。

## 2. コンポーネントの命名と配置

- **命名規則**:
  - コンポーネントファイル名およびコンポーネント関数名: `PascalCase` (例: `UserProfileCard.tsx`, `function UserProfileCard() {}`)
- **配置 (コロケーション)**:
  - **ページ固有コンポーネント**: 特定のページ (`src/app/about/page.tsx` など) でのみ使用されるコンポーネントは、そのページのディレクトリ配下に `_components` ディレクトリ (例: `src/app/about/_components/`) を作成し、そこに配置します。
  - **共通コンポーネント**: 複数のページやレイアウトで再利用されるコンポーネントは、`src/components/` ディレクトリ (必要に応じて作成) に配置します。
    - `src/components/ui/`: 低レベルなUI部品 (Button, Input, Card など)。DaisyUI コンポーネントのラッパーや、独自実装の基本部品。
    - `src/components/layout/`: アプリケーション全体のレイアウトに関連するコンポーネント (Header, Footer, Sidebar など)。
    - `src/components/feature/`: 特定の機能に関連する、より高レベルなコンポーネント群 (例: `src/components/feature/auth/`, `src/components/feature/profile/`)。

## 3. 状態管理

- **ローカルステート**: コンポーネント固有の状態は `useState` や `useReducer` を用いて管理します。RCC でのみ使用可能です。
- **URL ステート**: フィルタリング条件やページネーションなど、URL で表現可能な状態は Next.js の `useRouter` や `useSearchParams` を活用します。RSC/RCC 両方で利用可能です（RCC では Hooks を使用）。
- **グローバルステート**: アプリケーション全体で共有する必要がある状態（例: 認証情報、テーマ設定）については、現時点では導入を保留します。必要性が生じた場合に、React Context API や Zustand などの軽量なライブラリの導入を検討します。サーバーコンポーネントとの親和性を考慮して選定します。

## 4. コンポーネント分割

- **単一責務の原則 (SRP)**: 各コンポーネントは、単一の明確な責務を持つように設計します。
- **粒度**:
  - 再利用性や可読性を考慮し、適切な粒度でコンポーネントを分割します。巨大すぎるコンポーネントは避けます。
  - Presentational Component と Container Component の分離は、RSC/RCC の分離と合わせて自然に行われることが多いですが、意識的に分離することも有効です。
- **Props の設計**:
  - コンポーネントが必要とするデータは Props を通じて明確に渡します。
  - Props の数は適切に保ち、多すぎる場合はオブジェクトにまとめるなどを検討します。
  - Props の型は TypeScript で厳密に定義します。
