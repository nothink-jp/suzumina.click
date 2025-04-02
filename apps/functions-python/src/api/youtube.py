import json
from flask import Request
from google.cloud import firestore
import datetime
from src.lib.youtube_api import YouTubeAPI

# Firestoreクライアント
db = firestore.Client()

def get_channel_info(request: Request):
    """
    チャンネル情報を取得するAPIエンドポイント
    
    クエリパラメータ:
        channel_id: YouTubeチャンネルID
    """
    channel_id = request.args.get('channel_id')
    if not channel_id:
        return json.dumps({
            'error': 'Bad Request',
            'message': 'Missing required parameter: channel_id'
        }), 400, {'Content-Type': 'application/json'}
    
    # Firestoreからキャッシュを確認
    cache_ref = db.collection('cache').document(f'channel_{channel_id}')
    cache_doc = cache_ref.get()
    
    # 24時間以内のキャッシュがあれば、それを返す
    if cache_doc.exists:
        cache_data = cache_doc.to_dict()
        cache_time = cache_data.get('timestamp', None)
        if cache_time and (datetime.datetime.now() - cache_time).total_seconds() < 86400:  # 24時間
            return json.dumps(cache_data['data']), 200, {'Content-Type': 'application/json'}
    
    # キャッシュがないか古い場合はAPIから取得
    youtube = YouTubeAPI()
    try:
        channel_info = youtube.get_channel_info(channel_id)
        
        # Firestoreにキャッシュを保存
        cache_ref.set({
            'data': channel_info,
            'timestamp': datetime.datetime.now()
        })
        
        return json.dumps(channel_info), 200, {'Content-Type': 'application/json'}
    except Exception as e:
        return json.dumps({
            'error': 'API Error',
            'message': str(e)
        }), 500, {'Content-Type': 'application/json'}

def get_latest_videos(request: Request):
    """
    最新の動画一覧を取得するAPIエンドポイント
    
    クエリパラメータ:
        channel_id: YouTubeチャンネルID
        max_results: 取得する動画の最大数（デフォルト10、最大50）
    """
    channel_id = request.args.get('channel_id')
    if not channel_id:
        return json.dumps({
            'error': 'Bad Request',
            'message': 'Missing required parameter: channel_id'
        }), 400, {'Content-Type': 'application/json'}
    
    max_results = request.args.get('max_results', '10')
    try:
        max_results = int(max_results)
        max_results = min(max(1, max_results), 50)  # 1～50の範囲に制限
    except ValueError:
        max_results = 10
    
    # Firestoreからキャッシュを確認
    cache_ref = db.collection('cache').document(f'videos_{channel_id}')
    cache_doc = cache_ref.get()
    
    # 1時間以内のキャッシュがあれば、それを返す
    if cache_doc.exists:
        cache_data = cache_doc.to_dict()
        cache_time = cache_data.get('timestamp', None)
        if cache_time and (datetime.datetime.now() - cache_time).total_seconds() < 3600:  # 1時間
            videos = cache_data.get('data', [])
            return json.dumps(videos[:max_results]), 200, {'Content-Type': 'application/json'}
    
    # キャッシュがないか古い場合はAPIから取得
    youtube = YouTubeAPI()
    try:
        videos = youtube.get_latest_videos(channel_id, max_results)
        
        # Firestoreにキャッシュを保存
        cache_ref.set({
            'data': videos,
            'timestamp': datetime.datetime.now()
        })
        
        return json.dumps(videos), 200, {'Content-Type': 'application/json'}
    except Exception as e:
        return json.dumps({
            'error': 'API Error',
            'message': str(e)
        }), 500, {'Content-Type': 'application/json'}

def get_video_details(request: Request, video_id: str):
    """
    特定の動画の詳細情報を取得するAPIエンドポイント
    
    パスパラメータ:
        video_id: YouTube動画ID
    """
    if not video_id:
        return json.dumps({
            'error': 'Bad Request',
            'message': 'Missing required parameter: video_id'
        }), 400, {'Content-Type': 'application/json'}
    
    # Firestoreからキャッシュを確認
    cache_ref = db.collection('cache').document(f'video_{video_id}')
    cache_doc = cache_ref.get()
    
    # 1時間以内のキャッシュがあれば、それを返す
    if cache_doc.exists:
        cache_data = cache_doc.to_dict()
        cache_time = cache_data.get('timestamp', None)
        if cache_time and (datetime.datetime.now() - cache_time).total_seconds() < 3600:  # 1時間
            return json.dumps(cache_data['data']), 200, {'Content-Type': 'application/json'}
    
    # キャッシュがないか古い場合はAPIから取得
    youtube = YouTubeAPI()
    try:
        video_details = youtube.get_video_details(video_id)
        
        # Firestoreにキャッシュを保存
        cache_ref.set({
            'data': video_details,
            'timestamp': datetime.datetime.now()
        })
        
        return json.dumps(video_details), 200, {'Content-Type': 'application/json'}
    except Exception as e:
        return json.dumps({
            'error': 'API Error',
            'message': str(e)
        }), 500, {'Content-Type': 'application/json'}

def search_videos(request: Request):
    """
    動画を検索するAPIエンドポイント
    
    クエリパラメータ:
        query: 検索キーワード
        max_results: 取得する動画の最大数（デフォルト10、最大50）
    """
    query = request.args.get('query')
    if not query:
        return json.dumps({
            'error': 'Bad Request',
            'message': 'Missing required parameter: query'
        }), 400, {'Content-Type': 'application/json'}
    
    max_results = request.args.get('max_results', '10')
    try:
        max_results = int(max_results)
        max_results = min(max(1, max_results), 50)  # 1～50の範囲に制限
    except ValueError:
        max_results = 10
    
    # Firestoreからキャッシュを確認（検索はクエリごとにキャッシュ）
    cache_ref = db.collection('cache').document(f'search_{query.replace(" ", "_")}')
    cache_doc = cache_ref.get()
    
    # 30分以内のキャッシュがあれば、それを返す
    if cache_doc.exists:
        cache_data = cache_doc.to_dict()
        cache_time = cache_data.get('timestamp', None)
        if cache_time and (datetime.datetime.now() - cache_time).total_seconds() < 1800:  # 30分
            videos = cache_data.get('data', [])
            return json.dumps(videos[:max_results]), 200, {'Content-Type': 'application/json'}
    
    # キャッシュがないか古い場合はAPIから取得
    youtube = YouTubeAPI()
    try:
        search_results = youtube.search_videos(query, max_results)
        
        # Firestoreにキャッシュを保存
        cache_ref.set({
            'data': search_results,
            'timestamp': datetime.datetime.now()
        })
        
        return json.dumps(search_results), 200, {'Content-Type': 'application/json'}
    except Exception as e:
        return json.dumps({
            'error': 'API Error',
            'message': str(e)
        }), 500, {'Content-Type': 'application/json'}