from googleapiclient.discovery import build
from google.cloud import secretmanager
import datetime

class YouTubeAPI:
    """YouTube Data API v3へのアクセスを管理するクラス"""
    
    def __init__(self):
        """
        YouTubeAPI クライアントを初期化
        Secret Managerから認証情報を取得して接続を確立
        """
        self.youtube = self._get_youtube_service()
    
    def _get_youtube_service(self):
        """YouTube Data API サービスを取得"""
        # Secret Managerから認証情報を取得
        client = secretmanager.SecretManagerServiceClient()
        name = f"projects/suzumina-click-dev/secrets/youtube-api-key/versions/latest"
        response = client.access_secret_version(request={"name": name})
        api_key = response.payload.data.decode("UTF-8")
        
        # YouTube APIサービスを構築
        return build('youtube', 'v3', developerKey=api_key)
    
    def get_channel_info(self, channel_id):
        """
        指定されたチャンネルIDの情報を取得
        
        Args:
            channel_id (str): YouTubeチャンネルID
            
        Returns:
            dict: チャンネル情報
        """
        request = self.youtube.channels().list(
            part="snippet,contentDetails,statistics",
            id=channel_id
        )
        response = request.execute()
        
        if not response.get('items'):
            raise ValueError(f"Channel not found: {channel_id}")
        
        channel = response['items'][0]
        return {
            'id': channel['id'],
            'title': channel['snippet']['title'],
            'description': channel['snippet']['description'],
            'thumbnail': channel['snippet']['thumbnails']['high']['url'],
            'subscriberCount': int(channel['statistics'].get('subscriberCount', 0)),
            'viewCount': int(channel['statistics'].get('viewCount', 0)),
            'videoCount': int(channel['statistics'].get('videoCount', 0)),
            'uploadsPlaylistId': channel['contentDetails']['relatedPlaylists']['uploads']
        }
    
    def get_latest_videos(self, channel_id, max_results=10):
        """
        指定されたチャンネルIDの最新動画を取得
        
        Args:
            channel_id (str): YouTubeチャンネルID
            max_results (int): 取得する動画の最大数（最大50）
            
        Returns:
            list: 動画情報のリスト
        """
        # まずチャンネルのアップロードプレイリストIDを取得
        channel_response = self.youtube.channels().list(
            part="contentDetails",
            id=channel_id
        ).execute()
        
        if not channel_response.get('items'):
            raise ValueError(f"Channel not found: {channel_id}")
        
        uploads_playlist_id = channel_response['items'][0]['contentDetails']['relatedPlaylists']['uploads']
        
        # プレイリストから動画を取得
        playlist_response = self.youtube.playlistItems().list(
            part="snippet,contentDetails",
            playlistId=uploads_playlist_id,
            maxResults=max_results
        ).execute()
        
        return [self._format_video_info(item) for item in playlist_response.get('items', [])]
    
    def get_video_details(self, video_id):
        """
        指定された動画IDの詳細情報を取得
        
        Args:
            video_id (str): YouTube動画ID
            
        Returns:
            dict: 動画の詳細情報
        """
        video_response = self.youtube.videos().list(
            part="snippet,contentDetails,statistics",
            id=video_id
        ).execute()
        
        if not video_response.get('items'):
            raise ValueError(f"Video not found: {video_id}")
        
        video = video_response['items'][0]
        return {
            'id': video['id'],
            'title': video['snippet']['title'],
            'description': video['snippet']['description'],
            'publishedAt': video['snippet']['publishedAt'],
            'channelId': video['snippet']['channelId'],
            'channelTitle': video['snippet']['channelTitle'],
            'thumbnail': video['snippet']['thumbnails']['high']['url'],
            'duration': video['contentDetails']['duration'],
            'viewCount': int(video['statistics'].get('viewCount', 0)),
            'likeCount': int(video['statistics'].get('likeCount', 0)),
            'commentCount': int(video['statistics'].get('commentCount', 0)),
        }
    
    def search_videos(self, query, max_results=10):
        """
        キーワードに基づいて動画を検索
        
        Args:
            query (str): 検索キーワード
            max_results (int): 取得する検索結果の最大数（最大50）
            
        Returns:
            list: 検索結果のリスト
        """
        search_response = self.youtube.search().list(
            q=query,
            part="snippet",
            type="video",
            maxResults=max_results
        ).execute()
        
        return [self._format_search_result(item) for item in search_response.get('items', [])]
    
    def _format_video_info(self, item):
        """プレイリストアイテムを標準フォーマットに変換"""
        snippet = item['snippet']
        return {
            'id': item['contentDetails']['videoId'],
            'title': snippet['title'],
            'description': snippet['description'],
            'publishedAt': snippet['publishedAt'],
            'thumbnail': snippet['thumbnails']['high']['url'],
            'channelId': snippet['channelId'],
            'channelTitle': snippet['channelTitle'],
        }
    
    def _format_search_result(self, item):
        """検索結果を標準フォーマットに変換"""
        snippet = item['snippet']
        return {
            'id': item['id']['videoId'],
            'title': snippet['title'],
            'description': snippet['description'],
            'publishedAt': snippet['publishedAt'],
            'thumbnail': snippet['thumbnails']['high']['url'],
            'channelId': snippet['channelId'],
            'channelTitle': snippet['channelTitle'],
        }