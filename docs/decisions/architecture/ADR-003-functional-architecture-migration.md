# ADR-003: Entity/DDDパターンから関数型アーキテクチャへの完全移行

## ステータス
提案 (2025-08-19)

## コンテキスト

### 現状の問題
1. **アーキテクチャの混在**
   - Video: 完全なEntity実装（BaseEntity継承）
   - Work: Entity + PlainObjectの二重構造
   - Circle/Creator: PlainObjectのみ
   - User: 部分的なEntity実装

2. **技術的負債**
   - Entity→PlainObject変換のオーバーヘッド
   - RSC境界での制約
   - 過度な抽象化によるコード量増加（Circle/Creatorで約1,200-1,300行/Entity）

3. **保守性の課題**
   - 新規参入者の学習コスト高
   - 一貫性のないパターンによる混乱
   - 引き継ぎの困難さ

### 過去の試み
- 2025年1月: Circle/Creator Entity実装 → 見送り（過度な複雑化）
- 2025年8月19日: 関数型パターンへの部分移行 → 断念（データ不整合）

## 決定

**すべてのEntity/Value ObjectをPlainObject + 純粋関数パターンに統一する**

### 新アーキテクチャ
```typescript
// 1. データ型（PlainObject）
interface Work {
  id: string;
  productId: string;
  title: string;
  // すべてのフィールドはプリミティブまたはPlainObject
}

// 2. ビジネスロジック（純粋関数）
const workOperations = {
  validate: (work: Work): ValidationResult => { },
  isOnSale: (work: Work): boolean => { },
  formatPrice: (work: Work): string => { }
};

// 3. データ変換（純粋関数）
const workTransformers = {
  fromFirestore: (doc: FirestoreDocument): Work => { },
  toFirestore: (work: Work): FirestoreDocument => { }
};
```

## 移行計画

### Phase 0: 準備（Week 1: 2025-08-19〜25）
- [ ] 移行計画の承認
- [ ] 現在のEntity使用箇所の完全なマッピング
- [ ] テスト戦略の策定
- [ ] ロールバック計画の準備

### Phase 1: Work Entity削除（Week 2-3: 2025-08-26〜09-08）
**理由**: 最も使用頻度が高く、既にPlainObjectが存在

#### Week 2: 実装
- [ ] work-operations.ts作成（ビジネスロジック移植）
- [ ] work-transformers.ts作成（データ変換）
- [ ] work-validators.ts作成（バリデーション）
- [ ] 既存のWorkEntityメソッドを関数として再実装

#### Week 3: 移行
- [ ] apps/web内のWork Entity使用箇所を関数呼び出しに変更
- [ ] テストの書き換え
- [ ] Work Entity関連ファイルの削除

### Phase 2: Video Entity簡素化（Week 4-5: 2025-09-09〜22）
**理由**: 最も複雑だが、使用箇所が限定的

#### Week 4: 実装
- [ ] video-operations.ts作成（状態遷移ロジック）
- [ ] video-validators.ts作成（複雑なバリデーション）
- [ ] AudioButton関連の移行

#### Week 5: 移行とテスト
- [ ] 管理画面のVideo Entity使用箇所を移行
- [ ] E2Eテストで状態遷移を確認
- [ ] Video Entity削除

### Phase 3: User/残りの整理（Week 6: 2025-09-23〜29）
- [ ] User関連の整理
- [ ] BaseEntity/BaseValueObject削除
- [ ] core/result, core/errorsの評価（維持 or 削除）

### Phase 4: 最終調整（Week 7: 2025-09-30〜10-06）
- [ ] 全体的な型定義の整理
- [ ] ドキュメント更新
- [ ] パフォーマンステスト
- [ ] 最終レビュー

## 成功指標

1. **コード削減**
   - Entity関連コード50%以上削減
   - packages/shared-typesのサイズ30%削減

2. **パフォーマンス**
   - SSRレンダリング時間10%改善
   - ビルド時間20%短縮

3. **保守性**
   - 新規開発者のオンボーディング時間50%短縮
   - 単一パターンによる認知負荷削減

## リスクと対策

### リスク1: ビジネスロジックの散在
**対策**: operations/ディレクトリに集約、明確な命名規則

### リスク2: 型安全性の低下
**対策**: zodスキーマによる実行時検証、TypeScript strict mode維持

### リスク3: 大規模変更による不具合
**対策**: 段階的移行、各フェーズでの徹底的なテスト

## 移行後のディレクトリ構造

```
packages/shared-types/src/
├── types/           # 型定義（PlainObject）
│   ├── work.ts
│   ├── video.ts
│   ├── circle.ts
│   └── user.ts
├── operations/      # ビジネスロジック（純粋関数）
│   ├── work.ts
│   ├── video.ts
│   └── circle.ts
├── transformers/    # データ変換
│   ├── firestore.ts
│   └── api.ts
├── validators/      # バリデーション
│   ├── work.ts
│   └── video.ts
└── index.ts        # 統一されたエクスポート
```

## 参考
- [ADR-001: DDD実装ガイドライン](ADR-001-ddd-implementation-guidelines.md)
- [ADR-002: Entity実装の教訓](ADR-002-entity-implementation-lessons.md)

## 決定者
- 提案者: Claude (AI Assistant)
- 承認待ち: プロジェクトオーナー

## 更新履歴
- 2025-08-19: 初版作成