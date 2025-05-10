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
  1. **Server Actions の使用（非推奨）**: クライアントコンポーネントから Server Actions を直接呼び出すのは避けてください。代わりに、以下の「サーバーアクションラッパーパターン」を採用してください。
  2. **SWR の使用**: 再検証や自動再フェッチが必要な場合、SWR ライブラリを使用します。

### 1.3. Server Actions の活用

- **基本方針**: 
  - サーバーサイドでの操作（データ作成・更新・削除、認証など）は API Routes ではなく Server Actions を使用します。
  - **重要**: Server Actions は原則として RSC（サーバーコンポーネント）からのみ呼び出します。具体的には、`page.tsx`または`layout.tsx`などのサーバーコンポーネントから呼び出すことを推奨します。

#### 1.3.0. Server Actionsのクライアントコンポーネントでの利用方法

RCCで直接Server Actionsを呼び出すべきではありませんが、RCCがServer Actionsを必要とする場合は以下の「サーバーアクションラッパーパターン」を採用してください：

1. **サーバーアクションラッパーパターン**:
   - サーバーコンポーネント（page.tsxやlayout.tsx）でServer Actionsを呼び出し、初期データを取得
   - サーバーコンポーネントからクライアントコンポーネントにServer Actionsをprops経由で渡す
   - クライアントコンポーネント内ではpropsで受け取ったServer Actionsのみを使用

```tsx
// 🟢 正しいパターン：サーバーコンポーネント (page.tsx)
import { getAudioClips } from "@/actions/audioclips/actions"; // Server Action
import { checkFavoriteStatus } from "@/actions/audioclips/manage-favorites"; // Server Action
import { incrementPlayCount } from "@/actions/audioclips/actions"; // Server Action
import AudioClipListClient from "@/components/audioclips/AudioClipListClient";

export default async function VideoPage({ params }: { params: { id: string } }) {
  // Server Actionsを使って初期データを取得
  const initialData = await getAudioClips({
    videoId: params.id,
    limit: 10
  });

  // クライアントコンポーネントにServer Actionsを渡す
  return (
    <div>
      <h1>動画タイトル</h1>
      <AudioClipListClient 
        videoId={params.id}
        initialClips={initialData.clips}
        hasMore={initialData.hasMore}
        lastClip={initialData.lastClip}
        // Server ActionsをクライアントコンポーネントにProps経由で渡す
        getAudioClipsAction={getAudioClips}
        checkFavoriteStatusAction={checkFavoriteStatus}
        incrementPlayCountAction={incrementPlayCount}
      />
    </div>
  );
}

// 🟢 正しいパターン：クライアントコンポーネント
// apps/web/src/components/audioclips/AudioClipListClient.tsx
"use client";

import { useState } from "react";

interface AudioClipListClientProps {
  videoId: string;
  initialClips: any[];
  hasMore: boolean;
  lastClip?: any;
  // Server Actionsをプロップス経由で受け取る
  getAudioClipsAction: (params: any) => Promise<any>;
  checkFavoriteStatusAction: (clipId: string) => Promise<any>;
  incrementPlayCountAction: (clipId: string) => Promise<any>;
}

export default function AudioClipListClient({
  videoId,
  initialClips,
  hasMore,
  lastClip,
  getAudioClipsAction,
  checkFavoriteStatusAction,
  incrementPlayCountAction
}: AudioClipListClientProps) {
  const [clips, setClips] = useState(initialClips);
  // ...省略

  // 「もっと見る」ボタンをクリックしたときの処理
  const loadMoreClips = async () => {
    // props経由で受け取ったServer Actionを使用
    const result = await getAudioClipsAction({
      videoId,
      limit: 10,
      startAfter: lastClip?.createdAt ? new Date(lastClip.createdAt) : null
    });
    
    // 結果を処理
    setClips([...clips, ...result.clips]);
  };

  // ...以下省略
}

// ❌ 避けるべきパターン：クライアントコンポーネントでServer Actionsを直接インポート
"use client";

import { getAudioClips } from "@/actions/audioclips/actions"; // ❌ RCCでのServer Actionsの直接インポート

export function SomeClientComponent() {
  // ...
  const handleClick = async () => {
    // ❌ Server Actionsを直接呼び出し
    const data = await getAudioClips({ videoId });
    // ...
  };
  // ...
}
```

このパターンの利点：
- Server Actionsの呼び出しが明示的にサーバーコンポーネントを通じて行われる
- データフローが明確で追跡しやすい
- パフォーマンスの最適化やキャッシュの恩恵を受けやすい
- RSCからRCCへの明確な境界とデータの流れを維持

2. **フォーム提出用Server Actionsの例外**:
   - フォームの `action` 属性に直接Server Actionを指定する場合のみ、クライアントコンポーネント内でServer Actionsのインポートを許容します
   - この場合も、可能な限り「サーバーアクションラッパーパターン」を優先的に検討してください

```tsx
// 🟡 許容されるパターン：フォームのaction属性に直接指定する場合
"use client";

import { useFormState } from 'react-dom';
import { register } from '@/actions/user/register'; // フォーム送信用Server Action

export function RegistrationForm() {
  const [state, formAction] = useFormState(register, { error: null });
  
  return (
    <form action={formAction}>
      {/* フォームの内容 */}
    </form>
  );
}
```

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

## 2. 型定義とZodによるバリデーション

共有型ライブラリを作成し、モノレポ全体で一貫した型定義とバリデーションを実現します。

### 2.1. 共有型ライブラリ (`@suzumina.click/shared-types`)

- **目的**: アプリケーション全体で一貫した型定義を提供し、RSCとRCC間でのデータ受け渡しを安全に行えるようにします。
- **技術選定**: TypeScriptとZodを組み合わせて、静的型チェックと実行時バリデーションの両方を実現します。
- **配置場所**: `packages/shared-types/` ディレクトリに配置し、各アプリケーションから参照します。

### 2.2. ライブラリの構成

```
packages/shared-types/
├── src/
│   ├── index.ts                # エクスポートポイント
│   ├── video.ts                # 動画関連の型定義とZodスキーマ
│   ├── audioclip.ts            # 音声クリップ関連の型定義とZodスキーマ
│   ├── user.ts                 # ユーザー関連の型定義とZodスキーマ
│   └── common.ts               # 共通の型定義とユーティリティ
├── package.json
└── tsconfig.json
```

### 2.3. Zodスキーマと型定義の基本パターン

各ドメインごとに以下のパターンでZodスキーマと型定義を行います：

```typescript
// 1. Zodスキーマの定義
export const UserSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  email: z.string().email(),
  // ...
});

// 2. TypeScriptの型を抽出
export type User = z.infer<typeof UserSchema>;

// 3. シリアライズ/デシリアライズヘルパー
export function serializeUser(user: User): string {
  return JSON.stringify(user);
}

export function deserializeUser(json: string): User {
  try {
    const data = JSON.parse(json);
    return UserSchema.parse(data);
  } catch (error) {
    throw new Error('ユーザーデータの形式が無効です');
  }
}
```

### 2.4. RSCとRCCの間でのデータ受け渡し

サーバーコンポーネントとクライアントコンポーネントの間でのデータ受け渡しは、以下のパターンで行います：

```typescript
// サーバーコンポーネント (RSC)
import { Video, serializeVideo, VideoSchema } from "@suzumina.click/shared-types";

async function fetchVideoData(): Promise<Video> {
  // データ取得ロジック
  const rawData = await db.getVideo(id);
  
  // 型検証と変換
  const validatedData = VideoSchema.parse(rawData);
  
  return validatedData;
}

export default async function VideoPage() {
  const videoData = await fetchVideoData();
  
  // クライアントコンポーネントにデータを渡す
  return <VideoPlayerClient videoData={videoData} />;
}

// クライアントコンポーネント (RCC)
"use client";

import { Video, VideoSchema } from "@suzumina.click/shared-types";

interface VideoPlayerProps {
  videoData: Video;
}

export default function VideoPlayerClient({ videoData }: VideoPlayerProps) {
  // videoDataを使用（型安全）
  return <div>{videoData.title}</div>;
}
```

### 2.5. Server Actionsでの使用

Server Actionsでは、以下のようにZodスキーマを使用してバリデーションを行います：

```typescript
"use server";

import { VideoCreateSchema, Video, VideoSchema } from "@suzumina.click/shared-types";

export async function createVideo(formData: FormData) {
  try {
    // フォームデータをZodスキーマでバリデーション
    const validatedData = VideoCreateSchema.parse({
      title: formData.get("title"),
      description: formData.get("description"),
      // ...
    });
    
    // データ処理とFirestoreへの保存
    // ...
    
    // 結果を返す（型安全）
    return { success: true, data: newVideo };
  } catch (error) {
    if (error instanceof z.ZodError) {
      // バリデーションエラーの処理
      return { 
        success: false, 
        error: "入力データが無効です", 
        validationErrors: error.errors 
      };
    }
    
    // その他のエラー処理
    return { success: false, error: "動画の作成に失敗しました" };
  }
}
```

### 2.6. Firestoreとの連携

Firestoreとのデータ変換も共有型ライブラリを使って一貫して行います：

```typescript
// Firestoreからのデータ変換
export function convertFromFirestore<T>(
  schema: z.ZodType<T>, 
  data: FirebaseFirestore.DocumentData
): T {
  try {
    return schema.parse(data);
  } catch (error) {
    console.error("Firestoreデータのパースエラー:", error);
    throw new Error("データ形式が無効です");
  }
}

// Firestoreへの保存用データ変換
export function convertToFirestore<T>(data: T): Record<string, unknown> {
  return JSON.parse(JSON.stringify(data));
}
```

### 2.7. バリデーションエラーの統一

アプリケーション全体で一貫したエラー処理を行うために、バリデーションエラーの形式を統一します：

```typescript
// 共通のエラー形式
export const ValidationErrorSchema = z.object({
  path: z.array(z.union([z.string(), z.number()])),
  message: z.string()
});

export type ValidationError = z.infer<typeof ValidationErrorSchema>;

// エラーメッセージの日本語化ヘルパー
export function formatZodError(error: z.ZodError): ValidationError[] {
  return error.errors.map(err => ({
    path: err.path,
    message: err.message
  }));
}
```

## 8. フォームの設計と実装

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
