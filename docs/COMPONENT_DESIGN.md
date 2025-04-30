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
    // RSC (例: apps/web/src/app/some-page/page.tsx)
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

    // RCC (例: apps/web/src/app/some-page/_components/ClientButton.tsx)
    "use client";

    import { useState } from 'react';

    export default function ClientButton() {
      const [count, setCount] = useState(0);

      return (
        <button type="button" onClick={() => setCount(count + 1)}> {/* アクセシビリティのためtype="button"を明示 */}
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
  - **ページ固有コンポーネント**: 特定のページ (`apps/web/src/app/about/page.tsx` など) でのみ使用されるコンポーネントは、そのページのディレクトリ配下に `_components` ディレクトリ (例: `apps/web/src/app/about/_components/`) を作成し、そこに配置します。
  - **共通コンポーネント**: 複数のページやレイアウトで再利用されるコンポーネントは、`apps/web/src/components/` ディレクトリに配置します。
    - `apps/web/src/components/ui/`: 低レベルなUI部品 (Button, Input, Card など)。DaisyUI コンポーネントのラッパーや、独自実装の基本部品。
    - `apps/web/src/components/layout/`: アプリケーション全体のレイアウトに関連するコンポーネント (Header, Footer, Sidebar など)。
    - `apps/web/src/components/feature/`: 特定の機能に関連する、より高レベルなコンポーネント群 (例: `apps/web/src/components/feature/auth/`, `apps/web/src/components/feature/profile/`)。

## 3. 状態管理

- **ローカルステート**: コンポーネント固有の状態は `useState` や `useReducer` を用いて管理します。RCC でのみ使用可能です。
- **URL ステート**: フィルタリング条件やページネーションなど、URL で表現可能な状態は Next.js の `useRouter` や `useSearchParams` を活用します。RSC/RCC 両方で利用可能です（RCC では Hooks を使用）。
- **グローバルステート**: アプリケーション全体で共有する必要がある状態（例: 認証情報、テーマ設定）については、Firebase Authentication と連携した AuthProvider を使用しています。他のグローバル状態が必要な場合は、React Context API や Zustand などの軽量なライブラリの導入を検討します。サーバーコンポーネントとの親和性を考慮して選定します。

## 4. コンポーネント分割

- **単一責務の原則 (SRP)**: 各コンポーネントは、単一の明確な責務を持つように設計します。
- **粒度**:
  - 再利用性や可読性を考慮し、適切な粒度でコンポーネントを分割します。巨大すぎるコンポーネントは避けます。
  - Presentational Component と Container Component の分離は、RSC/RCC の分離と合わせて自然に行われることが多いですが、意識的に分離することも有効です。
- **Props の設計**:
  - コンポーネントが必要とするデータは Props を通じて明確に渡します。
  - Props の数は適切に保ち、多すぎる場合はオブジェクトにまとめるなどを検討します。
  - Props の型は TypeScript で厳密に定義します。

## 5. テスト戦略

- **単体テスト**: 各コンポーネントに対して Vitest と React Testing Library を用いた単体テストを作成します。
  - RSC/RCC それぞれに適した形でテストを記述します。
  - テストファイルは対象コンポーネントと同じディレクトリに `[ComponentName].test.tsx` の形式で配置します。
- **Storybook**: UI コンポーネントの見た目とインタラクションを確認するための Storybook を作成します。
  - 特に再利用性の高いコンポーネントには `[ComponentName].stories.tsx` の形式でストーリーを作成することを推奨します。

## 6. パフォーマンス最適化

- **画像最適化**: Next.js の組み込み `Image` コンポーネントを使用して画像の最適化を行います。
- **サーバーコンポーネントの活用**: データフェッチはできるだけサーバーコンポーネントで行い、クライアントサイドの負荷を軽減します。
- **コード分割**: 必要なときだけ特定のコンポーネントを読み込むために、`dynamic import` や React の `lazy` と `Suspense` を適宜活用します。
- **不要な再レンダリングの防止**: `memo`、`useMemo`、`useCallback` などを用いて、必要に応じて再レンダリングを最適化します。

## 7. アクセシビリティ

- **セマンティックHTML**: 適切なHTML要素を選択し、セマンティックなマークアップを心がけます。
- **ARIA属性**: 必要に応じてARIA属性を追加し、支援技術によるアクセシビリティを向上させます。
- **キーボード操作**: すべてのインタラクティブな要素がキーボードで操作できることを確認します。
- **フォーカス管理**: 特にモーダルやドロップダウンなど、フォーカス管理が重要なコンポーネントでは適切な実装を行います。

## 8. フォーム設計

フォームは Web アプリケーションの重要な構成要素です。本プロジェクトではフォーム実装に Conform ライブラリを採用し、型安全でプログレッシブエンハンスメントを実現します。

### 8.1. Conform の採用

- **基本方針**: フォーム実装には [Conform](https://conform.guide/) ライブラリを使用します。Conform は型安全なフォームバリデーションライブラリで、HTML の標準的なフォームをプログレッシブに拡張します。
- **主な利点**:
  - プログレッシブエンハンスメント優先の API
  - 型安全なフィールド推論
  - 細粒度のサブスクリプション管理
  - アクセシビリティヘルパーの組み込み
  - Zod との連携による自動型変換

### 8.2. フォームの実装原則

- **単一責務**: 各フォームは明確に定義された単一の目的を持ち、一つのコンポーネント内で完結するように実装します。フォームをコンポーネント間で分割したり、コンポーネントを跨いだりしないようにします。
- **クライアントコンポーネントとして実装**: フォームはインタラクティブな要素を含むため、基本的に `"use client"` ディレクティブを使用したクライアントコンポーネントとして実装します。
- **コンポーネント設計**:
  - フォームロジック（バリデーション、送信処理など）は、フォームUIを含むコンポーネント内に閉じ込めます。
  - 必要に応じて、入力フィールドを小さなコンポーネントに分割することは可能ですが、フォームのステートや送信ロジックは親コンポーネント内に保持します。

### 8.3. Zod によるバリデーション

- **スキーマ定義**: 各フォームのバリデーションスキーマは、最新バージョンの Zod を使用して定義します。フォームで扱うすべてのフィールドに適切なバリデーションを設定します。
- **実装場所**: バリデーションスキーマはフォームコンポーネント内で定義し、Conform の `parseWithZod` 関数と連携させます。
- **エラーメッセージ**: エラーメッセージは日本語で、ユーザーが理解しやすい形で提供します。

```tsx
// フォーム実装例
"use client";

import { useForm } from '@conform-to/react';
import { parseWithZod } from '@conform-to/zod';
import { z } from 'zod';

// フォームのスキーマ定義
const schema = z.object({
  username: z.string()
    .min(3, 'ユーザー名は3文字以上で入力してください')
    .max(20, 'ユーザー名は20文字以内で入力してください'),
  email: z.string()
    .email('メールアドレスの形式が正しくありません'),
  age: z.number({ coerce: true })
    .int('年齢は整数で入力してください')
    .min(18, '18歳以上である必要があります')
    .optional(),
});

// フォームコンポーネント
export function UserRegistrationForm() {
  // Conformのフックを使用してフォームを初期化
  const [form, fields] = useForm({
    // フォーム識別子
    id: 'user-registration',
    // 送信ハンドラ
    onSubmit: async (event) => {
      // フォームデータを取得
      const formData = new FormData(event.currentTarget);
      // Zodスキーマを使用して検証
      const submission = parseWithZod(formData, { schema });

      // 検証に失敗した場合
      if (submission.status !== 'success') {
        return submission.reply();
      }

      // 検証に成功した場合、APIに送信するなどの処理
      try {
        await registerUser(submission.value);
        // 成功時の処理
      } catch (error) {
        // エラー処理
        return submission.reply({
          formErrors: ['登録に失敗しました。再度お試しください。'],
        });
      }
    },
  });

  return (
    <form id={form.id} onSubmit={form.onSubmit} className="space-y-4">
      {/* フォームエラーの表示 */}
      {form.errors && (
        <div className="alert alert-error">
          <div>{form.errors}</div>
        </div>
      )}

      {/* 名前入力フィールド */}
      <div className="form-control">
        <label htmlFor={fields.username.id} className="label">
          <span className="label-text">ユーザー名</span>
        </label>
        <input
          type="text"
          id={fields.username.id}
          name={fields.username.name}
          className="input input-bordered"
          required
          aria-invalid={fields.username.errors ? true : undefined}
          aria-describedby={fields.username.errors ? `${fields.username.id}-error` : undefined}
        />
        {fields.username.errors && (
          <div id={`${fields.username.id}-error`} className="text-error text-sm mt-1">
            {fields.username.errors}
          </div>
        )}
      </div>

      {/* その他のフォームフィールド */}
      {/* ... */}

      {/* 送信ボタン */}
      <div className="form-control mt-6">
        <button type="submit" className="btn btn-primary">
          登録する
        </button>
      </div>
    </form>
  );
}
```

### 8.4. サーバーアクションとの連携

- **Server Actions**: Next.js の Server Actions を使用する場合、Conform はシームレスに連携可能です。フォームサブミット時のデータ処理はサーバーサイドで行い、バリデーションエラーはクライアントにストリームバックできます。
- **実装パターン**: Server Action 内で `parseWithZod` を使用してフォームデータを検証し、エラーがある場合は `submission.reply()` を返してクライアント側で表示します。

### 8.5. アクセシビリティ

- **適切な HTML 構造**: フォーム要素には適切な `label` 要素を関連付け、`for` 属性または `htmlFor` (React) で入力要素と紐付けます。
- **エラー通知**: エラーが発生した場合、`aria-invalid` と `aria-describedby` 属性を使用して支援技術にエラーを通知します。
- **フォーム構造**: フィールドセットとレジェンド要素を使用して、論理的に関連するフォーム要素をグループ化します。
- **必須フィールド**: 必須フィールドには `required` 属性を追加し、視覚的な表示（例: アスタリスク）も提供します。

### 8.6. パフォーマンスとユーザー体験

- **プログレッシブエンハンスメント**: フォームは JavaScript が無効でも基本的な機能が動作するように実装します。Conform はこの原則に基づいて設計されています。
- **フィードバック**: フォーム送信中はローディング状態を表示し、処理結果に応じた適切なフィードバックを提供します。
- **リアルタイムバリデーション**: ユーザー体験を向上させるために、可能な場合はフィールドの入力時にリアルタイムでバリデーションを行います。
