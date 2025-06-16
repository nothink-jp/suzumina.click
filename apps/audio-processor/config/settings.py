"""
設定管理クラス
環境変数から設定値を読み込み
"""

import os
from typing import Optional
from pydantic import BaseSettings, Field

class Settings(BaseSettings):
    """
    アプリケーション設定
    """
    
    # GCP プロジェクト設定
    gcp_project: str = Field(..., env='GOOGLE_CLOUD_PROJECT')
    gcp_region: str = Field(default='us-central1', env='GOOGLE_CLOUD_REGION')
    
    # Cloud Storage設定
    audio_bucket_name: str = Field(..., env='AUDIO_BUCKET_NAME')
    
    # Firestore設定
    firestore_database: str = Field(default='(default)', env='FIRESTORE_DATABASE')
    
    # 音声処理設定
    max_audio_buttons: int = Field(default=20, env='MAX_AUDIO_BUTTONS')
    min_segment_duration: float = Field(default=1.0, env='MIN_SEGMENT_DURATION')  # 秒
    max_segment_duration: float = Field(default=10.0, env='MAX_SEGMENT_DURATION')  # 秒
    
    # 音声品質設定
    opus_bitrate: str = Field(default='128k', env='OPUS_BITRATE')
    aac_bitrate: str = Field(default='128k', env='AAC_BITRATE')
    
    # ログレベル
    log_level: str = Field(default='INFO', env='LOG_LEVEL')
    
    # Cloud Run Jobs設定
    job_timeout: int = Field(default=3600, env='JOB_TIMEOUT')  # 秒（1時間）
    
    class Config:
        env_file = '.env'
        env_file_encoding = 'utf-8'
    
    @property
    def audio_bucket_url(self) -> str:
        """Cloud Storage音声バケットのURL"""
        return f"gs://{self.audio_bucket_name}"
    
    def validate_settings(self) -> bool:
        """
        設定値の妥当性チェック
        
        Returns:
            bool: 設定が有効かどうか
        """
        try:
            # 必須環境変数チェック
            required_vars = [
                'GOOGLE_CLOUD_PROJECT',
                'AUDIO_BUCKET_NAME'
            ]
            
            missing_vars = []
            for var in required_vars:
                if not os.getenv(var):
                    missing_vars.append(var)
            
            if missing_vars:
                raise ValueError(f"必須環境変数が設定されていません: {', '.join(missing_vars)}")
            
            # 数値範囲チェック
            if self.min_segment_duration >= self.max_segment_duration:
                raise ValueError("min_segment_duration は max_segment_duration より小さい必要があります")
            
            if self.max_audio_buttons <= 0:
                raise ValueError("max_audio_buttons は1以上である必要があります")
            
            return True
            
        except Exception as e:
            print(f"設定検証エラー: {str(e)}")
            return False