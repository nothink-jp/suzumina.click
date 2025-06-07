# DLsite作品取得インフラ設定

DLsite作品データを1時間に1回自動取得するためのGCPインフラ設定です。

## アーキテクチャ

```
Cloud Scheduler → Pub/Sub → Cloud Functions v2 → Firestore
```

## 設定されたリソース

### 1. Cloud Scheduler
- **ジョブ名**: `fetch-dlsite-works-hourly`
- **スケジュール**: `49 * * * *` (毎時49分実行)
- **タイムゾーン**: Asia/Tokyo
- **説明**: DLsite作品を毎時間取得するためのPub/Subトピックをトリガー

### 2. Pub/Sub
- **トピック名**: `dlsite-works-fetch-trigger`
- **用途**: Cloud SchedulerからCloud Functionsへのメッセージ配信

### 3. Cloud Functions v2
- **関数名**: `fetchDLsiteWorks`
- **ランタイム**: Node.js 22
- **メモリ**: 512Mi
- **タイムアウト**: 540秒 (9分)
- **トリガー**: Pub/Sub (`dlsite-works-fetch-trigger`)
- **エントリポイント**: `fetchDLsiteWorks`

### 4. サービスアカウント
- **名前**: `fetch-dlsite-works-sa`
- **権限**:
  - `roles/datastore.user` (Firestore読み書き)
  - `roles/logging.logWriter` (ログ書き込み)
  - `roles/run.invoker` (Cloud Run呼び出し)

### 5. IAM設定
- Cloud Scheduler Service Agent → Pub/Sub Publisher権限
- Pub/Sub Service Agent → Token Creator権限 (DLsite関数SA)
- Eventarc Service Agent → Event Receiver権限
- Eventarc Service Agent → Run Invoker権限

## スケジュール

| 関数 | 実行時間 | 頻度 |
|------|----------|------|
| YouTube動画取得 | 毎時19分 | 1時間に1回 |
| DLsite作品取得 | 毎時49分 | 1時間に1回 |

※ YouTube取得とDLsite取得は30分間隔で実行され、リソースの競合を避けています。

## デプロイ

### 前提条件
- Terraformがインストールされていること
- GCPプロジェクトが設定されていること
- 必要なAPIが有効化されていること

### 手順
1. Terraformでインフラをデプロイ:
```bash
cd terraform
terraform plan
terraform apply
```

2. GitHub Actionsで関数コードをデプロイ:
- `apps/functions`のコードが変更されると自動デプロイされます
- `fetchDLsiteWorks`関数が`index.ts`でエクスポートされている必要があります

### 確認
1. Cloud Schedulerでジョブが作成されていることを確認
2. Pub/Subでトピックが作成されていることを確認
3. Cloud Functionsで関数が作成されていることを確認
4. Firestoreの`dlsite-works`コレクションにデータが保存されることを確認

## モニタリング

### ログ確認
```bash
# Cloud Functionsのログを確認
gcloud functions logs read fetchDLsiteWorks --limit=50

# Cloud Schedulerのログを確認
gcloud logging read "resource.type=cloud_scheduler_job AND resource.labels.job_id=fetch-dlsite-works-hourly" --limit=10
```

### メトリクス
- Cloud Functions実行回数・成功率
- Cloud Scheduler実行状況
- Firestore書き込み操作数
- エラー率・実行時間

## トラブルシューティング

### よくある問題
1. **IAM権限エラー**: サービスアカウントの権限設定を確認
2. **タイムアウトエラー**: 関数のタイムアウト設定を調整
3. **メモリ不足**: 関数のメモリ割り当てを増加
4. **ネットワークエラー**: DLsiteへのアクセスが制限されていないか確認

### ログの確認方法
```bash
# 最新のエラーログを確認
gcloud logging read "resource.type=cloud_function AND resource.labels.function_name=fetchDLsiteWorks AND severity>=ERROR" --limit=10 --format="table(timestamp,severity,textPayload)"
```

## セキュリティ

### 最小権限の原則
- 各サービスアカウントは必要最小限の権限のみ付与
- Secret Managerを使用した機密情報の管理
- VPCファイアウォールルールによるネットワーク制御

### 監査ログ
- Cloud Audit Logsが有効化されており、すべてのリソースアクセスが記録されます

## コスト最適化

### リソース設定
- **最小インスタンス数**: 0 (コールドスタート許容)
- **最大インスタンス数**: 1 (同時実行制限)
- **メモリ**: 512Mi (最適なコストパフォーマンス)
- **実行頻度**: 1時間に1回 (必要最小限)

### 予想コスト
- Cloud Functions: 月額約$0.50-1.00
- Cloud Scheduler: 月額約$0.10
- Pub/Sub: 月額約$0.10
- **合計**: 月額約$0.70-1.20

## 関連ドキュメント
- [CLOUD_DEPLOYMENT.md](./CLOUD_DEPLOYMENT.md) - 全体のデプロイ手順
- [DESIGN_PLAN_DLSITE.md](./DESIGN_PLAN_DLSITE.md) - DLsite機能の設計書
- [DEVELOPMENT_SETUP.md](./DEVELOPMENT_SETUP.md) - 開発環境セットアップ