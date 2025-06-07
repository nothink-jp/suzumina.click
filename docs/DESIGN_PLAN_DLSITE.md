# DLsite作品データ取得機能 設計計画書

## 概要
[`30.json`](../30.json:1)のデータ構造分析結果をもとに、DLsite作品データ取得機能の詳細設計を策定します。既存の[`youtube.ts`](../apps/functions/src/youtube.ts:1)パターンを参考にし、[`@suzumina.click/shared-types`](../packages/shared-types:1)パッケージに型定義を配置する統合アーキテクチャを採用します。

## アーキテクチャ設計

### システム構成図
```mermaid
graph TB
    A[Pub/Sub Trigger] --> B[Cloud Function: fetchDLsiteWorks]
    B --> C[DLsite HTML Fetcher]
    C --> D[HTML Parser]
    D --> E[Data Mapper]
    E --> F[Data Validator]
    F --> G[Firestore Writer]
    G --> H[Metadata Manager]

    subgraph "Shared Types Package"
        ST1[@suzumina.click/shared-types]
        ST1 --> ST2[work.ts - DLsite作品型定義]
        ST1 --> ST3[video.ts - YouTube動画型定義]
        ST1 --> ST4[common.ts - 共通ユーティリティ]
    end

    subgraph "HTML Processing"
        C --> C1[cheerio HTMLパーサー]
        C1 --> C2[作品リスト抽出]
        C2 --> C3[個別作品データ抽出]
    end

    subgraph "Data Flow"
        D --> D1[HTMLから作品情報抽出]
        D1 --> D2[DLsiteWorkBaseSchema]
        E --> E1[Firestore保存形式変換]
        E1 --> E2[FirestoreDLsiteWorkSchema]
        F --> F1[型安全性検証]
        F1 --> F2[FrontendDLsiteWorkSchema]
    end

    ST2 -.-> E
    ST2 -.-> F
    ST2 -.-> G
```

## 型定義設計（@suzumina.click/shared-types）

### 1. 新規ファイル: `packages/shared-types/src/work.ts`

#### 基本スキーマ定義
```typescript
import { z } from "zod";

// 作品カテゴリ（HTMLから抽出される種別）
export const WorkCategorySchema = z.enum([
  "ADV",    // アドベンチャー
  "SOU",    // ボイス・ASMR
  "RPG",    // ロールプレイング
  "MOV",    // 動画
  "etc"
]);

// 価格情報
export const PriceInfoSchema = z.object({
  current: z.number().int().nonnegative(),
  original: z.number().int().nonnegative().optional(),
  currency: z.string().default("JPY"),
  discount: z.number().int().min(0).max(100).optional(), // 割引率(%)
});

// 評価情報
export const RatingInfoSchema = z.object({
  stars: z.number().min(0).max(5),
  count: z.number().int().nonnegative(),
  reviewCount: z.number().int().nonnegative().optional(),
});

// 基本的なDLsite作品データ
export const DLsiteWorkBaseSchema = z.object({
  id: z.string().min(1), // Firestore document ID
  productId: z.string().min(1), // RJ236867など
  title: z.string().min(1),
  circle: z.string(),
  author: z.string().optional(), // 声優名（涼花みなせなど）
  description: z.string().default(""),
  category: WorkCategorySchema,
  workUrl: z.string().url(),
  thumbnailUrl: z.string().url(),
  price: PriceInfoSchema,
  rating: RatingInfoSchema.optional(),
  salesCount: z.number().int().nonnegative().optional(),
  tags: z.array(z.string()).default([]),
});

// Firestore保存用スキーマ
export const FirestoreDLsiteWorkSchema = DLsiteWorkBaseSchema.extend({
  lastFetchedAt: z.string().datetime(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

// フロントエンド表示用スキーマ
export const FrontendDLsiteWorkSchema = FirestoreDLsiteWorkSchema.extend({
  displayPrice: z.string(), // "110円" など表示用
  discountText: z.string().optional(), // "50%OFF" など
  ratingText: z.string().optional(), // "★4.5 (148)" など
  relativeUrl: z.string(), // "/maniax/work/=/product_id/RJ236867.html"
});
```

#### 型抽出とヘルパー関数
```typescript
// 型の抽出
export type WorkCategory = z.infer<typeof WorkCategorySchema>;
export type PriceInfo = z.infer<typeof PriceInfoSchema>;
export type RatingInfo = z.infer<typeof RatingInfoSchema>;
export type DLsiteWorkBase = z.infer<typeof DLsiteWorkBaseSchema>;
export type FirestoreDLsiteWorkData = z.infer<typeof FirestoreDLsiteWorkSchema>;
export type FrontendDLsiteWorkData = z.infer<typeof FrontendDLsiteWorkSchema>;

// Firestoreデータをフロントエンド表示用に変換
export function convertToFrontendWork(
  data: FirestoreDLsiteWorkData
): FrontendDLsiteWorkData {
  const displayPrice = `${data.price.current}円`;
  const discountText = data.price.discount ? `${data.price.discount}%OFF` : undefined;
  const ratingText = data.rating 
    ? `★${data.rating.stars.toFixed(1)} (${data.rating.count})`
    : undefined;
  const relativeUrl = `/maniax/work/=/product_id/${data.productId}.html`;

  return FrontendDLsiteWorkSchema.parse({
    ...data,
    displayPrice,
    discountText,
    ratingText,
    relativeUrl,
  });
}
```

### 2. 更新: `packages/shared-types/src/index.ts`
```typescript
// 既存のエクスポートに追加
export * from "./work";
```

## Cloud Functions実装設計

### ファイル構成
```
apps/functions/src/
├── dlsite.ts                    # メイン関数（youtube.tsパターン）
├── utils/
│   ├── dlsite-fetcher.ts       # HTML取得
│   ├── dlsite-parser.ts        # HTMLパース・データ抽出
│   ├── dlsite-mapper.ts        # データ変換・マッピング
│   ├── dlsite-firestore.ts     # Firestore操作
│   ├── rate-limiter.ts         # レート制限
│   └── dlsite-validator.ts     # データ検証
```

### 1. メイン関数: `apps/functions/src/dlsite.ts`
```typescript
import type { CloudEvent } from "@google-cloud/functions-framework";
import { 
  type FirestoreDLsiteWorkData,
  type DLsiteWorkBase 
} from "@suzumina.click/shared-types";
import firestore, { Timestamp } from "./utils/firestore";
import * as logger from "./utils/logger";

// メタデータ管理（YouTubeパターンを踏襲）
interface FetchMetadata {
  lastFetchedAt: Timestamp;
  nextPageToken?: string;
  isInProgress: boolean;
  lastError?: string;
  targetAuthor: string; // "涼花みなせ"
}

export const fetchDLsiteWorks = async (
  event: CloudEvent<PubsubMessage>
): Promise<void> => {
  // youtube.tsと同様の構造で実装
};
```

### 2. HTMLパーサー: `apps/functions/src/utils/dlsite-parser.ts`
```typescript
import * as cheerio from "cheerio";
import { type DLsiteWorkBase, WorkCategorySchema } from "@suzumina.click/shared-types";

export interface ParsedWorkData {
  productId: string;
  title: string;
  circle: string;
  author?: string;
  // ... 他のフィールド
}

export function parseWorksFromHTML(html: string): ParsedWorkData[] {
  const $ = cheerio.load(html);
  const works: ParsedWorkData[] = [];
  
  // 作品リスト抽出
  $('li[data-list_item_product_id]').each((_, element) => {
    const $item = $(element);
    const productId = $item.attr('data-list_item_product_id');
    
    if (!productId) return;
    
    const work: ParsedWorkData = {
      productId,
      title: $item.find('.work_name a').attr('title') || '',
      circle: $item.find('.maker_name a').first().text().trim(),
      author: $item.find('.author a').text().trim() || undefined,
      // 価格情報の抽出
      // 評価情報の抽出
      // カテゴリ情報の抽出
    };
    
    works.push(work);
  });
  
  return works;
}
```

### 3. データマッパー: `apps/functions/src/utils/dlsite-mapper.ts`
```typescript
import { 
  type DLsiteWorkBase, 
  type FirestoreDLsiteWorkData,
  DLsiteWorkBaseSchema 
} from "@suzumina.click/shared-types";
import type { ParsedWorkData } from "./dlsite-parser";

export function mapToWorkBase(parsed: ParsedWorkData): DLsiteWorkBase {
  const mapped = {
    id: parsed.productId, // FirestoreドキュメントIDとして使用
    productId: parsed.productId,
    title: parsed.title,
    circle: parsed.circle,
    author: parsed.author,
    // ... データ変換ロジック
  };
  
  return DLsiteWorkBaseSchema.parse(mapped);
}

export function mapToFirestoreData(
  base: DLsiteWorkBase
): FirestoreDLsiteWorkData {
  const now = new Date().toISOString();
  
  return {
    ...base,
    lastFetchedAt: now,
    createdAt: now,
    updatedAt: now,
  };
}
```

## 実装フェーズ

### Phase 1: 型定義とHTMLパース基盤
1. **`packages/shared-types/src/work.ts`** 作成
2. **HTMLパーサー基盤**（`dlsite-parser.ts`）実装
3. **[`30.json`](../30.json:1)を使用した単体テスト**作成

### Phase 2: Cloud Functions基本機能
1. **HTMLフェッチャー**（`dlsite-fetcher.ts`）実装
2. **データマッパー**（`dlsite-mapper.ts`）実装
3. **基本的なCloud Function**（`dlsite.ts`）実装

### Phase 3: 高度な機能
1. **メタデータ管理**（YouTubeパターン踏襲）
2. **レート制限とエラーハンドリング**
3. **Firestore統合**

### Phase 4: 統合とテスト
1. **既存システムとの統合**
2. **End-to-Endテスト**
3. **パフォーマンス最適化**

## 技術的決定事項

### HTMLパーサーライブラリ
- **選択**: `cheerio`
- **理由**: 軽量、jQuery様のAPI、サーバーサイド最適化

### データ抽出戦略
- **CSS セレクター使用**: `li[data-list_item_product_id]`、`.author a`
- **フォールバック機能**: HTML構造変更への対応
- **データ検証**: Zodスキーマによる型安全性確保

### エラーハンドリング
- **HTML構造変更検知**: 予期されるセレクターの存在確認
- **レート制限対応**: 429エラー時の自動リトライ
- **部分的失敗許容**: 一部作品の取得失敗時も続行

## メタデータ管理設計

### Firestoreコレクション構造
```
/dlsiteMetadata
  /fetch_metadata
    - lastFetchedAt: Timestamp
    - nextPageToken: string?
    - isInProgress: boolean
    - targetAuthor: "涼花みなせ"
    - lastError: string?

/dlsiteWorks
  /{productId}  # RJ236867など
    - (FirestoreDLsiteWorkDataのフィールド)
```

### ページネーション対応
- **DLsite検索APIのページング機能活用**
- **増分更新**: 新規作品のみ取得するロジック
- **完全更新**: 定期的な全作品再取得

## 次のステップ

この設計計画の承認後、以下の順序で実装を開始します：

1. **`packages/shared-types/src/work.ts`** の作成
2. **[`30.json`](../30.json:1)を使用したHTMLパーサーのプロトタイプ**
3. **基本的なCloud Function構造の実装**
