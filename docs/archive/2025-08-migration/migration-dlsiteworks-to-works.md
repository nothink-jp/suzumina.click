# dlsiteWorks → works コレクション名マイグレーション手順

## 概要
Firestoreコレクション名を `dlsiteWorks` から `works` に変更するマイグレーション手順書です。

## 背景
- 現在のコレクション名 `dlsiteWorks` は他のコレクション（`videos`, `users`, `circles` など）の命名規則と一致していない
- 一貫性のある命名規則に統一するため `works` に変更する

## 影響範囲
- **コード**: 約20ファイル、60箇所以上の参照
- **インフラ**: Terraformのセキュリティルール、インデックス定義
- **データ**: 約1,500件の作品ドキュメント + 価格履歴サブコレクション

## 前提条件
- 本番環境へのアクセス権限
- Firestore Admin権限
- ダウンタイム: 30分-1時間を確保

## マイグレーション手順

### 1. 事前準備（必須）
```bash
# バックアップの作成（推奨）
gcloud firestore export gs://your-backup-bucket/dlsiteworks-backup-$(date +%Y%m%d)
```

### 2. アプリケーションの停止
```bash
# Cloud Functionsの一時停止
gcloud functions disable dlsiteUnifiedDataCollection
gcloud functions disable checkDataIntegrity
```

### 3. データマイグレーション実行
```bash
# マイグレーションスクリプトの実行
cd apps/functions
pnpm tsx src/tools/migrate-dlsiteworks-to-works.ts

# 実行ログ例:
# マイグレーション開始: dlsiteWorks → works
# 総ドキュメント数: 1487
# 進捗: 400/1487 (27%)
# 進捗: 800/1487 (54%)
# ...
# ✅ ドキュメント数が一致しました
```

### 4. インフラ更新
```bash
# Terraformで新しいインデックスを作成
cd terraform
terraform apply -target=google_firestore_index.works_circleid_registdate_desc

# セキュリティルールの更新
terraform apply -target=google_firestore_document.firestore_rules
```

### 5. コードのデプロイ
```bash
# mainブランチにマージ後、GitHub Actionsで自動デプロイ
# または手動デプロイ:
gcloud functions deploy dlsiteUnifiedDataCollection --source . --runtime nodejs22
gcloud functions deploy checkDataIntegrity --source . --runtime nodejs22
```

### 6. 動作確認
```bash
# 新しいコレクションでのデータ取得確認
firebase firestore:get works/RJ123456

# Webアプリケーションでの動作確認
# - 作品一覧ページ
# - 作品詳細ページ
# - サークルページ
# - クリエイターページ
```

### 7. 旧コレクションの削除（確認後）
```bash
# 削除前の最終確認
firebase firestore:get dlsiteWorks --limit 5

# 削除スクリプトの実行
pnpm tsx src/tools/cleanup-dlsiteworks-collection.ts
```

### 8. Cloud Functionsの再有効化
```bash
gcloud functions enable dlsiteUnifiedDataCollection
gcloud functions enable checkDataIntegrity
```

## ロールバック手順

問題が発生した場合:

1. コードを前のバージョンに戻す
```bash
git checkout main
```

2. データを逆マイグレーション（必要に応じて）
```bash
# worksからdlsiteWorksへの逆マイグレーションスクリプトを実行
# （別途作成が必要）
```

3. バックアップからの復元
```bash
gcloud firestore import gs://your-backup-bucket/dlsiteworks-backup-YYYYMMDD
```

## 注意事項
- **キャッシュ**: CDNやブラウザキャッシュのクリアが必要な場合がある
- **インデックス**: 新しいコレクションでインデックスの構築に時間がかかる可能性
- **並行処理**: マイグレーション中の書き込みは失われる可能性があるため、必ずアプリケーションを停止する

## 完了チェックリスト
- [ ] バックアップ作成完了
- [ ] Cloud Functions停止確認
- [ ] データマイグレーション成功
- [ ] インデックス作成完了
- [ ] セキュリティルール更新完了
- [ ] アプリケーションデプロイ完了
- [ ] 動作確認完了
- [ ] 旧コレクション削除完了
- [ ] Cloud Functions再有効化完了

## 問題発生時の連絡先
- 技術責任者: [連絡先]
- インフラチーム: [連絡先]