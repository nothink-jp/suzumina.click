# 価格履歴システム再設計実装計画
実施日: 2025-07-28

## 背景
- 現在のシステムは`locale_price`（セール価格）のみ保存し、`locale_official_price`（定価）を保存していない
- ロケールコード（en_US）で保存されているが、フロントエンドは通貨コード（USD）で検索している
- 日本の割引率を全通貨に適用しており、正確な国際価格情報が表示されていない

## 新スキーマ設計

### Firestoreドキュメント構造
```typescript
{
  // 基本情報
  workId: string,           // "RJ01424777"
  date: string,             // "2025-07-28" (YYYY-MM-DD)
  capturedAt: string,       // "2025-07-28T11:17:27.830Z" (ISO 8601)
  
  // 日本円価格（APIから直接マッピング）
  price: number,            // 792 (セール価格)
  officialPrice: number,    // 1320 (定価)
  
  // 国際価格（APIから直接マッピング）
  localePrice: {            // locale_price をそのまま保存
    "en_US": number,
    "de_DE": number,
    "zh_CN": number,
    "ko_KR": number,
    // ... 他のロケール
  },
  localeOfficialPrice: {    // locale_official_price をそのまま保存
    "en_US": number,
    "de_DE": number,
    "zh_CN": number,
    "ko_KR": number,
    // ... 他のロケール
  },
  
  // 割引情報
  discountRate: number,     // 40 (%)
  campaignId?: number       // 241
}
```

## 実装手順

### フェーズ1: データ削除とスキーマ更新（優先度: 高）

1. **既存価格履歴データの削除**
   - 全作品の priceHistory サブコレクションを削除
   - バックアップは不要（誤ったデータのため）

2. **型定義の更新**
   - `packages/shared-types/src/utilities/price-history.ts`
   - 新スキーマに合わせて`PriceHistoryDocument`を更新

3. **Cloud Functions更新**
   - `apps/functions/src/services/price-history/price-history-saver.ts`
   - APIレスポンスから新スキーマへの変換ロジック実装

### フェーズ2: フロントエンド対応（優先度: 中）

4. **通貨変換ロジックの更新**
   - 通貨コード → ロケールコードのマッピング削除
   - 日本円も含めた統一的な価格取得ロジック実装
   
5. **影響範囲の修正**
   - `price-history-chart.tsx`
   - `price-statistics.tsx` 
   - `price-history-utils.ts`

### フェーズ3: 検証とクリーンアップ（優先度: 低）

6. **動作確認**
   - 新データ収集の確認
   - 各通貨での価格表示確認
   - 割引率の正確性確認

7. **不要コードの削除**
   - 変動検出フラグ関連コード
   - メタデータ関連コード

## 移行時の注意事項

- **データ削除タイミング**: Cloud Functions更新の直前に実施
- **ダウンタイム**: 価格履歴表示が一時的に空になる（新データ収集まで）
- **ロールバック**: 型定義の変更のみ元に戻せば可能

## 成功基準

- [ ] Individual Info APIから取得した全通貨の価格が正しく保存される
- [ ] フロントエンドで通貨切り替え時に正しい価格が表示される
- [ ] 各通貨の正確な割引率が計算・表示される
- [ ] 日本円も他通貨と同じ方法で処理される

## 今後の拡張性

- Entity化は将来の課題として保留
- 価格変動通知機能などは新スキーマで実装可能
- 地域別価格戦略分析も可能に