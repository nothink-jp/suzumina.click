# Test Utils

音声ボタンパフォーマンス最適化プロジェクトのテスト・ベンチマーク関連ユーティリティ集です。

## 📋 概要

このディレクトリは開発・テスト環境でのパフォーマンス測定・ベンチマーク・統合テスト機能を提供します。本番ビルドには含まれず、開発時の品質保証とパフォーマンス分析に特化しています。

## 🛠️ 提供機能

### パフォーマンステストコンポーネント

- **`AudioButtonPerformanceTest`** - 大量データでの包括的性能測定
- **`LargeDatasetIntegrationTest`** - 実用的な統合テストシナリオ

### ベンチマークユーティリティ

- **`performance-benchmark.ts`** - 本格的なパフォーマンス分析ツール
- 回帰テスト・基準値設定・レポート生成機能
- 48→96→192→384件の段階的負荷テスト対応

## 🚀 使用方法

### 基本的なパフォーマンステスト

```typescript
import { AudioButtonPerformanceTest } from "@suzumina.click/ui/test-utils";

// プログレッシブローディングのテスト
<AudioButtonPerformanceTest
  testMode="progressive"
  itemCount={96}
  showMetrics={true}
  onTestComplete={(results) => console.log(results)}
/>

// 仮想化との比較テスト
<AudioButtonPerformanceTest
  testMode="comparison"
  itemCount={192}
  autoRun={true}
/>
```

### 統合テスト

```typescript
import { LargeDatasetIntegrationTest } from "@suzumina.click/ui/test-utils";

// 基本的な統合テスト
<LargeDatasetIntegrationTest
  initialDataSize={96}
  testScenario="basic"
  onTestResult={(result) => {
    console.log(`UX評価: ${result.userExperience}`);
  }}
/>

// ストレステスト
<LargeDatasetIntegrationTest
  initialDataSize={384}
  testScenario="stress"
/>
```

### ベンチマーク分析

```typescript
import {
  generateBenchmarkDataset,
  calculatePerformanceScore,
  generateBenchmarkReport,
  PERFORMANCE_THRESHOLDS
} from "@suzumina.click/ui/test-utils";

// テストデータ生成
const testData = generateBenchmarkDataset(96);

// パフォーマンススコア算出
const score = calculatePerformanceScore({
  datasetSize: 96,
  renderTime: { avg: 120, min: 80, max: 160, p95: 140 },
  memoryUsage: { initial: 20, peak: 80, final: 70 },
  scrollPerformance: { avgFps: 55, minFps: 48, frameDrops: 3 },
  interactionLatency: { click: 30, search: 120, scroll: 12 }
});

// レポート生成
const suite = {
  config: { datasetSizes: [48, 96, 192], iterations: 3, timeout: 30000, monitorMemory: true },
  results: benchmarkResults,
  summary: analyzeBenchmarkResults(benchmarkResults)
};
const report = generateBenchmarkReport(suite);
```

## 📊 パフォーマンス基準値

### レンダリング時間の上限

- **Small (48件)**: 100ms
- **Medium (96件)**: 200ms
- **Large (192件)**: 400ms
- **XLarge (384件)**: 800ms

### メモリ使用量の上限

- **Small**: 50MB
- **Medium**: 100MB
- **Large**: 200MB
- **XLarge**: 400MB

### その他の指標

- **最小スクロールFPS**: 50fps
- **インタラクション応答時間**: クリック50ms・検索200ms・スクロール16ms
- **合格スコア**: 70/100

## 🧪 テストシナリオ

### AudioButtonPerformanceTest

| モード | 説明 | 用途 |
|--------|------|------|
| `progressive` | プログレッシブローディングの性能測定 | 段階的ローディングの効果検証 |
| `virtualized` | 標準仮想化の性能測定 | 基本的な仮想化性能確認 |
| `comparison` | 両方式の並列比較 | 最適な手法の選択判断 |

### LargeDatasetIntegrationTest

| シナリオ | 説明 | 検証項目 |
|----------|------|----------|
| `basic` | 基本的な表示・操作テスト | レンダリング・応答性 |
| `search` | 検索・フィルタ機能テスト | 検索性能・フィルタリング |
| `interaction` | ユーザーインタラクションテスト | クリック・スクロール・お気に入り |
| `stress` | ストレステスト | 大量データでの安定性 |

## 📈 評価指標

### パフォーマンススコア (0-100)

- **Excellent (85-100)**: 優秀なパフォーマンス
- **Good (70-84)**: 許容範囲内
- **Poor (0-69)**: 改善が必要

### UX評価

- **excellent**: 検索性能 < 100ms, 応答性 < 50ms, メモリ安定
- **good**: 検索性能 < 200ms, 応答性 < 100ms, メモリ安定
- **poor**: 上記基準を下回る

## 🔧 開発環境での活用

### CI/CDでのベンチマーク

```bash
# パフォーマンステストの実行
pnpm test:performance

# ベンチマークレポート生成
pnpm benchmark:report

# 回帰テスト
pnpm benchmark:regression
```

### 開発時のプロファイリング

```typescript
// 開発環境でのリアルタイムメトリクス表示
if (process.env.NODE_ENV === 'development') {
  const metrics = useProgressiveLoadingMetrics(itemCount, upgradedCount, visibleRange);
  console.log('Performance Metrics:', metrics);
}
```

## ⚠️ 注意事項

### 使用制限

- **本番環境では使用禁止**: これらのコンポーネントは開発・テスト専用です
- **メモリ消費**: 大量データでのテストはメモリを多く消費します
- **ブラウザ依存**: パフォーマンス測定結果はブラウザ・デバイスに依存します

### 推奨環境

- **開発環境**: Chrome DevTools・React DevTools併用推奨
- **CI環境**: ヘッドレスブラウザでの自動テスト対応
- **ステージング環境**: 本番相当データでの検証推奨

## 📚 関連ドキュメント

- [UIパッケージREADME](../../README.md) - UIコンポーネントライブラリ概要
- [カスタムコンポーネント](../components/custom/) - 本番使用コンポーネント
- [開発ガイド](../../../../docs/guides/development.md) - 開発環境・原則

## 🎯 Phase 2完了状況

- ✅ **Phase 2a**: 仮想化システム基盤実装
- ✅ **Phase 2b**: react-window統合・VirtualizedAudioButtonList
- ✅ **Phase 2c**: レイジーローディングシステム（skeleton→preview→full）
- ✅ **Phase 2d**: AudioButtonSkeleton・AudioButtonPreview実装
- ✅ **Phase 2e**: 96+件表示テスト・パフォーマンス最適化

**テスト実績**: 359テスト全て通過・包括的品質保証完了

---

**suzumina.click プロジェクト - テストユーティリティ**
**更新日**: 2025-12-24
**バージョン**: 0.3.11