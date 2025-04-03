import pytest
from unittest.mock import patch, MagicMock
import datetime
from fastapi.testclient import TestClient

# テスト対象のFastAPIアプリケーションをインポート
# 注意: PYTHONPATHが適切に設定されているか、テスト実行時にsrcディレクトリが認識される必要があります。
# pytest実行時に `PYTHONPATH=./apps/functions-python pytest apps/functions-python/test` のように設定するか、
# pytestの設定ファイル(pyproject.toml or pytest.ini)で設定します。
from src.main import app

# TestClientを作成
client = TestClient(app)

# --- Fixtures (Optional, but good practice for mocking) ---

@pytest.fixture(autouse=True)
def mock_firestore():
    """Firestoreクライアントを自動的にモックするフィクスチャ"""
    with patch('src.api.youtube.db') as mock_db:
        # get()が返すドキュメントのモックを設定
        mock_doc_ref = MagicMock()
        mock_doc = MagicMock()
        mock_doc.exists = False # デフォルトではキャッシュなし
        mock_doc_ref.get.return_value = mock_doc
        mock_db.collection.return_value.document.return_value = mock_doc_ref
        yield mock_db

@pytest.fixture(autouse=True)
def mock_youtube_api_methods():
    """YouTubeAPIクラスのメソッドを自動的にモックするフィクスチャ"""
    with patch('src.api.youtube.YouTubeAPI') as mock_api_class:
        mock_api_instance = MagicMock()
        # 各メソッドのデフォルトの戻り値を設定 (必要に応じてテスト内で上書き)
        mock_api_instance.get_channel_info.return_value = {
            'id': 'mock-channel-id', 'title': 'Mock Channel', 'subscriberCount': 500, 'uploadsPlaylistId': 'mock-playlist-id'
        }
        mock_api_instance.get_latest_videos.return_value = [
            {'id': 'mock-video-id-1', 'title': 'Mock Video 1'}
        ]
        mock_api_instance.get_video_details.return_value = {
            'id': 'mock-video-id-detail', 'title': 'Mock Video Detail'
        }
        mock_api_instance.search_videos.return_value = [
            {'id': 'mock-search-video-1', 'title': 'Mock Search Result 1'}
        ]
        mock_api_class.return_value = mock_api_instance
        yield mock_api_instance # モックインスタンスをテスト関数で使えるように返す

# --- Test Functions ---

def test_hello_endpoint():
    """/api/hello エンドポイントのテスト"""
    response = client.get("/api/hello")
    assert response.status_code == 200
    assert response.json() == {
        'message': 'Hello from Python Cloud Run Functions!',
        'service': 'suzumina.click YouTube API'
    }

def test_get_channel_info_endpoint(mock_firestore, mock_youtube_api_methods):
    """/api/youtube/channel エンドポイントのテスト (キャッシュなし)"""
    # Arrange: モックの設定 (キャッシュなしの状態はデフォルト)
    channel_id = "test-channel-id"
    expected_response = {
        'id': 'mock-channel-id', 'title': 'Mock Channel', 'subscriberCount': 500, 'uploadsPlaylistId': 'mock-playlist-id'
    }
    mock_youtube_api_methods.get_channel_info.return_value = expected_response

    # Act: APIエンドポイントを呼び出す
    response = client.get("/api/youtube/channel", params={"channel_id": channel_id})

    # Assert: レスポンスとモックの呼び出しを確認
    assert response.status_code == 200
    assert response.json() == expected_response
    mock_firestore.collection.assert_called_with('cache')
    mock_firestore.collection().document.assert_called_with(f'channel_{channel_id}')
    mock_firestore.collection().document().get.assert_called_once()
    mock_youtube_api_methods.get_channel_info.assert_called_once_with(channel_id)
    # Firestoreへの書き込みも確認 (set)
    mock_firestore.collection().document().set.assert_called_once()

def test_get_channel_info_endpoint_cache_hit(mock_firestore, mock_youtube_api_methods):
    """/api/youtube/channel エンドポイントのテスト (キャッシュあり)"""
    # Arrange: Firestoreモックを設定してキャッシュヒットさせる
    channel_id = "cached-channel-id"
    cached_data = {'id': 'cached-id', 'title': 'Cached Channel'}
    mock_doc = MagicMock()
    mock_doc.exists = True
    mock_doc.to_dict.return_value = {
        'data': cached_data,
        'timestamp': datetime.datetime.now() - datetime.timedelta(hours=1) # 有効なキャッシュ
    }
    mock_firestore.collection.return_value.document.return_value.get.return_value = mock_doc

    # Act
    response = client.get("/api/youtube/channel", params={"channel_id": channel_id})

    # Assert
    assert response.status_code == 200
    assert response.json() == cached_data
    mock_firestore.collection().document().get.assert_called_once()
    mock_youtube_api_methods.get_channel_info.assert_not_called() # APIは呼ばれないはず
    mock_firestore.collection().document().set.assert_not_called() # setも呼ばれないはず

def test_get_latest_videos_endpoint(mock_firestore, mock_youtube_api_methods):
    """/api/youtube/videos エンドポイントのテスト"""
    # Arrange
    channel_id = "test-channel-id"
    max_results = 5
    expected_response = [{'id': 'mock-video-id-1', 'title': 'Mock Video 1'}] # モックのデフォルトを使用

    # Act
    response = client.get("/api/youtube/videos", params={"channel_id": channel_id, "max_results": max_results})

    # Assert
    assert response.status_code == 200
    assert response.json() == expected_response
    mock_firestore.collection().document(f'videos_{channel_id}').get.assert_called_once()
    mock_youtube_api_methods.get_latest_videos.assert_called_once_with(channel_id, max_results)
    mock_firestore.collection().document(f'videos_{channel_id}').set.assert_called_once()

def test_get_video_details_endpoint(mock_firestore, mock_youtube_api_methods):
    """/api/youtube/video/{video_id} エンドポイントのテスト"""
    # Arrange
    video_id = "test-video-id"
    expected_response = {'id': 'mock-video-id-detail', 'title': 'Mock Video Detail'} # モックのデフォルト
    mock_youtube_api_methods.get_video_details.return_value = expected_response

    # Act
    response = client.get(f"/api/youtube/video/{video_id}")

    # Assert
    assert response.status_code == 200
    assert response.json() == expected_response
    mock_firestore.collection().document(f'video_{video_id}').get.assert_called_once()
    mock_youtube_api_methods.get_video_details.assert_called_once_with(video_id)
    mock_firestore.collection().document(f'video_{video_id}').set.assert_called_once()

def test_search_videos_endpoint(mock_firestore, mock_youtube_api_methods):
    """/api/youtube/search エンドポイントのテスト"""
    # Arrange
    query = "test query"
    max_results = 7
    expected_response = [{'id': 'mock-search-video-1', 'title': 'Mock Search Result 1'}] # モックのデフォルト
    mock_youtube_api_methods.search_videos.return_value = expected_response
    cache_key = f'search_{query.replace(" ", "_")}'

    # Act
    response = client.get("/api/youtube/search", params={"query": query, "max_results": max_results})

    # Assert
    assert response.status_code == 200
    assert response.json() == expected_response
    mock_firestore.collection().document(cache_key).get.assert_called_once()
    mock_youtube_api_methods.search_videos.assert_called_once_with(query, max_results)
    mock_firestore.collection().document(cache_key).set.assert_called_once()

# --- Error Case Tests ---

def test_get_channel_info_missing_param():
    """/api/youtube/channel パラメータ不足時のテスト (FastAPI 422)"""
    response = client.get("/api/youtube/channel") # channel_id を渡さない
    assert response.status_code == 422 # Unprocessable Entity
    assert "detail" in response.json()
    assert response.json()["detail"][0]["msg"] == "Field required" # FastAPIのデフォルトエラーメッセージ

def test_youtube_api_error_leads_to_500(mock_youtube_api_methods):
    """YouTubeAPIのメソッドが例外を発生させた場合に500エラーになるかのテスト"""
    # Arrange: YouTubeAPIのメソッドが例外を投げるように設定
    channel_id = "error-channel"
    mock_youtube_api_methods.get_channel_info.side_effect = Exception("Simulated API Error")

    # Act
    response = client.get("/api/youtube/channel", params={"channel_id": channel_id})

    # Assert
    assert response.status_code == 500
    assert response.json() == {"detail": "API Error: Simulated API Error"}

# 注意: このテストを実行するには、pytest と httpx がインストールされている必要があります。
# また、PYTHONPATHが適切に設定されているか確認してください。
# 例: PYTHONPATH=./apps/functions-python pytest apps/functions-python/test/test_youtube_api.py