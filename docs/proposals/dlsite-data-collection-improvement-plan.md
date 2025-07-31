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

#### 1.1 差分更新モードの実装 ❌ (スキップ: YAGNI原則により不要と判断)
```
理由:
- 現在の全件更新（5分）はCloud Functions制限（9分）内で問題なく動作
- 1時間ごとの更新で即応性は十分確保
- 月額コスト$0.29は既に十分低い
- 複雑性を増すだけで実際の問題を解決しない
```

#### 1.2 バッチサイズ最適化 ✅ (完了: PR #138)
```typescript
const BATCH_SIZE = 50; // 100 → 50に削減
const MAX_CONCURRENT_API_REQUESTS = 3; // 6 → 3に削減
```

**実装済み効果**:
- エラー率の低下
- 処理の安定性向上
- API制限エラーの減少

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

#### PR #1: 差分更新モードの基盤実装 ❌ (スキップ: YAGNI原則により不要と判断)
```
理由:
- 現在の全件更新（5分）はCloud Functions制限（9分）内で問題なく動作
- バッチ処理の継続機能が既に実装済み
- 設定ファイルでのモード切り替えの具体的要件が不明
- 複雑性を増すだけで実際の問題を解決しない
```

#### PR #2: 人気作品の価格チェック機能 ❌ (スキップ: YAGNI原則により不要と判断)
```
理由:
- 人気作品の定義が不明確（ビジネス要件なし）
- 全作品を平等に扱う現在の方式がシンプルで良い
- 優先順位付けの具体的なメリットが不明
- 月額コスト$0.29は既に十分低い
```

#### PR #3: バッチサイズ最適化 ✅ (完了: PR #138)
```
perf: optimize batch size for API stability

- BATCH_SIZE: 100 → 50
- MAX_CONCURRENT_API_REQUESTS: 6 → 3
- エラーハンドリングの改善
- リトライロジックの追加（429/5xxエラー対応）

Files:
- apps/functions/src/endpoints/dlsite-individual-info-api.ts
- apps/functions/src/services/dlsite/individual-info-api-client.ts
- apps/functions/src/services/dlsite/__tests__/individual-info-api-client.test.ts
```

**実装済み**: 2025-07-29

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

## 実装進捗

### Phase 1: バッチ処理の安定化
- [x] PR #3: バッチサイズ最適化の実装 - **完了・マージ済み (PR #138)**
- [x] PR #1: 差分更新モードの基盤実装 - **スキップ（YAGNI原則）**
- [x] PR #2: 人気作品の価格チェック機能 - **スキップ（YAGNI原則）**

### Phase 2: データ正規化
- [x] PR #4: Circleデータ構造の正規化 - **完了・マージ済み (PR #139)**
- [x] PR #5: Creatorマッピングの正規化 - **完了・PR作成済み (PR #140)**
  - サブコレクション構造での実装
  - Collection Group Queryによる性能最適化
  - 既存のcreatorWorkMappingsコレクションからの移行完了
- [ ] PR #6: 統合更新処理の最適化（再設計）
- [ ] PR #8: データ整合性検証機能

### 削除されたタスク
- ~~PR #7: マイグレーションスクリプト~~ （データ構造の作り直しで不要に）
- ~~PR #9: Cloud Tasks並列処理~~ （実装量が大きくスコープから除外）
- ~~PR #10: 監視・アラート設定~~ （実装量が大きくスコープから除外）

**最終更新**: 2025-07-30

## PR #6: 統合更新処理の最適化（再設計）

### 重要な前提
- **更新頻度は変更しない**: 現在の1時間ごとの更新を維持
- **即応性は現状維持**: 新作品や価格変更を1時間以内に反映
- **目的は処理の質の改善**: エラー追跡、整合性、保守性の向上

### 現状の問題点
1. **ビジネスロジックの分散**: Work、Circle、Creatorの更新処理が異なる場所に散在
2. **エラーハンドリングの不統一**: 各処理で独自のエラーハンドリング
3. **トランザクションの欠如**: データ整合性が保証されていない
4. **重複処理**: 同じAPIデータから複数回情報を抽出

### 設計方針
1. **単一責任の原則**: 1つの関数で1つのAPIデータから全ての更新を行う
2. **原子性の保証**: 可能な限りトランザクションで整合性を保証
3. **エラーの集約**: 統一されたエラーハンドリング
4. **パフォーマンス**: 差分チェックで無駄な更新をスキップ

### 実装案

```typescript
// apps/functions/src/services/dlsite/unified-data-processor.ts

interface ProcessingResult {
  workId: string;
  success: boolean;
  updates: {
    work: boolean;
    circle: boolean;
    creators: boolean;
    priceHistory: boolean;
  };
  errors: string[];
}

/**
 * DLsite APIデータから全ての関連データを統合的に更新
 * 
 * この関数が責任を持つこと:
 * 1. Workデータの更新
 * 2. Circleデータの更新（workIds配列の管理）
 * 3. Creatorマッピングの更新（差分更新）
 * 4. 価格履歴の記録
 */
export async function processUnifiedDLsiteData(
  apiData: DLsiteRawApiResponse,
  options?: {
    skipPriceHistory?: boolean;
    forceUpdate?: boolean;
  }
): Promise<ProcessingResult> {
  const result: ProcessingResult = {
    workId: apiData.workno,
    success: false,
    updates: {
      work: false,
      circle: false,
      creators: false,
      priceHistory: false,
    },
    errors: [],
  };

  try {
    // 1. APIデータをWorkDocumentに変換
    const workData = WorkMapper.toWork(apiData);
    
    // 2. 既存データの存在確認（スキップ判定用）
    if (!options?.forceUpdate) {
      const existingWork = await getWorkFromFirestore(workData.productId);
      if (existingWork && !hasSignificantChanges(existingWork, workData)) {
        logger.debug(`作品 ${workData.productId} は変更なしのためスキップ`);
        result.success = true;
        return result;
      }
    }

    // 3. バッチ処理で全て更新（部分的なトランザクション）
    const batch = firestore.batch();
    
    // 3.1 Work更新
    const workRef = firestore.collection('dlsiteWorks').doc(workData.productId);
    batch.set(workRef, workData, { merge: true });
    result.updates.work = true;

    // 3.2 Circle更新（別バッチだが連続実行）
    await updateCircleWithWork(
      apiData.maker_id,
      workData.productId,
      apiData.maker_name,
      apiData.maker_name_en
    );
    result.updates.circle = true;

    // バッチコミット
    await batch.commit();

    // 4. Creator更新（サブコレクション操作のため別処理）
    const creatorResult = await updateCreatorWorkMapping(apiData, workData.productId);
    if (creatorResult.success) {
      result.updates.creators = true;
    } else if (creatorResult.error) {
      result.errors.push(`Creator更新エラー: ${creatorResult.error}`);
    }

    // 5. 価格履歴（オプション）
    if (!options?.skipPriceHistory) {
      try {
        await savePriceHistory(workData.productId, apiData);
        result.updates.priceHistory = true;
      } catch (error) {
        result.errors.push(`価格履歴エラー: ${error}`);
      }
    }

    result.success = result.errors.length === 0;
    
  } catch (error) {
    result.errors.push(`統合処理エラー: ${error instanceof Error ? error.message : String(error)}`);
    logger.error(`統合データ処理エラー: ${apiData.workno}`, { error });
  }

  return result;
}

/**
 * 重要な変更があるかチェック
 */
function hasSignificantChanges(
  existing: WorkDocument,
  updated: WorkDocument
): boolean {
  // 価格変更
  if (existing.price.current !== updated.price.current) return true;
  
  // タイトル変更
  if (existing.title !== updated.title) return true;
  
  // 販売状態変更
  if (existing.salesStatus.isOnSale !== updated.salesStatus.isOnSale) return true;
  
  // 評価の大幅な変更
  if (Math.abs((existing.rating?.stars || 0) - (updated.rating?.stars || 0)) > 2) return true;
  
  return false;
}
```

### エンドポイントの更新

```typescript
// apps/functions/src/endpoints/dlsite-individual-info-api.ts の修正

async function executeUnifiedDataCollection(): Promise<UnifiedFetchResult> {
  // ... 既存の作品ID収集処理 ...

  // バッチ処理の実行
  for (const batch of batches) {
    const batchResults = await batchFetchIndividualInfo(batch, {
      maxConcurrent: MAX_CONCURRENT_API_REQUESTS,
      batchDelay: config.requestDelay,
    });

    // 統合処理の実行
    const processingPromises = Array.from(batchResults.entries()).map(
      async ([workId, apiData]) => {
        const result = await processUnifiedDLsiteData(apiData, {
          skipPriceHistory: false, // 全て更新
          forceUpdate: false,      // 差分チェックあり
        });
        
        if (!result.success) {
          logger.warn(`作品処理警告: ${workId}`, { errors: result.errors });
        }
        
        return result;
      }
    );

    const results = await Promise.allSettled(processingPromises);
    
    // 結果の集計
    results.forEach((result) => {
      if (result.status === 'fulfilled' && result.value.success) {
        successCount++;
      } else {
        failureCount++;
      }
    });
  }

  // ... 後続処理 ...
}
```

### メリット
1. **コードの集約**: 1つのAPIデータから全ての更新を1箇所で実行
2. **エラーの可視化**: どの更新が失敗したか明確
3. **柔軟性**: オプションで特定の更新をスキップ可能
4. **保守性**: 更新ロジックが1箇所に集約

## PR #8: データ整合性検証機能（再設計）

### 位置づけ
- **通常の更新処理（1時間ごと）とは独立した補完機能**
- **週次で実行し、データの正確性を保証**
- **即応性には影響しない**

### 目的
- 定期的にデータの整合性をチェック
- 不整合を検出して修正
- システムの健全性を維持

### 実装案

```typescript
// apps/functions/src/endpoints/data-integrity-check.ts

interface IntegrityCheckResult {
  timestamp: string;
  checks: {
    circleWorkCounts: {
      checked: number;
      mismatches: number;
      fixed: number;
    };
    orphanedCreators: {
      checked: number;
      found: number;
      cleaned: number;
    };
    workCircleConsistency: {
      checked: number;
      mismatches: number;
      fixed: number;
    };
  };
  totalIssues: number;
  totalFixed: number;
}

export const checkDataIntegrity = functions.pubsub
  .schedule('0 3 * * 0') // 毎週日曜日 3:00 JST
  .timeZone('Asia/Tokyo')
  .onRun(async (context) => {
    const result: IntegrityCheckResult = {
      timestamp: new Date().toISOString(),
      checks: {
        circleWorkCounts: { checked: 0, mismatches: 0, fixed: 0 },
        orphanedCreators: { checked: 0, found: 0, cleaned: 0 },
        workCircleConsistency: { checked: 0, mismatches: 0, fixed: 0 },
      },
      totalIssues: 0,
      totalFixed: 0,
    };

    // 1. CircleのworkIds配列の整合性チェック
    await checkCircleWorkCounts(result);
    
    // 2. 孤立したCreatorマッピングのクリーンアップ
    await checkOrphanedCreators(result);
    
    // 3. Work-Circle相互参照の整合性
    await checkWorkCircleConsistency(result);

    // 結果をログとFirestoreに保存
    await saveIntegrityCheckResult(result);
    
    logger.info('データ整合性チェック完了', result);
  });
```

### Terraform設定

```hcl
# terraform/scheduler_data_integrity.tf

resource "google_cloud_scheduler_job" "data_integrity_check" {
  name        = "data-integrity-check"
  description = "週次データ整合性チェック"
  schedule    = "0 3 * * 0"
  time_zone   = "Asia/Tokyo"
  
  pubsub_target {
    topic_name = google_pubsub_topic.data_integrity.id
    data       = base64encode(jsonencode({
      task = "check_data_integrity"
    }))
  }
}
```

## 実装優先順位（更新）

1. **PR #6: 統合更新処理の最適化**（1週間）
   - 既存の分散したロジックを統合
   - エラーハンドリングの改善
   - 差分チェックによる効率化
   - **1時間ごとの更新頻度は変更なし**

2. **PR #8: データ整合性検証機能**（3-4日）
   - 週次の自動チェック（通常の更新とは別）
   - 不整合の自動修正
   - レポート機能

## まとめ

### 現在の運用
- **1時間ごと**: `fetchDLsiteUnifiedData`が全作品データを更新（約5分）
- **コスト**: 月額約$0.29（十分に低い）
- **即応性**: 新作品や価格変更を1時間以内に反映

### 改善後の運用
- **1時間ごと**: 同じ頻度だが、より効率的で信頼性の高い処理
  - 統合された更新処理（PR #6）
  - 差分チェックで無駄な更新をスキップ
  - エラー追跡の改善
- **週次**: データ整合性チェック（PR #8）
  - 通常の更新とは独立
  - データの正確性を保証

### 削除された提案
- 日次・週次・月次の差分更新モード → YAGNI原則により不要と判断
- Cloud Tasks並列処理 → 実装量が大きくスコープから除外
- 監視・アラート設定 → 実装量が大きくスコープから除外