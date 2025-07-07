# DLsite既存作品詳細情報更新システム 設計ドキュメント

## 📋 概要

既存作品の詳細情報を定期的に再取得しつつ、DLsiteサーバーへの負荷を最小限に抑える更新システムの設計書。

---

## 🎯 設計目標

### 主要目標
- **データ鮮度の向上**: 既存作品の詳細情報を定期的に更新
- **負荷最小化**: DLsiteサーバーへの負荷を可能な限り軽減
- **効率性**: 重要な変更を優先的に検出・更新
- **安定性**: 既存の新規作品取得処理に影響を与えない

### 制約条件
- 1回の実行での詳細取得は最大2-5作品まで
- 詳細ページアクセス間隔は最低500ms
- 既存の4時間間隔スケジュール実行を維持

---

## 🏗️ システム設計

### アーキテクチャ概要

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   新規作品処理   │    │  既存作品選別    │    │  詳細情報更新    │
│                │    │                │    │                │
│ ・完全詳細取得   │    │ ・更新優先度計算  │    │ ・差分検出      │
│ ・即座実行      │    │ ・ローテーション  │    │ ・段階的更新     │
└─────────────────┘    └─────────────────┘    └─────────────────┘
          │                       │                       │
          └───────────────────────┼───────────────────────┘
                                 │
                    ┌─────────────────┐
                    │  負荷制御システム  │
                    │                │
                    │ ・時間帯考慮     │
                    │ ・レート制限     │
                    │ ・エラー処理     │
                    └─────────────────┘
```

### コンポーネント設計

#### 1. **更新選別エンジン** (`WorkUpdateSelector`)
```typescript
interface WorkUpdateSelector {
  selectWorksForUpdate(
    existingWorks: OptimizedFirestoreDLsiteWorkData[],
    config: UpdateConfig
  ): Promise<WorkUpdatePlan>;
}

interface UpdateConfig {
  maxUpdatesPerRun: number;      // 1回の実行での最大更新数
  rotationCycleDays: number;     // 全作品をカバーする周期（日数）
  forceUpdateAfterDays: number;  // 強制更新までの日数
  priorityThreshold: number;     // 優先更新のしきい値
  timeBasedQuota: boolean;       // 時間帯による更新数調整
}

interface WorkUpdatePlan {
  forceUpdates: WorkUpdateItem[];    // 強制更新対象
  priorityUpdates: WorkUpdateItem[]; // 優先更新対象
  rotationUpdates: WorkUpdateItem[]; // ローテーション更新対象
  totalQuota: number;               // 今回の更新可能数
}
```

#### 2. **優先度計算エンジン** (`PriorityCalculator`)
```typescript
interface PriorityCalculator {
  calculatePriority(work: OptimizedFirestoreDLsiteWorkData): number;
}

// 優先度計算ファクター
interface PriorityFactors {
  salesPopularity: number;    // 販売数による重み (0-50点)
  ratingActivity: number;     // 評価数による重み (0-30点)
  recency: number;           // 新しさによる重み (0-20点)
  lastUpdateAge: number;     // 最終更新からの経過時間 (0-30点)
  categoryImportance: number; // カテゴリ重要度 (0-10点)
}
```

#### 3. **差分検出システム** (`ChangeDetector`)
```typescript
interface ChangeDetector {
  detectChanges(work: OptimizedFirestoreDLsiteWorkData): Promise<ChangeDetectionResult>;
}

interface ChangeDetectionResult {
  hasSignificantChanges: boolean;
  detectedChanges: ChangeType[];
  confidence: number; // 変更検出の信頼度
}

enum ChangeType {
  SALES_COUNT_CHANGE = "sales_count",
  RATING_CHANGE = "rating",
  PRICE_CHANGE = "price",
  CONTENT_CHANGE = "content"
}
```

#### 4. **負荷制御システム** (`LoadController`)
```typescript
interface LoadController {
  getUpdateQuota(currentTime: Date): number;
  shouldSkipUpdate(consecutiveErrors: number): boolean;
  calculateDelay(lastRequestTime: Date): number;
}

interface LoadControlConfig {
  baseDelay: number;              // 基本遅延時間 (ms)
  timeBasedMultipliers: {         // 時間帯別倍率
    nightTime: number;    // 深夜 (02:00-06:00)
    daytime: number;      // 昼間 (10:00-16:00) 
    other: number;        // その他時間帯
  };
  errorBackoffConfig: {
    maxRetries: number;
    backoffMultiplier: number;
  };
}
```

---

## 🔄 更新戦略

### 1. **ハイブリッド更新方式**

#### Phase 1: 強制更新
```typescript
// 条件: 最終更新から30日以上経過
const forceUpdateCandidates = works.filter(work => {
  const daysSinceUpdate = getDaysSinceLastUpdate(work);
  return daysSinceUpdate > config.forceUpdateAfterDays;
});
```

#### Phase 2: 優先度ベース更新
```typescript
// 条件: 高優先度 + 差分検出
const priorityUpdates = await Promise.all(
  highPriorityWorks.map(async work => ({
    work,
    hasChanges: await changeDetector.detectChanges(work)
  }))
).then(results => 
  results.filter(r => r.hasChanges).map(r => r.work)
);
```

#### Phase 3: ローテーション更新
```typescript
// 条件: 14日サイクルでの順次更新
const rotationSegment = getCurrentRotationSegment(config.rotationCycleDays);
const rotationUpdates = getWorksForSegment(works, rotationSegment);
```

### 2. **時間帯考慮更新**

| 時間帯 | 更新数 | 遅延時間 | 備考 |
|--------|--------|----------|------|
| 02:00-06:00 | 5作品 | 300ms | 深夜・負荷軽 |
| 10:00-16:00 | 1作品 | 1000ms | 昼間・負荷重 |
| その他 | 2作品 | 500ms | 標準 |

### 3. **差分検出方式**

#### 軽量チェック (Info API)
```typescript
// 高速で重要な変更を検出
const lightweightChanges = [
  'sales_count',      // 販売数変更
  'rating_count',     // 評価数変更
  'rating_average',   // 評価平均変更
  'price_current'     // 価格変更
];
```

#### 詳細チェック (必要時のみ)
```typescript
// 軽量チェックで変更検出時のみ実行
const detailedChanges = [
  'category_text',    // カテゴリテキスト変更
  'file_info',        // ファイル情報変更
  'bonus_content',    // 特典情報変更
  'track_info'        // トラック情報変更
];
```

---

## 📊 データ管理

### 更新履歴追跡
```typescript
interface UpdateHistory {
  workId: string;
  lastDetailUpdate: string;      // ISO datetime
  lastLightweightCheck: string;  // ISO datetime
  updateCount: number;           // 累計更新回数
  lastChangeDetected: string;    // 最終変更検出日時
  updatePriority: number;        // 現在の優先度
  consecutiveNoChanges: number;  // 連続変更なし回数
}
```

### 統計・監視データ
```typescript
interface UpdateStatistics {
  totalWorksInRotation: number;   // ローテーション対象作品数
  updatesLastWeek: number;        // 先週の更新数
  changesDetectedRate: number;    // 変更検出率
  averageUpdateInterval: number;  // 平均更新間隔（日）
  loadControlMetrics: {
    requestsPerHour: number;      // 時間あたりリクエスト数
    errorRate: number;            // エラー率
    averageResponseTime: number;  // 平均レスポンス時間
  };
}
```

---

## ⚙️ 実装計画

### Phase 1: 基盤実装
- [ ] `WorkUpdateSelector` コンポーネント
- [ ] `PriorityCalculator` ロジック
- [ ] 基本的なローテーション機能
- [ ] 設定管理システム

### Phase 2: 高度な機能
- [ ] `ChangeDetector` による差分検出
- [ ] `LoadController` による負荷制御
- [ ] 時間帯考慮更新システム
- [ ] エラーハンドリング強化

### Phase 3: 監視・最適化
- [ ] 更新統計収集
- [ ] パフォーマンス監視
- [ ] 自動調整機能
- [ ] ダッシュボード表示

---

## 🔍 考慮事項・課題

### 技術的課題
1. **メモリ効率**: 大量の既存作品データの効率的な処理
2. **状態管理**: 更新履歴とローテーション状態の永続化
3. **並行性**: 新規作品処理との競合状態回避
4. **エラー処理**: ネットワークエラーや構造変更への対応

### 運用課題
1. **設定調整**: 最適な更新頻度・優先度パラメータの決定
2. **監視**: 更新効果と負荷のバランス監視
3. **緊急対応**: DLsite側の制限強化時の対応手順
4. **データ品質**: 部分更新による整合性確保

### 将来的検討事項
1. **機械学習**: 変更予測モデルによる更新最適化
2. **分散処理**: 複数リージョンでの負荷分散
3. **リアルタイム**: Webhook等による即座更新システム
4. **キャッシュ**: CDNやEdge Cacheによる応答速度向上

---

## 📈 成功指標

### 定量指標
- **カバレッジ**: 全作品の80%を30日以内に更新
- **効率性**: 変更検出率15%以上を維持
- **負荷**: DLsiteへのリクエスト数20%以下の増加
- **応答性**: 重要な変更を48時間以内に検出

### 定性指標
- ユーザーから見た情報の新鮮さ向上
- DLsiteからの制限・警告なし
- システム安定性の維持
- 運用コストの合理性

---

## 🔗 関連ドキュメント

- [DEVELOPMENT.md](./DEVELOPMENT.md) - 開発環境・設計原則
- [INFRASTRUCTURE_ARCHITECTURE.md](./INFRASTRUCTURE_ARCHITECTURE.md) - インフラ構成
- [FIRESTORE_STRUCTURE.md](./FIRESTORE_STRUCTURE.md) - データベース構造
- [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md) - デプロイ・運用ガイド

---

**バージョン**: 1.0  
**作成日**: 2025-07-07  
**最終更新**: 2025-07-07  
**ステータス**: 設計段階