# DLsiteデータ収集システム改善計画

## 概要

現在のDLsiteデータ収集Cloud Functionsには、パフォーマンス、データ整合性、コスト面で複数の課題があります。本ドキュメントでは、これらの課題を体系的に整理し、エンティティ設計を中心とした根本的な改善プランを提案します。

## 現状の課題

### 1. パフォーマンス課題
- **処理時間**: 全作品（約1,500件）の更新に約5分かかる
- **タイムアウトリスク**: Cloud Functionsの最大実行時間（9分）に近い
- **API制限**: DLsite APIへの連続アクセスによる制限リスク

### 2. データ整合性課題
- **workCount不整合**: サークルの作品数カウントが実際と異なる
- **クリエイターマッピング**: 削除・変更されたクリエイター情報が残存
- **価格履歴**: 日次更新が必要だが、全件処理は非効率
- **データ構造の不統一**: Workはエンティティ化済みだが、Circle/Creatorは未整備

### 3. コスト課題
- **Cloud Run**: 月額約$0.15（150分の実行時間）
- **Firestore**: 月額約$0.14（45,000回の読み取り）
- **不要な処理**: 変更のない作品も毎回更新

### 4. 運用課題
- **エラー復旧**: バッチ処理の途中失敗時の継続処理が複雑
- **監視**: 処理の進行状況が不透明
- **メンテナンス**: データ不整合の検出・修正が手動
- **ビジネスロジックの分散**: 更新ロジックがCloud Functions内に散在

## 改善方針

### 基本原則
1. **ドメイン駆動設計**: エンティティによるビジネスロジックの集約
2. **段階的改善**: リスクを抑えながら順次改善
3. **費用対効果**: 低コストで高効果な施策を優先
4. **データ品質**: 整合性と正確性を重視
5. **可観測性**: 処理状況の可視化

## 改善プラン

### Phase 1: 即効性のある改善（1-2週間）

#### 1.1 差分更新モードの実装
```typescript
// 実装概要
export async function fetchDLsiteUnifiedData() {
  const mode = determineUpdateMode();
  
  switch (mode) {
    case 'daily-incremental':     // 日次: 新作品 + 人気作品の価格
    case 'weekly-full':           // 週次: 全作品の価格履歴
    case 'monthly-complete':      // 月次: 完全更新
  }
}
```

**期待効果**:
- 日次処理時間: 5分 → 1-2分（80%削減）
- API呼び出し: 1,500件 → 200件（87%削減）
- コスト: 月額$0.29 → $0.06（80%削減）

#### 1.2 バッチサイズ最適化
```typescript
const BATCH_SIZE = 50; // 100 → 50に削減
const MAX_CONCURRENT_API_REQUESTS = 3; // 6 → 3に削減
```

**期待効果**:
- エラー率の低下
- 処理の安定性向上

### Phase 2: データ構造とユーティリティ関数の改善（2-3週間）

#### 2.1 Circle/Creatorデータ構造の正規化
```typescript
// シンプルで整合性のあるデータ構造
export interface CircleDocument {
  circleId: string;
  name: string;
  nameEn?: string;
  workIds: string[];  // workCountは計算で求める
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// クリエイター情報の正規化
export interface CreatorDocument {
  creatorId: string;
  name: string;
  primaryRole?: CreatorRole;
  // マッピングはサブコレクションで管理
}

// サブコレクション: creators/{creatorId}/works/{workId}
export interface CreatorWorkRelation {
  workId: string;
  roles: CreatorRole[];
  circleId: string;
  updatedAt: Timestamp;
}
```

#### 2.2 整合性を保証するユーティリティ関数
```typescript
// services/dlsite/circle-firestore.ts
export async function updateCircleWithWork(
  circleId: string,
  workId: string,
  circleName: string,
  transaction?: Transaction
): Promise<void> {
  const ref = firestore.collection('circles').doc(circleId);
  const doc = await ref.get();
  
  if (!doc.exists) {
    // 新規作成（workIdsで管理）
    await ref.set({
      circleId,
      name: circleName,
      workIds: [workId],
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now()
    });
  } else {
    // 既存更新（重複チェック込み）
    const data = doc.data() as CircleDocument;
    if (!data.workIds.includes(workId)) {
      await ref.update({
        workIds: FieldValue.arrayUnion(workId),
        name: circleName, // 名前も更新
        updatedAt: Timestamp.now()
      });
    }
  }
}

// services/dlsite/creator-firestore.ts  
export async function updateCreatorWorkMapping(
  apiData: DLsiteRawApiResponse,
  workId: string
): Promise<void> {
  const batch = firestore.batch();
  const processedCreators = new Set<string>();
  
  // 現在のマッピングを取得（差分更新のため）
  const existingMappings = await getExistingCreatorMappings(workId);
  
  // APIデータから新しいマッピングを構築
  const newMappings = extractCreatorMappings(apiData);
  
  // 追加・更新
  for (const [creatorId, mapping] of newMappings) {
    const creatorRef = firestore.collection('creators').doc(creatorId);
    const mappingRef = creatorRef.collection('works').doc(workId);
    
    batch.set(creatorRef, {
      creatorId,
      name: mapping.name,
      updatedAt: Timestamp.now()
    }, { merge: true });
    
    batch.set(mappingRef, {
      workId,
      roles: mapping.roles,
      circleId: apiData.maker_id,
      updatedAt: Timestamp.now()
    });
    
    processedCreators.add(creatorId);
  }
  
  // 削除（APIデータに存在しないマッピング）
  for (const [creatorId] of existingMappings) {
    if (!processedCreators.has(creatorId)) {
      const mappingRef = firestore
        .collection('creators')
        .doc(creatorId)
        .collection('works')
        .doc(workId);
      
      batch.delete(mappingRef);
    }
  }
  
  await batch.commit();
}
```

**期待効果**:
- 既存パターンとの一貫性維持
- 実装の簡潔性（エンティティ不要）
- workCountの自動整合性（配列長から計算）
- 削除されたクリエイター情報の自動クリーンアップ
- トランザクションによる整合性保証

### Phase 3: アーキテクチャ改善（1ヶ月）

#### 3.1 Cloud Tasksによる並列処理
```typescript
// オーケストレーター関数
export async function orchestrateDataCollection() {
  const batches = createBatches(workIds, 50);
  
  // Cloud Tasksに並列投入
  await Promise.all(
    batches.map(batch => createCloudTask(batch))
  );
}
```

**期待効果**:
- 処理時間: 5分 → 30秒（90%削減）
- スケーラビリティの向上

#### 3.2 統合的な更新処理
```typescript
// services/dlsite/dlsite-unified-updater.ts
export async function updateFromDLsiteData(
  apiData: DLsiteRawApiResponse,
  workData: WorkDocument
): Promise<void> {
  // トランザクションで整合性を保証
  await firestore.runTransaction(async (transaction) => {
    // 1. Work更新（既存のsaveWorksToFirestore相当）
    const workRef = firestore.collection('dlsiteWorks').doc(workData.productId);
    transaction.set(workRef, workData, { merge: true });
    
    // 2. Circle更新（新しいユーティリティ関数）
    await updateCircleWithWork(
      apiData.maker_id,
      workData.productId,
      apiData.maker_name,
      transaction
    );
    
    // 3. Creator更新（差分更新で整合性保証）
    await updateCreatorWorkMapping(apiData, workData.productId);
  });
}

// 再集計用ユーティリティ
export async function recalculateCircleWorkCounts(): Promise<void> {
  const circles = await firestore.collection('circles').get();
  const batch = firestore.batch();
  
  for (const circleDoc of circles.docs) {
    const circleId = circleDoc.id;
    
    // 実際の作品を検索
    const works = await firestore
      .collection('dlsiteWorks')
      .where('circleId', '==', circleId)
      .get();
    
    const actualWorkIds = works.docs.map(doc => doc.id);
    const currentData = circleDoc.data() as CircleDocument;
    
    // 差分がある場合のみ更新
    if (actualWorkIds.length !== currentData.workIds.length) {
      batch.update(circleDoc.ref, {
        workIds: actualWorkIds,
        updatedAt: Timestamp.now()
      });
    }
  }
  
  await batch.commit();
}
```

#### 3.3 イベントドリブンアーキテクチャ（オプション）
```typescript
// 将来的な拡張: Firestoreトリガーで自動同期
export const onWorkDelete = functions.firestore
  .document('dlsiteWorks/{workId}')
  .onDelete(async (snapshot) => {
    const workData = snapshot.data() as WorkDocument;
    
    // Circleから作品を削除
    await removeWorkFromCircle(workData.circleId, workData.productId);
    
    // Creatorマッピングを削除
    await removeCreatorMappings(workData.productId);
  });
```

### Phase 4: 監視・運用改善（継続的）

#### 4.1 処理メトリクスの可視化
- Cloud Monitoringダッシュボード作成
- 処理時間、エラー率、データ整合性の監視

#### 4.2 自動アラート設定
- 処理失敗時の通知
- データ不整合検出時のアラート

## 実装優先順位

### 高優先度（すぐ実装）
1. 差分更新モードの実装
2. バッチサイズ最適化

### 中優先度（2週間以内）
1. Circle/Creatorデータ構造の正規化
2. 整合性保証ユーティリティ関数の実装
3. 統合的な更新処理への移行
4. workCount再集計機能の実装

### 低優先度（1ヶ月以内）
1. Cloud Tasksによる並列処理
2. イベントドリブンアーキテクチャ（オプション）
3. 処理メトリクスの可視化
4. 自動アラート設定

## 成功指標

### パフォーマンス
- 日次処理時間: 5分 → 1分以内
- エラー率: 5% → 1%以下

### コスト
- 月額コスト: $0.29 → $0.10以下
- API呼び出し数: 45,000回 → 10,000回以下

### データ品質
- workCount整合性: 99%以上
- クリエイターマッピング正確性: 99%以上

## リスクと対策

### リスク
1. **移行時のデータ欠損**: 段階的移行で対応
2. **API仕様変更**: 抽象化レイヤーで対応
3. **コスト増加**: 使用量モニタリングで早期発見

### 対策
- 各フェーズでのロールバック計画
- 本番環境での段階的適用
- 継続的なモニタリング

## スケジュール案

```
Week 1:    Phase 1 実装・テスト（差分更新、バッチ最適化）
Week 2:    Phase 1 本番適用、効果測定
Week 3-4:  Phase 2 エンティティ設計・実装
Week 5:    Phase 2 マイグレーション準備・テスト
Week 6:    Phase 2 段階的本番適用
Week 7-8:  Phase 3 並列処理・イベント駆動の設計・開発
Week 9-10: Phase 3 テスト・段階的適用
Week 11-12: Phase 4 監視強化・最適化
継続的:    運用改善・機能拡張
```

## 技術的詳細

### プロジェクトの実装方針に基づく設計

1. **シンプルなデータ構造**
   - 必要最小限のフィールド
   - workCountは配列長から計算（FieldValue.incrementを廃止）
   - サブコレクションによる正規化

2. **ユーティリティ関数パターン**
   - 既存のWork/Video実装と一貫性
   - リポジトリパターンは使用しない
   - 直接的なFirestore操作

3. **整合性保証の方法**
   - トランザクションによる原子性
   - 差分更新による正確性
   - 定期的な再集計による修正

### マイグレーション戦略

1. **既存データの移行**
   - creatorWorkMappingsをサブコレクションに移行
   - circlesコレクションにworkIds配列を追加
   - 段階的な移行スクリプト

2. **互換性の維持**
   - 既存のCloud Functionsは動作継続
   - 新しい更新処理を段階的に適用
   - ロールバック可能な設計

## サンプル実装

### 月次再集計スケジューラー（terraform）
```hcl
resource "google_cloud_scheduler_job" "recalculate_circle_counts" {
  name        = "recalculate-circle-counts"
  description = "月次でサークルのworkCountを再集計"
  schedule    = "0 3 1 * *"  # 毎月1日 3:00 JST
  time_zone   = "Asia/Tokyo"
  
  pubsub_target {
    topic_name = google_pubsub_topic.maintenance_tasks.id
    data       = base64encode(jsonencode({
      task = "recalculate_circle_counts"
    }))
  }
}
```

## PR（Pull Request）計画

### PR作成の基本方針
- **1 PR = 1機能または1改善**
- **PRサイズ**: 最大500行（レビュー可能なサイズ）
- **依存関係**: 各PRは独立して動作可能
- **テスト**: 各PRに対応するテストを含む

### Phase 1 のPR計画（1-2週間）

#### PR #1: 差分更新モードの基盤実装
```
feat: add incremental update mode for DLsite data collection

- 更新モード判定ロジックの追加
- メタデータによる更新対象の選定
- 設定ファイルでのモード切り替え

Files:
- apps/functions/src/services/dlsite/update-mode-manager.ts (new)
- apps/functions/src/endpoints/dlsite-individual-info-api.ts (modify)
- apps/functions/src/services/dlsite/__tests__/update-mode-manager.test.ts (new)
```

#### PR #2: 人気作品の価格チェック機能
```
feat: add popular works price check for daily updates

- 人気作品の選定ロジック
- 価格変更検出の実装
- 日次更新への統合

Files:
- apps/functions/src/services/dlsite/popular-works-selector.ts (new)
- apps/functions/src/services/price-history/price-change-detector.ts (new)
- tests for above files
```

#### PR #3: バッチサイズ最適化
```
perf: optimize batch size for API stability

- BATCH_SIZE: 100 → 50
- MAX_CONCURRENT_API_REQUESTS: 6 → 3
- エラーハンドリングの改善

Files:
- apps/functions/src/endpoints/dlsite-individual-info-api.ts
- apps/functions/src/services/dlsite/individual-info-api-client.ts
```

### Phase 2 のPR計画（2-3週間）

#### PR #4: Circleデータ構造の正規化
```
feat: normalize circle data structure with workIds array

- CircleDocument型定義の追加
- circle-firestore.tsの新規作成
- 既存データとの互換性維持

Files:
- packages/shared-types/src/firestore/circle.ts (new)
- apps/functions/src/services/dlsite/circle-firestore.ts (new)
- apps/functions/src/services/dlsite/__tests__/circle-firestore.test.ts (new)
```

#### PR #5: Creatorマッピングの正規化
```
feat: normalize creator mappings with subcollections

- CreatorDocument型定義の追加
- creator-firestore.tsの新規作成
- 差分更新ロジックの実装

Files:
- packages/shared-types/src/firestore/creator.ts (new)
- apps/functions/src/services/dlsite/creator-firestore.ts (new)
- apps/functions/src/services/dlsite/__tests__/creator-firestore.test.ts (new)
```

#### PR #6: 統合更新処理の実装
```
feat: implement unified update process with data integrity

- トランザクションによる一括更新
- collect-circle-creator-info.tsの置き換え
- エラーハンドリングの統合

Files:
- apps/functions/src/services/dlsite/dlsite-unified-updater.ts (new)
- apps/functions/src/endpoints/dlsite-individual-info-api.ts (modify)
- apps/functions/src/services/dlsite/collect-circle-creator-info.ts (deprecate)
```

#### PR #7: マイグレーションスクリプト
```
feat: add migration scripts for circle and creator data

- 既存データの移行スクリプト
- バックアップとロールバック機能
- 進捗レポート

Files:
- apps/functions/src/tools/migrations/migrate-circles-v2.ts (new)
- apps/functions/src/tools/migrations/migrate-creators-v2.ts (new)
- apps/functions/src/tools/migrations/README.md (new)
```

#### PR #8: workCount再集計機能
```
feat: add monthly recalculation for circle work counts

- 再集計Cloud Functions
- Terraformでのスケジューラー設定
- 実行ログとレポート

Files:
- apps/functions/src/endpoints/maintenance-tasks.ts (new)
- terraform/scheduler_maintenance.tf (new)
- apps/functions/src/services/dlsite/circle-statistics.ts (new)
```

### Phase 3 のPR計画（1ヶ月）

#### PR #9: Cloud Tasks並列処理（大規模PR）
```
feat: implement parallel processing with Cloud Tasks

- オーケストレーター関数の実装
- バッチ分割とタスク投入
- 進捗追跡とエラーハンドリング

Files:
- apps/functions/src/endpoints/dlsite-orchestrator.ts (new)
- apps/functions/src/endpoints/dlsite-batch-processor.ts (new)
- terraform/cloud_tasks.tf (new)
- Multiple test files
```

#### PR #10: 監視・アラート設定
```
feat: add monitoring and alerting for data collection

- Cloud Monitoringメトリクス
- アラートポリシー設定
- ダッシュボード作成

Files:
- terraform/monitoring.tf (new)
- apps/functions/src/infrastructure/monitoring/metrics.ts (new)
- docs/operations/monitoring-guide.md (new)
```

### レビューチェックリスト

各PRで確認すべき項目：

1. **コード品質**
   - [ ] TypeScript strictモードでエラーなし
   - [ ] Biome lintパス
   - [ ] テストカバレッジ80%以上

2. **パフォーマンス**
   - [ ] API呼び出し数の削減確認
   - [ ] バッチ処理の効率性

3. **互換性**
   - [ ] 既存機能への影響なし
   - [ ] ロールバック可能

4. **ドキュメント**
   - [ ] 型定義のJSDocコメント
   - [ ] 複雑なロジックの説明

## 次のステップ

1. このプランのレビューと承認
2. Phase 1の詳細設計書作成
3. PR #1から順次実装開始
4. 各PRのレビューとマージ
5. 本番環境での段階的適用

---

**作成日**: 2025-07-29
**バージョン**: 4.0（PR計画を追加）