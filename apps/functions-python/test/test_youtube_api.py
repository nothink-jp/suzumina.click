import unittest
from unittest.mock import patch, MagicMock
import sys
import os

# テスト対象のモジュールへのパスを追加
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from src.lib.youtube_api import YouTubeAPI

class TestYoutubeAPI(unittest.TestCase):
    
    @patch('src.lib.youtube_api.build')
    @patch('src.lib.youtube_api.secretmanager.SecretManagerServiceClient')
    def setUp(self, mock_secret_manager, mock_build):
        # Secret Managerからの応答をモック
        mock_secret_version = MagicMock()
        mock_secret_version.payload.data.decode.return_value = "test-api-key"
        mock_secret_client = MagicMock()
        mock_secret_client.access_secret_version.return_value = mock_secret_version
        mock_secret_manager.return_value = mock_secret_client
        
        # YouTube API buildをモック
        self.mock_youtube = MagicMock()
        mock_build.return_value = self.mock_youtube
        
        # テスト対象のインスタンスを作成
        self.api = YouTubeAPI()
    
    def test_get_channel_info(self):
        # YouTube API応答のモック
        mock_list = MagicMock()
        mock_execute = MagicMock()
        mock_execute.execute.return_value = {
            'items': [{
                'id': 'test-channel-id',
                'snippet': {
                    'title': 'Test Channel',
                    'description': 'A test channel',
                    'thumbnails': {'high': {'url': 'http://example.com/thumb.jpg'}}
                },
                'statistics': {
                    'subscriberCount': '1000',
                    'viewCount': '10000',
                    'videoCount': '100'
                },
                'contentDetails': {
                    'relatedPlaylists': {'uploads': 'test-playlist-id'}
                }
            }]
        }
        mock_list.list.return_value = mock_execute
        self.mock_youtube.channels.return_value = mock_list
        
        # メソッドを実行
        result = self.api.get_channel_info('test-channel-id')
        
        # アサーション
        self.assertEqual(result['id'], 'test-channel-id')
        self.assertEqual(result['title'], 'Test Channel')
        self.assertEqual(result['subscriberCount'], 1000)
        self.assertEqual(result['uploadsPlaylistId'], 'test-playlist-id')
        
        # API呼び出しパラメータの確認
        self.mock_youtube.channels.return_value.list.assert_called_once_with(
            part="snippet,contentDetails,statistics",
            id='test-channel-id'
        )
    
    def test_get_latest_videos(self):
        # Channel API応答のモック
        mock_channel_list = MagicMock()
        mock_channel_execute = MagicMock()
        mock_channel_execute.execute.return_value = {
            'items': [{
                'contentDetails': {
                    'relatedPlaylists': {'uploads': 'test-playlist-id'}
                }
            }]
        }
        mock_channel_list.list.return_value = mock_channel_execute
        self.mock_youtube.channels.return_value = mock_channel_list
        
        # PlaylistItems API応答のモック
        mock_playlist_list = MagicMock()
        mock_playlist_execute = MagicMock()
        mock_playlist_execute.execute.return_value = {
            'items': [
                {
                    'snippet': {
                        'title': 'Test Video 1',
                        'description': 'Description 1',
                        'publishedAt': '2024-04-01T00:00:00Z',
                        'thumbnails': {'high': {'url': 'http://example.com/thumb1.jpg'}},
                        'channelId': 'test-channel-id',
                        'channelTitle': 'Test Channel'
                    },
                    'contentDetails': {'videoId': 'test-video-id-1'}
                }
            ]
        }
        mock_playlist_list.list.return_value = mock_playlist_execute
        self.mock_youtube.playlistItems.return_value = mock_playlist_list
        
        # メソッドを実行
        result = self.api.get_latest_videos('test-channel-id', 1)
        
        # アサーション
        self.assertEqual(len(result), 1)
        self.assertEqual(result[0]['id'], 'test-video-id-1')
        self.assertEqual(result[0]['title'], 'Test Video 1')
        
        # API呼び出しパラメータの確認
        self.mock_youtube.playlistItems.return_value.list.assert_called_once_with(
            part="snippet,contentDetails",
            playlistId='test-playlist-id',
            maxResults=1
        )

if __name__ == '__main__':
    unittest.main()