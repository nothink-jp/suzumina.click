"""
Firestore統合クライアント
動画メタデータ・音声ボタン情報の管理
"""

import logging
from typing import Optional, Dict, Any, List
from datetime import datetime
from google.cloud import firestore
from google.cloud.exceptions import GoogleCloudError

from config.settings import Settings

class FirestoreClient:
    """
    Firestore操作クライアント
    """
    
    def __init__(self, settings: Settings):
        self.settings = settings
        self.logger = logging.getLogger(__name__)
        
        try:
            self.client = firestore.Client(
                project=settings.gcp_project,
                database=settings.firestore_database
            )
            
            self.logger.info(f"Firestore初期化完了: project={settings.gcp_project}")
            
        except Exception as e:
            self.logger.error(f"Firestore初期化エラー: {str(e)}", exc_info=True)
            raise
    
    def get_video_metadata(self, video_id: str) -> Optional[Dict[str, Any]]:
        """
        動画メタデータをFirestoreから取得
        
        Args:
            video_id: YouTube動画ID
            
        Returns:
            Optional[Dict[str, Any]]: 動画メタデータ
        """
        try:
            doc_ref = self.client.collection('youtubeVideos').document(video_id)
            doc = doc_ref.get()
            
            if not doc.exists:
                self.logger.warning(f"動画メタデータが見つかりません: {video_id}")
                return None
            
            data = doc.to_dict()
            self.logger.info(f"動画メタデータ取得完了: {video_id}")
            
            return data
            
        except GoogleCloudError as e:
            self.logger.error(f"動画メタデータ取得エラー ({video_id}): {str(e)}", exc_info=True)
            return None
    
    def update_video_audio_buttons(self, video_id: str, audio_buttons: List[Dict[str, Any]]) -> bool:
        """
        動画の音声ボタン情報をFirestoreに保存
        
        Args:
            video_id: YouTube動画ID
            audio_buttons: 音声ボタン情報リスト
            
        Returns:
            bool: 更新成功可否
        """
        try:
            # 動画ドキュメントを更新
            doc_ref = self.client.collection('youtubeVideos').document(video_id)
            
            # 音声ボタンデータをFirestore形式に変換
            firestore_buttons = []
            for button in audio_buttons:
                firestore_button = {
                    'id': button.id,
                    'title': button.title,
                    'startTime': button.start_time,
                    'endTime': button.end_time,
                    'duration': button.duration,
                    'audioFiles': button.audio_files,
                    'createdAt': firestore.SERVER_TIMESTAMP,
                }
                firestore_buttons.append(firestore_button)
            
            # 動画ドキュメントを更新
            update_data = {
                'audioButtons': firestore_buttons,
                'audioProcessingStatus': 'completed',
                'audioProcessingUpdatedAt': firestore.SERVER_TIMESTAMP,
                'updatedAt': firestore.SERVER_TIMESTAMP,
            }
            
            doc_ref.update(update_data)
            
            self.logger.info(f"音声ボタン情報更新完了: {video_id} ({len(audio_buttons)}個)")
            
            # 各音声ボタンを個別ドキュメントとしても保存
            self._save_individual_audio_buttons(video_id, audio_buttons)
            
            return True
            
        except GoogleCloudError as e:
            self.logger.error(f"音声ボタン情報更新エラー ({video_id}): {str(e)}", exc_info=True)
            return False
    
    def _save_individual_audio_buttons(self, video_id: str, audio_buttons: List[Dict[str, Any]]):
        """
        音声ボタンを個別ドキュメントとして保存
        
        Args:
            video_id: YouTube動画ID
            audio_buttons: 音声ボタン情報リスト
        """
        try:
            for button in audio_buttons:
                button_doc_id = f"{video_id}_{button.id}"
                doc_ref = self.client.collection('audioButtons').document(button_doc_id)
                
                button_data = {
                    'videoId': video_id,
                    'buttonId': button.id,
                    'title': button.title,
                    'startTime': button.start_time,
                    'endTime': button.end_time,
                    'duration': button.duration,
                    'audioFiles': button.audio_files,
                    'createdAt': firestore.SERVER_TIMESTAMP,
                    'updatedAt': firestore.SERVER_TIMESTAMP,
                }
                
                doc_ref.set(button_data)
            
            self.logger.info(f"個別音声ボタン保存完了: {video_id}")
            
        except GoogleCloudError as e:
            self.logger.error(f"個別音声ボタン保存エラー ({video_id}): {str(e)}", exc_info=True)
    
    def update_processing_status(self, video_id: str, status: str, error_message: Optional[str] = None) -> bool:
        """
        音声処理ステータスを更新
        
        Args:
            video_id: YouTube動画ID
            status: 処理ステータス ('pending', 'processing', 'completed', 'failed')
            error_message: エラーメッセージ（失敗時）
            
        Returns:
            bool: 更新成功可否
        """
        try:
            doc_ref = self.client.collection('youtubeVideos').document(video_id)
            
            update_data = {
                'audioProcessingStatus': status,
                'audioProcessingUpdatedAt': firestore.SERVER_TIMESTAMP,
                'updatedAt': firestore.SERVER_TIMESTAMP,
            }
            
            if error_message:
                update_data['audioProcessingError'] = error_message
            
            doc_ref.update(update_data)
            
            self.logger.info(f"処理ステータス更新完了: {video_id} -> {status}")
            return True
            
        except GoogleCloudError as e:
            self.logger.error(f"処理ステータス更新エラー ({video_id}): {str(e)}", exc_info=True)
            return False
    
    def get_audio_buttons(self, video_id: str) -> List[Dict[str, Any]]:
        """
        動画の音声ボタン一覧を取得
        
        Args:
            video_id: YouTube動画ID
            
        Returns:
            List[Dict[str, Any]]: 音声ボタン情報リスト
        """
        try:
            # audioButtonsコレクションから取得
            query = self.client.collection('audioButtons').where('videoId', '==', video_id)
            docs = query.stream()
            
            buttons = []
            for doc in docs:
                button_data = doc.to_dict()
                buttons.append(button_data)
            
            # 作成時刻でソート
            buttons.sort(key=lambda x: x.get('createdAt', datetime.min))
            
            self.logger.info(f"音声ボタン取得完了: {video_id} ({len(buttons)}個)")
            return buttons
            
        except GoogleCloudError as e:
            self.logger.error(f"音声ボタン取得エラー ({video_id}): {str(e)}", exc_info=True)
            return []
    
    def delete_audio_buttons(self, video_id: str) -> bool:
        """
        動画の音声ボタンを削除
        
        Args:
            video_id: YouTube動画ID
            
        Returns:
            bool: 削除成功可否
        """
        try:
            # 個別音声ボタンドキュメントを削除
            query = self.client.collection('audioButtons').where('videoId', '==', video_id)
            docs = query.stream()
            
            deleted_count = 0
            for doc in docs:
                doc.reference.delete()
                deleted_count += 1
            
            # 動画ドキュメントから音声ボタン情報を削除
            doc_ref = self.client.collection('youtubeVideos').document(video_id)
            doc_ref.update({
                'audioButtons': firestore.DELETE_FIELD,
                'audioProcessingStatus': 'pending',
                'audioProcessingUpdatedAt': firestore.SERVER_TIMESTAMP,
                'updatedAt': firestore.SERVER_TIMESTAMP,
            })
            
            self.logger.info(f"音声ボタン削除完了: {video_id} ({deleted_count}個)")
            return True
            
        except GoogleCloudError as e:
            self.logger.error(f"音声ボタン削除エラー ({video_id}): {str(e)}", exc_info=True)
            return False
    
    def create_processing_job_record(self, video_id: str, job_name: str) -> Optional[str]:
        """
        音声処理ジョブレコードを作成
        
        Args:
            video_id: YouTube動画ID
            job_name: Cloud Run Jobsのジョブ名
            
        Returns:
            Optional[str]: ジョブドキュメントID
        """
        try:
            job_data = {
                'videoId': video_id,
                'jobName': job_name,
                'status': 'queued',
                'createdAt': firestore.SERVER_TIMESTAMP,
                'buttonsCreated': 0,
            }
            
            doc_ref = self.client.collection('audioProcessingJobs').add(job_data)[1]
            job_id = doc_ref.id
            
            self.logger.info(f"処理ジョブレコード作成: {job_id} (video={video_id})")
            return job_id
            
        except GoogleCloudError as e:
            self.logger.error(f"処理ジョブレコード作成エラー ({video_id}): {str(e)}", exc_info=True)
            return None