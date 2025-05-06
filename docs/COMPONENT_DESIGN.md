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

- **RSC でのフェッチ**: ページやレイアウトに必要なデータの取得は、原則として RSC 内で `async/await` を用いて直接行います。これにより、データ取得のレイテンシをサーバーサイドで吸収できます。
- **RCC でのフェッチ**: クライアント操作に応じて追加データを取得する場合は、以下のいずれかの方法を使用します：
  1. **Server Actions の使用（推奨）**: クライアントコンポーネントから Server Actions を直接呼び出してデータを取得します。
  2. **SWR の使用**: 再検証や自動再フェッチが必要な場合、SWR ライブラリを使用します。

### 1.3. Server Actions の活用

- **基本方針**: サーバーサイドでの操作（データ作成・更新・削除、認証など）は API Routes ではなく Server Actions を使用します。
- **使用方法**:
  1. **ファイル単位の "use server"**: サーバー専用関数を含むファイル全体に適用する場合
     ```tsx
     // src/actions/some-feature/actions.ts
     "use server";
     
     import { getServerSession } from 'next-auth';
     import { authOptions } from '@/lib/auth/auth-options';
     
     export async function createItem(data: FormData) {
       // 認証チェック
       const session = await getServerSession(authOptions);
       if (!session) {
         return { success: false, error: '認証が必要です' };
       }
       
       // データ処理
       try {
         // ...処理ロジック
         return { success: true, data: result };
       } catch (error) {
         return { success: false, error: 'エラーが発生しました' };
       }
     }
     ```
  
  2. **関数単位の "use server"**: インラインのサーバーアクション
     ```tsx
     // src/components/feature/some-feature/SomeForm.tsx
     "use client";
     
     import { updateData } from '@/actions/some-feature/actions'; // ファイル単位のServer Action
     
     // インラインServer Action
     async function submitForm(formData: FormData) {
       "use server";
       // 処理ロジック
       return { success: true };
     }
     
     export function SomeForm() {
       return (
         <form action={submitForm}>
           {/* フォーム内容 */}
         </form>
       );
     }
     ```

- **認証とバリデーション**: すべての Server Action 内で必ず認証チェックとデータバリデーションを行います。

#### 1.3.1. Server Actions のディレクトリ配置

Server Actions は機能と再利用性に基づいて適切に整理します。以下のディレクトリ構造を採用します：

- **共有 Server Actions**：複数のコンポーネントや機能で使用される Server Actions
  ```
  apps/web/src/actions/
  ├── [機能分野]/
  │   ├── actions.ts               # 主要アクション関数
  │   ├── actions.test.ts          # アクションのテスト
  │   ├── types.ts                 # 関連する型定義
  │   └── validation.ts            # バリデーションロジック
  ├── auth/                        # 例: 認証関連
  │   ├── actions.ts               # サインイン、サインアウトなど
  │   └── actions.test.ts
  ├── user/                        # 例: ユーザー管理
  │   ├── actions.ts
  │   ├── actions.test.ts
  │   └── types.ts
  └── [その他機能分野]/
  ```

- **コンポーネント固有 Server Actions**：特定のコンポーネントでのみ使用される Server Actions
  ```
  apps/web/src/components/feature/[機能名]/
  ├── SomeComponent.tsx            # コンポーネント
  ├── SomeComponent.test.tsx       # コンポーネントのテスト
  ├── actions.ts                   # コンポーネント固有のServer Actions
  └── actions.test.ts              # アクションのテスト
  ```

- **ページ固有 Server Actions**：特定のページでのみ使用される Server Actions
  ```
  apps/web/src/app/[ページパス]/
  ├── page.tsx                     # ページコンポーネント
  ├── _components/                 # ページ固有のコンポーネント
  └── _actions/                    # ページ固有のServer Actions
      ├── actions.ts
      └── actions.test.ts
  ```

#### 1.3.2. ファイルと関数の命名規則

- **ファイル命名**:
  - 基本的には `actions.ts` を使用
  - 機能が多い場合は目的別に分割: `create.ts`, `update.ts`, `delete.ts` など
  - 型定義は `types.ts` に格納
  - バリデーションロジックは `validation.ts` に格納

- **関数命名**:
  - 動詞 + 目的語の形式で命名: `createUser`, `updateProfile`, `deleteComment` など
  - 取得系: `getUser`, `listPosts`, `searchProducts` など
  - 更新系: `createItem`, `updateSettings`, `deleteAccount` など
  - その他操作: `signIn`, `signOut`, `toggleFavorite` など

#### 1.3.3. Server Actions のテスト

- テストファイルは対応する Server Action ファイルと同じディレクトリに配置し、`.test.ts` の拡張子を使用
- モック関数と適切な環境変数を使用してテストを記述
- アクションの入力バリデーション、認証ロジック、正常系・異常系の動作を検証

#### 1.3.4. 戻り値の型定義

Server Action の戻り値は常に型付けされた一貫した形式にします：

```tsx
// 共通の戻り値型
type ActionResult<T> = {
  success: boolean;
  data?: T;
  error?: string;
};

// 使用例
export async function createUser(data: FormData): Promise<ActionResult<User>> {
  try {
    // データ処理ロジック
  } catch (error) {
    return { success: false, error: 'エラーが発生しました' };
  }
}
```

#### 1.3.5. エラーハンドリング

- すべての Server Action で try-catch ブロックを使用
- エラー発生時は開発環境でのみ詳細なエラーログを出力
- ユーザーに表示するエラーメッセージは日本語で簡潔かつ親切に作成
- セキュリティに関わる詳細情報は本番環境でユーザーに露出しない

#### 1.3.6. 環境変数とシークレット

- Server Actions内で使用する環境変数は、必ず`NEXT_PUBLIC_`プレフィックスのない変数を使用
- シークレット情報（APIキー、トークンなど）は必ずサーバーサイドでのみ扱い、クライアントに公開しない
- 機密性の高い値はGitHubリポジトリやDockerイメージに含めず、環境変数として設定

#### 1.3.7. バッチ処理とスケジューリング

- 重い処理や時間のかかる操作はバックグラウンドタスクとして実装
- 長時間実行される処理は、進捗状態を保存して中断・再開可能な設計にする
- 定期実行が必要な処理はCloud Schedulerと連携したServer Actionsとして実装

#### 1.3.8. Server Actions間の連携

- 複雑な処理フローでは、小さな責任を持つServer Actionsに分割
- 共通処理はユーティリティ関数として抽出し、複数のServer Actionsから再利用
- Server Actions間の依存関係は明示的に型定義し、インターフェースを明確に

#### 1.3.9. デプロイとスケーリング

- サーバーレスデプロイメント環境（Cloud Run）において、コールドスタートを考慮
- キャッシュ戦略を適切に設計（Redisキャッシュ、SWRなど）
- 高負荷時のスケーリング特性を考慮したコード設計

### 1.4. Headless UI の利用

### 8. フォームの設計と実装

#### 8.1. フォームの基本方針

- **クライアントコンポーネントとして実装**: フォームはインタラクティブな要素を含むため、基本的に `"use client"` ディレクティブを使用したクライアントコンポーネントとして実装します。
- **コンポーネント設計**:
  - フォームロジック（バリデーション、送信処理など）は、フォームUIを含むコンポーネント内に閉じ込めます。
  - 必要に応じて、入力フィールドを小さなコンポーネントに分割することは可能ですが、フォームのステートや送信ロジックは親コンポーネント内に保持します。

### 8.3. Zod によるバリデーション

- **スキーマ定義**: 各フォームのバリデーションスキーマは、最新バージョンの Zod を使用して定義します。フォームで扱うすべてのフィールドに適切なバリデーションを設定します。
- **実装場所**: バリデーションスキーマはフォームコンポーネント内で定義し、Conform の `parseWithZod` 関数と連携させます。
- **エラーメッセージ**: エラーメッセージは日本語で、ユーザーが理解しやすい形で提供します。

### 8.4. Server Actions との連携

- **基本実装パターン**: フォームの送信処理は Server Actions を使用して実装します。
- **Conform と Server Actions の連携例**:

```tsx
// フォーム実装例（Server Actions連携版）
"use client";

import { useForm } from '@conform-to/react';
import { parseWithZod } from '@conform-to/zod';
import { z } from 'zod';
import { registerUser } from '@/actions/user/register'; // Server Action

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
    id: 'user-registration',
    // Server Actionへの送信ハンドラ
    onSubmit: async (event) => {
      // フォームデータを取得
      const formData = new FormData(event.currentTarget);
      // Zodスキーマを使用して検証
      const submission = parseWithZod(formData, { schema });

      // 検証に失敗した場合
      if (submission.status !== 'success') {
        return submission.reply();
      }

      // 検証に成功した場合、Server Actionに送信
      try {
        // Server Actionを呼び出し
        const result = await registerUser(submission.value);
        
        // エラーの場合
        if (!result.success) {
          return submission.reply({
            formErrors: [result.error || '登録に失敗しました'],
          });
        }
        
        // 成功時の処理
        // ここでリダイレクトや成功メッセージ表示などを行う
        return submission.reply();
      } catch (error) {
        // 予期せぬエラー処理
        return submission.reply({
          formErrors: ['登録処理中にエラーが発生しました。再度お試しください。'],
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

- **ダイレクトServer Actionパターン**: フォームの `action` 属性に直接 Server Action を指定する実装も可能です。

```tsx
// フォームコンポーネント（ダイレクトServer Actionパターン）
"use client";

import { useFormState } from 'react-dom';
import { register } from '@/actions/user/register'; // Server Action

// 初期状態
const initialState = { 
  error: null, 
  success: false 
};

export function SimpleRegistrationForm() {
  // Server Actionとフォーム状態の連携
  const [state, formAction] = useFormState(register, initialState);
  
  return (
    <form action={formAction} className="space-y-4">
      {/* エラー表示 */}
      {state.error && (
        <div className="alert alert-error">
          <div>{state.error}</div>
        </div>
      )}
      
      {/* 成功表示 */}
      {state.success && (
        <div className="alert alert-success">
          <div>登録が完了しました</div>
        </div>
      )}
      
      {/* 名前入力フィールド */}
      <div className="form-control">
        <label htmlFor="username" className="label">
          <span className="label-text">ユーザー名</span>
        </label>
        <input
          id="username"
          name="username"
          type="text"
          className="input input-bordered"
          required
        />
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

### 8.5. アクセシビリティ

- **適切な HTML 構造**: フォーム要素には適切な `label` 要素を関連付け、`for` 属性または `htmlFor` (React) で入力要素と紐付けます。
- **エラー通知**: エラーが発生した場合、`aria-invalid` と `aria-describedby` 属性を使用して支援技術にエラーを通知します。
- **フォーム構造**: フィールドセットとレジェンド要素を使用して、論理的に関連するフォーム要素をグループ化します。
- **必須フィールド**: 必須フィールドには `required` 属性を追加し、視覚的な表示（例: アスタリスク）も提供します。

### 8.6. パフォーマンスとユーザー体験

- **プログレッシブエンハンスメント**: フォームは JavaScript が無効でも基本的な機能が動作するように実装します。Conform はこの原則に基づいて設計されています。
- **フィードバック**: フォーム送信中はローディング状態を表示し、処理結果に応じた適切なフィードバックを提供します。
- **リアルタイムバリデーション**: ユーザー体験を向上させるために、可能な場合はフィールドの入力時にリアルタイムでバリデーションを行います。
