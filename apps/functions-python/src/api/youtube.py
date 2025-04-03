from google.cloud import firestore
import datetime
from src.lib.youtube_api import YouTubeAPI
from fastapi import HTTPException, Query, Path
from typing import Annotated # Python 3.9+ で Query, Path を使うため

# Firestoreクライアント
db = firestore.Client()

def get_channel_info(
    channel_id: Annotated[str, Query(description="YouTubeチャンネルID")]
):
    """
    チャンネル情報を取得するAPIエンドポイント
    """
    # Firestoreからキャッシュを確認
    cache_ref = db.collection('cache').document(f'channel_{channel_id}')
    cache_doc = cache_ref.get()

    # 24時間以内のキャッシュがあれば、それを返す
    if cache_doc.exists:
        cache_data = cache_doc.to_dict()
        cache_time = cache_data.get('timestamp', None)
        if cache_time and (datetime.datetime.now() - cache_time).total_seconds() < 86400:  # 24時間
            return cache_data['data']

    # キャッシュがないか古い場合はAPIから取得
    youtube = YouTubeAPI()
    try:
        channel_info = youtube.get_channel_info(channel_id)

        # Firestoreにキャッシュを保存
        cache_ref.set({
            'data': channel_info,
            'timestamp': datetime.datetime.now()
        })
        
        return channel_info
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"API Error: {str(e)}")

def get_latest_videos(
    channel_id: Annotated[str, Query(description="YouTubeチャンネルID")],
    max_results: Annotated[int, Query(ge=1, le=50, description="取得する動画の最大数")] = 10
):
    """
    最新の動画一覧を取得するAPIエンドポイント
    """
    # Firestoreからキャッシュを確認
    cache_ref = db.collection('cache').document(f'videos_{channel_id}')
    cache_doc = cache_ref.get()

    # 1時間以内のキャッシュがあれば、それを返す
    if cache_doc.exists:
        cache_data = cache_doc.to_dict()
        cache_time = cache_data.get('timestamp', None)
        if cache_time and (datetime.datetime.now() - cache_time).total_seconds() < 3600:  # 1時間
            videos = cache_data.get('data', [])
            return videos[:max_results]

    # キャッシュがないか古い場合はAPIから取得
    youtube = YouTubeAPI()
    try:
        videos = youtube.get_latest_videos(channel_id, max_results)
        
        # Firestoreにキャッシュを保存
        cache_ref.set({
            'data': videos,
            'timestamp': datetime.datetime.now()
        })
        
        return videos
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"API Error: {str(e)}")

def get_video_details(
    video_id: Annotated[str, Path(description="YouTube動画ID")]
):
    """
    特定の動画の詳細情報を取得するAPIエンドポイント
    """
    # Firestoreからキャッシュを確認
    cache_ref = db.collection('cache').document(f'video_{video_id}')
    cache_doc = cache_ref.get()

    # 1時間以内のキャッシュがあれば、それを返す
    if cache_doc.exists:
        cache_data = cache_doc.to_dict()
        cache_time = cache_data.get('timestamp', None)
        if cache_time and (datetime.datetime.now() - cache_time).total_seconds() < 3600:  # 1時間
            return cache_data['data']

    # キャッシュがないか古い場合はAPIから取得
    youtube = YouTubeAPI()
    try:
        video_details = youtube.get_video_details(video_id)
        
        # Firestoreにキャッシュを保存
        cache_ref.set({
            'data': video_details,
            'timestamp': datetime.datetime.now()
        })
        
        return video_details
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"API Error: {str(e)}")

def search_videos(
    query: Annotated[str, Query(description="検索キーワード")],
    max_results: Annotated[int, Query(ge=1, le=50, description="取得する動画の最大数")] = 10
):
    """
    動画を検索するAPIエンドポイント
    """
    # Firestoreからキャッシュを確認（検索はクエリごとにキャッシュ）
    cache_ref = db.collection('cache').document(f'search_{query.replace(" ", "_")}')
    cache_doc = cache_ref.get()

    # 30分以内のキャッシュがあれば、それを返す
    if cache_doc.exists:
        cache_data = cache_doc.to_dict()
        cache_time = cache_data.get('timestamp', None)
        if cache_time and (datetime.datetime.now() - cache_time).total_seconds() < 1800:  # 30分
            videos = cache_data.get('data', [])
            return videos[:max_results]

    # キャッシュがないか古い場合はAPIから取得
    youtube = YouTubeAPI()
    try:
        search_results = youtube.search_videos(query, max_results)
        
        # Firestoreにキャッシュを保存
        cache_ref.set({
            'data': search_results,
            'timestamp': datetime.datetime.now()
        })
        
        return search_results
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"API Error: {str(e)}")