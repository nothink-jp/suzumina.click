# 作品詳細情報の更新間隔分析

## 📊 現在の処理能力と制約

### 基本パラメータ
- **総作品数**: 1000+ 作品（涼花みなせ関連）
- **現在の実行頻度**: 1時間に1回
- **現在の処理**: 1ページ（100作品）/実行
- **詳細ページ取得**: 新規追加機能

### 処理能力制約
```
レート制限: 500ms間隔（詳細ページ）
1時間あたり最大処理: 3600秒 ÷ 0.5秒 = 7200リクエスト（理論値）
実用的な処理能力: 10-20作品/時間（安全マージン考慮）
```

## 🕐 作品更新間隔の詳細計算

### Phase 1: 新規作品（即座更新）
```
新作品検出 → 1時間以内に詳細データ取得
更新間隔: ≤ 1時間
対象: 月2-3作品（新作頻度）
```

### Phase 2: 既存作品バックフィル（初回のみ）
```
処理能力: 20作品/時間
全1000作品: 1000 ÷ 20 = 50時間
実行期間: 50時間 ÷ 24時間 = 約2.1日

スケジュール例:
Day 1: 0-480作品 (24時間 × 20作品/時間)
Day 2: 481-960作品
Day 3: 961-1000作品 (朝方完了)
```

### Phase 3: 定期メンテナンス更新（定常運用）

#### A. 月1回全体更新モデル
```
更新頻度: 30日に1回
処理期間: 1000作品 ÷ 20作品/時間 = 50時間 ≈ 2日
各作品の更新間隔: 30日

例：作品ID RJ123456
├── 1月1日: 詳細データ更新
├── 2月1日: 次回更新
└── 更新間隔: 30日
```

#### B. 連続ローテーション更新モデル（推奨）
```
毎時更新: 10作品/時間
1000作品 ÷ 10作品/時間 = 100時間 = 4.17日
各作品の更新間隔: 4-5日

例：作品ID RJ123456
├── 1月1日 12:00: 詳細データ更新
├── 1月5日 17:00: 次回更新  
└── 更新間隔: 4日5時間
```

#### C. 優先度別更新モデル（最適化）
```
高優先度（新作・人気作品）: 週1回更新 = 7日間隔
中優先度（通常作品）: 月1回更新 = 30日間隔  
低優先度（古い作品）: 3ヶ月1回 = 90日間隔

分類例:
├── 高優先度: 過去1年の新作 (約24作品) → 7日間隔
├── 中優先度: 過去5年の作品 (約200作品) → 30日間隔
└── 低優先度: それ以前の作品 (約776作品) → 90日間隔
```

## 📈 実装シナリオ別の更新間隔

### シナリオ A: 保守的実装（安全重視）
```
処理能力: 5作品/時間
全作品更新サイクル: 1000 ÷ 5 = 200時間 = 8.3日
各作品更新間隔: 8-9日

メリット: DLsiteへの負荷最小
デメリット: 更新頻度が低い
```

### シナリオ B: バランス実装（推奨）
```
処理能力: 10作品/時間  
全作品更新サイクル: 1000 ÷ 10 = 100時間 = 4.2日
各作品更新間隔: 4-5日

メリット: 負荷と更新頻度のバランス
デメリット: なし
```

### シナリオ C: アグレッシブ実装（高頻度）
```
処理能力: 20作品/時間
全作品更新サイクル: 1000 ÷ 20 = 50時間 = 2.1日  
各作品更新間隔: 2-3日

メリット: 高頻度更新
デメリット: DLsiteへの負荷増加リスク
```

## 🎯 推奨実装案

### 段階的実装スケジュール
```
Week 1-2: バックフィル実行（既存1000作品）
├── 処理能力: 15作品/時間
├── 完了時間: 67時間 ≈ 3日
└── 深夜時間帯実行

Week 3以降: 定常運用
├── 新規作品: 即座更新（≤1時間）
├── 既存作品: 4日サイクル更新
└── 処理能力: 10作品/時間
```

### 更新頻度の最終回答
```
🎯 各音声作品の詳細データ更新間隔:

新規作品: 1時間以内
既存作品: 4-5日間隔（推奨実装）

※ 実装する処理能力に応じて調整可能:
- 保守的: 8-9日間隔
- アグレッシブ: 2-3日間隔
```

## 🔄 実装時の考慮事項

### 動的調整機能
```typescript
// エラー率に応じた自動調整
if (errorRate > 0.05) {
  processingRate = Math.max(processingRate * 0.5, 2); // 最低2作品/時間
} else if (errorRate < 0.01) {
  processingRate = Math.min(processingRate * 1.2, 25); // 最大25作品/時間
}
```

### 優先度調整
```typescript
// 最終更新からの経過時間による優先度
const getUpdatePriority = (work: WorkData) => {
  const daysSinceUpdate = (Date.now() - work.lastDetailUpdate) / (1000 * 60 * 60 * 24);
  
  if (daysSinceUpdate > 30) return 'high';     // 30日以上 → 高優先度
  if (daysSinceUpdate > 7) return 'medium';    // 7日以上 → 中優先度
  return 'low';                                // 7日以内 → 低優先度
};
```

この分析により、**各作品の詳細データは4-5日間隔で更新される**ことが確認できます。