# Entity・Value Object アーキテクチャ解説書

## 概要

suzumina.clickプロジェクトで採用したEntity・Value Objectアーキテクチャの設計思想と実装詳細を記録した技術ドキュメント。

## アーキテクチャの設計思想

### Domain-Driven Design (DDD) の採用

本プロジェクトではDDDの以下の概念を採用：

1. **Entity（エンティティ）**
   - 識別子を持つドメインオブジェクト
   - ライフサイクルを持ち、時間とともに状態が変化
   - 例：Work（作品）、User（ユーザー）

2. **Value Object（値オブジェクト）**
   - 識別子を持たない不変のオブジェクト
   - 概念的な整合性を保つための集約
   - 例：Price（価格）、Rating（評価）、DateRange（日付範囲）

3. **Domain Service（ドメインサービス）**
   - エンティティやValue Objectに属さないビジネスロジック
   - 複数のエンティティにまたがる処理
   - 例：PriceCalculator、WorkAggregator

## 実装構造

### ディレクトリ構成

```
packages/shared-types/src/
├── entities/           # エンティティ定義
│   ├── work.ts
│   ├── user.ts
│   └── ...
├── value-objects/      # Value Object定義
│   ├── price.ts
│   ├── rating.ts
│   ├── date-range.ts
│   └── ...
├── api-schemas/        # API レスポンススキーマ
│   └── dlsite-raw.ts
└── utilities/          # ユーティリティ関数

apps/functions/src/services/
├── mappers/           # マッピング層（薄い抽象化）
│   └── work-mapper.ts
└── domain/            # ドメインサービス
    ├── price-calculator.ts
    └── work-aggregator.ts
```

### Value Objectの実装パターン

```typescript
import { z } from "zod";

// 1. スキーマ定義
export const Price = z
  .object({
    current: z.number().min(0),
    currency: z.string().length(3),
    original: z.number().optional(),
    discount: z.number().min(0).max(100).optional(),
  })
  .transform((data) => ({
    // 2. データプロパティ
    ...data,
    
    // 3. ビジネスロジック（メソッド）
    hasDiscount: () => 
      data.discount !== undefined && data.discount > 0,
    
    isExpensive: () => 
      data.current > 2000,
    
    formatWithCurrency: () => 
      `${data.currency} ${data.current.toLocaleString()}`,
    
    // 4. 等価性判定
    equals: (other: unknown): boolean => {
      if (!isPriceType(other)) return false;
      return data.current === other.current && 
             data.currency === other.currency;
    },
  }));

export type Price = z.infer<typeof Price>;
```

### Mapperの実装（薄い抽象化）

```typescript
export class WorkMapper {
  /**
   * APIレスポンスからエンティティへの変換
   * ビジネスロジックは含まない（薄いマッピング層）
   */
  static toWork(raw: DLsiteRawApiResponse): Work {
    return {
      // 基本的なマッピング
      id: raw.product_id,
      title: raw.work_name,
      
      // Value Objectの生成
      price: WorkMapper.toPrice(raw),
      rating: WorkMapper.toRating(raw),
      
      // ネストしたマッピング
      voiceActors: WorkMapper.extractVoiceActors(raw),
    };
  }
  
  private static toPrice(raw: DLsiteRawApiResponse): Price {
    return Price.parse({
      current: raw.price ?? 0,
      currency: "JPY",
      original: raw.official_price,
      discount: raw.discount_rate,
    });
  }
}
```

## ベストプラクティス

### 1. Value Objectの設計原則

#### 不変性の保証
```typescript
// ❌ 悪い例：直接変更可能
price.current = 1000;

// ✅ 良い例：新しいインスタンスを返す
const newPrice = Price.create({
  ...price,
  current: 1000,
});
```

#### 適切な粒度
```typescript
// ❌ 悪い例：粒度が大きすぎる
const WorkDetails = z.object({
  price: z.number(),
  rating: z.number(),
  voiceActors: z.array(z.string()),
  // ... 20個以上のフィールド
});

// ✅ 良い例：概念ごとに分離
const Price = z.object({ /* ... */ });
const Rating = z.object({ /* ... */ });
const CreatorInfo = z.object({ /* ... */ });
```

### 2. ビジネスロジックの配置

#### Value Objectに配置すべきロジック
- 自身のデータに関する計算・判定
- フォーマット処理
- バリデーション
- 等価性判定

#### Domain Serviceに配置すべきロジック
- 複数のエンティティにまたがる処理
- 外部サービスとの連携
- 複雑な集計処理

### 3. 型安全性の確保

#### 入力検証の徹底
```typescript
equals: (other: unknown): boolean => {
  // 1. null/undefined チェック
  if (!other) return false;
  
  // 2. 型ガード
  if (!isPriceType(other)) return false;
  
  // 3. 安全な比較
  return data.current === other.current;
},
```

#### ヘルパー関数の活用
```typescript
// 認知的複雑度を下げるためのヘルパー
function isPriceType(value: unknown): value is PriceInfo {
  if (!value || typeof value !== "object") return false;
  const o = value as Record<string, unknown>;
  return typeof o.amount === "number" && 
         typeof o.currency === "string";
}
```

## 移行の成果

### 技術的メリット

1. **型安全性の向上**
   - コンパイル時エラーの早期発見
   - ランタイムエラーの削減

2. **保守性の向上**
   - ビジネスロジックの明確な配置
   - テストの書きやすさ向上

3. **パフォーマンスへの影響**
   - メモリ使用量：変化なし
   - レスポンスタイム：変化なし（0.3-0.4秒維持）

### 削除されたレガシー要素

1. **レガシーフィールド（6,012個）**
   - totalDownloadCount
   - bonusContent
   - isExclusive
   - apiGenres
   - apiCustomGenres
   - apiWorkOptions
   - wishlistCount

2. **旧マッパーファイル（4ファイル）**
   - dlsite-api-mapper.ts
   - dlsite-api-mapper-v2.ts
   - individual-info-to-work-mapper.ts
   - individual-info-to-work-mapper-v2.ts

## 今後の展望

1. **他のコレクションへの適用**
   - audioButtons
   - videos
   - users

2. **ドメインモデルの深化**
   - より詳細なValue Object定義
   - ビジネスルールの明確化

3. **パフォーマンス最適化**
   - Value Objectのメモリ効率改善
   - 遅延評価の活用

---

**作成日**: 2025年7月24日  
**最終更新**: 2025年7月24日  
**ステータス**: 移行完了