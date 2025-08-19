# Entity移行影響分析

## 現在のEntity/Value Object使用状況

### 1. Work関連（最優先）
**Entity/Value Objects**:
- `packages/shared-types/src/entities/work-entity.ts` - Work Entity本体
- `packages/shared-types/src/entities/work/work-builder.ts` - ビルダーパターン
- `packages/shared-types/src/value-objects/work/` - 8個のValue Objects
  - work-id.ts, work-title.ts, work-price.ts, work-rating.ts
  - work-creators.ts, price.ts, rating.ts, circle.ts, creator-type.ts, date-range.ts

**使用箇所**:
- `apps/web/src/app/works/` - 作品一覧・詳細ページ
- `apps/functions/src/` - Cloud Functions内での変換
- テストファイル多数

**影響度**: 🔴 **高** - 最も広範囲に使用

### 2. Video関連（複雑度高）
**Entity/Value Objects**:
- `packages/shared-types/src/entities/video.ts` - Video Entity本体
- `packages/shared-types/src/value-objects/video/` - 4個のValue Objects
  - video-content.ts, video-metadata.ts, video-statistics.ts, channel.ts
- `packages/shared-types/src/value-objects/video-category.ts`

**使用箇所**:
- `apps/web/src/app/videos/` - 動画管理機能
- `apps/web/src/hooks/use-video.tsx` - カスタムフック
- 管理画面での状態遷移ロジック

**影響度**: 🟡 **中** - 複雑だが局所的

### 3. AudioButton関連
**Entity/Value Objects**:
- `packages/shared-types/src/entities/audio-button.ts` - AudioButton Entity
- `packages/shared-types/src/value-objects/audio-button/` - 3個のValue Objects
  - audio-content.ts, audio-reference.ts, button-statistics.ts

**使用箇所**:
- 音声ボタン管理機能
- お気に入り機能

**影響度**: 🟢 **低** - Video Entityと密結合

### 4. 共通基盤
- `packages/shared-types/src/base/entity.ts` - BaseEntity
- `packages/shared-types/src/base/value-object.ts` - BaseValueObject
- `packages/shared-types/src/core/result.ts` - Result型
- `packages/shared-types/src/core/errors.ts` - エラー型

## 移行優先順位と理由

### 優先度1: Work Entity（Week 2-3）
**理由**:
- 最も使用頻度が高い
- すでにWorkPlainObjectが存在し、並行運用中
- ビジネスロジックが比較的単純（CRUD中心）

**移行方法**:
```typescript
// Before: Entity使用
const work = Work.fromFirestoreData(doc);
if (work.isOnSale()) { }

// After: 関数使用
const work = workTransformers.fromFirestore(doc);
if (workOperations.isOnSale(work)) { }
```

### 優先度2: Video Entity（Week 4-5）
**理由**:
- 最も複雑なビジネスロジック（状態遷移）
- AudioButtonと密結合
- 管理画面でのみ使用（影響範囲限定的）

**移行方法**:
```typescript
// 状態遷移を純粋関数で実装
const videoOperations = {
  publish: (video: Video): Result<Video, Error> => {
    if (video.status !== 'draft') {
      return err(new Error('Invalid status'));
    }
    return ok({ ...video, status: 'published' });
  }
};
```

### 優先度3: AudioButton（Week 5内で完了）
**理由**:
- Video移行と同時に実施可能
- 独立性が低い（Videoに依存）

### 優先度4: 基盤削除（Week 6）
**理由**:
- すべてのEntity移行後に削除
- core/resultは有用なので評価後に判断

## テスト戦略

### 1. 並行運用期間の設定
```typescript
// 移行期間中の互換性レイヤー
export class Work {
  static fromPlainObject(plain: WorkPlainObject) {
    // 既存コードの互換性維持
    console.warn('Deprecated: Use workOperations instead');
    return plain as any; // 型互換性のみ提供
  }
}
```

### 2. テストの段階的移行
```typescript
// Step 1: 新関数のテスト追加
describe('workOperations', () => {
  // 新しいテスト
});

// Step 2: 既存Entityテストを維持
describe('Work Entity (deprecated)', () => {
  // 既存テストは一時的に維持
});

// Step 3: 移行完了後に旧テスト削除
```

### 3. E2Eテストによる保証
- 各Phase完了時にE2Eテスト実施
- 本番環境と同等のデータでテスト

## リスク管理

### リスク1: 本番環境での不具合
**対策**:
- Feature Flagによる段階的ロールアウト
- 各Phaseごとにステージング環境で1週間検証

### リスク2: パフォーマンス劣化
**対策**:
- 移行前後でパフォーマンス計測
- React DevToolsでレンダリング回数確認

### リスク3: 型安全性の低下
**対策**:
- TypeScript strict mode維持
- zodによる実行時検証追加

## 成功指標

### 定量的指標
- [ ] コード行数: 30%削減（約3,000行削減目標）
- [ ] ビルド時間: 20%短縮
- [ ] テストカバレッジ: 80%以上維持

### 定性的指標
- [ ] 単一のアーキテクチャパターン
- [ ] 新規開発者が1日で理解可能
- [ ] RSC完全対応

## チェックリスト

### Phase 1準備完了条件
- [ ] 全Entity使用箇所のリスト作成
- [ ] 移行計画のレビュー完了
- [ ] ロールバック手順の文書化

### Phase 2完了条件（Work）
- [ ] workOperations.ts実装
- [ ] すべてのWork Entity使用箇所を移行
- [ ] Work関連テスト100%通過

### Phase 3完了条件（Video）
- [ ] videoOperations.ts実装
- [ ] 状態遷移ロジックの移行
- [ ] 管理画面の動作確認

### Phase 4完了条件（最終）
- [ ] BaseEntity/BaseValueObject削除
- [ ] ドキュメント更新
- [ ] パフォーマンステスト完了

## 次のアクション

1. **この計画のレビューと承認**
2. **Phase 1の開始判断**
3. **必要に応じて計画の調整**