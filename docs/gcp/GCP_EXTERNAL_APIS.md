# Google Cloud Platform 外部API連携設計

suzumina.clickにおけるYouTube Data APIとの連携について説明します。

## YouTube Data API概要

YouTube Data APIを利用して、チャンネル情報の取得、動画一覧の管理、メタデータの取得、新規動画の検知などを行います。

主なリソース: channels（チャンネル情報）、videos（動画情報）、playlistItems（プレイリスト内動画）、search（検索）、commentThreads（コメント）

## 認証と権限管理

- **APIキー認証**: 公開データの読み取り専用アクセス。GCPコンソールで作成しSecret Managerで保管
- **OAuth 2.0認証**: ユーザー代理操作や非公開データアクセス。必要最小限の権限スコープを設定

## クォータ管理

標準クォータは1日あたり10,000ユニット。効率的なAPI利用戦略として：

- 必要な情報のみをリクエスト
- 一度に複数アイテムを取得
- データをFirestoreにキャッシュ
- レート制限時は指数バックオフでリトライ

## 実装方法

### Python実装の基本

```python
from googleapiclient.discovery import build
from google.cloud import secretmanager

def get_youtube_service():
    client = secretmanager.SecretManagerServiceClient()
    name = f"projects/suzumina-click-dev/secrets/youtube-api-key/versions/latest"
    response = client.access_secret_version(request={"name": name})
    api_key = response.payload.data.decode("UTF-8")
    return build('youtube', 'v3', developerKey=api_key)
```

### TypeScript実装の基本

```typescript
import { google } from 'googleapis';
import { SecretManagerServiceClient } from '@google-cloud/secret-manager';

async function getYoutubeService() {
  const secretClient = new SecretManagerServiceClient();
  const [version] = await secretClient.accessSecretVersion({
    name: 'projects/suzumina-click-dev/secrets/youtube-api-key/versions/latest',
  });
  const apiKey = version.payload?.data?.toString() || '';
  return google.youtube({ version: 'v3', auth: apiKey });
}
```

### バッチ処理

YouTube データ同期は以下の方針で実行します：

- Cloud Run Jobsで定期実行（1日1回、オフピーク時間帯）
- 取得データはFirestoreに保存
- 重要イベント時は頻度を調整

## 関連ドキュメント

[全体概要](GCP_OVERVIEW.md) | [ストレージ設計](GCP_STORAGE.md) |

最終更新日: 2025年4月3日
