# 関数型移行チェックリスト

## 移行対象一覧と進捗

### ✅ Phase 0: 完了済み
- [x] Work Entity → WorkData
- [x] WorkPlainObject → WorkData（統合）
- [x] Firestore Transformer実装

### 🚀 Phase 1: Entity移行（優先度：最高）

#### Video Entity (1,355行)
- [ ] VideoData型定義
- [ ] VideoActions実装
- [ ] video-transformer.ts作成
- [ ] apps/webでの使用箇所移行 (8ファイル)
- [ ] テスト修正
- [ ] Video Entityクラス削除

#### AudioButton Entity (625行)
- [ ] AudioButtonData型定義
- [ ] AudioButtonActions実装
- [ ] audio-button-transformer.ts作成
- [ ] apps/webでの使用箇所移行 (5ファイル)
- [ ] テスト修正
- [ ] AudioButton Entityクラス削除

### 📦 Phase 2: Value Objects移行（優先度：高）

#### Video Value Objects (2,488行)
- [ ] Channel (338行) → 関数化
- [ ] VideoContent (639行) → プレーンオブジェクト化
- [ ] VideoMetadata (297行) → ユーティリティ関数化
- [ ] VideoStatistics (407行) → プレーンオブジェクト化

#### Audio Button Value Objects (1,212行)
- [ ] AudioContent (444行) → プレーンオブジェクト化
- [ ] AudioReference (356行) → ユーティリティ関数化
- [ ] ButtonStatistics (412行) → プレーンオブジェクト化

### 🔧 Phase 3: Work Value Objects移行（優先度：中）

#### Work関連Value Objects (3,200行)
- [ ] WorkTitle (343行) → ユーティリティ関数化
- [ ] WorkPrice (234行) → PriceUtils
- [ ] WorkRating (265行) → RatingUtils
- [ ] WorkCreators (425行) → プレーンオブジェクト化
- [ ] WorkId (226行) → バリデーション関数化
- [ ] Circle (242行) → プレーンオブジェクト化
- [ ] その他の小規模Value Objects

### 📋 Phase 4: その他のEntity/Types

#### 単純なEntity（優先度：低）
- [ ] User → UserData
- [ ] Contact → ContactData
- [ ] Favorite → FavoriteData
- [ ] WorkEvaluation → WorkEvaluationData
- [ ] UserEvaluation → UserEvaluationData

### 🏁 Phase 5: 最終統合

- [ ] BaseEntityクラスの削除
- [ ] ValueObject基底クラスの削除
- [ ] 不要なディレクトリの削除
- [ ] index.tsのエクスポート整理
- [ ] ドキュメント更新

## 移行時の注意事項

### ✅ DO
- PlainObjectを使用（RSC対応）
- 純粋関数でビジネスロジック実装
- イミュータビリティを保持
- 既存APIとの後方互換性維持

### ❌ DON'T
- クラスインスタンスの作成
- thisキーワードの使用
- 副作用のある関数
- 破壊的変更

## 各移行のテンプレート

```typescript
// 1. データ型定義 (models/xxx-data.ts)
export interface XxxData {
  readonly id: string;
  readonly field1: string;
  readonly field2?: number;
}

// 2. アクション関数 (actions/xxx-actions.ts)
export const XxxActions = {
  update: (data: XxxData, updates: Partial<XxxData>): XxxData => ({
    ...data,
    ...updates
  }),
  
  validate: (data: XxxData): boolean => {
    return data.id.length > 0;
  }
};

// 3. 変換関数 (transformers/xxx-transformer.ts)
export const fromFirestore = (doc: FirestoreDoc): XxxData => ({
  id: doc.id,
  field1: doc.field1,
  field2: doc.field2
});

export const toFirestore = (data: XxxData): FirestoreDoc => ({
  id: data.id,
  field1: data.field1,
  field2: data.field2
});
```

## 進捗トラッキング

| カテゴリ | 総数 | 完了 | 進捗率 |
|---------|------|------|--------|
| Entity | 5 | 1 | 20% |
| Value Objects | 40+ | 0 | 0% |
| テスト | - | - | - |
| ドキュメント | 5 | 2 | 40% |

## 完了予定日

- Phase 1: 2025-08-25
- Phase 2: 2025-09-01
- Phase 3: 2025-09-08
- Phase 4: 2025-09-12
- Phase 5: 2025-09-15

**目標完了日: 2025年9月15日**