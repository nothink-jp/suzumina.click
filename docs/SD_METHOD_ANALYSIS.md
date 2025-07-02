# 特性評価システムのSD法分析と改善提案

## 現在の実装分析

### SD法（Semantic Differential法）の基本要件
1. **双極形容詞対**: 意味的に対立する概念のペア
2. **等間隔スケール**: 心理的距離が等しい評価段階
3. **中立点**: 明確な中間位置
4. **価値中性**: 良い/悪いの価値判断を避ける

### 現在の18軸の評価

#### ✅ SD法として適切な軸
```
声質・話し方:
- pitch: 「低音 ←→ 高音」 ✅ 物理的特性、価値中性
- clarity: 「クリア ←→ ハスキー」 ✅ 音質特性、価値中性
- speed: 「ゆっくり ←→ 早口」 ✅ 客観的特性

行動・表現:
- energy: 「ダウナー ←→ アッパー」 ✅ 価値中性
- assertiveness: 「受け身 ←→ 積極的」 ✅ 行動特性
- boldness: 「恥ずかしがり ←→ 大胆」 ✅ 性格特性

属性・魅力:
- stimulation: 「癒し ←→ 高刺激」 ✅ 効果の種類
- style: 「清楚 ←→ ギャル」 ✅ 表現スタイル
- appeal: 「ピュア ←→ セクシー」 ✅ 魅力の種類
```

#### ⚠️ 改善が必要な軸
```
声質・話し方:
- sweetness: 「甘い ←→ クール」 
  問題: 「甘い」が必ずしも「クール」の対義語ではない
  改善案: 「暖かい ←→ クール」

- formality: 「丁寧語 ←→ タメ口」
  問題: 言語形式の違いで、SD法の概念と異なる
  改善案: 「フォーマル ←→ カジュアル」

性格・内面:
- intelligence: 「天然 ←→ 知的」
  問題: 「知的」に価値判断が含まれる
  改善案: 「直感的 ←→ 論理的」

- cunning: 「無邪気 ←→ あざとい」
  問題: 「あざとい」に負の価値判断
  改善案: 「率直 ←→ 計算的」

- emotionalStability: 「情緒安定 ←→ 情緒不安定」
  問題: 「不安定」に負の価値判断
  改善案: 「穏やか ←→ 感情豊か」
```

## 推奨される改善案

### 1. 軸の再定義
```typescript
export const IMPROVED_CHARACTERISTIC_AXES = {
  voiceQuality: {
    pitch: { left: "低音", right: "高音" },
    clarity: { left: "クリア", right: "ハスキー" },
    warmth: { left: "暖かい", right: "クール" }, // sweetness から変更
    speed: { left: "ゆっくり", right: "早口" },
    formality: { left: "フォーマル", right: "カジュアル" }, // 改善
  },
  personality: {
    maturity: { left: "幼い", right: "大人びた" },
    thinking: { left: "直感的", right: "論理的" }, // intelligence から変更
    dominance: { left: "従順", right: "支配的" },
    approach: { left: "率直", right: "計算的" }, // cunning から変更
    independence: { left: "依存的", right: "自立的" },
    emotionality: { left: "穏やか", right: "感情豊か" }, // 改善
  },
  // behaviorExpression と attributeCharm は適切
}
```

### 2. スケールの数学的処理

#### 現在の1-5スケール
```typescript
// 統計処理しやすい形に変換
function convertTo7Point(value: number): number {
  // 1-5 を 1-7 に変換（より細かい評価）
  return Math.round(((value - 1) / 4) * 6 + 1);
}

function convertToBipolar(value: number): number {
  // 1-5 を -2〜+2 に変換（SD法の標準的な形）
  return (value - 3);
}
```

#### 統計分析用の関数
```typescript
export function calculateSemanticProfile(
  evaluations: UserWorkEvaluation[]
): SemanticProfile {
  const profile: SemanticProfile = {};
  
  for (const [category, axes] of Object.entries(CHARACTERISTIC_AXES)) {
    profile[category] = {};
    
    for (const axisKey of Object.keys(axes)) {
      const values = evaluations
        .map(e => e[category]?.[axisKey]?.value)
        .filter(v => v !== undefined);
        
      if (values.length > 0) {
        const mean = values.reduce((a, b) => a + b, 0) / values.length;
        const variance = values.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / values.length;
        
        profile[category][axisKey] = {
          mean: mean,
          standardDeviation: Math.sqrt(variance),
          sampleSize: values.length,
          bipolarScore: mean - 3, // -2〜+2の双極スコア
        };
      }
    }
  }
  
  return profile;
}
```

### 3. 集団プロファイル分析

```typescript
export function compareSemanticProfiles(
  profile1: SemanticProfile,
  profile2: SemanticProfile
): ComparisonResult {
  // 2つのセマンティックプロファイルを比較
  // 例：異なる声優キャラクターの特性比較
}

export function calculateSemanticDistance(
  profile1: SemanticProfile,
  profile2: SemanticProfile
): number {
  // ユークリッド距離でプロファイル間の類似度を計算
}
```

## 結論

現在の実装は基本的なSD法の構造を持っていますが、より厳密なSD法にするためには：

1. **価値中性の確保**: 良い/悪いの判断を含む軸を修正
2. **対義語の適切性**: 意味的に真に対立する概念のペアに調整
3. **統計処理の強化**: セマンティックプロファイル分析機能の追加

これらの改善により、学術的にも実用的にも優れた特性評価システムになります。