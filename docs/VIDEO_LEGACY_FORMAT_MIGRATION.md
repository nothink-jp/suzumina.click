# Video Legacy Format Migration Guide

## 概要

このドキュメントは、Video entityのレガシーフォーマットサポートを完全に削除し、新しい直接的なFirestore永続化方式に移行するための手順書です。

## 移行の背景

- **変更前**: Video entity → toLegacyFormat() → Firestore
- **変更後**: Video entity → toFirestore() → Firestore
- **影響範囲**: videosコレクション内のすべてのドキュメント
- **推定移行時間**: 約3時間

## 前提条件

1. videosコレクションはfetchYouTubeVideos Cloud Functionのみが書き込む
2. Webアプリケーションは読み取り専用でvideosコレクションを使用
3. メンテナンスウィンドウ中は新規動画の取得を一時停止可能

## 移行手順

### 1. 事前準備（移行前日）

```bash
# 1. 現在のvideosコレクションのバックアップを作成
gcloud firestore export gs://suzumina-click-backup/videos-backup-$(date +%Y%m%d) \
  --collection-ids=videos

# 2. バックアップの確認
gsutil ls -la gs://suzumina-click-backup/videos-backup-*
```

### 2. メンテナンスモード開始（移行当日）

```bash
# 1. Cloud SchedulerでfetchYouTubeVideosのスケジュールを無効化
gcloud scheduler jobs pause fetch-youtube-videos

# 2. 現在実行中のCloud Functionsがないことを確認
gcloud functions logs read fetchYouTubeVideos \
  --limit=10 \
  --format="table(timestamp,severity,textPayload)"
```

### 3. videosコレクションのクリア

```bash
# Firestoreのvideosコレクションを完全に削除
# 注意: この操作は元に戻せません。必ずバックアップを確認してから実行してください。

# Cloud Consoleから手動で削除するか、以下のスクリプトを使用:
```

```typescript
// delete-videos-collection.ts
import { getFirestore } from 'firebase-admin/firestore';
import { initializeApp } from 'firebase-admin/app';

initializeApp();
const firestore = getFirestore();

async function deleteAllVideos() {
  const videosRef = firestore.collection('videos');
  const snapshot = await videosRef.get();
  
  const batchSize = 500;
  let batch = firestore.batch();
  let count = 0;
  
  for (const doc of snapshot.docs) {
    batch.delete(doc.ref);
    count++;
    
    if (count % batchSize === 0) {
      await batch.commit();
      console.log(`Deleted ${count} documents`);
      batch = firestore.batch();
    }
  }
  
  if (count % batchSize !== 0) {
    await batch.commit();
    console.log(`Deleted total ${count} documents`);
  }
}

deleteAllVideos().catch(console.error);
```

### 4. 新バージョンのデプロイ

```bash
# 1. Cloud Functionsの新バージョンをデプロイ
cd apps/functions
pnpm build
pnpm deploy

# 2. デプロイの確認
gcloud functions describe fetchYouTubeVideos --gen2
```

### 5. 動画データの再取得

```bash
# 1. fetchYouTubeVideosを手動実行して全動画を再取得
gcloud functions call fetchYouTubeVideos --gen2

# 2. ログを監視
gcloud functions logs read fetchYouTubeVideos \
  --limit=50 \
  --format="table(timestamp,severity,textPayload)"

# 3. 取得状況の確認（複数回実行が必要な場合あり）
# 実行状況はyoutubeMetadata/fetch_metadataドキュメントで確認可能
```

### 6. データ検証

```bash
# Firestore Consoleまたは以下のスクリプトで検証
```

```typescript
// verify-migration.ts
import { getFirestore } from 'firebase-admin/firestore';
import { initializeApp } from 'firebase-admin/app';

initializeApp();
const firestore = getFirestore();

async function verifyMigration() {
  const videosRef = firestore.collection('videos');
  const snapshot = await videosRef.limit(10).get();
  
  console.log(`Total videos: ${(await videosRef.count().get()).data().count}`);
  
  snapshot.docs.forEach(doc => {
    const data = doc.data();
    // 新形式の必須フィールドを確認
    const requiredFields = [
      'videoId', 'title', 'description', 'channelId', 
      'channelTitle', 'publishedAt', 'thumbnailUrl', 'lastFetchedAt'
    ];
    
    const missingFields = requiredFields.filter(field => !(field in data));
    if (missingFields.length > 0) {
      console.error(`Document ${doc.id} missing fields:`, missingFields);
    } else {
      console.log(`Document ${doc.id} OK`);
    }
  });
}

verifyMigration().catch(console.error);
```

### 7. メンテナンスモード終了

```bash
# 1. Cloud Schedulerを再開
gcloud scheduler jobs resume fetch-youtube-videos

# 2. Webアプリケーションの動作確認
# - https://suzumina.click/videos にアクセス
# - 動画一覧が正常に表示されることを確認
# - 個別の動画詳細ページが正常に表示されることを確認
```

## ロールバック手順

問題が発生した場合のロールバック手順：

```bash
# 1. Cloud Schedulerを停止
gcloud scheduler jobs pause fetch-youtube-videos

# 2. 旧バージョンのCloud Functionsをデプロイ
git checkout <previous-commit-hash>
cd apps/functions
pnpm build
pnpm deploy

# 3. バックアップからリストア
gcloud firestore import gs://suzumina-click-backup/videos-backup-YYYYMMDD \
  --collection-ids=videos

# 4. Cloud Schedulerを再開
gcloud scheduler jobs resume fetch-youtube-videos
```

## 注意事項

1. **バックアップ**: 必ず事前にバックアップを作成し、リストア可能であることを確認してください
2. **監視**: 移行中はCloud Functionsのログとエラーレートを継続的に監視してください
3. **段階的確認**: 動画の再取得は段階的に行われるため、完了まで複数回の実行が必要な場合があります
4. **キャッシュ**: CDNやブラウザキャッシュをクリアする必要がある場合があります

## 移行後の確認項目

- [ ] videosコレクションのドキュメント数が移行前と同等
- [ ] Web画面で動画一覧が正常に表示される
- [ ] Web画面で動画詳細が正常に表示される
- [ ] 音声ボタンの作成が正常に動作する
- [ ] Cloud Functionsのエラーレートが正常範囲内
- [ ] fetchYouTubeVideosの定期実行が正常に動作する

## 関連ドキュメント

- [Entity Implementation Guidelines](./ENTITY_IMPLEMENTATION_GUIDELINES.md)
- [Firestore Structure](./FIRESTORE_STRUCTURE.md)
- [Cloud Functions Documentation](../apps/functions/README.md)