"""
Google Cloud Storage統合クライアント
音声ファイルのアップロード・管理
"""

import logging
from typing import Optional, Dict, Any
from pathlib import Path
from google.cloud import storage
from google.cloud.exceptions import GoogleCloudError

from config.settings import Settings

class CloudStorageClient:
    """
    Google Cloud Storage操作クライアント
    """
    
    def __init__(self, settings: Settings):
        self.settings = settings
        self.logger = logging.getLogger(__name__)
        
        try:
            self.client = storage.Client(project=settings.gcp_project)
            self.bucket = self.client.bucket(settings.audio_bucket_name)
            
            self.logger.info(f"Cloud Storage初期化完了: bucket={settings.audio_bucket_name}")
            
        except Exception as e:
            self.logger.error(f"Cloud Storage初期化エラー: {str(e)}", exc_info=True)
            raise
    
    def upload_audio_file(self, local_file_path: Path, storage_path: str) -> Optional[str]:
        """
        音声ファイルをCloud Storageにアップロード
        
        Args:
            local_file_path: ローカルファイルパス
            storage_path: Cloud Storage内のパス
            
        Returns:
            Optional[str]: アップロード成功時のパブリックURL
        """
        try:
            if not local_file_path.exists():
                self.logger.error(f"アップロード対象ファイルが存在しません: {local_file_path}")
                return None
            
            self.logger.info(f"ファイルアップロード開始: {local_file_path} -> {storage_path}")
            
            # Blobオブジェクト作成
            blob = self.bucket.blob(storage_path)
            
            # ファイルアップロード
            blob.upload_from_filename(str(local_file_path))
            
            # メタデータ設定
            blob.metadata = {
                'original_filename': local_file_path.name,
                'upload_timestamp': str(int(local_file_path.stat().st_mtime)),
                'content_type': self._get_content_type(local_file_path.suffix),
            }
            blob.patch()
            
            # パブリックURL生成（署名付きURLを使用）
            url = self._generate_signed_url(blob)
            
            file_size = local_file_path.stat().st_size
            self.logger.info(f"ファイルアップロード完了: {storage_path} ({file_size} bytes)")
            
            return url
            
        except GoogleCloudError as e:
            self.logger.error(f"Cloud Storageアップロードエラー ({storage_path}): {str(e)}", exc_info=True)
            return None
        except Exception as e:
            self.logger.error(f"予期しないアップロードエラー ({storage_path}): {str(e)}", exc_info=True)
            return None
    
    def _generate_signed_url(self, blob: storage.Blob, expiration_hours: int = 1) -> str:
        """
        署名付きURLを生成
        
        Args:
            blob: Storageブロブ
            expiration_hours: 有効期限（時間）
            
        Returns:
            str: 署名付きURL
        """
        from datetime import timedelta
        
        try:
            url = blob.generate_signed_url(
                expiration=timedelta(hours=expiration_hours),
                method='GET'
            )
            return url
            
        except Exception as e:
            self.logger.warning(f"署名付きURL生成失敗、パブリックURLを返却: {str(e)}")
            return f"https://storage.googleapis.com/{self.bucket.name}/{blob.name}"
    
    def _get_content_type(self, file_extension: str) -> str:
        """
        ファイル拡張子からContent-Typeを取得
        
        Args:
            file_extension: ファイル拡張子（.を含む）
            
        Returns:
            str: Content-Type
        """
        content_types = {
            '.opus': 'audio/opus',
            '.aac': 'audio/aac',
            '.mp4': 'audio/mp4',
            '.ogg': 'audio/ogg',
            '.wav': 'audio/wav',
            '.mp3': 'audio/mpeg',
        }
        
        return content_types.get(file_extension.lower(), 'audio/mpeg')
    
    def delete_audio_file(self, storage_path: str) -> bool:
        """
        Cloud Storageから音声ファイルを削除
        
        Args:
            storage_path: Cloud Storage内のパス
            
        Returns:
            bool: 削除成功可否
        """
        try:
            blob = self.bucket.blob(storage_path)
            blob.delete()
            
            self.logger.info(f"ファイル削除完了: {storage_path}")
            return True
            
        except GoogleCloudError as e:
            self.logger.error(f"ファイル削除エラー ({storage_path}): {str(e)}", exc_info=True)
            return False
    
    def list_audio_files(self, prefix: str) -> list:
        """
        指定プレフィックスの音声ファイル一覧を取得
        
        Args:
            prefix: ファイルパスのプレフィックス
            
        Returns:
            list: ファイル情報のリスト
        """
        try:
            blobs = self.bucket.list_blobs(prefix=prefix)
            
            files = []
            for blob in blobs:
                files.append({
                    'name': blob.name,
                    'size': blob.size,
                    'created': blob.time_created,
                    'updated': blob.updated,
                    'content_type': blob.content_type,
                })
            
            self.logger.info(f"ファイル一覧取得完了: {len(files)}件 (prefix={prefix})")
            return files
            
        except GoogleCloudError as e:
            self.logger.error(f"ファイル一覧取得エラー (prefix={prefix}): {str(e)}", exc_info=True)
            return []
    
    def get_bucket_info(self) -> Dict[str, Any]:
        """
        バケット情報を取得
        
        Returns:
            Dict[str, Any]: バケット情報
        """
        try:
            bucket_info = {
                'name': self.bucket.name,
                'location': self.bucket.location,
                'storage_class': self.bucket.storage_class,
                'time_created': self.bucket.time_created,
            }
            
            return bucket_info
            
        except GoogleCloudError as e:
            self.logger.error(f"バケット情報取得エラー: {str(e)}", exc_info=True)
            return {}