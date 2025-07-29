# DDD (Domain-Driven Design) 実装判断基準

## 概要

このドキュメントは、suzumina.clickプロジェクトにおけるDDD実装の判断基準と実装履歴をまとめたものです。
DDDは強力なパターンですが、すべてのドメインに適用すべきではありません。適切な判断基準に基づいて実装を決定することが重要です。

## 実装履歴

### ✅ DDDを適用したEntity

#### 1. Video Entity (2025年1月)
- **適用理由**:
  - 複雑なビジネスルール（公開状態、タグ管理、統計情報）
  - 頻繁な状態変更（再生回数、評価）
  - YouTubeメタデータとの統合
- **効果**: 
  - バグの減少
  - ビジネスロジックの一元化
  - テストの容易化

### ❌ DDDを見送ったEntity

#### 1. Circle/Creator/CreatorWorkMapping Entity (2025年1月)
- **見送り理由**:
  - シンプルなドメイン（基本的にはCRUD操作のみ）
  - ビジネスルールが少ない
  - コード量が25倍に増加（3,588行追加 vs 144行削減）
- **判断**: 
  - コスト > ベネフィット
  - 既存の型定義で十分機能している

## DDD適用判断基準

### 🟢 DDDを適用すべき場合

#### 1. ドメインの複雑性
- [ ] 5つ以上の関連するプロパティがある
- [ ] 3つ以上の状態遷移がある
- [ ] 複数の不変条件（invariants）を維持する必要がある
- [ ] ビジネスルールが頻繁に変更される

#### 2. ビジネスロジックの存在
- [ ] 単純なCRUD以上の操作が必要
- [ ] 複雑な計算やバリデーションがある
- [ ] 他のEntityとの協調動作がある
- [ ] ドメインイベントの発生源となる

#### 3. データ整合性の重要性
- [ ] トランザクション境界が明確
- [ ] 不正な状態を防ぐ必要がある
- [ ] 監査ログが必要
- [ ] 複数のシステムとの同期が必要

### 🔴 DDDを適用すべきでない場合

#### 1. シンプルなドメイン
- データの保存と取得のみ
- ビジネスルールがない、または単純
- 状態変更が稀
- 他のEntityとの関連が少ない

#### 2. 開発効率の観点
- チームがDDDに不慣れ
- 短期的な開発速度が優先
- プロトタイプや検証段階
- 保守より新規開発が中心

#### 3. コスト対効果
- Entity実装のコードが元の10倍以上
- ビジネスロジックの抽出機会が少ない
- 既存実装で問題が発生していない
- パフォーマンスへの懸念

## 実装パターンの選択肢

### 1. フルEntity実装
```typescript
// 複雑なドメインに適用
export class VideoEntity extends BaseEntity {
  private constructor(
    private readonly _id: VideoId,
    private readonly _title: VideoTitle,
    private readonly _status: VideoStatus,
    // ... 多数のValue Objects
  ) {}
  
  // ビジネスロジック
  publish(): VideoEntity { /* ... */ }
  archive(): VideoEntity { /* ... */ }
  updateStatistics(): VideoEntity { /* ... */ }
}
```

### 2. 軽量Value Object
```typescript
// ID検証のみが必要な場合
export class CircleId {
  constructor(private readonly value: string) {
    if (!value.match(/^RG\d+$/)) {
      throw new Error("Invalid circle ID");
    }
  }
  toString(): string { return this.value; }
}

// シンプルな型定義と組み合わせ
export interface CircleData {
  id: CircleId;
  name: string;
  workCount: number;
}
```

### 3. ユーティリティ関数
```typescript
// ビジネスロジックが少ない場合
export const circleUtils = {
  isValidId: (id: string) => /^RG\d+$/.test(id),
  isNewCircle: (createdAt: Date) => {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    return createdAt > thirtyDaysAgo;
  }
};
```

## 実装前のチェックリスト

### 必須確認事項
1. [ ] ドメインエキスパートとの議論を行ったか？
2. [ ] ビジネスルールを5つ以上列挙できるか？
3. [ ] 既存の型定義では解決できない問題があるか？
4. [ ] ROI（投資対効果）を計算したか？

### コスト見積もり
- Entity実装: 約500行/Entity
- テスト実装: 約500行/Entity
- 既存コード修正: 約100-200行
- ドキュメント: 約100行

**合計: 約1,200-1,300行/Entity**

## 段階的アプローチ

### Phase 1: 検証
1. 最も複雑なEntityから開始（例: Video）
2. 3-6ヶ月運用して効果測定
3. チームのフィードバック収集

### Phase 2: 評価
1. バグ削減率の測定
2. 開発速度への影響評価
3. 保守性の改善度合い

### Phase 3: 展開判断
1. 効果が確認できた場合のみ他のEntityへ展開
2. 問題がある場合は方針転換
3. 部分的な採用も検討

## まとめ

DDDのEntity実装は、ドメインの複雑性に応じて適用すべきです。シンプルなドメインには
シンプルな解決策を、複雑なドメインには適切な抽象化を適用することが、長期的な保守性と
開発効率のバランスを保つ鍵となります。

「必要になったら実装する」YAGNI原則を守り、過度な設計を避けることが重要です。

---

最終更新: 2025年1月29日