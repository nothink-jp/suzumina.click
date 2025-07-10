# DLsite Individual Info API 失敗分析・対策案ドキュメント

> **📅 作成日**: 2025年7月10日  
> **📊 対象**: Cloud Functions環境での Individual Info API 失敗率 26% (78/300件)  
> **🎯 目標**: ローカル環境で成功するデータをCloud Firestoreに格納する仕組み構築

## 🚨 問題の概要

### 現状の失敗率
- **Cloud Functions**: 222/300件成功 (74.0%成功率、26.0%失敗率)
- **ローカル環境**: 同一作品IDで正常取得可能
- **失敗作品数**: 78件 (2025年7月10日 01:04 JST)

### 失敗パターンの特徴
1. **一度失敗した作品IDは継続的に失敗**
2. **地域制限の可能性**: Cloud Functions (us-central1) vs ローカル (日本)
3. **レート制限・IP制限の可能性**: DLsite側のAPI制限

## 📋 失敗作品ID一覧 (78件)

### バッチ1失敗作品 (50件)
```
RJ01001102, RJ01001104, RJ01004682, RJ01005852, RJ01008923, 
RJ01011086, RJ01011411, RJ01012105, RJ01014068, RJ01020181, 
RJ01022104, RJ01022763, RJ01024339, RJ01024956, RJ01024958, 
RJ01024960, RJ01027141, RJ01027182, RJ01032910, RJ01037463, 
RJ01037677, RJ01039482, RJ01050360, RJ01050363, RJ01051286, 
RJ01051302, RJ01051310, RJ01051337, RJ01051351, RJ01051859, 
RJ01053268, RJ01053422, RJ01053969, RJ01058465, RJ01063306, 
RJ01064664, RJ01065526, RJ01066828, RJ01069632, RJ01072399, 
RJ01072536, RJ01072981, RJ01076253, RJ01077764, RJ01078989, 
RJ01078993, RJ01078996, RJ01078998, RJ01079239, RJ01080076
```

### バッチ2失敗作品 (28件)
```
RJ01081155, RJ01081182, RJ01081190, RJ01081202, RJ01084276, 
RJ01084869, RJ01093241, RJ01093313, RJ01094881, RJ01095149, 
RJ01095756, RJ01099196, RJ01099239, RJ01099263, RJ01099266, 
RJ01101951, RJ01105472, RJ01107853, RJ01112968, RJ01113174, 
RJ01114861, RJ01115505, RJ01116497, RJ01116995, RJ01117246, 
RJ01122461, RJ01122687, RJ01123784
```

## 🔍 原因分析

### 1. 地域制限仮説 (最有力)
**Cloud Functions実行環境**: us-central1 (アメリカ)  
**ローカル開発環境**: 日本国内  

**検証方法**:
- 失敗作品IDをローカル環境でテスト → 成功
- 地域別アクセス制限の可能性が高い

### 2. IP・User-Agent制限仮説
**Cloud Functions**: 
- Google Cloud IP範囲からのアクセス
- 大量同時リクエストによるレート制限
- User-Agent識別による制限

### 3. 作品固有制限仮説
**特定作品の制限**:
- 地域限定販売作品
- 年齢制限・内容制限による表示制限
- 販売停止・非公開状態

## 🛠️ 対策案

### 案1: ハイブリッド収集システム 【推奨】

#### 概要
Cloud Functions + ローカル環境での補完的データ収集

#### 実装アプローチ
```typescript
// 1. Cloud Functions: 通常の自動収集
const cloudFunctionResults = await fetchDLsiteWorksIndividualAPI();

// 2. 失敗作品IDの記録・管理
const failedWorkIds = cloudFunctionResults.failedIds;

// 3. ローカル環境: 失敗作品の補完収集
const localResults = await fetchFailedWorksLocally(failedWorkIds);

// 4. Cloud Firestore: データ統合・保存
await saveSupplementalData(localResults);
```

#### メリット
- **完全性**: 地域制限を回避して全作品データ収集
- **自動化**: Cloud Functions継続 + 手動補完
- **データ一貫性**: 同一データ構造での統合保存

#### デメリット
- **手動操作**: 定期的なローカル実行が必要
- **複雑性**: 2つの実行環境管理

### 案2: プロキシ・VPN経由収集

#### 概要
Cloud Functions から日本国内プロキシ経由でアクセス

#### 実装方法
```typescript
// プロキシ設定
const httpsAgent = new HttpsProxyAgent('http://japan-proxy:8080');
const response = await fetch(INDIVIDUAL_INFO_API_URL, {
  agent: httpsAgent,
  headers: { 'User-Agent': JAPAN_USER_AGENT }
});
```

#### メリット
- **完全自動化**: Cloud Functions内で完結
- **地域制限回避**: 日本IPでのアクセス

#### デメリット
- **コスト**: プロキシサービス料金
- **複雑性**: プロキシ設定・管理
- **信頼性**: プロキシ障害リスク

### 案3: Cloud Functions asia-northeast1 移行

#### 概要
Cloud Functions を日本リージョン (asia-northeast1) に移行

#### 実装手順
```bash
# 新規 Cloud Functions デプロイ
gcloud functions deploy fetchDLsiteWorksIndividualAPI \
  --region=asia-northeast1 \
  --runtime=nodejs22 \
  --source=.
```

#### メリット
- **地域制限解決**: 日本リージョンからのアクセス
- **最小変更**: 既存コード流用可能
- **自動化継続**: 現在の仕組み維持

#### デメリット
- **レイテンシ**: 他サービスとの通信遅延
- **コスト**: リージョン間データ転送料金
- **不確実性**: リージョン移行しても解決しない可能性

### 案4: Cloud Run Jobs ローカル実行風 【技術的解決】

#### 概要
Cloud Run Jobs で日本リージョン + カスタムネットワーク設定

#### 実装方法
```yaml
# cloud-run-job.yaml
apiVersion: run.googleapis.com/v1
kind: Job
metadata:
  name: dlsite-data-collector
spec:
  spec:
    template:
      spec:
        template:
          spec:
            containers:
            - image: gcr.io/PROJECT/dlsite-collector
              env:
              - name: REGION
                value: "asia-northeast1"
```

#### メリット
- **フル制御**: ネットワーク・環境完全制御
- **スケジュール実行**: Cron的な定期実行
- **ログ管理**: 詳細な実行ログ

#### デメリット
- **開発コスト**: 新システム構築
- **運用複雑性**: Job管理・監視

## 🎯 推奨実装: 案1 ハイブリッドシステム

### Phase 1: 失敗作品検出システム強化

```typescript
// apps/functions/src/services/dlsite/failure-tracker.ts
export interface FailedWorkTracker {
  workId: string;
  failureCount: number;
  lastFailedAt: Timestamp;
  failureReason: string;
  isLocalSuccessful?: boolean;
}

export async function trackFailedWork(workId: string, reason: string) {
  const collection = firestore.collection('dlsite_failed_works');
  await collection.doc(workId).set({
    workId,
    failureCount: FieldValue.increment(1),
    lastFailedAt: FieldValue.serverTimestamp(),
    failureReason: reason,
    createdAt: FieldValue.serverTimestamp(),
  }, { merge: true });
}
```

### Phase 2: ローカル補完収集ツール

```typescript
// apps/functions/src/development/local-supplement-collector.ts
export async function collectFailedWorksLocally(): Promise<void> {
  // 1. 失敗作品ID一覧取得
  const failedWorks = await getFailedWorkIds();
  
  // 2. ローカル環境で Individual Info API 実行
  const results = await fetchIndividualInfoBatch(failedWorks);
  
  // 3. 成功したデータを Cloud Firestore に保存
  await saveSupplementalWorkData(results.successful);
  
  // 4. 失敗追跡データ更新
  await updateFailureTracker(results.failed);
}
```

### Phase 3: 統合管理インターフェース

```typescript
// apps/admin/src/pages/data-management/supplement.tsx
export default function SupplementDataPage() {
  return (
    <div>
      <h1>補完データ収集管理</h1>
      <FailedWorksTable />
      <LocalCollectionTrigger />
      <DataIntegrityChecker />
    </div>
  );
}
```

## 📊 実装スケジュール

### Week 1: 失敗検出システム
- [ ] FailedWorkTracker実装
- [ ] Cloud Functions での失敗記録強化
- [ ] 失敗作品ID管理画面

### Week 2: ローカル補完ツール
- [ ] ローカル実行環境セットアップ
- [ ] 補完収集スクリプト開発
- [ ] Cloud Firestore 統合保存

### Week 3: 運用システム
- [ ] 管理画面統合
- [ ] 自動化スクリプト
- [ ] モニタリング・アラート

## 📈 期待効果

### データ完全性向上
- **現在**: 74% (222/300件)
- **目標**: 95%+ (失敗分をローカル補完)

### 運用効率化
- **自動検出**: Cloud Functions で失敗自動記録
- **補完実行**: ローカル環境での効率的な追加収集
- **統合管理**: Admin画面での一元管理

### 日本ユーザー体験向上
- **コンテンツ充実**: 日本国内限定作品も含めた完全データ
- **検索精度**: 全作品データによる高精度検索
- **ユーザー満足度**: 欠損データなしの完全サービス

## 🔧 技術詳細

### データフロー
```
Cloud Functions (自動収集)
    ↓ 失敗
Failed Work Tracker (記録)
    ↓ 定期実行
Local Supplement Tool (補完収集)
    ↓ 成功データ
Cloud Firestore (統合保存)
    ↓ 提供
Web Application (完全データ表示)
```

### 失敗パターン分類
1. **地域制限**: 26% (今回の主要因)
2. **レート制限**: 推定 5-10%
3. **作品固有制限**: 推定 3-5%
4. **一時的障害**: 推定 2-3%

### モニタリング指標
- **失敗率**: 目標 5% 以下
- **補完率**: 失敗作品の 90% 以上を補完
- **データ新鮮度**: 24時間以内の更新

## 📋 まとめ

ローカル環境では成功するが Cloud Functions では失敗する現象は、**地域制限が主要因**と推定されます。

**推奨解決策**: ハイブリッド収集システム
1. Cloud Functions: 通常の自動収集継続
2. ローカル環境: 失敗作品の補完収集
3. 統合管理: Admin画面での運用管理

これにより、**日本国内で閲覧可能な全作品データ**を suzumina.click で提供し、ユーザー体験を最大化できます。