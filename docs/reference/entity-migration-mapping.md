# Entity移行マッピング - Phase 0分析結果

## Work Entity移行マッピング

### 現状分析
- **Work Entity使用**: ほぼゼロ（既にWorkPlainObjectが主流）
- **影響範囲**: 最小限（変換ロジックのみ）
- **移行リスク**: 低

### ビジネスロジック移行マッピング

| Entity メソッド | 新しい関数 | 場所 | 優先度 |
|---------------|-----------|------|--------|
| `fromFirestoreData()` | `fromFirestore()` | transformers/firestore.ts | 高 |
| `toPlainObject()` | 不要（既にPlainObject） | - | - |
| `isAdultContent()` | `isAdultContent()` | operations/work.ts | 中 |
| `isVoiceWork()` | `isVoiceWork()` | operations/work.ts | 中 |
| `isGameWork()` | `isGameWork()` | operations/work.ts | 中 |
| `isMangaWork()` | `isMangaWork()` | operations/work.ts | 中 |
| `isNewRelease()` | `isNewRelease()` | operations/work.ts | 低 |
| `isPopular()` | `isPopular()` | operations/work.ts | 低 |
| `getSearchableText()` | `getSearchableText()` | operations/work.ts | 中 |
| `getAllTags()` | `getAllTags()` | operations/work.ts | 中 |
| `isValid()` | `validate()` | validators/work.ts | 高 |
| `getValidationErrors()` | `getValidationErrors()` | validators/work.ts | 高 |

### Value Object移行マッピング

| Value Object | 新しい場所 | 変更内容 |
|-------------|-----------|---------|
| WorkId | validators/work.ts | `validateWorkId()` 関数として |
| WorkTitle | types/work.ts | 型定義のみ、検証は関数化 |
| WorkPrice | operations/work.ts | `formatPrice()` 等の関数として |
| WorkRating | operations/work.ts | `calculateRating()` 等の関数として |
| WorkCreators | types/work.ts | 型定義のみ |
| Circle | types/work.ts | 型定義のみ |

### 定数・設定の移行

```typescript
// 現在: Work Entity内の定数
private static readonly GAME_CATEGORIES = ["GAM", "RPG", ...];

// 移行後: operations/work.ts内の定数
const GAME_CATEGORIES = ["GAM", "RPG", ...] as const;
```

## Video Entity移行マッピング（Phase 2用）

### 状態遷移ロジック
| Entity メソッド | 新しい関数 | 複雑度 |
|---------------|-----------|--------|
| `publish()` | `publishVideo()` | 高 |
| `archive()` | `archiveVideo()` | 中 |
| `updateMetadata()` | `updateVideoMetadata()` | 中 |
| `canPublish()` | `canPublishVideo()` | 中 |

### AudioButton関連
- Video Entityと密結合
- Video移行時に同時実施

## 移行実装順序

### Step 1: 型定義の準備（Phase 0内で完了）
1. `types/work.ts` - WorkPlainObjectをWorkとして再定義
2. 既存のWorkPlainObjectへのエイリアス作成

### Step 2: 関数の実装（Phase 1 Week 2）
1. `validators/work.ts` - バリデーション関数
2. `transformers/firestore.ts` - Firestore変換
3. `operations/work.ts` - ビジネスロジック

### Step 3: 使用箇所の移行（Phase 1 Week 3）
1. apps/web内の変更（20ファイル）
2. apps/functions内の変更（推定5-10ファイル）
3. テストの更新

## 互換性戦略

```typescript
// Phase 1期間中の互換性レイヤー
// packages/shared-types/src/entities/work-entity.ts

import { workOperations } from '../operations/work';
import type { WorkPlainObject } from '../plain-objects/work-plain';

/**
 * @deprecated Use workOperations and transformers directly
 */
export class Work {
  static fromFirestoreData(data: any) {
    console.warn('Deprecated: Use workTransformers.fromFirestore()');
    return { value: workTransformers.fromFirestore(data) };
  }
  
  // 既存コードの互換性維持
  toPlainObject(): WorkPlainObject {
    return this as any;
  }
}
```

## テスト戦略

### 並行テスト期間
- 新旧両方のテストを維持
- 結果の一致を確認
- カバレッジ80%以上維持

### テストファイル移行
| 現在 | 移行後 |
|------|--------|
| `__tests__/work-entity.test.ts` | `__tests__/operations/work.test.ts` |
| `__tests__/work-conversions.test.ts` | `__tests__/transformers/firestore.test.ts` |

## 成功基準

- [ ] すべてのWork Entity使用箇所が関数呼び出しに変更
- [ ] テストカバレッジ80%以上
- [ ] パフォーマンステストで劣化なし
- [ ] E2Eテスト100%通過