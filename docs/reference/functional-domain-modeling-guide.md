# 関数型ドメインモデリングガイド

## 概要

suzumina.clickプロジェクトにおける関数型プログラミングパターンの実装ガイド。

## 基本原則

1. **データと振る舞いの分離**: PlainObject + Actions パターン
2. **イミュータビリティ**: すべてのデータ構造は不変
3. **純粋関数**: 副作用のない予測可能な関数
4. **RSC互換性**: シリアライズ可能なデータ構造のみ使用

## ディレクトリ構造

```
packages/shared-types/src/
├── models/        # イミュータブルなデータ型定義
├── actions/       # ピュア関数によるビジネスロジック
├── transformers/  # データ変換ロジック
└── utils/         # ユーティリティ関数
```

## 実装パターン

### データモデル (models/)

```typescript
// WorkData - イミュータブルなPlainObject
export interface WorkData {
  readonly id: string;
  readonly title: string;
  readonly price: PriceData;
  // ...
}
```

### アクション関数 (actions/)

```typescript
// WorkActions - ピュア関数のコレクション
export const WorkActions = {
  updateTitle: (work: WorkData, title: string): WorkData => ({
    ...work,
    title
  }),
  
  applyDiscount: (work: WorkData, rate: number): WorkData => ({
    ...work,
    price: {
      ...work.price,
      current: work.price.current * (1 - rate)
    }
  })
};
```

### トランスフォーマー (transformers/)

```typescript
// データソース間の変換
export const fromFirestore = (doc: FirestoreWorkDocument): WorkData | null => {
  // Firestore形式から内部モデルへ変換
};

export const toFirestore = (work: WorkData): FirestoreWorkDocument => {
  // 内部モデルからFirestore形式へ変換
};
```

## 移行時の注意点

1. **後方互換性**: `convertToWorkPlainObject`などの既存APIは維持
2. **段階的移行**: 新機能から関数型パターンを適用
3. **テスト**: すべての変更に対してテストを追加

## 参考資料

- [ADR-003: 関数型ドメインモデリングの採用](../decisions/architecture/ADR-003-functional-domain-modeling-adoption.md)
- [エンティティ実装ガイド](./entity-implementation-guide.md)