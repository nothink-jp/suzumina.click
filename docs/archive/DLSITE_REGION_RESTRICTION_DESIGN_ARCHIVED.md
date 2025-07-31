# DLsite リージョン制限対応設計書

> **📅 作成日**: 2025年7月11日  
> **📅 最終更新**: 2025年7月11日  
> **🎯 目的**: DLsiteリージョン制限作品の完全網羅システム設計  
> **📋 対象**: 涼花みなせ様作品の全作品データ取得実現  
> **✅ ステータス**: Phase 0-2 実装完了・Phase 3-4 準備中

## 🔍 問題分析

### 現状の制限事項

**地域差異の実態**:
- **ローカル（日本）**: 1,488作品収集可能 ✅
- **リモート（Cloud Functions）**: 1,132作品のみ ⚠️
- **差異**: 356作品（23.92%）がリモートでアクセス不可 ❌

**Individual Info API制限**:
- リージョン制限作品は Individual Info API でも `404 Not Found`
- DLsiteの地域制限はAPI レベルで実装されている
- 現在のシステムは技術的制約の範囲内で正常動作

### 🎯 ユーザー要求

**完全網羅の実現**:
> 「可能なら涼花みなせ様の作品を全て網羅したいです。手作業でも構いません。」

**要求分析**:
1. 全1,488作品の情報取得・表示
2. リージョン制限作品の存在明示
3. 手動作業を含む柔軟な対応
4. 将来的なデータ更新体制

---

## 🏗️ 設計方針

### アーキテクチャ原則

**1. 段階的実装**
- Phase 0: Cloud Functions実装簡素化（和集合処理削除）
- Phase 1: リージョン制限フラグシステム
- Phase 2: ローカルデータ収集ツール  
- Phase 3: 手動データ投入ワークフロー

**2. 効率性最優先**
- **Cloud Functions簡素化**: 無効な和集合処理を削除し性能向上
- **リソース最適化**: 356件の無駄なAPI呼び出しを排除
- **実行時間短縮**: 不要な処理を削除してコスト削減

**3. データ完全性保証**
- assets/dlsite-work-ids.json を真実の情報源として維持（ローカル用）
- Cloud Functionsは現在リージョンのみ処理（1,132作品）
- リージョン制限作品は別途ローカル収集で対応

**4. 明確な責務分離**
- **Cloud Functions**: 現在リージョンで取得可能な作品のみ処理
- **ローカルツール**: 全作品の収集・制限作品の補完
- **手動入力**: 技術的制約を超えた完全網羅

---

## 📊 データ設計

### 1. リージョン制限フラグシステム

#### Firestore作品データ拡張

```typescript
// packages/shared-types/src/dlsite.ts
interface OptimizedFirestoreDLsiteWorkData {
  // 既存フィールド...
  
  // 🆕 リージョン制限関連フィールド
  regionRestricted?: boolean;              // リージョン制限フラグ
  regionRestrictedReason?: RegionRestrictionReason; // 制限理由
  regionRestrictedDetectedAt?: string;     // 制限検出日時
  lastRegionAttemptAt?: string;           // 最終アクセス試行日時
  availableInRegions?: string[];          // 取得可能リージョン
  localDataSource?: boolean;              // ローカル収集データかどうか
}

// 制限理由の分類
type RegionRestrictionReason = 
  | 'API_NOT_FOUND'           // Individual Info API で404
  | 'SEARCH_NOT_VISIBLE'      // 検索結果に表示されない
  | 'GEOGRAPHIC_RESTRICTION'  // 地理的制限
  | 'CONTENT_POLICY'          // コンテンツポリシー制限
  | 'UNKNOWN';                // 不明な理由
```

#### 専用管理コレクション

```typescript
// 新規コレクション: regionRestrictedWorks
interface RegionRestrictedWork {
  workId: string;                    // 作品ID
  title?: string;                    // 作品タイトル（ローカル取得時）
  detectedAt: string;               // 制限検出日時
  detectionMethod: DetectionMethod; // 検出方法
  lastAttemptAt: string;           // 最終試行日時
  attemptCount: number;            // 試行回数
  errorDetails: {                  // エラー詳細
    httpStatus?: number;
    errorMessage?: string;
    apiEndpoint?: string;
  };
  localDataAvailable?: boolean;    // ローカルデータ有無
  manualDataEntry?: {              // 手動入力データ
    enteredAt: string;
    enteredBy: string;
    dataSource: string;
  };
}

type DetectionMethod = 
  | 'INDIVIDUAL_API_404'    // Individual Info API 404エラー
  | 'SEARCH_MISSING'        // 検索結果未含有
  | 'ASSET_FILE_DIFF'       // アセットファイル差分
  | 'MANUAL_DETECTION';     // 手動検出
```

### 2. ローカルデータ収集設計

#### 拡張データ収集

```typescript
// ローカル環境での詳細データ取得
interface LocalCollectedWorkData {
  workId: string;
  collectedAt: string;
  collectionMethod: 'INDIVIDUAL_API' | 'MANUAL_ENTRY' | 'HYBRID';
  
  // 基本作品情報
  basicInfo: OptimizedFirestoreDLsiteWorkData;
  
  // 追加メタデータ
  metadata: {
    collectorVersion: string;    // 収集ツールバージョン
    collectionEnvironment: string; // 収集環境
    dataQuality: 'COMPLETE' | 'PARTIAL' | 'MANUAL'; // データ品質
    verificationStatus: boolean; // 検証済みかどうか
  };
}
```

---

## 🔧 実装設計

### Phase 0: Cloud Functions実装簡素化（最優先）

#### 0.1 和集合処理削除

**現在の無効なフロー**:
```typescript
// 削除対象: 無駄な処理フロー
collectWorkIds() → createUnion(asset + current) → Individual API calls → 356件404エラー
```

**簡素化後の効率的フロー**:
```typescript
// 新しいシンプルフロー
collectWorkIds() → Individual API calls (現在リージョンのみ)
```

**削除対象ファイル・機能**:
```typescript
// work-id-validator.ts
- createUnionWorkIds() 関数削除
- validateWorkIdList() のアセットファイル処理削除
- リージョン差異検証ロジック削除

// dlsite-individual-info-api.ts  
- assets/dlsite-work-ids.json 読み込み処理削除
- 和集合作成処理削除
- 356件の無駄なAPI呼び出し削除

// 保持する機能
- collectWorkIdsForProduction() (現在リージョン収集)
- Individual Info API呼び出し (有効IDのみ)
- データ保存・更新処理
```

#### 0.2 性能向上効果

**削減される処理**:
- ✅ ファイル読み込み: assets/dlsite-work-ids.json (1,488件)
- ✅ 和集合計算: O(n) の差分・統合処理
- ✅ 無効API呼び出し: 356件 × Individual Info API
- ✅ 無駄なログ出力: リージョン差異関連

**期待される改善**:
- ⚡ 実行時間: 30-40%短縮
- 💰 コスト削減: API呼び出し356件削減
- 🧹 コード簡素化: 複雑なロジック削除
- 📊 ログクリーンアップ: 必要な情報のみ

---

### Phase 1: リージョン制限検出システム

#### 1.1 検出ロジック拡張

```typescript
// services/dlsite/individual-info-api-client.ts
async function fetchIndividualWorkInfo(workId: string): Promise<WorkData | null> {
  try {
    const response = await makeRequest(/* ... */);
    
    if (response.status === 404) {
      // 🆕 リージョン制限検出ロジック
      await detectAndRecordRegionRestriction(workId, {
        method: 'INDIVIDUAL_API_404',
        httpStatus: 404,
        apiEndpoint: url,
        detectedAt: new Date().toISOString()
      });
      
      logger.warn(`🌏 リージョン制限を検出: ${workId}`, {
        operation: 'regionRestrictionDetected',
        workId,
        reason: 'INDIVIDUAL_API_404'
      });
      
      return null;
    }
    
    // 成功時は制限フラグをクリア
    await clearRegionRestrictionFlag(workId);
    return mapToWorkData(response.data);
    
  } catch (error) {
    // エラーハンドリング...
  }
}

// 🆕 制限検出・記録機能
async function detectAndRecordRegionRestriction(
  workId: string, 
  detectionInfo: DetectionInfo
): Promise<void> {
  // assets/dlsite-work-ids.json に存在するかチェック
  const isInAssetFile = await checkWorkIdInAssetFile(workId);
  
  if (isInAssetFile) {
    // works コレクションにフラグ設定
    await updateWorkRegionRestriction(workId, {
      regionRestricted: true,
      regionRestrictedReason: 'API_NOT_FOUND',
      regionRestrictedDetectedAt: detectionInfo.detectedAt,
      lastRegionAttemptAt: detectionInfo.detectedAt
    });
    
    // regionRestrictedWorks コレクションに記録
    await recordRegionRestrictedWork(workId, detectionInfo);
  }
}
```

#### 1.2 差分検出強化

```typescript
// services/dlsite/work-id-validator.ts
async function detectRegionRestrictedWorks(): Promise<RegionDifferenceReport> {
  const assetWorkIds = await loadAssetFileWorkIds();
  const currentRegionIds = await collectWorkIdsForProduction();
  
  const missingInCurrentRegion = assetWorkIds.filter(
    id => !currentRegionIds.includes(id)
  );
  
  // 🆕 各未取得作品のリージョン制限検出
  for (const workId of missingInCurrentRegion) {
    await detectAndRecordRegionRestriction(workId, {
      method: 'ASSET_FILE_DIFF',
      detectedAt: new Date().toISOString()
    });
  }
  
  return {
    totalAssetWorks: assetWorkIds.length,
    currentRegionWorks: currentRegionIds.length,
    regionRestrictedWorks: missingInCurrentRegion.length,
    regionRestrictedIds: missingInCurrentRegion
  };
}
```

### Phase 2: ローカルデータ収集ツール

#### 2.1 拡張収集ツール

```typescript
// development/core/local-data-collector.ts
class LocalDataCollector {
  /**
   * ローカル環境での完全データ収集
   */
  async collectCompleteLocalData(): Promise<LocalCollectionResult> {
    logger.info("🏠 ローカル完全データ収集開始");
    
    const assetWorkIds = await this.loadAssetFileWorkIds();
    const results: LocalCollectedWorkData[] = [];
    const errors: CollectionError[] = [];
    
    for (const workId of assetWorkIds) {
      try {
        // Individual Info API でデータ取得試行
        const workData = await this.fetchLocalWorkData(workId);
        
        if (workData) {
          results.push({
            workId,
            collectedAt: new Date().toISOString(),
            collectionMethod: 'INDIVIDUAL_API',
            basicInfo: workData,
            metadata: {
              collectorVersion: '1.0.0',
              collectionEnvironment: 'local-japan',
              dataQuality: 'COMPLETE',
              verificationStatus: true
            }
          });
          
          logger.info(`✅ ローカル収集成功: ${workId}`);
        } else {
          // ローカルでも取得できない場合
          errors.push({
            workId,
            error: 'LOCAL_COLLECTION_FAILED',
            timestamp: new Date().toISOString()
          });
          
          logger.warn(`⚠️ ローカル収集失敗: ${workId}`);
        }
        
        // レート制限対応
        await new Promise(resolve => setTimeout(resolve, 200));
        
      } catch (error) {
        errors.push({
          workId,
          error: error.message,
          timestamp: new Date().toISOString()
        });
      }
    }
    
    return {
      totalAttempted: assetWorkIds.length,
      successfulCollections: results.length,
      failedCollections: errors.length,
      collectedData: results,
      errors
    };
  }
  
  /**
   * Firestoreへの安全なデータ投入
   */
  async uploadToFirestore(
    localData: LocalCollectedWorkData[]
  ): Promise<UploadResult> {
    logger.info(`🔄 Firestore投入開始: ${localData.length}件`);
    
    const batches = this.createBatches(localData, 500); // Firestore制限対応
    const results: UploadBatchResult[] = [];
    
    for (const [index, batch] of batches.entries()) {
      try {
        const batchResult = await this.uploadBatch(batch);
        results.push(batchResult);
        
        logger.info(`✅ バッチ${index + 1}/${batches.length}完了: ${batchResult.successCount}件`);
        
        // バッチ間の待機
        await new Promise(resolve => setTimeout(resolve, 1000));
        
      } catch (error) {
        logger.error(`❌ バッチ${index + 1}投入失敗:`, error);
        results.push({
          batchIndex: index,
          successCount: 0,
          errorCount: batch.length,
          errors: [error.message]
        });
      }
    }
    
    return this.aggregateUploadResults(results);
  }
}
```

#### 2.2 手動データ入力支援

```typescript
// development/core/manual-data-entry.ts
class ManualDataEntryTool {
  /**
   * 手動データ入力用のテンプレート生成
   */
  async generateDataEntryTemplate(
    regionRestrictedWorks: string[]
  ): Promise<ManualEntryTemplate> {
    const template = {
      metadata: {
        generatedAt: new Date().toISOString(),
        targetWorks: regionRestrictedWorks.length,
        entryInstructions: [
          "1. 各作品IDについて、利用可能な情報源から基本情報を入力",
          "2. title, price, ratingは最低限必要",
          "3. 不明な項目は null または空文字で記入",
          "4. dataSource に情報源を明記"
        ]
      },
      entries: regionRestrictedWorks.map(workId => ({
        workId,
        title: "",
        price: null,
        rating: null,
        description: "",
        tags: [],
        dataSource: "", // "official_site" | "manual_research" | "user_report"
        entryStatus: "pending", // "pending" | "completed" | "verified"
        notes: ""
      }))
    };
    
    return template;
  }
  
  /**
   * 手動入力データの検証・投入
   */
  async processManualEntries(
    entries: ManualEntry[]
  ): Promise<ManualEntryResult> {
    const validatedEntries = [];
    const validationErrors = [];
    
    for (const entry of entries) {
      const validation = await this.validateManualEntry(entry);
      
      if (validation.isValid) {
        validatedEntries.push({
          ...entry,
          processedAt: new Date().toISOString(),
          dataQuality: 'MANUAL',
          manualDataEntry: {
            enteredAt: new Date().toISOString(),
            enteredBy: 'manual-operator',
            dataSource: entry.dataSource
          }
        });
      } else {
        validationErrors.push({
          workId: entry.workId,
          errors: validation.errors
        });
      }
    }
    
    return {
      validEntries: validatedEntries.length,
      invalidEntries: validationErrors.length,
      data: validatedEntries,
      errors: validationErrors
    };
  }
}
```

### Phase 3: 統合ワークフロー

#### 3.1 完全網羅プロセス

```typescript
// development/workflows/complete-coverage-workflow.ts
class CompleteCoverageWorkflow {
  async executeCompleteCoverage(): Promise<CompleteCoverageResult> {
    logger.info("🎯 涼花みなせ様作品完全網羅開始");
    
    // Step 1: リージョン制限検出
    const regionAnalysis = await this.analyzeRegionRestrictions();
    
    // Step 2: ローカルデータ収集
    const localCollection = await this.executeLocalCollection();
    
    // Step 3: 手動データ入力準備
    const manualEntryPrep = await this.prepareManualEntry();
    
    // Step 4: 統合・投入
    const integration = await this.integrateAllData();
    
    // Step 5: 検証・レポート
    const verification = await this.verifyCompleteness();
    
    return {
      totalWorks: 1488,
      automaticCollection: localCollection.successCount,
      manualEntries: manualEntryPrep.pendingEntries,
      completeness: verification.completenessPercentage,
      steps: {
        regionAnalysis,
        localCollection,
        manualEntryPrep,
        integration,
        verification
      }
    };
  }
}
```

---

## 🎛️ UI・表示設計

### フロントエンド対応

#### 作品カード表示拡張

```typescript
// apps/web/src/components/DLsiteWorkCard.tsx
interface WorkCardProps {
  work: DLsiteWorkData;
  showRegionInfo?: boolean;
}

function DLsiteWorkCard({ work, showRegionInfo = true }: WorkCardProps) {
  return (
    <div className="work-card">
      {/* 既存の作品情報表示 */}
      
      {/* 🆕 リージョン制限情報表示 */}
      {work.regionRestricted && showRegionInfo && (
        <div className="region-restriction-badge">
          <Icon name="globe" />
          <span>日本国内限定作品</span>
          <Tooltip content={`
            この作品は地域制限により詳細情報を取得できません。
            検出日時: ${work.regionRestrictedDetectedAt}
            理由: ${work.regionRestrictedReason}
          `} />
        </div>
      )}
      
      {/* データソース表示 */}
      {work.localDataSource && (
        <div className="data-source-badge">
          <Icon name="home" />
          <span>ローカル収集データ</span>
        </div>
      )}
    </div>
  );
}
```

#### 統計ダッシュボード

```typescript
// apps/web/src/components/CompleteCoverageStats.tsx
interface CoverageStats {
  totalWorks: number;
  availableWorks: number;
  regionRestrictedWorks: number;
  manualEntries: number;
  completenessPercentage: number;
}

function CompleteCoverageStats({ stats }: { stats: CoverageStats }) {
  return (
    <div className="coverage-dashboard">
      <h3>🎯 涼花みなせ様作品収録状況</h3>
      
      <div className="stats-grid">
        <StatCard
          title="総作品数"
          value={stats.totalWorks}
          subtitle="全リージョン確認済み"
          icon="list"
        />
        
        <StatCard
          title="詳細情報取得済み"
          value={stats.availableWorks}
          subtitle={`${((stats.availableWorks / stats.totalWorks) * 100).toFixed(1)}%`}
          icon="check"
          color="green"
        />
        
        <StatCard
          title="リージョン制限作品"
          value={stats.regionRestrictedWorks}
          subtitle="存在確認済み"
          icon="globe"
          color="orange"
        />
        
        <StatCard
          title="手動入力データ"
          value={stats.manualEntries}
          subtitle="補完収集済み"
          icon="edit"
          color="blue"
        />
      </div>
      
      <ProgressBar
        value={stats.completenessPercentage}
        max={100}
        label={`網羅率: ${stats.completenessPercentage.toFixed(1)}%`}
      />
    </div>
  );
}
```

---

## 📋 運用ワークフロー

### 定期メンテナンス

#### 週次データ更新

```typescript
// 1. リージョン制限検出
pnpm --filter @suzumina.click/functions tools:detect-region-restrictions

// 2. ローカル完全収集
pnpm --filter @suzumina.click/functions tools:collect-local-complete

// 3. 手動入力テンプレート生成
pnpm --filter @suzumina.click/functions tools:generate-manual-template

// 4. データ統合・投入
pnpm --filter @suzumina.click/functions tools:integrate-complete-data

// 5. 完全性検証
pnpm --filter @suzumina.click/functions tools:verify-completeness
```

#### 月次品質確認

```typescript
// 1. データ品質監査
pnpm --filter @suzumina.click/functions tools:audit-data-quality

// 2. リージョン制限再確認
pnpm --filter @suzumina.click/functions tools:recheck-region-restrictions

// 3. 手動データ更新確認
pnpm --filter @suzumina.click/functions tools:review-manual-entries

// 4. 完全網羅レポート生成
pnpm --filter @suzumina.click/functions tools:generate-coverage-report
```

---

## 🚀 実装計画

### Phase 0: Cloud Functions簡素化（✅ 完了）
- [x] 問題分析・設計完了
- [x] 和集合処理削除（work-id-validator.ts）
- [x] Individual Info API 簡素化（dlsite-individual-info-api.ts）
- [x] 不要なアセットファイル読み込み削除
- [x] ログ出力クリーンアップ
- [x] 性能向上効果確認（356件の無駄なAPI呼び出し削除）

### Phase 1: 基盤システム（✅ 完了）
- [x] リージョン制限フラグシステム実装
- [x] 差分検出ロジック強化
- [x] regionRestrictedWorksコレクション設計・実装
- [x] 検出方法分類システム実装

### Phase 2: ローカル収集（✅ 完了）
- [x] ローカルデータ収集ツール開発（local-complete-collector.ts）
- [x] リージョン制限検出システム（region-restriction-detector.ts）
- [x] Firestore投入システム
- [x] バッチ処理・エラーハンドリング
- [x] package.json実行スクリプト追加
- [x] 本番環境デバッグログ削除・最適化

### Phase 3: 手動入力支援（🔄 準備中）
- [ ] 手動入力テンプレート生成ツール
- [ ] CSV/JSON形式対応データ検証システム
- [ ] 手動データ統合ワークフロー
- [ ] データ品質チェック・バリデーション

### Phase 4: 統合・完成（🔄 準備中）
- [ ] 完全網羅ワークフローツール
- [ ] フロントエンドUI統計ダッシュボード
- [ ] リージョン制限表示対応
- [ ] 運用ドキュメント・E2Eテスト

---

## 📊 期待される成果

### 定量的効果

- **作品網羅率**: 76% → **100%** (全1,488作品)
- **データ品質**: リージョン制限の明確な可視化
- **運用効率**: 手動作業の最適化・自動化

### 定性的効果

- **完全性の保証**: 涼花みなせ様の全作品を網羅
- **透明性の向上**: 制限理由の明確化
- **将来拡張性**: 他声優さんへの適用可能

### ユーザー体験向上

- **情報の完全性**: 存在する全作品の認知
- **制限の明確化**: アクセスできない理由の理解
- **段階的改善**: 継続的なデータ品質向上

---

## 💡 まとめ

### 🎉 実装進捗状況（2025年7月11日現在）

**✅ Phase 0-2 完了**: DLsiteリージョン制限システムの基盤実装が完了し、**涼花みなせ様の全1,488作品を完全網羅**するためのツールが利用可能になりました。

**実装済み機能**:
1. **Cloud Functions簡素化**: 356件の無駄なAPI呼び出しを削除し、性能向上を実現
2. **リージョン制限検出**: 自動的に制限作品を識別・フラグ設定
3. **ローカル完全収集**: 日本国内環境での全作品データ収集ツール
4. **バッチ処理システム**: 安全なFirestore投入・エラーハンドリング
5. **開発ツール統合**: package.jsonスクリプトによる簡単実行

**核心的アプローチ**:
1. **技術的制約の受容**: リージョン制限は回避不可として設計 ✅
2. **段階的データ収集**: 自動→手動→統合の柔軟なワークフロー（Phase 2まで完了）
3. **透明性の確保**: 制限状況の明確な可視化システム ✅
4. **継続的改善**: 運用しながらの品質向上体制 ✅

### 🚀 次のステップ（Phase 3-4）

Phase 3-4の実装により、手作業を含む柔軟なアプローチで技術的制約を超えた**完全網羅**を実現し、ファンの皆様に最高の体験を提供する準備が整いました。