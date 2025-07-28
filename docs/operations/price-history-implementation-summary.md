# 価格履歴システム実装サマリー

## 実装日: 2025-07-28

## 概要
DLsite作品の国際価格履歴システムを再設計・実装しました。従来は日本円のセール価格（locale_price）のみを保存していましたが、Individual Info APIの仕様を正しく理解し、セール価格と通常価格の両方を全通貨で保存するように改善しました。

## 主な変更点

### 1. スキーマ設計の改善
- **旧スキーマ**: 日本円価格と国際価格を混在させ、計算フィールドやメタデータを含む複雑な構造
- **新スキーマ**: APIレスポンスを直接マッピングするシンプルな構造

```typescript
// 新しいスキーマ
{
  workId: string,
  date: string,
  capturedAt: string,
  
  // 日本円価格（APIから直接）
  price: number,           // セール価格または通常価格
  officialPrice: number,   // 通常価格
  
  // 国際価格（APIから直接）
  localePrice: Record<string, number>,        // 各地域のセール価格
  localeOfficialPrice: Record<string, number>, // 各地域の通常価格
  
  // 割引情報
  discountRate: number,
  campaignId?: number
}
```

### 2. API仕様の正しい理解
Individual Info APIのレスポンス構造:
- `price` / `official_price`: 日本円の価格
- `locale_price` / `locale_official_price`: 国際価格（JPYは含まない）
- 地域コード例: `en_US` (USD), `de_DE` (EUR), `zh_CN` (CNY)

### 3. データ移行
- 既存の価格履歴データ13,194件（1,506作品分）を全て削除
- 新スキーマで再収集開始

### 4. 実装ファイル

#### 型定義
- `packages/shared-types/src/utilities/price-history.ts`
  - `PriceHistoryDocumentSchema`を簡素化
  - 不要なフィールド（priceChanged, newCampaign, metadata）を削除

#### Cloud Functions
- `apps/functions/src/services/price-history/price-history-saver.ts`
  - APIレスポンスを直接マッピング
  - locale_priceの配列/オブジェクト両対応
- 削除: `price-change-detector.ts`（価格変更検出は不要と判断）

#### フロントエンド
- `apps/web/src/components/price-history/price-history-chart.tsx`
  - 通貨コード→ロケールコードマッピング追加
  - 日本円と国際通貨の統一的な処理
- `apps/web/src/components/price-history/price-statistics.tsx`
  - 新スキーマ対応の統計計算
- `apps/web/src/lib/price-history-utils.ts`
  - 価格変更回数の動的計算

### 5. 技術的な改善点
1. **通貨マッピング**: フロントエンドの通貨コード（USD）とFirestoreのロケールコード（en_US）の変換
2. **型安全性**: 全ての価格アクセスでundefinedチェック
3. **パフォーマンス**: 不要な計算フィールドを削除してデータサイズ削減

### 6. 今後の課題
- Entity化は見送り（現在のシンプルな構造で十分）
- 価格履歴データの再収集完了待ち
- 国際価格の正確性検証（日本国内からは確認困難）

## 関連ドキュメント
- 削除済み: `docs/price-history-implementation-plan.md`
- 削除済み: `docs/price-history-schema-design.md`