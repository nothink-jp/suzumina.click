# DLsiteスクレイピング拡張による負荷影響分析

## 📊 現在の負荷状況（Before）

### 実行パターン
- **実行頻度**: 1時間に1回（Cloud Scheduler）
- **処理ページ数**: 1ページ/実行（MAX_PAGES_PER_EXECUTION = 1）
- **作品数**: 最大100作品/実行（ITEMS_PER_PAGE = 100）

### リクエスト詳細
```
1実行あたりのリクエスト:
├── DLsite検索ページ: 1リクエスト
│   └── URL: dlsite.com/maniax/fsr/.../page/N
├── DLsite Info API: 最大100リクエスト
│   └── URL: dlsite.com/maniax/api/=/product.json?workno={ID}
└── 総リクエスト: 101リクエスト/時間
```

### レート制限
- **検索ページ間**: 1000ms間隔
- **Info API間**: 100ms間隔
- **実行時間**: 約2-3分/実行

## 🚀 拡張後の負荷変化（After）

### 新規追加されるスクレイピング

#### 1. 作品詳細ページスクレイピング
```typescript
// 新規追加: 詳細ページから収録内容・ファイル情報を取得
URL: https://www.dlsite.com/maniax/work/=/product_id/{PRODUCT_ID}.html
対象: 新規作品のみ（既存作品は詳細データがあるのでスキップ）
```

**取得する新データ**:
- 収録内容（トラック情報・再生時間）
- ファイル情報（サイズ・形式・総再生時間）
- 詳細クリエイター情報（CV・シナリオ・イラスト・音楽）
- 特典情報
- より詳細な作品説明

#### 2. 実装される負荷軽減策

**a) 既存作品スキップ**
```typescript
// 詳細データが既に存在する作品はスキップ
if (existingWork.trackInfo && existingWork.fileInfo && existingWork.detailedCreators) {
    logger.debug(`作品 ${productId}: 詳細データ済み、スキップ`);
    continue;
}
```

**b) 段階的実装**
```typescript
// Phase 1: 新規作品のみ詳細スクレイピング
// Phase 2: 既存作品の段階的バックフィル（低頻度）
// Phase 3: 定期更新（月1回程度）
```

## 📈 負荷増加の定量分析

### リクエスト数の変化

#### 初回実装時（新規作品のみ）
```
現在: 101リクエスト/時間
拡張後: 101 + N リクエスト/時間
├── 既存: 検索1 + API100 = 101
└── 新規: 詳細ページN件（Nは新規作品数）

N = 通常0-5件/日（新作公開頻度）
※ 涼花みなせ関連作品の新作頻度は月2-3件程度
```

#### バックフィル期間（既存作品の一括処理）
```
対象: 既存約200作品（推定）
期間: 1-2週間で段階的実行
追加: 10-20リクエスト/時間

総リクエスト: 101 + 20 = 121リクエスト/時間（一時的）
```

#### 定常運用時
```
新規作品のみ: 月平均3作品 × 1リクエスト = 3リクエスト/月
時間平均: +0.004リクエスト/時間（無視できるレベル）

実質的な負荷増加: ほぼ0%
```

### 実行時間の変化

#### 現在の実行時間
```
検索ページ取得: 2-3秒
Info API (100件): 100 × 0.1秒 + 通信 = 約15-20秒
合計: 約20-25秒/実行
```

#### 拡張後の実行時間
```
新規作品詳細ページ（0-5件）: 5 × 2秒 = 最大10秒追加
レート制限: 500ms間隔を追加

定常時合計: 約25-30秒/実行（20%増加）
バックフィル時: 約45-60秒/実行（2倍、一時的）
```

## 🛡️ DLsiteへの配慮・負荷軽減措置

### 1. レート制限の強化
```typescript
// 現在: Info API間100ms
// 拡張後: 詳細ページ間500ms（より保守的）

const DETAIL_PAGE_RATE_LIMIT = 500; // ms
const MAX_DETAIL_PAGES_PER_EXECUTION = 10; // 1実行あたり最大10件
```

### 2. 実行頻度の調整
```typescript
// 詳細ページ取得の頻度制御
const DETAIL_SCRAPING_INTERVAL = {
  newWorks: 'immediate',      // 新規作品: 即座
  backfill: 'hourly',         // バックフィル: 1時間毎10件
  maintenance: 'monthly'      // 定期更新: 月1回
};
```

### 3. 負荷分散
```typescript
// 時間帯による分散
const DETAIL_SCRAPING_SCHEDULE = {
  newWorks: '常時（低負荷）',
  backfill: '深夜帯（2-6時）',  // アクセス少ない時間
  maintenance: '月初深夜'
};
```

### 4. エラーハンドリング・Graceful Degradation
```typescript
// DLsiteがエラーを返した場合の対応
try {
  const detailData = await fetchWorkDetailPage(productId);
  work.trackInfo = parseTrackInfo(detailData);
} catch (error) {
  logger.warn(`詳細データ取得失敗: ${productId}, 基本データのみで継続`);
  // 基本データで継続、詳細データは後回し
}
```

## 📊 負荷影響サマリー

### DLsiteサーバーへの影響
```
定常時負荷増加: +0.004%（実質0%）
バックフィル時: +20%（1-2週間の一時的）
実行時間: +20%（25秒→30秒）

リクエスト間隔: 100ms → 500ms（より安全）
実行パターン: 既存の低負荷スケジュール維持
```

### 実装リスク評価
```
🟢 定常運用: 非常に低リスク
🟡 バックフィル: 低-中リスク（期間限定）
🟢 サーバー負荷: 許容範囲内
🟢 ブロック可能性: 極めて低い
```

### 推奨実装ステップ
```
Phase 1: 新規作品のみ詳細取得（即座実装可）
Phase 2: 既存作品バックフィル（段階的、深夜実行）
Phase 3: 定期メンテナンス（月1回更新）
```

## 🔍 モニタリング計画

### 実装時の監視項目
1. **DLsiteエラー率**: 5%以下維持
2. **実行時間**: 60秒以下維持
3. **スキップ率**: 新規作品スキップ0%
4. **成功率**: 詳細データ取得95%以上

### アラート設定
```typescript
// エラー率監視
if (errorRate > 0.05) {
  await pauseDetailScraping();
  await notifyAdministrator();
}

// 実行時間監視  
if (executionTime > 60000) {
  await reduceDetailRequestCount();
}
```

この分析により、DLsiteスクレイピング拡張は**定常時ほぼ負荷増加なし**で実現できることが確認できます。