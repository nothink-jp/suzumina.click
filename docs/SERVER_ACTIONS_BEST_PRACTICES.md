# Next.js Server Actionsのベストプラクティス

このドキュメントは、Next.js 15におけるServer Actionsのベストプラクティスをまとめたものです。今後のプロジェクト開発時に参照してください。

## 1. Server Actionsの基本構造

### 一貫したレスポンス形式

```typescript
'use server'

// レスポンス型の定義
interface ActionResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// 統一されたレスポンス形式を使用した関数例
export async function fetchData(id: string): Promise<ActionResponse<Data>> {
  try {
    // 処理
    return {
      success: true,
      data: result,
      message: "データを取得しました"
    };
  } catch (error) {
    return {
      success: false,
      error: "データの取得中にエラーが発生しました"
    };
  }
}
```

## 2. 入力バリデーション

### 早期リターンパターン

```typescript
'use server'

export async function updateData(id: string, data: unknown): Promise<ActionResponse> {
  // 必須パラメータの検証
  if (!id) {
    return { 
      success: false, 
      error: "IDが必要です" 
    };
  }

  // 型の検証
  if (typeof data !== 'object' || data === null) {
    return { 
      success: false, 
      error: "有効なデータ形式ではありません" 
    };
  }

  // 処理を続行...
}
```

### Zodによるバリデーションパターン

```typescript
'use server'

import { z } from 'zod';

const schema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
});

export async function submitForm(formData: FormData) {
  const validatedFields = schema.safeParse({
    name: formData.get('name'),
    email: formData.get('email'),
  });

  if (!validatedFields.success) {
    return {
      success: false,
      errors: validatedFields.error.flatten().fieldErrors,
    };
  }
  
  const { name, email } = validatedFields.data;
  // 検証済みデータを使用して処理を続行...
}
```

## 3. 認証と権限管理

```typescript
'use server'

import { getCurrentUser } from '../auth/getCurrentUser';

export async function updateResource(resourceId: string, data: unknown): Promise<ActionResponse> {
  // 認証チェック
  const user = await getCurrentUser();
  if (!user) {
    return { 
      success: false, 
      error: "認証が必要です" 
    };
  }

  // リソースの取得
  const resource = await db.resources.findUnique({ where: { id: resourceId } });
  
  if (!resource) {
    return { 
      success: false, 
      error: "リソースが見つかりません" 
    };
  }

  // 権限チェック
  if (resource.ownerId !== user.uid) {
    return { 
      success: false, 
      error: "このリソースを編集する権限がありません" 
    };
  }

  // 処理を続行...
}
```

## 4. エラーハンドリング

```typescript
'use server'

export async function processData(data: unknown): Promise<ActionResponse> {
  try {
    // データ処理
    const result = await someOperation(data);
    return { 
      success: true, 
      data: result,
      message: "処理が完了しました"
    };
  } catch (error) {
    console.error('エラー詳細:', error);
    
    if (error instanceof DatabaseError) {
      return { 
        success: false, 
        error: "データベース操作中にエラーが発生しました" 
      };
    }
    
    if (error instanceof ValidationError) {
      return { 
        success: false, 
        error: "入力データが無効です" 
      };
    }
    
    // 一般的なエラー
    return { 
      success: false, 
      error: "処理中に予期しないエラーが発生しました" 
    };
  }
}
```

## 5. キャッシュ管理

### キャッシュの再検証

```typescript
'use server'

import { revalidatePath, revalidateTag } from 'next/cache';

export async function updateContent(id: string, content: string): Promise<ActionResponse> {
  try {
    // データ更新処理
    await db.contents.update({ 
      where: { id }, 
      data: { content } 
    });
    
    // 特定のパスのキャッシュを再検証
    revalidatePath(`/contents/${id}`);
    
    // または特定のタグのキャッシュを再検証
    revalidateTag(`content-${id}`);
    
    return { 
      success: true, 
      message: "コンテンツが更新されました" 
    };
  } catch (error) {
    console.error(error);
    return { 
      success: false, 
      error: "コンテンツの更新中にエラーが発生しました" 
    };
  }
}
```

## 6. トランザクション処理

```typescript
'use server'

export async function transferPoints(fromId: string, toId: string, amount: number): Promise<ActionResponse> {
  try {
    // トランザクション処理
    const result = await db.transaction(async (tx) => {
      // 送信元残高確認
      const from = await tx.accounts.findUnique({ where: { id: fromId } });
      if (!from || from.points < amount) {
        throw new Error("残高不足");
      }
      
      // ポイント移動
      await tx.accounts.update({ 
        where: { id: fromId }, 
        data: { points: { decrement: amount } } 
      });
      
      await tx.accounts.update({ 
        where: { id: toId }, 
        data: { points: { increment: amount } } 
      });
      
      // 取引記録
      await tx.transfers.create({
        data: {
          fromId,
          toId,
          amount,
          timestamp: new Date()
        }
      });
      
      return { fromId, toId, amount };
    });
    
    revalidatePath(`/accounts/${fromId}`);
    revalidatePath(`/accounts/${toId}`);
    
    return { 
      success: true, 
      data: result,
      message: "転送が完了しました" 
    };
  } catch (error) {
    console.error(error);
    if (error.message === "残高不足") {
      return { 
        success: false, 
        error: "残高が不足しています" 
      };
    }
    return { 
      success: false, 
      error: "転送処理中にエラーが発生しました" 
    };
  }
}
```

## 7. Server Actionsの再利用とコンポーザビリティ

```typescript
'use server'

// 基本的なログ記録アクション
async function logAction(action: string, userId: string, details?: object) {
  await db.logs.create({
    data: {
      action,
      userId,
      details,
      timestamp: new Date()
    }
  });
}

// 他のServer Actionから呼び出し
export async function createPost(formData: FormData): Promise<ActionResponse> {
  const user = await getCurrentUser();
  if (!user) {
    return { success: false, error: "認証が必要です" };
  }
  
  try {
    const title = formData.get('title') as string;
    const content = formData.get('content') as string;
    
    const post = await db.posts.create({
      data: {
        title,
        content,
        authorId: user.id
      }
    });
    
    // 他のServer Actionを呼び出す
    await logAction('create_post', user.id, { postId: post.id });
    
    revalidatePath('/posts');
    
    return { 
      success: true, 
      data: { postId: post.id },
      message: "投稿が作成されました" 
    };
  } catch (error) {
    console.error(error);
    return { 
      success: false, 
      error: "投稿の作成中にエラーが発生しました" 
    };
  }
}
```

## 8. テスト容易性

```typescript
'use server'

// 依存性を注入できる設計
export async function fetchPosts(
  repository = defaultRepository,
  page: number = 1
): Promise<ActionResponse<Post[]>> {
  try {
    const posts = await repository.getPosts(page);
    return {
      success: true,
      data: posts,
      message: `${posts.length}件の投稿を取得しました`
    };
  } catch (error) {
    console.error(error);
    return {
      success: false,
      error: "投稿の取得中にエラーが発生しました"
    };
  }
}

// テスト例
describe('fetchPosts', () => {
  it('正常にポストを取得できること', async () => {
    const mockRepo = {
      getPosts: vi.fn().mockResolvedValue([{ id: '1', title: 'テスト投稿' }])
    };
    
    const result = await fetchPosts(mockRepo);
    
    expect(result.success).toBe(true);
    expect(result.data).toHaveLength(1);
    expect(result.data[0].title).toBe('テスト投稿');
  });
});
```

## 9. プログレッシブエンハンスメント

Server Actionsはフォームと組み合わせることで、JavaScriptが無効な環境でも動作するようにします。

```typescript
// app/contact/page.tsx
import { submitForm } from './actions';

export default function ContactPage() {
  return (
    <form action={submitForm}>
      <input type="text" name="name" required />
      <input type="email" name="email" required />
      <textarea name="message" required></textarea>
      <button type="submit">送信</button>
    </form>
  );
}

// app/contact/actions.ts
'use server'

export async function submitForm(formData: FormData) {
  // 処理
}
```

## 10. バッチ処理と重い操作

```typescript
'use server'

export async function processBatchOperation(items: string[]): Promise<ActionResponse> {
  try {
    // 処理開始ログ
    console.log(`バッチ処理開始: ${items.length}件`);
    
    // 結果を追跡
    const results = {
      success: 0,
      failed: 0,
      errors: [] as string[]
    };
    
    // 一括処理
    await Promise.all(items.map(async (item, index) => {
      try {
        await processItem(item);
        results.success++;
      } catch (error) {
        results.failed++;
        results.errors.push(`Item ${index}: ${error.message}`);
      }
    }));
    
    // 重要な結果をログ
    console.log(`バッチ処理完了: 成功=${results.success}, 失敗=${results.failed}`);
    
    return {
      success: true,
      data: results,
      message: `${results.success}件の処理が完了、${results.failed}件が失敗しました`
    };
  } catch (error) {
    console.error(error);
    return {
      success: false,
      error: "バッチ処理中にエラーが発生しました"
    };
  }
}
```

## 実装例の参照

プロジェクト内の以下のファイルに、これらのパターンの実装例があります：

- `apps/web/src/actions/audioclips/manage-tags.ts`: タグ管理のServer Actions
- `apps/web/src/actions/audioclips/manage-tags.test.ts`: Server Actionsのテスト例
