# Entity V2 Production Migration Guide

**最終更新**: 2025-01-25

## 概要

このドキュメントは、suzumina.clickのEntity V2アーキテクチャへの本番移行手順を説明します。

## 前提条件

### 必要な権限
- Google Cloud Projectへのアクセス権
- Firestore管理者権限
- Cloud Storageへの書き込み権限

### 環境変数
```bash
export GOOGLE_CLOUD_PROJECT=suzumina-click
export GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account-key.json
export BACKUP_BUCKET=suzumina-click-backup
```

### 必要なツール
- `gcloud` CLI（認証済み）
- `gsutil` CLI
- Node.js 22.x
- pnpm

## 移行スクリプトの概要

### 基本スクリプト（PR #17で実装済み）
- `migrate:v2` - インタラクティブモードで移行を実行
- `migrate:v2:dry` - ドライランモード
- `migrate:v2:prod` - 本番移行（確認プロンプトなし）

### 本番移行用スクリプト（PR #19で追加）
- `migration:prepare` - 環境準備と事前チェック
- `migration:dry-run` - 詳細なドライラン実行
- `migration:backup` - Firestoreバックアップ作成
- `migration:execute` - 本番移行実行
- `migration:validate` - 移行後検証
- `migration:rollback` - ロールバック実行

## 推奨移行手順

### Phase 1: 事前準備（移行前日）

#### 1.1 環境確認
```bash
cd apps/functions
pnpm migration:prepare
```

このコマンドは以下を確認します：
- 環境変数の設定
- gcloud認証状態
- バックアップバケットへのアクセス

#### 1.2 ステークホルダーへの通知
- 移行予定時刻の告知
- 影響範囲の説明
- 緊急連絡先の共有

### Phase 2: ドライラン（移行当日）

#### 2.1 全データのドライラン実行
```bash
pnpm migration:dry-run
```

出力例：
```
🔍 ドライランフェーズ
==================================================
📊 レポート出力先: dry-run-report-2025-01-25T10-00-00.txt

📂 videos の検証を開始...
📊 統計情報:
   総ドキュメント数: 1234
   移行済み: 0
   エラー: 2

📂 audioButtons の検証を開始...
📊 統計情報:
   総ドキュメント数: 5678
   移行済み: 0
   エラー: 5

📊 エラー率: 0.08%
✅ ドライラン完了！
```

#### 2.2 レポート確認
```bash
cat dry-run-report-*.txt
```

**重要**: エラー率が1%を超える場合は移行を中止し、問題を解決してください。

### Phase 3: バックアップ

#### 3.1 Firestoreバックアップの作成
```bash
pnpm migration:backup
```

出力例：
```
💾 バックアップフェーズ
==================================================
📍 プロジェクト: suzumina-click
📍 バックアップ先: gs://suzumina-click-backup/entity-v2-migration/2025-01-25T10-30-00
📍 対象コレクション: videos, audioButtons

✅ バックアップが完了しました
📝 バックアップメタデータを保存しました: backup-metadata-2025-01-25T10-30-00.json
```

#### 3.2 バックアップの確認
```bash
gsutil ls gs://suzumina-click-backup/entity-v2-migration/
```

### Phase 4: 段階的本番移行

#### 4.1 小規模テスト（100件）
```bash
pnpm migration:execute -- --max-documents 100
```

検証：
```bash
pnpm migration:validate
```

#### 4.2 Videosコレクションの移行
```bash
pnpm migrate:v2:prod --collections videos
```

または統合スクリプトで：
```bash
pnpm migration:execute
```

#### 4.3 AudioButtonsコレクションの移行
```bash
pnpm migrate:v2:prod --collections audioButtons
```

### Phase 5: 移行後検証

#### 5.1 自動検証の実行
```bash
pnpm migration:validate --verbose
```

出力例：
```
✔️ 検証フェーズ
==================================================
📂 videos の検証を開始...
📊 統計情報:
   総ドキュメント数: 1234
   移行済み: 1234
   未移行: 0
   移行率: 100.00%

🔬 10件のサンプルを検証中...
  ✅ video-001
  ✅ video-002
  ...
✅ 検証完了: 10/10 件が有効

📄 検証レポートを保存しました: validation-report-2025-01-25T11-00-00.md
✅ 検証完了！
🎉 すべての検証に合格しました
```

#### 5.2 手動検証チェックリスト

**UI検証**:
- [ ] 音声ボタン一覧ページの表示確認
- [ ] 動画詳細ページの表示確認
- [ ] 検索機能の動作確認

**機能検証**:
- [ ] 音声ボタンの再生機能
- [ ] お気に入り機能
- [ ] いいね/再生数のカウント

**パフォーマンス検証**:
- [ ] ページロード時間
- [ ] API応答時間

### Phase 6: 問題発生時のロールバック

#### 6.1 _v2Migrationフィールドの削除
```bash
pnpm migration:rollback
```

#### 6.2 バックアップからの完全復元
```bash
pnpm migration:rollback -- --restore-backup --backup-path gs://suzumina-click-backup/entity-v2-migration/[timestamp]
```

**警告**: バックアップからの復元は現在のデータを完全に上書きします。

## 移行時の注意事項

### データ収集の一時停止
移行中はYouTube Sync V2が実行されないよう、Cloud Schedulerを一時停止することを推奨します：

```bash
gcloud scheduler jobs pause youtube-sync-videos --location=asia-northeast1
gcloud scheduler jobs pause youtube-sync-audio-buttons --location=asia-northeast1
```

移行完了後に再開：
```bash
gcloud scheduler jobs resume youtube-sync-videos --location=asia-northeast1
gcloud scheduler jobs resume youtube-sync-audio-buttons --location=asia-northeast1
```

### モニタリング
移行中は以下を監視してください：
- Cloud Loggingでのエラーログ
- Firestore使用量メトリクス
- アプリケーションのエラー率

## トラブルシューティング

### よくある問題

#### 1. 権限エラー
```
Error: Missing or insufficient permissions
```
**解決策**: サービスアカウントにFirestore管理者権限を付与

#### 2. バックアップバケットへのアクセスエラー
```
Error: AccessDeniedException: 403
```
**解決策**: バケットへの書き込み権限を確認

#### 3. メモリ不足エラー
```
Error: JavaScript heap out of memory
```
**解決策**: バッチサイズを小さくする、または`--max-old-space-size`を増やす

### 緊急連絡先
- 技術責任者: [連絡先]
- インフラ担当: [連絡先]
- プロダクトオーナー: [連絡先]

## 移行完了後のタスク

1. **ドキュメント更新**
   - 移行完了日時の記録
   - 発生した問題と解決策の記録

2. **モニタリング設定**
   - Entity V2用のアラート設定
   - パフォーマンスメトリクスの確認

3. **フィーチャーフラグの有効化**
   - 段階的にEntity V2を有効化
   - A/Bテストの実施

## 参考資料

- [Entity/Value Object Architecture Documentation](./ENTITY_VALUE_OBJECT_ARCHITECTURE.md)
- [PR Breakdown Document](./ENTITY_VALUE_OBJECT_PR_BREAKDOWN.md)
- [Domain Model Documentation](./DOMAIN_MODEL.md)