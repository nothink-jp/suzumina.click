# 命名規則簡潔化移行ガイド

## 概要

このドキュメントは、suzumina.clickプロジェクトにおける型名の簡潔化を安全に実施するための詳細なガイドです。

## 現状の命名規則の問題点

### 1. 過度に説明的な型名
```typescript
// 現在は完了
type WorkDocument = { ... }  // 旧: OptimizedFirestoreDLsiteWorkData
// → "Optimized", "Firestore", "DLsite" を削除し、Firestoreドキュメントであることを明示
```

### 2. 技術的詳細の露出
```typescript
// 現在
type FirestoreFieldTimestamp = { ... }
// → "Firestore", "Field" は実装詳細

// 理想
type Timestamp = { ... }
```

### 3. 冗長な接頭辞/接尾辞
```typescript
// 現在
type UnifiedDataCollectionMetadata = { ... }
// → "Unified", "Data" は不要

// 理想
type CollectionMetadata = { ... }
```

## 移行対象の型一覧

### 優先度: 高（頻繁に使用される型）

| 現在の名前 | 新しい名前 | 使用箇所数 | 影響度 |
|-----------|-----------|-----------|--------|
| ~~OptimizedFirestoreDLsiteWorkData~~ | ~~Work~~ WorkDocument（完了） | 150+ | 高 |
| DLsiteRawApiResponse | DLsiteApiResponse | 20+ | 中 |
| UnifiedDataCollectionMetadata | CollectionMetadata | 30+ | 中 |
| FirestoreFieldTimestamp | Timestamp | 80+ | 高 |

### 優先度: 中

| 現在の名前 | 新しい名前 | 使用箇所数 | 影響度 |
|-----------|-----------|-----------|--------|
| OptimizedAudioButtonData | AudioButton | 40+ | 中 |
| FirestoreVideoDocument | Video | 35+ | 中 |
| DLsiteWorkEvaluationData | WorkEvaluation | 25+ | 低 |
| FirestoreUserDocument | User | 45+ | 中 |

### 優先度: 低

| 現在の名前 | 新しい名前 | 使用箇所数 | 影響度 |
|-----------|-----------|-----------|--------|
| PriceHistoryEntryData | PriceHistory | 15+ | 低 |
| CircleCreatorInfoData | CircleCreator | 20+ | 低 |
| VideoTagAssociationData | VideoTag | 10+ | 低 |

## V2サフィックスの扱い

### 移行期間中の一時的な命名規則
Entity/Value Object移行期間中は、新旧の実装を区別するために一時的に"V2"サフィックスを使用しています：

```typescript
// 移行期間中の命名
export class VideoV2 { ... }  // 新しいEntity実装
export class AudioButtonV2 { ... }  // 新しいEntity実装

// 最終的な命名（移行完了後）
export class Video { ... }  // V2サフィックスを削除
export class AudioButton { ... }  // V2サフィックスを削除
```

### V2サフィックス削除のタイミング
1. **Phase 6（PR #21）で実施**: 旧実装の削除と同時にV2サフィックスも削除
2. **削除方法**: 型エイリアスを使用した段階的移行
3. **影響範囲**: 全コードベースでの一括置換が必要

```typescript
// Stage 1: エイリアスで新名称を準備
export type Video = VideoV2;
export type AudioButton = AudioButtonV2;

// Stage 2: import文を新名称に更新
import { Video } from '@suzumina.click/shared-types';  // VideoV2ではなく

// Stage 3: V2実装を正式名称に変更、旧実装を削除
export class Video { ... }  // 旧VideoV2クラス
// 旧Videoクラスは削除済み
```

## 段階的移行戦略

### Stage 1: エイリアス導入（リスク: 最小）

#### 1.1 エイリアスファイルの作成
```typescript
// packages/shared-types/src/aliases/index.ts
// 新しい簡潔な名前をエイリアスとして定義

// エンティティ
// WorkDocumentは既に実装済み（OptimizedFirestoreDLsiteWorkDataから名称変更）
export type User = import('../entities/user').FirestoreUserDocument;
export type Video = import('../entities/video').FirestoreVideoDocument;
export type AudioButton = import('../entities/audio-button').OptimizedAudioButtonData;

// Value Objects
export type Timestamp = import('../utilities/common').FirestoreFieldTimestamp;

// API関連
export type DLsiteApiResponse = import('../api-schemas/dlsite-raw').DLsiteRawApiResponse;

// メタデータ
export type CollectionMetadata = import('../entities/collection-metadata').UnifiedDataCollectionMetadata;
```

#### 1.2 index.tsでの再エクスポート
```typescript
// packages/shared-types/src/index.ts
// 既存のエクスポートを維持しつつ、新しい名前も追加
export * from './aliases';

// 後方互換性のため既存のエクスポートも維持
export * from './entities/work';
export * from './entities/user';
// ...
```

### Stage 2: 新規コードでの使用（リスク: 低）

#### 2.1 インポートガイドライン
```typescript
// ❌ 旧: 冗長な名前
import { OptimizedFirestoreDLsiteWorkData } from '@suzumina.click/shared-types';

// ✅ 現在: WorkDocumentに統一
import { WorkDocument } from '@suzumina.click/shared-types';
```

#### 2.2 コーディング規約の更新
- 新規ファイルでは簡潔な型名を使用
- コードレビューで旧名称の使用を指摘
- VSCode snippetsの更新

### Stage 3: 既存コードの段階的更新（リスク: 中）

#### 3.1 更新順序
1. **ユニットテスト** → 影響範囲が限定的
2. **ユーティリティ関数** → 独立性が高い
3. **Reactコンポーネント** → UIへの影響を確認
4. **Server Actions** → APIの互換性確認
5. **Cloud Functions** → 最も慎重に

#### 3.2 自動置換スクリプト
```typescript
// scripts/migrate-type-names.ts
import { Project } from 'ts-morph';

const project = new Project({
  tsConfigFilePath: './tsconfig.json'
});

const replacements = [
  // { from: 'OptimizedFirestoreDLsiteWorkData', to: 'WorkDocument' }, // 完了済み
  { from: 'DLsiteRawApiResponse', to: 'DLsiteApiResponse' },
  // ... 他の置換
];

// ファイルごとに置換を実行
for (const sourceFile of project.getSourceFiles()) {
  let modified = false;
  
  for (const { from, to } of replacements) {
    const identifiers = sourceFile.getDescendantsOfKind(
      SyntaxKind.Identifier
    );
    
    for (const identifier of identifiers) {
      if (identifier.getText() === from) {
        identifier.replaceWithText(to);
        modified = true;
      }
    }
  }
  
  if (modified) {
    await sourceFile.save();
  }
}
```

### Stage 4: 旧名称の非推奨化（リスク: 低）

#### 4.1 非推奨マーク
```typescript
// packages/shared-types/src/entities/work.ts
/**
 * OptimizedFirestoreDLsiteWorkDataはWorkDocumentに名称変更済み (2025-07-26)
 * PR #125で完全移行完了
 */
```

#### 4.2 ESLintルールの追加
```javascript
// .eslintrc.js
module.exports = {
  rules: {
    'no-restricted-imports': [
      'error',
      {
        patterns: [
          {
            group: ['**/OptimizedFirestoreDLsiteWorkData'],
            message: 'Use Work instead of OptimizedFirestoreDLsiteWorkData'
          }
        ]
      }
    ]
  }
};
```

### Stage 5: 完全移行（リスク: 高）

#### 5.1 旧名称の削除
- すべての参照が新名称に更新されたことを確認
- 型定義ファイルから旧名称を削除
- import文の整理

#### 5.2 ドキュメント更新
- API仕様書の更新
- 型定義ドキュメントの更新
- 変更履歴の記録

## 移行時の注意事項

### 1. データベースとの整合性
```typescript
// Firestoreのコレクション名は変更済み
const COLLECTION_NAME = 'works'; // 'dlsiteWorks'から'works'に変更済み

// 型名のみ変更
type Work = { ... }; // 旧: OptimizedFirestoreDLsiteWorkData
```

### 2. APIレスポンスの互換性
```typescript
// APIレスポンスの型は内部的に変換
export async function fetchWork(id: string): Promise<Work> {
  const doc = await firestore
    .collection('works')
    .doc(id)
    .get();
  
  // 型名は変わってもデータ構造は同じ
  return doc.data() as Work;
}
```

### 3. シリアライゼーション
```typescript
// JSONシリアライゼーションには影響なし
const work: Work = { ... };
const json = JSON.stringify(work); // 変更なし
```

## テスト戦略

### 1. 型レベルテスト
```typescript
// packages/shared-types/src/__tests__/aliases.test.ts
import { Work } from '../aliases';
import { OptimizedFirestoreDLsiteWorkData } from '../entities/work';

// 型の等価性を確認
type AssertEqual<T, U> = T extends U ? (U extends T ? true : false) : false;
type TestWorkAlias = AssertEqual<Work, OptimizedFirestoreDLsiteWorkData>;
const _testWork: TestWorkAlias = true;
```

### 2. ランタイムテスト
```typescript
// 既存のテストがすべて合格することを確認
describe('Type alias migration', () => {
  it('should maintain backward compatibility', () => {
    const work: Work = createMockWork();
    expect(isValidWork(work)).toBe(true);
  });
});
```

### 3. E2Eテスト
- すべてのAPIエンドポイントのテスト
- UIコンポーネントの動作確認
- データベース操作の確認

## ロールバック計画

### 即時ロールバック（Stage 1-2）
```bash
# エイリアスファイルを削除
rm packages/shared-types/src/aliases/index.ts

# index.tsから再エクスポートを削除
git checkout packages/shared-types/src/index.ts
```

### 段階的ロールバック（Stage 3-4）
```bash
# 自動置換の逆操作
node scripts/rollback-type-names.ts

# コミットの revert
git revert <commit-hash>
```

## チェックリスト

### 移行前
- [ ] すべてのテストが合格
- [ ] TypeScript compilationエラーなし
- [ ] ドキュメントの準備完了
- [ ] チーム全体への周知

### 移行中
- [ ] Stage 1: エイリアス導入完了
- [ ] Stage 2: 新規コードでの使用開始
- [ ] Stage 3: 既存コードの50%更新
- [ ] Stage 3: 既存コードの100%更新
- [ ] Stage 4: 非推奨化の実施

### 移行後
- [ ] すべてのテストが合格
- [ ] パフォーマンステスト合格
- [ ] ドキュメント更新完了
- [ ] 変更ログの記録

## FAQ

### Q: なぜ今、命名規則を変更するのか？
A: Entity/Value Objectアーキテクチャの導入により、型の役割が明確になったため、冗長な名前が不要になりました。

### Q: 既存のコードは動作し続けるか？
A: はい。段階的移行により、既存のコードは影響を受けません。

### Q: パフォーマンスへの影響は？
A: 型名の変更はコンパイル時のみの変更で、ランタイムパフォーマンスには影響しません。

### Q: 移行期間はどのくらいか？
A: 完全移行まで約4-6週間を想定しています。

---

**作成日**: 2025年7月24日  
**バージョン**: 1.2  
**ステータス**: 部分的に完了  
**更新日**: 
- 2025年7月25日 - V2サフィックスの扱いについて追記
- 2025年7月26日 - OptimizedFirestoreDLsiteWorkData → WorkDocument移行完了