# DLsite作品評価システム設計書

> **作成日**: 2025-07-21  
> **バージョン**: 1.0  
> **ステータス**: ✅ 実装完了・アーカイブ準備中  
> **完了日**: 2025-07-21  
> **実装成果**: 10選ランキング・3段階星評価・NG評価システム完全実装

## 1. 概要

### 1.1 目的

suzumina.clickにおいて、ユーザーがDLsite音声作品を評価できるシステムを実装する。このシステムは、将来的なレコメンド機能の基盤となる。

### 1.2 評価の種類

ユーザーは各作品に対して、以下の3種類の排他的な評価を付けることができる：

1. **10選評価**: ユーザーにとって特別な10作品を1位から10位まで順位付け
2. **通常評価**: 星1〜3の3段階評価（普通・良い・とても良い）
3. **NG評価**: 苦手な作品として非表示設定

### 1.3 制約事項

- 1作品につき1ユーザー1評価のみ
- 評価タイプは排他的（同時に複数の評価タイプは設定不可）
- 10選は最大10作品まで、順位の重複不可

## 2. データモデル設計

### 2.1 Firestoreコレクション構造

#### 2.1.1 evaluations コレクション

個々の作品評価を保存するメインコレクション。

```typescript
// コレクション: evaluations
// ドキュメントID: {userId}_{workId} (例: "123456789_RJ01414353")

interface FirestoreWorkEvaluation {
  // 基本識別情報
  id: string;                          // ドキュメントID（複合キー）
  workId: string;                      // DLsite作品ID (例: "RJ01414353")
  userId: string;                      // Discord ユーザーID
  
  // 評価タイプ（排他的）
  evaluationType: 'top10' | 'star' | 'ng';
  
  // 評価詳細（条件付きフィールド）
  top10Rank?: number;                  // 1-10 (evaluationType === 'top10'の時のみ)
  starRating?: 1 | 2 | 3;              // 星評価 (evaluationType === 'star'の時のみ)
  
  // メタデータ
  createdAt: Timestamp;                // 初回評価日時
  updatedAt: Timestamp;                // 最終更新日時
}
```

#### 2.1.2 users/{userId}/top10 サブコレクション

ユーザーの10選ランキングを効率的に管理するためのサブコレクション。

```typescript
// コレクション: users/{userId}/top10
// ドキュメントID: "ranking"

interface UserTop10List {
  userId: string;                      // ユーザーID
  rankings: {
    [rank: number]: {                  // キー: 1-10の順位
      workId: string;                  // 作品ID
      workTitle?: string;              // 作品タイトル（表示用キャッシュ）
      updatedAt: Timestamp;            // この順位に設定された日時
    } | null;                          // null = その順位は空き
  };
  lastUpdatedAt: Timestamp;            // 最終更新日時
  totalCount: number;                  // 現在の10選登録数（0-10）
}
```

### 2.2 インデックス要件

```yaml
# 評価の検索・集計用インデックス
evaluations:
  - fields: [userId, evaluationType, updatedAt DESC]  # ユーザー別評価一覧
  - fields: [workId, evaluationType]                   # 作品別評価集計
  - fields: [evaluationType, updatedAt DESC]          # 全体評価一覧

# 10選ランキング用（将来的なCollection Group Query用）
users/{userId}/top10:
  - fields: [rankings.*.workId]                        # 作品ID検索用
```

### 2.3 データアクセスパターン

| 操作 | クエリパターン | 用途 |
|------|-------------|------|
| ユーザーの評価取得 | `evaluations.doc(${userId}_${workId})` | 作品詳細ページ表示 |
| ユーザーの全評価 | `evaluations.where('userId', '==', userId)` | マイページ表示 |
| 作品の評価集計 | `evaluations.where('workId', '==', workId)` | 将来のレコメンド用 |
| 10選ランキング取得 | `users/{userId}/top10/ranking` | 10選管理・表示 |

## 3. UI/UX設計

### 3.1 評価コンポーネントの配置

作品詳細ページの右サイドバー最上部に配置。現在のレイアウト構造：

- メインコンテンツ：3カラムグリッド（lg:grid-cols-3）
- 左側（lg:col-span-2）：タブコンテンツ
- 右側（lg:col-span-1）：サイドバー

評価コンポーネントは右サイドバーの最初の要素として配置し、以下の要素を含む：

```
┌─────────────────────────┐
│ あなたの評価            │
├─────────────────────────┤
│ [10選管理セクション]    │
│ ・現在の順位表示        │
│ ・順位変更ボタン        │
│ ・10選から外すボタン    │
├─────────────────────────┤
│ [通常評価セクション]    │
│ ◯ ⭐ 普通              │
│ ◯ ⭐⭐ 良い            │
│ ◯ ⭐⭐⭐ とても良い    │
├─────────────────────────┤
│ [NG評価セクション]      │
│ ◯ ❌ 苦手な作品        │
└─────────────────────────┘
```

### 3.2 インタラクション仕様

#### 3.2.1 10選への追加フロー（スタック型実装）

1. 「10選に追加」ボタンをクリック
2. モーダルで既存の10選を一覧表示し、何位に入れるかの選択を表示
3. 既に10件ある場合は、10位が10選から外れる警告を表示（下位押し出し）
4. 確定後、トランザクションで更新

**スタック型動作の詳細**：

- 新しい作品を指定位置に挿入
- 指定位置以下の作品は1つずつ下位にシフト
- 10件を超える場合、最下位（10位）が自動的に10選から除外

#### 3.2.2 評価変更フロー

1. ラジオボタンで新しい評価を選択
2. 自動的にサーバーアクションを実行
3. ローディング中は操作を無効化
4. 成功/失敗のフィードバック表示

### 3.3 視覚的フィードバック

| 状態 | 表示 |
|------|------|
| 10選選択中 | オレンジ色のバッジ + 順位表示 |
| 星評価選択中 | 選択したラジオボタンがハイライト |
| NG評価選択中 | 赤色の背景 + 警告メッセージ |
| 更新中 | スピナー表示 + 操作無効化 |

## 4. 実装詳細

### 4.1 Server Actions

**配置場所**: `apps/web/src/app/works/[workId]/evaluation-actions.ts`

```typescript
'use server';

import { auth } from '@/lib/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { revalidatePath } from 'next/cache';
import { WorkEvaluationSchema, UserTop10ListSchema } from '@/schemas/work-evaluation';

// 評価の更新（作成・変更）- revalidatePath使用（重要データ操作）
export async function updateWorkEvaluation(
  workId: string, 
  evaluation: EvaluationInput
): Promise<Result> {
  // 認証チェック
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: 'Unauthorized' };
  }
  
  // 入力検証
  const validation = WorkEvaluationSchema.safeParse(evaluation);
  if (!validation.success) {
    return { success: false, error: validation.error.message };
  }
  
  // トランザクション処理（スタック型10選処理含む）
  const result = await performEvaluationUpdate(workId, evaluation, session.user.id);
  
  // キャッシュ無効化（重要データ操作）
  revalidatePath(`/works/${workId}`);
  revalidatePath('/my-evaluations'); // マイページ用
  
  return result;
}

// 10選スタック型更新の内部実装
async function performEvaluationUpdate(
  workId: string,
  evaluation: EvaluationInput,
  userId: string
): Promise<Result> {
  const firestore = getFirestore();
  
  return firestore.runTransaction(async (transaction) => {
    const evaluationId = `${userId}_${workId}`;
    const userTop10Ref = firestore.collection('users').doc(userId).collection('top10').doc('ranking');
    
    if (evaluation.type === 'top10' && evaluation.top10Rank) {
      // 10選スタック型処理
      const top10Doc = await transaction.get(userTop10Ref);
      const currentData = top10Doc.data() as UserTop10List || { rankings: {}, totalCount: 0 };
      
      // 新しいランキング配列を作成
      const newRankings: Record<number, any> = {};
      let removedWork: string | null = null;
      
      // 指定位置に新作品を挿入
      newRankings[evaluation.top10Rank] = {
        workId,
        workTitle: evaluation.workTitle, // UIから渡される
        updatedAt: Timestamp.now()
      };
      
      // 既存作品をシフト
      for (let rank = 1; rank <= 10; rank++) {
        if (rank < evaluation.top10Rank) {
          // 上位はそのまま
          newRankings[rank] = currentData.rankings[rank];
        } else if (rank > evaluation.top10Rank) {
          // 下位は1つずつシフト
          const shiftedWork = currentData.rankings[rank - 1];
          if (shiftedWork && rank <= 10) {
            newRankings[rank] = shiftedWork;
          } else if (rank === 11 && shiftedWork) {
            // 11位になる作品は削除対象
            removedWork = shiftedWork.workId;
          }
        }
      }
      
      // 10選データ更新
      transaction.set(userTop10Ref, {
        userId,
        rankings: newRankings,
        totalCount: Math.min(Object.keys(newRankings).length, 10),
        lastUpdatedAt: Timestamp.now()
      });
      
      // 押し出された作品の評価を削除
      if (removedWork) {
        const removedEvalId = `${userId}_${removedWork}`;
        transaction.delete(firestore.collection('evaluations').doc(removedEvalId));
      }
    }
    
    // 評価データ保存
    // ... 既存の評価保存処理
  });
}

// 現在の評価を取得（認証必須）
export async function getWorkEvaluation(workId: string): Promise<Evaluation | null> {
  const session = await auth();
  if (!session?.user?.id) return null;
  
  // Firestore取得処理
  const evaluation = await fetchUserEvaluation(session.user.id, workId);
  return evaluation;
}

// ユーザーの10選リストを取得
export async function getUserTop10List(): Promise<UserTop10List | null> {
  const session = await auth();
  if (!session?.user?.id) return null;
  
  const list = await fetchUserTop10List(session.user.id);
  return list;
}

// 評価を削除 - revalidatePath使用（重要データ操作）
export async function removeWorkEvaluation(workId: string): Promise<Result> {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: 'Unauthorized' };
  }
  
  const result = await deleteEvaluation(session.user.id, workId);
  
  // キャッシュ無効化
  revalidatePath(`/works/${workId}`);
  revalidatePath('/my-evaluations');
  
  return result;
}

// 統計更新用（Fire-and-Forget）- revalidatePathなし
export async function incrementEvaluationStats(
  workId: string,
  evaluationType: string
): Promise<void> {
  // バッチ処理用のキューに追加（非同期処理）
  await queueStatsUpdate(workId, evaluationType);
  // revalidatePathは使用しない（統計更新のため）
}
```

### 4.2 コンポーネント構成

Next.js 15 App Router と `@docs/DEVELOPMENT.md` のベストプラクティスに準拠した構成：

```
apps/web/src/components/work/          # ドメイン分類: 作品関連
├── work-evaluation/                    # 評価機能ディレクトリ
│   ├── work-evaluation.tsx            # Client Component - 評価UI全体
│   ├── work-evaluation.test.tsx       # co-locationテスト
│   ├── top10-rank-modal.tsx          # Client Component - 10選モーダル
│   ├── top10-rank-modal.test.tsx     # co-locationテスト
│   ├── evaluation-radio-group.tsx    # Client Component - 評価選択
│   ├── evaluation-radio-group.test.tsx # co-locationテスト
│   ├── evaluation-display.tsx        # Server Component - 評価表示専用
│   └── index.ts                      # バレルエクスポート
│
├── hooks/                             # カスタムフック
│   ├── use-work-evaluation.ts        # 評価データ取得・更新
│   ├── use-work-evaluation.test.ts   # フックテスト
│   ├── use-top10-list.ts            # 10選リスト管理
│   └── use-top10-list.test.ts       # フックテスト
│
└── types/                            # コンポーネント専用型定義
    └── work-evaluation.types.ts     # ローカル型定義
```

**Server Actions配置（Page同一ディレクトリ）**：

```
apps/web/src/app/works/[workId]/
├── page.tsx                          # 作品詳細ページ
├── actions.ts                        # 既存のServer Actions
└── evaluation-actions.ts             # 評価専用Server Actions（新規）
```

**設計原則の適用**：

1. **Server/Client Component分離**
   - `evaluation-display.tsx`: Server Component（読み取り専用表示）
   - その他: Client Component（インタラクション必要）

2. **ファイル命名規則**
   - すべてkebab-case使用
   - `.test.tsx`でco-location配置

3. **責任分離**
   - UIコンポーネント: 表示・インタラクション
   - Server Actions: データ操作・検証
   - Hooks: 状態管理・データ取得

### 4.3 WorkDetailコンポーネントへの統合

現在の作品詳細ページ（`apps/web/src/app/works/[workId]/components/WorkDetail.tsx`）の右サイドバーに統合：

```tsx
// WorkDetail.tsx (Client Component)
"use client";

import { WorkEvaluation } from "@/components/work/work-evaluation";
import { useSession } from "next-auth/react";

export default function WorkDetail({ work }: WorkDetailProps) {
  const { data: session } = useSession();
  
  return (
    <div className="max-w-6xl mx-auto">
      {/* ... 既存のコンテンツ ... */}
      
      {/* メインコンテンツエリア */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* 左側: タブコンテンツ */}
        <div className="lg:col-span-2">
          {/* ... 既存のタブ ... */}
        </div>
        
        {/* 右側: サイドバー */}
        <div className="space-y-6">
          {/* 評価コンポーネント（最上部に配置） */}
          {session?.user && (
            <Suspense fallback={<WorkEvaluationSkeleton />}>
              <WorkEvaluation workId={work.productId} />
            </Suspense>
          )}
          
          {/* 既存のサークル情報 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                サークル情報
              </CardTitle>
            </CardHeader>
            {/* ... */}
          </Card>
          
          {/* 既存のクリエイター情報 */}
          {/* ... */}
        </div>
      </div>
    </div>
  );
}
```

**評価データの取得方法**：

```tsx
// apps/web/src/app/works/[workId]/page.tsx (Server Component)
import { getWorkById } from "./actions";
import { getWorkEvaluation } from "./evaluation-actions";

export default async function WorkPage({ params }: PageProps) {
  const { workId } = await params;
  
  // 並列データ取得
  const [work, userEvaluation] = await Promise.all([
    getWorkById(workId),
    getWorkEvaluation(workId) // 認証チェック含む
  ]);

  if (!work) {
    notFound();
  }

  return <WorkDetail work={work} initialEvaluation={userEvaluation} />;
}
```

### 4.4 状態管理

```typescript
// 評価状態の管理
interface EvaluationState {
  currentEvaluation: Evaluation | null;
  isLoading: boolean;
  isUpdating: boolean;
  error: Error | null;
}

// 楽観的更新の実装（デバウンス処理付き）
const updateEvaluation = useMemo(() => 
  debounce(async (newEvaluation) => {
    // 1. 更新中フラグを立てる
    setIsUpdating(true);
    
    // 2. UIを即座に更新（楽観的更新）
    setOptimisticEvaluation(newEvaluation);
    
    // 3. サーバーアクションを実行
    try {
      await updateWorkEvaluation(workId, newEvaluation);
    } catch (error) {
      // 4. エラー時は元に戻す
      revertEvaluation();
      showError(error);
    } finally {
      setIsUpdating(false);
    }
  }, 300), // 300msのデバウンス
  [workId]
);
```

## 5. セキュリティ考慮事項

### 5.1 認証・認可

- すべての操作に Discord OAuth 認証を要求
- ユーザーは自分の評価のみ作成・編集・削除可能
- Server Actions で session チェックを必須化

### 5.2 データ検証

- 入力値の型チェック（Zod スキーマ）
- 10選の順位は1-10の範囲内
- 星評価は1-3の範囲内

### 5.3 レート制限

**初回実装では省略** - 将来的な実装候補：

- 評価更新の連続実行防止
- 一括操作の防止

**代替策（初回実装）**：

- UIレベルでのデバウンス処理（連続クリック防止）
- 更新中のボタン無効化
- 楽観的更新によるレスポンス向上

## 6. パフォーマンス最適化

### 6.1 クエリ最適化

- 複合キー（`${userId}_${workId}`）による O(1) アクセス
- 必要なフィールドのみ取得
- バッチ読み取りの活用

### 6.2 キャッシュ戦略

- React Query による評価データのキャッシュ
- 10選リストは5分間キャッシュ
- 楽観的更新によるUX向上

### 6.3 バンドルサイズ

- 評価コンポーネントの動的インポート
- アイコンの tree shaking

## 7. 将来の拡張性

### 7.1 レコメンドシステムへの対応

現在の設計は、以下の分析を可能にする：

- ユーザー間の評価類似度計算
- 作品のジャンル別評価傾向分析
- 協調フィルタリングの実装

### 7.2 追加機能の可能性

- 評価コメント機能
- タグ付け機能
- 評価の公開/非公開設定
- 評価履歴の表示

### 7.3 データ移行計画

- 既存のお気に入り機能からの移行パス
- 評価スキーマのバージョニング

## 8. テスト計画

### 8.1 単体テスト

- Server Actions のロジックテスト
- コンポーネントの表示テスト
- フックのステート管理テスト

### 8.2 統合テスト

- 評価の作成・更新・削除フロー
- 10選の順位入れ替えフロー
- エラーハンドリング

### 8.3 E2Eテスト

- ユーザージャーニー全体のテスト
- 認証状態での動作確認
- 同時更新時の動作確認

## 9. 実装スケジュール案

| フェーズ | 内容 | 工数目安 |
|---------|------|----------|
| Phase 1 | データモデル実装・Firestore設定 | 0.5日 |
| Phase 2 | Server Actions 実装 | 1日 |
| Phase 3 | UIコンポーネント実装 | 2日 |
| Phase 4 | 統合・テスト | 1日 |
| Phase 5 | レビュー・修正 | 0.5日 |

**合計見積もり**: 5日

## 10. 運用考慮事項

### 10.1 監視項目

- 評価APIのレスポンスタイム
- エラー率
- Firestore の読み取り/書き込み数

### 10.2 バックアップ

- 日次での評価データエクスポート
- 10選ランキングの定期スナップショット

### 10.3 サポート対応

- 評価の誤操作時の復元手順
- 不適切な評価の報告機能

---

**付録A**: 関連ドキュメント

- [FIRESTORE_STRUCTURE.md](./FIRESTORE_STRUCTURE.md) - Firestore全体構造
- [UBIQUITOUS_LANGUAGE.md](./UBIQUITOUS_LANGUAGE.md) - ドメイン用語定義

**付録B**: 参考実装

- お気に入り機能の実装（`/apps/web/src/components/audio-button/favorite-button.tsx`）
- ユーザー認証フロー（`/apps/web/src/lib/auth.ts`）
