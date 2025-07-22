# サークル・クリエイターページ実装設計書

## 概要

DLsite Individual Info APIから取得できるサークル情報（`maker_id`/`circle_id`）とクリエイター情報（`creaters`）を活用し、サークルページとクリエイターページを実装する設計書です。

### 実装目標

- サークル別の作品一覧表示
- クリエイター別の参加作品一覧表示
- 作品詳細ページからのシームレスなナビゲーション
- 効率的なデータ収集と更新

### 設計原則

- **YAGNI原則**: 必要な機能のみ実装
- **既存ファイル優先**: 新規ファイル作成は最小限
- **Firestore Admin SDK**: `firebase-admin`の直接使用は禁止
- **テスト駆動開発**: 実装後は必ずテストを実行

## 1. データベース設計

### 1.1 Firestoreコレクション構造

#### 既存コレクションの活用優先

**方針**: 新規コレクション作成は最小限とし、既存の`dlsiteWorks`コレクションを最大限活用する。

#### circles コレクション（必要最小限の新規コレクション）

```typescript
interface CircleData {
  circleId: string;        // "RG23954" (maker_id/circle_id from API)
  name: string;            // "チームランドセル" (maker_name)
  nameEn?: string;         // "Team Landsel" (maker_name_en)
  workCount: number;       // 関連作品数（統計情報）
  lastUpdated: Timestamp;  // 最終更新日時
  createdAt: Timestamp;    // 初回登録日時
}
```

#### creatorWorkMappings コレクション（クエリ最適化用）

Firestoreの配列内オブジェクト検索の制限を回避するための非正規化コレクション：

```typescript
interface CreatorWorkMapping {
  creatorId: string;       // "28165"
  workId: string;          // "RJ01234567"
  creatorName: string;     // "涼花みなせ"
  types: CreatorType[];    // ["voice", "scenario"]
  circleId: string;        // "RG23954"
  createdAt: Timestamp;
}

type CreatorType = "voice" | "illustration" | "scenario" | "music" | "other";
```

#### dlsiteWorks コレクションの拡張

```typescript
// 既存のOptimizedFirestoreDLsiteWorkDataに追加
interface OptimizedFirestoreDLsiteWorkData {
  // ... 既存フィールド
  
  circleId: string;        // "RG23954" (必須フィールドに変更)
  
  // creatorsフィールドは既に実装済み
  // 各クリエイター情報にIDが含まれている
  creaters?: {
    voice_by?: Array<{ id?: string; name: string }>;
    scenario_by?: Array<{ id?: string; name: string }>;
    illust_by?: Array<{ id?: string; name: string }>;
    music_by?: Array<{ id?: string; name: string }>;
    others_by?: Array<{ id?: string; name: string }>;
    created_by?: Array<{ id?: string; name: string }>;
  };
}
```

### 1.2 インデックス設計

必要なFirestoreインデックスは`terraform/firestore_indexes.tf`で管理します（このプロジェクトはFirebaseを使用していないため）:

```hcl
# terraform/firestore_indexes.tf に追加

# circles コレクション - サークル一覧ページ用（将来実装）
resource "google_firestore_index" "circles_name_workcount_desc" {
  project    = var.gcp_project_id
  collection = "circles"
  
  fields {
    field_path = "name"
    order      = "ASCENDING"
  }
  
  fields {
    field_path = "workCount"
    order      = "DESCENDING"
  }
}

# creatorWorkMappings コレクション - クリエイター検索用
resource "google_firestore_index" "creatormappings_creatorid_workid" {
  project    = var.gcp_project_id
  collection = "creatorWorkMappings"
  
  fields {
    field_path = "creatorId"
    order      = "ASCENDING"
  }
  
  fields {
    field_path = "workId"
    order      = "ASCENDING"
  }
}

# creatorWorkMappings コレクション - クリエイタータイプ検索用
resource "google_firestore_index" "creatormappings_creatorid_types" {
  project    = var.gcp_project_id
  collection = "creatorWorkMappings"
  
  fields {
    field_path = "creatorId"
    order      = "ASCENDING"
  }
  
  fields {
    field_path   = "types"
    array_config = "CONTAINS"
  }
}

# dlsiteWorks コレクション - サークル別作品一覧用
resource "google_firestore_index" "dlsiteworks_circleid_registdate_desc" {
  project    = var.gcp_project_id
  collection = "dlsiteWorks"
  
  fields {
    field_path = "circleId"
    order      = "ASCENDING"
  }
  
  fields {
    field_path = "registDate"
    order      = "DESCENDING"
  }
}
```

## 2. データ収集戦略

### 2.1 Individual Info API からのデータマッピング

#### 既存ファイルの拡張（individual-info-to-work-mapper.ts）

```typescript
// apps/functions/src/services/dlsite/individual-info-to-work-mapper.ts を拡張
export function mapIndividualInfoToWork(
  apiData: DLsiteIndividualInfo
): OptimizedFirestoreDLsiteWorkData {
  // ... 既存のマッピング処理

  return {
    // ... 既存フィールド
    
    // サークルID追加（必須化）- 既存実装の確認が必要
    circleId: apiData.maker_id || apiData.circle_id || 'UNKNOWN',
    
    // creatorsフィールドは既存のマッピングで処理済み
    // apiData.creatersがそのままマッピングされている
  };
}
```

### 2.2 サークル・クリエイター情報の収集処理

#### Cloud Functions での実装（推奨）

```typescript
// apps/functions/src/services/dlsite/collect-circle-creator-info.ts
import { Firestore } from '@google-cloud/firestore';
import { logger } from '@/shared/logging/logger';
import type { DLsiteIndividualInfo, OptimizedFirestoreDLsiteWorkData } from '@suzumina.click/shared-types';
import { z } from 'zod';

const adminDb = new Firestore();

// 入力検証スキーマ
const CircleIdSchema = z.string().regex(/^RG\d+$/);
const CreatorIdSchema = z.string().min(1);

export async function collectCircleAndCreatorInfo(
  workData: OptimizedFirestoreDLsiteWorkData,
  apiData: DLsiteIndividualInfo,
  isNewWork: boolean
): Promise<{ success: boolean; error?: string }> {
  try {
    const batch = adminDb.batch();
    
    // 1. サークル情報の更新（Fire-and-Forget パターン）
    await updateCircleInfo(batch, apiData, isNewWork);
    
    // 2. クリエイターマッピングの更新
    await updateCreatorMappings(batch, apiData, workData.id);
    
    // バッチコミット（最大500操作）
    await batch.commit();
    
    return { success: true };
  } catch (error) {
    logger.error('サークル・クリエイター情報収集エラー:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}

async function updateCircleInfo(
  batch: FirebaseFirestore.WriteBatch,
  apiData: DLsiteIndividualInfo,
  isNewWork: boolean
) {
  const circleId = apiData.maker_id || apiData.circle_id;
  if (!circleId) return;
  
  // 入力検証
  const validation = CircleIdSchema.safeParse(circleId);
  if (!validation.success) {
    logger.warn(`無効なサークルID: ${circleId}`);
    return;
  }
  
  const circleRef = adminDb.collection('circles').doc(circleId);
  const circleDoc = await circleRef.get();
  
  if (!circleDoc.exists) {
    // 新規サークル
    batch.set(circleRef, {
      circleId,
      name: apiData.maker_name || '',
      nameEn: apiData.maker_name_en,
      workCount: 1,
      lastUpdated: Firestore.FieldValue.serverTimestamp(),
      createdAt: Firestore.FieldValue.serverTimestamp(),
    });
  } else if (isNewWork) {
    // 既存サークルの新作品追加時のみworkCountを増加
    // 注: workCountは統計情報のため、Fire-and-Forgetパターンを使用
    batch.update(circleRef, {
      name: apiData.maker_name || circleDoc.data().name,
      nameEn: apiData.maker_name_en,
      workCount: Firestore.FieldValue.increment(1),
      lastUpdated: Firestore.FieldValue.serverTimestamp(),
    });
  } else {
    // 既存作品の更新時は名前のみ更新
    batch.update(circleRef, {
      name: apiData.maker_name || circleDoc.data().name,
      nameEn: apiData.maker_name_en,
      lastUpdated: Firestore.FieldValue.serverTimestamp(),
    });
  }
}

async function updateCreatorMappings(
  batch: FirebaseFirestore.WriteBatch,
  apiData: DLsiteIndividualInfo,
  workId: string
) {
  const creatorTypeMap: Array<[keyof typeof apiData.creaters, CreatorType]> = [
    ['voice_by', 'voice'],
    ['illust_by', 'illustration'],
    ['scenario_by', 'scenario'],
    ['music_by', 'music'],
    ['others_by', 'other'],
    ['created_by', 'other'],
  ];
  
  const circleId = apiData.maker_id || apiData.circle_id || 'UNKNOWN';
  const processedCreators = new Set<string>(); // 重複処理防止
  
  for (const [field, type] of creatorTypeMap) {
    const creators = apiData.creaters?.[field] || [];
    
    for (const creator of creators) {
      if (!creator.id || processedCreators.has(creator.id)) continue;
      
      // 入力検証
      const validation = CreatorIdSchema.safeParse(creator.id);
      if (!validation.success) {
        logger.warn(`無効なクリエイターID: ${creator.id}`);
        continue;
      }
      
      // マッピングドキュメントの作成/更新
      const mappingId = `${creator.id}_${workId}`;
      const mappingRef = adminDb.collection('creatorWorkMappings').doc(mappingId);
      
      const existingMapping = await mappingRef.get();
      const existingTypes = existingMapping.exists 
        ? existingMapping.data()?.types || [] 
        : [];
      
      const updatedTypes = Array.from(new Set([...existingTypes, type]));
      
      batch.set(mappingRef, {
        creatorId: creator.id,
        workId,
        creatorName: creator.name,
        types: updatedTypes,
        circleId,
        createdAt: Firestore.FieldValue.serverTimestamp(),
      }, { merge: true });
      
      processedCreators.add(creator.id);
    }
  }
}
```

### 2.3 既存Cloud Functions への統合

```typescript
// apps/functions/src/endpoints/dlsite.ts の既存関数を拡張
import { collectCircleAndCreatorInfo } from '../services/dlsite/collect-circle-creator-info';

export const fetchDLsiteWorksIndividualAPI: CloudEventFunction<any> = async (event) => {
  // ... 既存の処理
  
  // 作品情報保存後に実行（Fire-and-Forget）
  const isNewWork = !existingWork;
  
  // エラーがあってもメイン処理は継続
  collectCircleAndCreatorInfo(workData, apiData, isNewWork)
    .catch(error => logger.warn('サークル情報更新エラー（無視）:', error));
  
  // ... 続きの処理
};
```

## 3. フロントエンド実装

### 3.1 ルーティング構造

```
app/
├── circles/
│   └── [circleId]/
│       └── page.tsx        # サークル詳細ページ
├── creators/
│   └── [creatorId]/
│       └── page.tsx        # クリエイター詳細ページ
```

### 3.2 Server Actions (データ取得のみ)

#### app/circles/[circleId]/actions.ts

```typescript
'use server';

import { Firestore } from '@google-cloud/firestore';
import type { CircleData, OptimizedFirestoreDLsiteWorkData } from '@suzumina.click/shared-types';
import { z } from 'zod';

const adminDb = new Firestore();

const CircleIdSchema = z.string().regex(/^RG\d+$/);

export async function getCircleWithWorks(circleId: string) {
  // 入力検証
  const validation = CircleIdSchema.safeParse(circleId);
  if (!validation.success) {
    return null;
  }
  
  try {
    // サークル情報取得
    const circleDoc = await adminDb.collection('circles').doc(circleId).get();
    
    if (!circleDoc.exists) {
      return null;
    }
    
    const circleData = circleDoc.data() as CircleData;
    
    // サークルの作品一覧取得
    const worksSnapshot = await adminDb
      .collection('dlsiteWorks')
      .where('circleId', '==', circleId)
      .orderBy('registDate', 'desc')
      .limit(100)
      .get();
    
    const works = worksSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as OptimizedFirestoreDLsiteWorkData[];
    
    return {
      circle: circleData,
      works
    };
  } catch (error) {
    console.error('サークル情報取得エラー:', error);
    return null;
  }
}
```

#### app/creators/[creatorId]/actions.ts

```typescript
'use server';

import { Firestore } from '@google-cloud/firestore';
import type { OptimizedFirestoreDLsiteWorkData } from '@suzumina.click/shared-types';
import { z } from 'zod';

const adminDb = new Firestore();

const CreatorIdSchema = z.string().min(1);

interface CreatorInfo {
  id: string;
  name: string;
  types: string[];
  workCount: number;
}

export async function getCreatorWithWorks(creatorId: string) {
  // 入力検証
  const validation = CreatorIdSchema.safeParse(creatorId);
  if (!validation.success) {
    return null;
  }
  
  try {
    // creatorWorkMappings を使用して効率的に作品を取得
    const mappingsSnapshot = await adminDb
      .collection('creatorWorkMappings')
      .where('creatorId', '==', creatorId)
      .get();
    
    if (mappingsSnapshot.empty) {
      return null;
    }
    
    // クリエイター情報の集約
    const creatorInfo: CreatorInfo = {
      id: creatorId,
      name: '',
      types: [],
      workCount: 0
    };
    
    const workIds = new Set<string>();
    const allTypes = new Set<string>();
    
    mappingsSnapshot.docs.forEach(doc => {
      const data = doc.data();
      workIds.add(data.workId);
      data.types?.forEach((type: string) => allTypes.add(type));
      if (data.creatorName && !creatorInfo.name) {
        creatorInfo.name = data.creatorName;
      }
    });
    
    creatorInfo.types = Array.from(allTypes);
    creatorInfo.workCount = workIds.size;
    
    // 作品詳細を取得（バッチ処理）
    const works: OptimizedFirestoreDLsiteWorkData[] = [];
    const workIdArray = Array.from(workIds);
    
    // Firestoreの制限により、一度に10件まで
    for (let i = 0; i < workIdArray.length; i += 10) {
      const batch = workIdArray.slice(i, i + 10);
      const snapshot = await adminDb
        .collection('dlsiteWorks')
        .where(Firestore.FieldPath.documentId(), 'in', batch)
        .get();
      
      snapshot.docs.forEach(doc => {
        works.push({
          id: doc.id,
          ...doc.data()
        } as OptimizedFirestoreDLsiteWorkData);
      });
    }
    
    // 登録日でソート
    works.sort((a, b) => b.registDate.toMillis() - a.registDate.toMillis());
    
    return {
      creator: creatorInfo,
      works
    };
  } catch (error) {
    console.error('クリエイター情報取得エラー:', error);
    return null;
  }
}
```

### 3.3 ページコンポーネント

#### app/circles/[circleId]/page.tsx

```tsx
import { getCircleWithWorks } from './actions';
import { DLsiteWorkCard } from '@/components/content/dlsite-work-card';
import { notFound } from 'next/navigation';

export default async function CirclePage({
  params
}: {
  params: { circleId: string }
}) {
  const data = await getCircleWithWorks(params.circleId);
  
  if (!data) {
    notFound();
  }
  
  const { circle, works } = data;
  
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">{circle.name}</h1>
        {circle.nameEn && (
          <p className="text-lg text-muted-foreground">{circle.nameEn}</p>
        )}
        <p className="mt-4 text-sm text-muted-foreground">
          作品数: {circle.workCount}件
        </p>
      </div>
      
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
        {works.map((work) => (
          <DLsiteWorkCard key={work.id} work={work} />
        ))}
      </div>
    </div>
  );
}
```

#### app/creators/[creatorId]/page.tsx

```tsx
import { getCreatorWithWorks } from './actions';
import { DLsiteWorkCard } from '@/components/content/dlsite-work-card';
import { notFound } from 'next/navigation';

const creatorTypeLabels: Record<string, string> = {
  voice: '声優',
  illustration: 'イラスト',
  scenario: 'シナリオ',
  music: '音楽',
  other: 'その他'
};

function getCreatorTypeLabel(types: string[]): string {
  if (types.length === 1) {
    return creatorTypeLabels[types[0]] || types[0];
  }
  return types.map(type => creatorTypeLabels[type] || type).join(' / ');
}

export default async function CreatorPage({
  params
}: {
  params: { creatorId: string }
}) {
  const data = await getCreatorWithWorks(params.creatorId);
  
  if (!data) {
    notFound();
  }
  
  const { creator, works } = data;
  
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">{creator.name}</h1>
        <p className="text-lg text-muted-foreground">
          {getCreatorTypeLabel(creator.types)}
        </p>
        <p className="mt-4 text-sm text-muted-foreground">
          参加作品数: {creator.workCount}件
        </p>
      </div>
      
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
        {works.map((work) => (
          <DLsiteWorkCard key={work.id} work={work} />
        ))}
      </div>
    </div>
  );
}
```

### 3.4 既存コンポーネントの更新

#### WorkDetail.tsx への変更

```tsx
// サークル情報セクション
<div className="mb-6">
  <h3 className="text-sm font-medium mb-2">サークル</h3>
  <Link 
    href={`/circles/${work.circleId}`}
    className="text-primary hover:underline"
  >
    {work.circleName}
  </Link>
</div>

// クリエイター情報セクション（既存のcreatorsフィールドを使用）
{work.creaters?.voice_by && work.creaters.voice_by.length > 0 && (
  <div className="mb-6">
    <h3 className="text-sm font-medium mb-2">声優</h3>
    <div className="flex flex-wrap gap-2">
      {work.creaters.voice_by.map((creator, index) => (
        creator.id ? (
          <Link
            key={index}
            href={`/creators/${creator.id}`}
            className="text-primary hover:underline"
          >
            {creator.name}
          </Link>
        ) : (
          <span key={index} className="text-muted-foreground">
            {creator.name}
          </span>
        )
      ))}
    </div>
  </div>
)}
```

#### DLsiteWorkCard.tsx への変更

```tsx
// サークル名をリンク化
<Link 
  href={`/circles/${work.circleId}`}
  className="text-sm text-muted-foreground hover:text-primary transition-colors"
>
  {work.circleName}
</Link>
```

## 4. テスト戦略

### 4.1 単体テスト

#### collect-circle-creator-info.test.ts

```typescript
import { describe, it, expect, vi } from 'vitest';
import { collectCircleAndCreatorInfo } from './collect-circle-creator-info';

describe('collectCircleAndCreatorInfo', () => {
  it('should create new circle when not exists', async () => {
    const mockBatch = {
      set: vi.fn(),
      commit: vi.fn().mockResolvedValue(undefined),
    };
    
    // テスト実装
    const result = await collectCircleAndCreatorInfo(mockWorkData, mockApiData, true);
    
    expect(result.success).toBe(true);
    expect(mockBatch.set).toHaveBeenCalled();
  });
  
  it('should handle invalid circle ID', async () => {
    const invalidApiData = { ...mockApiData, maker_id: 'INVALID' };
    
    const result = await collectCircleAndCreatorInfo(mockWorkData, invalidApiData, true);
    
    expect(result.success).toBe(true); // エラーは無視される
  });
});
```

### 4.2 統合テスト

```typescript
describe('Circle Page Integration', () => {
  it('should display circle information and works', async () => {
    render(await CirclePage({ params: { circleId: 'RG23954' } }));
    
    expect(screen.getByText('チームランドセル')).toBeInTheDocument();
    expect(screen.getByText(/作品数: \d+件/)).toBeInTheDocument();
  });
});
```

### 4.3 必須テストコマンド

```bash
# 実装後は必ず実行
pnpm test
pnpm lint
pnpm typecheck
```

## 5. 実装スケジュール

### Phase 1: データ基盤（3日）

- [ ] 既存マッパーの確認と拡張
- [ ] Cloud Functions での収集処理実装
- [ ] creatorWorkMappings コレクション設計
- [ ] バッチ処理の最適化

### Phase 2: フロントエンド基本実装（3日）

- [ ] サークルページの実装
- [ ] クリエイターページの実装
- [ ] Server Actions の実装
- [ ] 既存コンポーネントのリンク追加

### Phase 3: テストと品質保証（2日）

- [ ] 単体テストの作成
- [ ] 統合テストの実装
- [ ] パフォーマンステスト
- [ ] エラーハンドリングの検証

## 6. 技術的考慮事項

### 6.1 パフォーマンス最適化

1. **バッチ処理の制限**
   - Firestoreバッチ: 最大500操作/バッチ
   - whereIn クエリ: 最大10件/クエリ
   - 大量データ処理時の分割実装

2. **Fire-and-Forget パターンの活用**
   - 統計情報（workCount）の非同期更新
   - revalidatePath を使用しない
   - エラー時もメイン処理継続

3. **クエリ最適化**
   - creatorWorkMappings による効率的な検索
   - 複合インデックスの活用
   - 不要なドキュメント読み込みの回避

### 6.2 データ整合性

1. **バッチ処理による原子性保証**
   - 複数コレクションの同時更新
   - トランザクション処理の適切な使用
   - エラー時のロールバック

2. **重複処理の防止**
   - processedCreators Set による制御
   - マッピングドキュメントのID設計
   - merge オプションによる安全な更新

### 6.3 セキュリティ考慮

1. **入力検証の徹底**
   - Zod スキーマによる型検証
   - 正規表現による形式チェック
   - エラーログの適切な記録

2. **アクセス制御**
   - Server Actions は認証不要（読み取り専用）
   - Cloud Functions は内部処理のみ
   - Firestore Rules での追加保護

## 7. 実装上の重要事項

### 7.1 Firebase Admin SDK の使用制限

**CLAUDE.md の指示に従い、以下を厳守**：

```typescript
// ❌ 禁止: firebase-admin パッケージの使用
import { firestore } from 'firebase-admin';
import * as admin from 'firebase-admin';

// ✅ 正しい: @google-cloud/firestore の使用
import { Firestore } from '@google-cloud/firestore';
const adminDb = new Firestore();
```

### 7.2 既存ファイル優先の原則

1. **新規ファイル作成は最小限**
   - 既存のマッパーを拡張
   - 既存のCloud Functions に統合
   - 新規コレクションは必要最小限

2. **Server Actions の適切な使用**
   - データ取得のみに使用
   - Fire-and-Forget パターンは Cloud Functions で
   - revalidatePath は重要な操作のみ

### 7.3 テスト実行の必須化

```bash
# 実装後は必ず実行
pnpm test      # 単体テスト
pnpm lint      # コード品質チェック
pnpm typecheck # 型チェック
```

## 8. ローカル開発環境での一括収集サポート

### 8.1 collect:complete-local スクリプトの拡張

`pnpm collect:complete-local`コマンドでサークル・クリエイター情報も一括収集できるよう、既存の`LocalDataCollector`を拡張します。

#### apps/functions/src/development/core/local-complete-collector.ts の拡張

```typescript
// 既存のLocalDataCollectorクラスを拡張
import { collectCircleAndCreatorInfo } from '../../services/dlsite/collect-circle-creator-info';

export class LocalDataCollector {
  // ... 既存のプロパティとメソッド
  
  // 新規: サークル・クリエイター収集統計
  private circleStats = {
    totalCircles: 0,
    newCircles: 0,
    updatedCircles: 0,
  };
  
  private creatorStats = {
    totalMappings: 0,
    uniqueCreators: new Set<string>(),
  };
  
  async collectAllData(): Promise<void> {
    // ... 既存の処理
    
    // 作品データ保存後、サークル・クリエイター情報も収集
    console.log('🔄 サークル・クリエイター情報の収集を開始...');
    await this.collectCirclesAndCreators();
    
    // 統計情報の表示
    this.displayCircleCreatorStats();
  }
  
  private async collectCirclesAndCreators(): Promise<void> {
    const startTime = Date.now();
    
    // バッチ処理のためのキュー
    const circleQueue = new Map<string, CircleData>();
    const creatorMappingQueue: CreatorWorkMapping[] = [];
    
    // 全作品データからサークル・クリエイター情報を抽出
    for (const [workId, apiData] of this.apiResponses) {
      const workData = this.works.get(workId);
      if (!workData || !apiData) continue;
      
      // サークル情報の収集
      const circleId = apiData.maker_id || apiData.circle_id;
      if (circleId && circleId.match(/^RG\d+$/)) {
        if (!circleQueue.has(circleId)) {
          circleQueue.set(circleId, {
            circleId,
            name: apiData.maker_name || '',
            nameEn: apiData.maker_name_en,
            workCount: 0,
            lastUpdated: new Date(),
            createdAt: new Date(),
          });
        }
        // workCountをインクリメント
        const circle = circleQueue.get(circleId)!;
        circle.workCount++;
      }
      
      // クリエイターマッピングの収集
      const creatorTypeMap: Array<[keyof typeof apiData.creaters, CreatorType]> = [
        ['voice_by', 'voice'],
        ['illust_by', 'illustration'],
        ['scenario_by', 'scenario'],
        ['music_by', 'music'],
        ['others_by', 'other'],
        ['created_by', 'other'],
      ];
      
      for (const [field, type] of creatorTypeMap) {
        const creators = apiData.creaters?.[field] || [];
        
        for (const creator of creators) {
          if (!creator.id) continue;
          
          this.creatorStats.uniqueCreators.add(creator.id);
          
          creatorMappingQueue.push({
            creatorId: creator.id,
            workId: workData.id,
            creatorName: creator.name,
            types: [type],
            circleId: circleId || 'UNKNOWN',
            createdAt: new Date(),
          });
        }
      }
    }
    
    // Firestoreへの保存（バッチ処理）
    await this.saveCirclesAndCreators(circleQueue, creatorMappingQueue);
    
    const duration = Date.now() - startTime;
    console.log(`✅ サークル・クリエイター情報収集完了: ${duration}ms`);
  }
  
  private async saveCirclesAndCreators(
    circleQueue: Map<string, CircleData>,
    creatorMappingQueue: CreatorWorkMapping[]
  ): Promise<void> {
    // サークル情報の保存
    console.log(`📝 ${circleQueue.size}件のサークル情報を保存中...`);
    
    const circleArray = Array.from(circleQueue.values());
    for (let i = 0; i < circleArray.length; i += 500) {
      const batch = this.adminDb.batch();
      const batchCircles = circleArray.slice(i, i + 500);
      
      for (const circle of batchCircles) {
        const ref = this.adminDb.collection('circles').doc(circle.circleId);
        const existing = await ref.get();
        
        if (!existing.exists) {
          this.circleStats.newCircles++;
          batch.set(ref, {
            ...circle,
            lastUpdated: Firestore.FieldValue.serverTimestamp(),
            createdAt: Firestore.FieldValue.serverTimestamp(),
          });
        } else {
          this.circleStats.updatedCircles++;
          batch.update(ref, {
            name: circle.name,
            nameEn: circle.nameEn,
            workCount: circle.workCount,
            lastUpdated: Firestore.FieldValue.serverTimestamp(),
          });
        }
      }
      
      await batch.commit();
      console.log(`  バッチ ${Math.floor(i / 500) + 1}/${Math.ceil(circleArray.length / 500)} 完了`);
    }
    
    this.circleStats.totalCircles = circleQueue.size;
    
    // クリエイターマッピングの保存（重複を統合）
    console.log(`📝 ${creatorMappingQueue.length}件のクリエイターマッピングを処理中...`);
    
    // マッピングを統合（同じcreatorId_workIdの組み合わせはtypesを統合）
    const mappingMap = new Map<string, CreatorWorkMapping>();
    
    for (const mapping of creatorMappingQueue) {
      const key = `${mapping.creatorId}_${mapping.workId}`;
      
      if (mappingMap.has(key)) {
        const existing = mappingMap.get(key)!;
        existing.types = Array.from(new Set([...existing.types, ...mapping.types]));
      } else {
        mappingMap.set(key, { ...mapping });
      }
    }
    
    // バッチ保存
    const mappingArray = Array.from(mappingMap.values());
    for (let i = 0; i < mappingArray.length; i += 500) {
      const batch = this.adminDb.batch();
      const batchMappings = mappingArray.slice(i, i + 500);
      
      for (const mapping of batchMappings) {
        const mappingId = `${mapping.creatorId}_${mapping.workId}`;
        const ref = this.adminDb.collection('creatorWorkMappings').doc(mappingId);
        
        batch.set(ref, {
          ...mapping,
          createdAt: Firestore.FieldValue.serverTimestamp(),
        }, { merge: true });
      }
      
      await batch.commit();
      console.log(`  バッチ ${Math.floor(i / 500) + 1}/${Math.ceil(mappingArray.length / 500)} 完了`);
    }
    
    this.creatorStats.totalMappings = mappingMap.size;
  }
  
  private displayCircleCreatorStats(): void {
    console.log('\n=== サークル・クリエイター収集統計 ===');
    console.log(`🏢 サークル数: ${this.circleStats.totalCircles}`);
    console.log(`  - 新規: ${this.circleStats.newCircles}`);
    console.log(`  - 更新: ${this.circleStats.updatedCircles}`);
    console.log(`👥 ユニーククリエイター数: ${this.creatorStats.uniqueCreators.size}`);
    console.log(`🔗 マッピング数: ${this.creatorStats.totalMappings}`);
  }
}
```

### 8.2 メモリ効率の考慮事項

大量データ処理時のメモリ使用量を最適化：

1. **ストリーミング処理**
   - 作品データを一度にすべてメモリに保持せず、バッチごとに処理
   - Map/Setのサイズを監視し、必要に応じて中間保存

2. **バッチサイズの調整**
   - Firestoreバッチの最大500操作制限を考慮
   - メモリ使用量に応じて動的にバッチサイズを調整

3. **ガベージコレクションの促進**
   - 処理済みデータの早期解放
   - 大きなオブジェクトの参照を適切にクリア

### 8.3 実行コマンド

```bash
# 全データ収集（作品 + サークル + クリエイター）
pnpm --filter @suzumina.click/functions collect:complete-local

# オプション: サークル・クリエイター情報のみ収集（将来の拡張）
# pnpm --filter @suzumina.click/functions collect:circles-creators-local
```

### 8.4 エラーハンドリング

1. **部分的な失敗の許容**
   - 個別のサークル・クリエイター情報収集エラーは警告として記録
   - メイン処理は継続

2. **リトライ機構**
   - Firestore書き込みエラー時の自動リトライ
   - 指数バックオフによる負荷軽減

3. **進捗レポート**
   - 定期的な進捗表示
   - エラー発生時の詳細情報出力

## 9. 将来の拡張性（YAGNI原則適用）

以下は現時点では実装しない（必要になったら実装）：

- 統計情報の詳細分析
- ソーシャル機能（フォロー・通知）
- レコメンデーション機能
- 差分更新専用コマンド（collect:circles-creators-diff）

現在は基本機能の実装に集中する。

## まとめ

本設計は、`DEVELOPMENT.md` と `CLAUDE.md` の基準に準拠し、以下の原則を遵守しています：

1. **既存ファイル優先**: 新規ファイル作成を最小限に抑制
2. **Firestore Admin SDK**: `@google-cloud/firestore` のみを使用（`firebase-admin`は使用禁止）
3. **YAGNI原則**: 必要な機能のみを実装
4. **テスト駆動開発**: 包括的なテスト戦略
5. **Fire-and-Forget パターン**: 統計情報の非同期更新

DLsite Individual Info APIの情報を効率的に活用し、パフォーマンスとセキュリティを考慮した実装により、ユーザーがサークルやクリエイター単位で作品を探索できる機能を実現します。

**最終更新**: 2025-07-21  
**ドキュメントバージョン**: 2.1 (ローカル収集サポート追加版)
