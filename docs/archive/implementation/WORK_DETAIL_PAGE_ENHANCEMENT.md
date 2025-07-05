# 作品詳細ページ拡張設計書

## 📋 概要

suzumina.clickの作品詳細ページを大幅に拡張し、v0モックと同等の豊富な機能を実現する設計書です。

## 🎯 実装目標

### Before（現在の実装）
- 基本的な作品情報のみ表示
- 価格・評価・説明・タグ
- 静的な情報表示

### After（目標）
- **収録内容詳細**: トラック情報・再生時間
- **ファイル情報**: サイズ・形式・総再生時間
- **特性評価システム**: ユーザー参加型の多軸評価
- **時系列データ**: 価格推移・販売推移チャート
- **詳細クリエイター情報**: CV・シナリオ・イラスト・音楽等
- **タブ式UI**: 情報を整理したインターフェース

## 🗂️ データモデル拡張

### 1. 収録内容（TrackInfo）
```typescript
interface TrackInfo {
  trackNumber: number;        // トラック番号
  title: string;             // トラック名
  duration?: number;         // 再生時間（秒）
  durationText?: string;     // "5分3秒"
  description?: string;      // トラック説明
}
```

### 2. ファイル情報（FileInfo）
```typescript
interface FileInfo {
  totalSizeBytes?: number;      // 総ファイルサイズ（バイト）
  totalSizeText?: string;       // "3.71 GB"
  formats: string[];            // ["WAV", "MP3"]
  totalDuration?: number;       // 総再生時間（秒）
  totalDurationText?: string;   // "約2時間4分"
  additionalFiles: string[];    // ["readme.txt", "script.txt"]
}
```

### 3. 詳細クリエイター情報（DetailedCreatorInfo）
```typescript
interface DetailedCreatorInfo {
  voiceActors: string[];       // 声優（CV）
  scenario: string[];          // シナリオ
  illustration: string[];      // イラスト
  music: string[];            // 音楽
  design: string[];           // デザイン
  other: Record<string, string[]>; // その他のクリエイター情報
}
```

### 4. 時系列データ（WorkTimeSeriesData）
```typescript
interface WorkTimeSeriesData {
  workId: string;
  priceHistory: PriceHistoryPoint[];    // 価格推移
  salesHistory: SalesHistoryPoint[];   // 販売推移
  rankingHistory: RankingHistoryPoint[]; // ランキング推移
  reviewHistory: ReviewHistoryPoint[];  // レビュー推移
  lastUpdated: string;
  trackingStarted: string;
}
```

### 5. ユーザー評価システム（UserWorkEvaluation）
```typescript
interface UserWorkEvaluation {
  workId: string;
  userId: string;
  overallRating: number;                      // 1-5星
  voiceCharacteristics?: VoiceCharacteristics; // 声の特性
  workCharacteristics?: WorkCharacteristics;   // 作品特性
  audioTechnical?: AudioTechnical;            // 音響・技術
  reviewText?: string;                        // レビューテキスト
  recommendedTags: string[];                  // おすすめタグ
  isPublic: boolean;                         // 公開設定
  createdAt: string;
  updatedAt: string;
}
```

## 🎨 特性評価システム詳細

### 評価軸設計

#### 声の特性（VoiceCharacteristics）
- **高音 ←→ 低音** (pitch): 1-5スケール
- **甘い ←→ クール** (sweetness): 1-5スケール  
- **優しい ←→ 厳しい** (gentleness): 1-5スケール
- **癒し系 ←→ 刺激系** (healing): 1-5スケール

#### 作品特性（WorkCharacteristics）
- **シチュエーション重視 ←→ ストーリー重視** (situationFocus): 1-5スケール
- **創作性 ←→ 刺激性** (creativity): 1-5スケール
- **日常系 ←→ ファンタジー** (realism): 1-5スケール
- **変態性 ←→ 能動性** (activity): 1-5スケール

#### 音響・技術（AudioTechnical）
- **バイノーラル録音 ←→ モノラル** (binauralQuality): 1-5スケール
- **環境音少 ←→ 環境音多** (ambientSound): 1-5スケール
- **音質重視 ←→ 内容重視** (audioQuality): 1-5スケール

### 集計ロジック
- 各軸の平均値計算
- 信頼度スコア（評価数に基づく）
- 評価者数の表示

## 📊 時系列データ設計

### データポイント構造
```typescript
interface TimeSeriesDataPoint {
  date: string;          // ISO日時
  fetchedAt: string;     // データ取得時刻
  source: "dlsite" | "manual" | "estimated";
}
```

### 価格推移（PriceHistoryPoint）
- 現在価格・元価格
- 割引率・セールタイプ
- セール終了日・ポイント還元率

### 販売推移（SalesHistoryPoint）
- 累計販売数・期間販売数
- 日別平均販売数（推定）
- 販売順位・ランキングカテゴリ

### ランキング推移（RankingHistoryPoint）
- ランキング順位・カテゴリ
- ランキング期間（日別/週別/月別等）
- ランキングタイプ（販売/人気/新作/レビュー）

## 🎯 UI/UX設計

### タブ構成
1. **概要**: 基本情報・収録内容・クリエイター情報
2. **特性評価**: ユーザー評価システム・特性チャート
3. **価格推移**: 価格チャート・セール履歴
4. **販売推移**: 販売数チャート・ランキング履歴
5. **仕様**: ファイル情報・技術仕様

### 特性評価UI
- レーダーチャート形式の視覚表示
- ユーザー評価入力フォーム
- 評価統計の表示（平均・分布・件数）

### チャート実装
- Recharts ライブラリ使用
- レスポンシブデザイン対応
- インタラクティブなツールチップ
- 期間選択フィルター

## 🏗️ 実装計画

### Phase 1: データ基盤構築 ✅完了
- [x] 拡張データモデル設計
- [x] 型定義作成（shared-types）
- [x] ユーザー評価システム設計
- [x] 時系列データ設計

### Phase 2: バックエンド拡張
- [ ] DLsiteスクレイピング機能拡張
  - 収録内容・ファイル情報の取得
  - 詳細クリエイター情報の抽出
- [ ] Firestoreスキーマ更新
  - 新データモデルへの移行
  - 既存データの保持・拡張

### Phase 3: フロントエンド実装
- [ ] 作品詳細ページUI拡張
  - タブ式インターフェース
  - 特性評価表示
  - 収録内容一覧
- [ ] ユーザー評価機能UI
  - 特性評価入力フォーム
  - 評価集計表示
- [ ] チャート実装
  - 価格推移チャート
  - 販売推移チャート

## 📁 ファイル構成

### 型定義（packages/shared-types/src/）
- `work.ts`: 拡張された作品データモデル
- `user-evaluation.ts`: ユーザー評価システム
- `time-series-data.ts`: 時系列データ

### UI コンポーネント（apps/web/src/components/）
- `WorkDetailTabs.tsx`: タブ式UI
- `CharacteristicRatingChart.tsx`: 特性評価チャート
- `UserEvaluationForm.tsx`: ユーザー評価フォーム
- `PriceHistoryChart.tsx`: 価格推移チャート
- `SalesHistoryChart.tsx`: 販売推移チャート

### API Routes（apps/web/src/app/api/）
- `works/[workId]/evaluations/route.ts`: ユーザー評価API
- `works/[workId]/time-series/route.ts`: 時系列データAPI

## 🔄 データフロー

### 1. 作品データ収集
```
DLsite詳細ページ → Cloud Functions → Firestore
                      ↓
                  拡張データ抽出
                    (収録内容、ファイル情報、
                     クリエイター情報)
```

### 2. ユーザー評価
```
ユーザー → 評価フォーム → Server Actions → Firestore
                                    ↓
                              評価集計処理 → AggregatedCharacteristics
```

### 3. 時系列データ
```
定期実行 → 価格・販売数取得 → Firestoreサブコレクション
               ↓
          チャート表示 ← データ集計 ← フロントエンド
```

## 🔒 セキュリティ・品質

### データ検証
- Zodスキーマによる型安全性
- Server Actionsでの入力検証
- サニタイゼーション処理

### パフォーマンス
- 時系列データの効率的クエリ
- チャートデータのキャッシュ
- 大量データの段階的読み込み

### ユーザビリティ
- レスポンシブデザイン
- アクセシビリティ対応
- エラーハンドリング

## 📈 成功指標

### ユーザーエンゲージメント
- 特性評価参加率: 20%以上
- 詳細ページ滞在時間: 2分以上
- チャート利用率: 30%以上

### データ品質
- 評価データ数: 1作品あたり10件以上
- 時系列データ収集率: 95%以上
- データ更新頻度: 1日1回以上

この設計により、v0モックと同等以上の豊富な機能を持つ作品詳細ページを実現し、ユーザーにとって価値の高い情報提供を行います。