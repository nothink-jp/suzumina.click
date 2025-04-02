# Google Cloud Platform 外部API連携設計

このドキュメントでは、suzumina.clickで使用する外部APIとの連携設計について説明します。特にYouTube Data APIとの連携に焦点を当てています。

## 目次

- [YouTube Data API概要](#youtube-data-api概要)
- [認証と権限管理](#認証と権限管理)
- [クォータと利用制限](#クォータと利用制限)
- [実装例（Python）](#実装例python)
- [実装例（TypeScript）](#実装例typescript)
- [バッチ処理での利用](#バッチ処理での利用)
- [関連ドキュメント](#関連ドキュメント)

## YouTube Data API概要

suzumina.clickではYouTube Data APIを利用して、YouTubeチャンネルのデータを取得・管理します。

### 主な用途

- チャンネル情報の取得（登録者数、総視聴回数など）
- 動画一覧の取得と管理
- 動画のメタデータ（タイトル、説明、サムネイル、再生回数など）の取得
- 新規アップロード動画の検知と通知
- コメントの取得と分析

### APIエンドポイント

YouTube Data API v3は、以下のようなリソースとメソッドを提供しています：

| リソース | 主なメソッド | 用途 |
|---------|------------|------|
| channels | list, update | チャンネル情報の取得・更新 |
| videos | list, insert, update | 動画情報の取得・管理 |
| playlistItems | list | プレイリスト内の動画取得 |
| search | list | 動画・チャンネル・プレイリストの検索 |
| commentThreads | list, insert | コメントスレッドの取得・作成 |
| captions | list, insert, update | 字幕の取得・管理 |

## 認証と権限管理

YouTube Data APIへのアクセスには、以下の認証方法が利用可能です：

### APIキー認証

公開データの読み取り専用アクセスに適しています：

1. **APIキーの作成**：
   - GCPコンソールのAPI認証情報ページでAPIキーを作成
   - 使用するIPアドレスやドメインに制限を設定

2. **APIキーの管理**：
   - APIキーはSecret Managerで安全に保管
   - 環境変数や設定ファイルに直接記載しない

3. **APIキーを使用したアクセス例**：

   ```python
   from googleapiclient.discovery import build
   
   api_key = "YOUR_API_KEY"  # Secret Managerから取得する
   youtube = build('youtube', 'v3', developerKey=api_key)
   ```

### OAuth 2.0認証

ユーザーに代わって操作を行う場合や、非公開データにアクセスする場合に使用します：

1. **OAuth 2.0クライアントIDの作成**：
   - GCPコンソールでOAuth 2.0クライアントIDを作成
   - リダイレクトURIを設定

2. **必要なスコープの設定**：
   - 必要最小限の権限スコープを要求
   - 例: `https://www.googleapis.com/auth/youtube.readonly`

3. **OAuthフローの実装**：

   ```python
   from google_auth_oauthlib.flow import InstalledAppFlow
   from googleapiclient.discovery import build
   
   # 認証情報ファイルはSecret Managerから取得する
   CLIENT_SECRETS_FILE = "client_secret.json"
   SCOPES = ['https://www.googleapis.com/auth/youtube.readonly']
   
   flow = InstalledAppFlow.from_client_secrets_file(CLIENT_SECRETS_FILE, SCOPES)
   credentials = flow.run_local_server()
   
   youtube = build('youtube', 'v3', credentials=credentials)
   ```

## クォータと利用制限

YouTube Data APIにはクォータ制限があり、効率的な使用が求められます：

### クォータの基本

- 標準のクォータは1日あたり10,000ユニット
- 各APIメソッドは異なるクォータコストを持つ
  - 単純な読み取り操作: 1〜5ユニット
  - 複雑な検索操作: 100ユニット
  - 動画アップロード: 1,600ユニット

### クォータ管理戦略

1. **クォータの監視**：
   - GCPコンソールでAPIクォータ使用状況を定期的に確認
   - 高使用量時のアラートを設定

2. **効率的なAPI呼び出し**：
   - 必要な情報のみをリクエスト（fields パラメータの活用）
   - 一度に複数のアイテムを取得（maxResults パラメータの最適化）
   - 必要なAPIコールのみを実行

3. **キャッシュ戦略**：
   - 頻繁に変更されないデータはFirestoreにキャッシュ
   - 有効期限を設定してデータの鮮度を確保
   - 同一データに対する重複リクエストを防止

4. **バックオフとリトライ**：
   - レート制限エラー発生時は指数バックオフでリトライ
   - エラーのログ記録と監視

## 実装例（Python）

以下は、Python用のYouTube Data API使用例です：

### クライアント初期化

```python
from googleapiclient.discovery import build
from google.cloud import secretmanager

def get_youtube_service():
    """YouTube Data API サービスを取得"""
    # Secret Managerから認証情報を取得
    client = secretmanager.SecretManagerServiceClient()
    name = f"projects/suzumina-click-dev/secrets/youtube-api-key/versions/latest"
    response = client.access_secret_version(request={"name": name})
    api_key = response.payload.data.decode("UTF-8")
    
    # YouTube APIサービスを構築
    return build('youtube', 'v3', developerKey=api_key)
```

### チャンネル情報の取得

```python
def get_channel_info(channel_id):
    """チャンネル情報を取得"""
    youtube = get_youtube_service()
    
    request = youtube.channels().list(
        part="snippet,contentDetails,statistics",
        id=channel_id
    )
    response = request.execute()
    
    return response['items'][0] if response['items'] else None
```

### 最新の動画を取得

```python
def get_latest_videos(channel_id, max_results=10):
    """最新の動画を取得"""
    youtube = get_youtube_service()
    
    # まずチャンネルのアップロードプレイリストIDを取得
    channel_response = youtube.channels().list(
        part="contentDetails",
        id=channel_id
    ).execute()
    
    uploads_playlist_id = channel_response['items'][0]['contentDetails']['relatedPlaylists']['uploads']
    
    # プレイリストから動画を取得
    playlist_response = youtube.playlistItems().list(
        part="snippet,contentDetails",
        playlistId=uploads_playlist_id,
        maxResults=max_results
    ).execute()
    
    return playlist_response['items']
```

## 実装例（TypeScript）

以下は、TypeScript用のYouTube Data API使用例です：

### YouTubeクライアント初期化

```typescript
import { google, youtube_v3 } from 'googleapis';
import { SecretManagerServiceClient } from '@google-cloud/secret-manager';

async function getYoutubeService(): Promise<youtube_v3.Youtube> {
  // Secret Managerから認証情報を取得
  const secretClient = new SecretManagerServiceClient();
  const [version] = await secretClient.accessSecretVersion({
    name: 'projects/suzumina-click-dev/secrets/youtube-api-key/versions/latest',
  });
  
  const apiKey = version.payload?.data?.toString() || '';
  
  // YouTube APIサービスを構築
  return google.youtube({
    version: 'v3',
    auth: apiKey,
  });
}
```

### YouTubeチャンネル情報の取得

```typescript
async function getChannelInfo(channelId: string): Promise<any> {
  const youtube = await getYoutubeService();
  
  const response = await youtube.channels.list({
    part: ['snippet', 'contentDetails', 'statistics'],
    id: [channelId],
  });
  
  return response.data.items?.[0] || null;
}
```

### 最新のYouTube動画を取得

```typescript
async function getLatestVideos(channelId: string, maxResults = 10): Promise<any[]> {
  const youtube = await getYoutubeService();
  
  // まずチャンネルのアップロードプレイリストIDを取得
  const channelResponse = await youtube.channels.list({
    part: ['contentDetails'],
    id: [channelId],
  });
  
  const uploadsPlaylistId = channelResponse.data.items?.[0]?.contentDetails?.relatedPlaylists?.uploads;
  
  if (!uploadsPlaylistId) {
    return [];
  }
  
  // プレイリストから動画を取得
  const playlistResponse = await youtube.playlistItems.list({
    part: ['snippet', 'contentDetails'],
    playlistId: uploadsPlaylistId,
    maxResults,
  });
  
  return playlistResponse.data.items || [];
}
```

## バッチ処理での利用

YouTube APIは、Cloud Run Jobsで定期的なバッチ処理として利用することが推奨されます：

### データ同期ジョブの実装例

```python
# apps/jobs-python/src/jobs/youtube_sync/main.py

from google.cloud import firestore
import datetime

# 上記で定義したYouTube APIヘルパー関数をインポート
from lib.youtube_api import get_channel_info, get_latest_videos

def main():
    """YouTubeデータ同期ジョブ"""
    print("Starting YouTube data sync job...")
    
    try:
        # Firestoreクライアントを初期化
        db = firestore.Client()
        
        # 監視対象チャンネルIDを取得（設定から）
        channel_id = "UCxxxxxxxxxxxxxxxxxxxxxxx"  # 実際のチャンネルID
        
        # チャンネル情報を取得
        channel_info = get_channel_info(channel_id)
        if not channel_info:
            print(f"Channel {channel_id} not found")
            return 1
            
        # チャンネル情報をFirestoreに保存
        channel_ref = db.collection('youtube').document('channel_info')
        channel_ref.set({
            'title': channel_info['snippet']['title'],
            'description': channel_info['snippet']['description'],
            'thumbnail': channel_info['snippet']['thumbnails']['high']['url'],
            'subscriberCount': int(channel_info['statistics']['subscriberCount']),
            'viewCount': int(channel_info['statistics']['viewCount']),
            'videoCount': int(channel_info['statistics']['videoCount']),
            'lastUpdated': datetime.datetime.now()
        })
        
        # 最新の動画を取得（最大50件）
        videos = get_latest_videos(channel_id, 50)
        
        # 動画情報をFirestoreに保存
        for video in videos:
            video_id = video['contentDetails']['videoId']
            video_ref = db.collection('youtube').document('videos').collection('items').document(video_id)
            
            video_ref.set({
                'title': video['snippet']['title'],
                'description': video['snippet']['description'],
                'publishedAt': datetime.datetime.fromisoformat(video['snippet']['publishedAt'].replace('Z', '+00:00')),
                'thumbnail': video['snippet']['thumbnails']['high']['url'],
                'lastUpdated': datetime.datetime.now()
            })
        
        print(f"Successfully synced YouTube data - {len(videos)} videos updated")
        return 0
        
    except Exception as e:
        print(f"Error in YouTube data sync job: {e}")
        return 1

if __name__ == "__main__":
    exit_code = main()
    exit(exit_code)
```

### スケジュール設定

YouTube APIデータ同期は、APIクォータを考慮して適切な頻度で実行するようスケジュールします：

- **定期実行**: 1日1回（午前2時などオフピーク時間帯）
- **クォータ配分**: 1日の制限内で複数のジョブに分散
- **重要イベント時**: 重要なイベント（配信など）の前後は頻度を上げる

## 関連ドキュメント

- [全体概要](GCP_OVERVIEW.md)
- [バッチ処理設計](GCP_JOBS.md)
- [ストレージ設計](GCP_STORAGE.md)
- [ベストプラクティス](GCP_BEST_PRACTICES.md)

## 最終更新日

2025年4月2日
