# 特性評価システム 完全ドキュメント

## 📋 目次
1. [システム概要](#システム概要)
2. [評価軸の定義](#評価軸の定義)
3. [データ構造と値の扱い](#データ構造と値の扱い)
4. [SD法としての設計](#sd法としての設計)
5. [統計分析と活用方法](#統計分析と活用方法)
6. [UI実装詳細](#ui実装詳細)
7. [今後の拡張可能性](#今後の拡張可能性)

---

## システム概要

### 基本コンセプト
suzumina.clickの特性評価システムは、声優「涼花みなせ」の音声作品における**キャラクター特性を多角的に評価**するためのシステムです。SD法（Semantic Differential法）をベースとした4分類18軸の評価体系により、各作品のキャラクター特性を定量化・可視化します。

### 目的
- **作品検索の向上**: 特性による作品フィルタリング
- **キャラクター分析**: 統計的なキャラクター特性の把握
- **推奨システム**: 類似特性作品の推奨
- **コミュニティ機能**: ユーザー間での特性評価共有

### 技術仕様
- **評価軸数**: 18軸（4分類）
- **評価スケール**: 1-5の5段階評価
- **集計方式**: 加重平均（信頼度・評価者数考慮）
- **表示方式**: プログレスバー + 数値表示

---

## 評価軸の定義

### 1. 声質・話し方 (Voice Quality) - 5軸

#### 1.1 音の高さ (pitch)
```
低音 (1) ←─────→ 高音 (5)
```
- **評価対象**: 声の基本的な音程・ピッチ
- **1**: 深みのある低音、落ち着いた印象
- **3**: 標準的な音域、バランスの取れた音程
- **5**: 高くて明るい音、可愛らしい印象
- **分析用途**: 声質の基本分類、年齢層マッピング

#### 1.2 声の透明度 (clarity)
```
クリア (1) ←─────→ ハスキー (5)
```
- **評価対象**: 声の質感・透明感
- **1**: 澄んだ透明な声質、雑音のない純粋さ
- **3**: 適度な質感、標準的な声質
- **5**: ハスキーで魅力的、少しかすれた質感
- **分析用途**: 声質の個性分類、魅力度分析

#### 1.3 声の印象 (sweetness)
```
甘い (1) ←─────→ クール (5)
```
- **評価対象**: 声から受ける温度感・印象
- **1**: 甘く優しい声、包み込むような暖かさ
- **3**: バランスの取れた印象、標準的
- **5**: クールで知的、洗練された印象
- **分析用途**: キャラクター性格の基本分類

#### 1.4 話すスピード (speed)
```
ゆっくり (1) ←─────→ 早口 (5)
```
- **評価対象**: 発話のテンポ・リズム
- **1**: ゆったりとした話し方、落ち着いたペース
- **3**: 標準的な話速、聞きやすいテンポ
- **5**: 早口でテンポが良い、活発な印象
- **分析用途**: キャラクターの活動性・エネルギー分析

#### 1.5 話し方 (formality)
```
丁寧語 (1) ←─────→ タメ口 (5)
```
- **評価対象**: 言葉遣いの丁寧さ・フォーマル度
- **1**: 敬語・丁寧語中心、フォーマルな話し方
- **3**: 適度な丁寧さ、場面に応じた使い分け
- **5**: カジュアル・タメ口中心、親しみやすさ
- **分析用途**: キャラクター関係性・距離感分析

### 2. 性格・内面 (Personality) - 6軸

#### 2.1 成熟度 (maturity)
```
幼い (1) ←─────→ 大人びた (5)
```
- **評価対象**: 精神的・心理的な成熟レベル
- **1**: 子供っぽい無邪気さ、純真な印象
- **3**: 年相応の成熟度、バランスの取れた精神性
- **5**: 大人の落ち着き、精神的成熟
- **分析用途**: 年齢層設定・キャラクター深度分析

#### 2.2 知性 (intelligence)
```
天然 (1) ←─────→ 知的 (5)
```
- **評価対象**: 思考の論理性・知的印象
- **1**: 天然で自然体、直感的な行動
- **3**: 標準的な知性、常識的な判断力
- **5**: 知的で論理的、計算された行動
- **分析用途**: キャラクター知性設定・行動パターン分析

#### 2.3 主導性 (dominance)
```
従順 (1) ←─────→ 支配的 (5)
```
- **評価対象**: 関係性における主導権・支配性
- **1**: 従順で素直、相手に従う傾向
- **3**: 状況に応じた適切な対応、バランス型
- **5**: 主導的・支配的、相手をリードする
- **分析用途**: 関係性動力学・役割分析

#### 2.4 したたかさ (cunning)
```
無邪気 (1) ←─────→ あざとい (5)
```
- **評価対象**: 計算性・戦略的思考
- **1**: 無邪気で純粋、計算のない自然体
- **3**: 適度な計算性、社会的な適応力
- **5**: あざとく計算的、戦略的な行動
- **分析用途**: キャラクター複雑性・魅力分析

#### 2.5 自立性 (independence)
```
依存的 (1) ←─────→ 自立的 (5)
```
- **評価対象**: 精神的・行動的自立度
- **1**: 依存的で甘えん坊、他者に頼る傾向
- **3**: 適度な自立性、バランスの取れた依存
- **5**: 独立心旺盛、自力で解決する傾向
- **分析用途**: キャラクター自立度・関係性分析

#### 2.6 感情の安定性 (emotionalStability)
```
情緒安定 (1) ←─────→ 情緒不安定 (5)
```
- **評価対象**: 感情の変動・安定性
- **1**: 常に冷静で安定、感情の起伏が少ない
- **3**: 標準的な感情変動、適度な感情表現
- **5**: 感情豊か、感情の起伏が激しい
- **分析用途**: キャラクター感情特性・ドラマ性分析

### 3. 行動・表現 (Behavior Expression) - 4軸

#### 3.1 エネルギー (energy)
```
ダウナー (1) ←─────→ アッパー (5)
```
- **評価対象**: 基本的な活動エネルギー・テンション
- **1**: 落ち着いた低エネルギー、静的な印象
- **3**: 標準的なエネルギーレベル、安定した活動性
- **5**: 高エネルギーで活発、動的な印象
- **分析用途**: キャラクター活動性・場面適応分析

#### 3.2 積極性 (assertiveness)
```
受け身 (1) ←─────→ 積極的 (5)
```
- **評価対象**: 行動の積極性・主体性
- **1**: 受動的で控えめ、相手の出方を待つ
- **3**: 状況に応じた適切な行動、バランス型
- **5**: 積極的で行動力がある、主体的
- **分析用途**: キャラクター行動パターン・関係性分析

#### 3.3 愛情表現 (affection)
```
ツン (1) ←─────→ デレ (5)
```
- **評価対象**: 愛情表現の直接性・素直さ
- **1**: ツンデレのツン要素、素直でない愛情表現
- **3**: 適度な愛情表現、バランスの取れた態度
- **5**: 素直なデレ要素、直接的な愛情表現
- **分析用途**: 恋愛関係性・キャラクター魅力分析

#### 3.4 大胆さ (boldness)
```
恥ずかしがり (1) ←─────→ 大胆 (5)
```
- **評価対象**: 行動の大胆さ・恥じらい
- **1**: 恥ずかしがりで内向的、控えめな行動
- **3**: 適度な恥じらいと大胆さ、状況対応型
- **5**: 大胆で恥じらいがない、積極的行動
- **分析用途**: キャラクター行動特性・魅力度分析

### 4. 属性・魅力 (Attributes Charm) - 3軸

#### 4.1 刺激度 (stimulation)
```
癒し (1) ←─────→ 高刺激 (5)
```
- **評価対象**: 提供する体験の刺激度・効果
- **1**: 癒し系で穏やか、リラックス効果
- **3**: 適度な刺激、バランスの取れた体験
- **5**: 高刺激で興奮度が高い、エネルギッシュ
- **分析用途**: 作品効果・ユーザー体験分析

#### 4.2 スタイル (style)
```
清楚 (1) ←─────→ ギャル (5)
```
- **評価対象**: 外見・振る舞いのスタイル
- **1**: 清楚で上品、伝統的な美しさ
- **3**: 標準的なスタイル、バランスの取れた印象
- **5**: ギャル系で現代的、派手で華やか
- **分析用途**: キャラクタービジュアル・世代分析

#### 4.3 魅力の種類 (appeal)
```
ピュア (1) ←─────→ セクシー (5)
```
- **評価対象**: 魅力の質・アピールポイント
- **1**: ピュアで純真、清純な魅力
- **3**: バランスの取れた魅力、万人受けする印象
- **5**: セクシーで大人の魅力、官能的
- **分析用途**: ターゲット層・魅力タイプ分析

---

## データ構造と値の扱い

### 基本データ構造

```typescript
// 個別軸の評価データ
interface CharacteristicAxis {
  value: number;           // 1-5の評価値
  confidence: number;      // 0-1の信頼度（評価数に基づく）
  evaluatorCount: number;  // 評価者数
}

// カテゴリ別評価
interface VoiceQuality {
  pitch?: CharacteristicAxis;
  clarity?: CharacteristicAxis;
  sweetness?: CharacteristicAxis;
  speed?: CharacteristicAxis;
  formality?: CharacteristicAxis;
}

// 集計された特性評価
interface AggregatedCharacteristics {
  voiceQuality?: VoiceQuality;
  personality?: Personality;
  behaviorExpression?: BehaviorExpression;
  attributeCharm?: AttributeCharm;
  overall: {
    averageRating: number;      // 全軸の平均評価
    totalEvaluations: number;   // 総評価数
    recommendationRate: number; // 推奨率（4-5の割合）
  };
  lastUpdated: string; // ISO日時文字列
}
```

### 値の意味と解釈

#### 評価値 (value: 1-5)
```
1.0 - 1.5 : 強く左側の特性
1.5 - 2.5 : やや左側の特性
2.5 - 3.5 : 中間的・どちらでもない
3.5 - 4.5 : やや右側の特性
4.5 - 5.0 : 強く右側の特性
```

#### 信頼度 (confidence: 0-1)
```typescript
confidence = Math.min(evaluatorCount / 30, 1);

0.0 - 0.3 : 低信頼度（評価数不足）
0.3 - 0.7 : 中程度の信頼度
0.7 - 1.0 : 高信頼度（十分な評価数）
```

#### 統計的活用
```typescript
// 加重平均計算
function calculateWeightedAverage(evaluations: CharacteristicAxis[]): number {
  const totalWeight = evaluations.reduce((sum, e) => sum + e.confidence * e.evaluatorCount, 0);
  const weightedSum = evaluations.reduce((sum, e) => sum + e.value * e.confidence * e.evaluatorCount, 0);
  return weightedSum / totalWeight;
}

// 標準偏差計算
function calculateStandardDeviation(values: number[]): number {
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const variance = values.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / values.length;
  return Math.sqrt(variance);
}
```

---

## SD法としての設計

### SD法の基本原理
セマンティック・ディファレンシャル法（Semantic Differential Method）は、概念の意味的な位置を多次元空間で測定する心理学的手法です。

#### 基本構成要素
1. **概念（Concept）**: 評価対象（声優キャラクター）
2. **尺度（Scale）**: 対義語ペア + 7段階評価
3. **被験者（Subject）**: 評価者（ユーザー）

### 本システムでのSD法適用

#### 適用レベル
```
レベル1: 個別軸評価 (SD法の基本単位)
レベル2: カテゴリ評価 (関連軸のグループ化)
レベル3: 総合プロファイル (18軸統合評価)
```

#### 数学的変換

```typescript
// 1-5スケールから双極スケールへの変換
function toBipolarScale(value: number): number {
  return (value - 3.0); // -2.0 ～ +2.0
}

// セマンティック距離の計算
function calculateSemanticDistance(
  profile1: AggregatedCharacteristics,
  profile2: AggregatedCharacteristics
): number {
  const allAxes = [
    'voiceQuality', 'personality', 
    'behaviorExpression', 'attributeCharm'
  ];
  
  let sumSquaredDiffs = 0;
  let validAxesCount = 0;
  
  for (const category of allAxes) {
    const cat1 = profile1[category];
    const cat2 = profile2[category];
    
    if (cat1 && cat2) {
      for (const axis of Object.keys(cat1)) {
        if (cat1[axis] && cat2[axis]) {
          const diff = cat1[axis].value - cat2[axis].value;
          sumSquaredDiffs += diff * diff;
          validAxesCount++;
        }
      }
    }
  }
  
  return Math.sqrt(sumSquaredDiffs / validAxesCount);
}
```

### 因子分析の可能性

18軸から潜在的な因子を抽出することで、より少ない次元でキャラクター特性を表現できます。

```typescript
// 想定される因子構造
interface CharacterFactors {
  energy: number;      // エネルギー因子（活発さ）
  warmth: number;      // 温かさ因子（親しみやすさ）
  competence: number;  // 有能さ因子（知性・自立性）
  sensuality: number;  // 官能性因子（魅力・刺激）
}
```

---

## 統計分析と活用方法

### 1. 記述統計分析

#### 基本統計量
```typescript
interface AxisStatistics {
  mean: number;           // 平均値
  median: number;         // 中央値
  mode: number;           // 最頻値
  standardDeviation: number; // 標準偏差
  skewness: number;       // 歪度
  kurtosis: number;       // 尖度
  range: number;          // 範囲
  quartiles: [number, number, number]; // 四分位数
}
```

#### 分布分析
```typescript
function analyzeDistribution(values: number[]): DistributionAnalysis {
  return {
    isNormalDistribution: performShapiroWilkTest(values),
    distributionType: identifyDistributionType(values),
    outliers: detectOutliers(values),
    confidenceInterval: calculateConfidenceInterval(values, 0.95)
  };
}
```

### 2. 相関分析

#### 軸間相関
```typescript
function calculateAxisCorrelations(
  evaluations: UserWorkEvaluation[]
): CorrelationMatrix {
  const correlationMatrix: CorrelationMatrix = {};
  
  // すべての軸ペアについて相関係数を計算
  for (const axis1 of ALL_AXES) {
    for (const axis2 of ALL_AXES) {
      correlationMatrix[`${axis1}_${axis2}`] = 
        calculatePearsonCorrelation(
          getAxisValues(evaluations, axis1),
          getAxisValues(evaluations, axis2)
        );
    }
  }
  
  return correlationMatrix;
}
```

#### 作品間類似度
```typescript
function findSimilarWorks(
  targetWork: string,
  allWorks: AggregatedCharacteristics[],
  threshold: number = 0.8
): SimilarWork[] {
  return allWorks
    .map(work => ({
      workId: work.workId,
      similarity: calculateCosineSimilarity(targetWork, work),
      semanticDistance: calculateSemanticDistance(targetWork, work)
    }))
    .filter(result => result.similarity >= threshold)
    .sort((a, b) => b.similarity - a.similarity);
}
```

### 3. クラスター分析

#### K-meansクラスタリング
```typescript
interface CharacterCluster {
  clusterId: number;
  centroid: AggregatedCharacteristics;
  members: string[]; // work IDs
  characteristics: string[]; // 特徴的な軸
  description: string; // クラスターの特徴説明
}

function performCharacterClustering(
  works: AggregatedCharacteristics[],
  k: number = 5
): CharacterCluster[] {
  // K-meansアルゴリズムで作品をクラスタリング
  // 各クラスターの特徴を自動生成
}
```

### 4. 予測分析

#### 評価予測
```typescript
function predictUserRating(
  userProfile: UserPreference,
  workCharacteristics: AggregatedCharacteristics
): PredictionResult {
  // ユーザーの過去の評価パターンから
  // 新作品の評価を予測
  return {
    predictedRating: number,
    confidence: number,
    reasoning: string[]
  };
}
```

#### トレンド分析
```typescript
function analyzeTrends(
  timeSeriesData: CharacteristicsTrend[]
): TrendAnalysis {
  // 時系列での特性トレンドを分析
  // 人気の変化、流行の予測
}
```

### 5. 実用的活用方法

#### 推奨システム
```typescript
function recommendWorks(
  userId: string,
  userHistory: UserEvaluation[],
  availableWorks: AggregatedCharacteristics[]
): Recommendation[] {
  // 1. ユーザーの好みプロファイル作成
  const userProfile = buildUserProfile(userHistory);
  
  // 2. 作品との適合度計算
  const matches = availableWorks.map(work => ({
    workId: work.workId,
    matchScore: calculateMatchScore(userProfile, work),
    reasons: explainMatch(userProfile, work)
  }));
  
  // 3. スコア順ソート＆フィルタリング
  return matches
    .filter(match => match.matchScore >= 0.7)
    .sort((a, b) => b.matchScore - a.matchScore)
    .slice(0, 10);
}
```

#### 検索フィルタ
```typescript
function createCharacteristicFilter(
  criteria: FilterCriteria
): (work: AggregatedCharacteristics) => boolean {
  return (work) => {
    // 各軸の条件をチェック
    for (const [axis, range] of Object.entries(criteria)) {
      const value = getAxisValue(work, axis);
      if (value < range.min || value > range.max) {
        return false;
      }
    }
    return true;
  };
}
```

#### A/Bテスト分析
```typescript
function analyzeABTest(
  groupA: UserEvaluation[],
  groupB: UserEvaluation[]
): ABTestResult {
  // 異なる評価UI・説明での評価結果を比較
  // 統計的有意差の検定
}
```

---

## UI実装詳細

### コンポーネント構成

```typescript
// メインコンポーネント
CharacteristicEvaluation
├── CategorySection (4個)
│   └── CharacteristicAxis (18個)
│       ├── AxisLabel
│       ├── EvaluationBadge
│       ├── BipolarLabels
│       ├── ProgressBar
│       └── ValueDisplay
└── OverallStatistics
    ├── AverageRating
    ├── TotalEvaluations
    └── RecommendationRate
```

### 視覚化の工夫

#### プログレスバーの意味
```typescript
// パーセンテージ計算
const percentage = ((value - 1) / 4) * 100;
// 1.0 → 0%   (完全に左)
// 3.0 → 50%  (中央)
// 5.0 → 100% (完全に右)

// 透明度による信頼度表現
const opacity = Math.max(0.3, confidence);
// 低信頼度: 薄く表示
// 高信頼度: 濃く表示
```

#### カラーシステム
```css
/* プライマリカラー（suzuka） */
.progress-bar { background: #ff4785; }

/* セカンダリカラー（minase） */
.category-title { color: #ff7e2d; }

/* 中央線 */
.center-line { background: #6b7280; opacity: 0.5; }

/* 値インジケーター */
.value-indicator { background: #1f2937; }
```

### インタラクション設計

#### ホバー効果
```typescript
// 軸の詳細情報表示
onAxisHover = (axisKey: string) => {
  showTooltip({
    title: getAxisDisplayName(axisKey),
    description: getAxisDescription(axisKey),
    statistics: getAxisStatistics(axisKey)
  });
};
```

#### クリック操作
```typescript
// 軸クリックで詳細分析表示
onAxisClick = (axisKey: string) => {
  openDetailModal({
    axis: axisKey,
    distributionChart: true,
    comparisonWorks: true,
    userEvaluations: true
  });
};
```

### レスポンシブ対応
```css
/* デスクトップ: 2列レイアウト */
@media (min-width: 1024px) {
  .categories-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

/* タブレット: 1列レイアウト */
@media (max-width: 1023px) {
  .categories-grid {
    grid-template-columns: 1fr;
  }
  
  .axis-labels {
    font-size: 0.75rem; /* 小さめの文字 */
  }
}

/* モバイル: コンパクト表示 */
@media (max-width: 640px) {
  .evaluation-badge {
    display: none; /* 評価数非表示 */
  }
  
  .tab-text {
    display: none; /* タブ文字非表示 */
  }
}
```

---

## 今後の拡張可能性

### 1. 機械学習の活用

#### 自動評価システム
```typescript
interface AutoEvaluationSystem {
  // 音声分析による自動評価
  analyzeVoiceCharacteristics(audioFile: File): Promise<VoiceQuality>;
  
  // テキスト分析による性格推定
  analyzePersonalityFromScript(script: string): Promise<Personality>;
  
  // 学習データの精度向上
  trainModel(userEvaluations: UserEvaluation[]): Promise<ModelMetrics>;
}
```

#### 評価品質の向上
```typescript
// 一貫性チェック
function detectInconsistentEvaluations(
  userEvaluations: UserEvaluation[]
): InconsistencyReport {
  // 同一ユーザーの評価の一貫性をチェック
  // 異常値・矛盾する評価の検出
}

// 評価者信頼度スコア
function calculateEvaluatorReliability(
  userId: string,
  evaluationHistory: UserEvaluation[]
): ReliabilityScore {
  // 他の評価者との相関
  // 評価の時系列安定性
  // 極端評価の頻度
}
```

### 2. 高度な分析機能

#### セマンティック検索
```typescript
interface SemanticSearch {
  // 自然言語での特性検索
  searchByDescription(query: string): Promise<Work[]>;
  // 例: "優しくて癒し系で、少し天然な子"
  
  // 類似キャラクター検索
  findSimilarCharacters(
    referenceWork: string,
    similarityThreshold: number
  ): Promise<SimilarCharacter[]>;
}
```

#### 動的評価システム
```typescript
interface AdaptiveEvaluation {
  // ユーザーの評価傾向に応じた軸の重み調整
  adaptAxisWeights(userId: string): Promise<AxisWeights>;
  
  // 個人化された評価スケール
  personalizeScale(userId: string): Promise<PersonalScale>;
  
  // コンテキスト依存評価
  contextualEvaluation(
    work: string,
    context: EvaluationContext
  ): Promise<ContextualRating>;
}
```

### 3. コミュニティ機能

#### 評価者コミュニティ
```typescript
interface EvaluatorCommunity {
  // 評価者グループ分け
  clusterEvaluators(): Promise<EvaluatorCluster[]>;
  
  // 専門家評価者認定
  identifyExpertEvaluators(
    domain: AxisCategory
  ): Promise<ExpertEvaluator[]>;
  
  // 評価討論機能
  createEvaluationDiscussion(
    workId: string,
    axis: string
  ): Promise<Discussion>;
}
```

#### ソーシャル機能
```typescript
interface SocialFeatures {
  // 評価の共有・いいね
  shareEvaluation(evaluationId: string): Promise<ShareResult>;
  
  // 評価者フォロー
  followEvaluator(userId: string): Promise<FollowResult>;
  
  // 評価コンテスト
  createEvaluationContest(
    theme: string,
    duration: number
  ): Promise<Contest>;
}
```

### 4. API・データ連携

#### 外部サービス連携
```typescript
interface ExternalIntegration {
  // DLsite APIとの連携強化
  syncWithDLsiteMetadata(): Promise<SyncResult>;
  
  // 音声分析サービス連携
  integrateVoiceAnalysisAPI(
    provider: VoiceAnalysisProvider
  ): Promise<Integration>;
  
  // SNS連携
  shareToSocialMedia(
    evaluation: UserEvaluation,
    platform: SocialPlatform
  ): Promise<ShareResult>;
}
```

#### データエクスポート
```typescript
interface DataExport {
  // CSV/JSON エクスポート
  exportEvaluationData(
    filters: ExportFilters
  ): Promise<ExportedData>;
  
  // 学術研究用データセット
  generateResearchDataset(
    anonymized: boolean
  ): Promise<ResearchData>;
  
  // 統計レポート生成
  generateStatisticsReport(
    timeRange: DateRange
  ): Promise<StatisticsReport>;
}
```

### 5. 国際化対応

#### 多言語サポート
```typescript
interface Internationalization {
  // 軸ラベルの多言語化
  translateAxisLabels(
    language: SupportedLanguage
  ): Promise<TranslatedLabels>;
  
  // 文化的適応
  adaptToCulture(
    culture: CultureCode
  ): Promise<CulturalAdaptation>;
  
  // 地域別評価傾向分析
  analyzeRegionalTrends(
    region: RegionCode
  ): Promise<RegionalAnalysis>;
}
```

---

## 結論

suzumina.clickの特性評価システムは、SD法の理論をベースとした実用的な評価システムとして設計されています。18軸の多角的評価により、声優キャラクターの特性を定量的に分析・可視化し、ユーザーの作品発見と理解を支援します。

現在の実装は基本的な評価・表示機能を提供していますが、将来的には機械学習、高度な統計分析、コミュニティ機能などの拡張により、より洗練された特性評価プラットフォームへと発展する可能性を秘めています。

**このドキュメントは特性評価システムの理解と今後の開発に活用してください。**