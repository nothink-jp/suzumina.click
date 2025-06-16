"""
音声処理メインクラス
YouTube動画から音声を抽出し、音声ボタンを生成
"""

import os
import tempfile
import subprocess
import logging
from typing import List, Dict, Any, Optional, NamedTuple
from pathlib import Path
import yt_dlp
from pydub import AudioSegment
import json

from google.cloud import storage, firestore
from config.settings import Settings
from utils.audio_analyzer import AudioAnalyzer
from utils.cloud_storage import CloudStorageClient
from utils.firestore_client import FirestoreClient

class ProcessingResult(NamedTuple):
    """音声処理結果"""
    success: bool
    buttons_created: int
    error_message: Optional[str] = None
    storage_urls: List[str] = []

class AudioButton(NamedTuple):
    """音声ボタンデータ"""
    id: str
    title: str
    start_time: float  # 秒
    end_time: float    # 秒
    duration: float    # 秒
    audio_files: Dict[str, Dict[str, Any]]  # format -> {url, fileSize, bitrate}

class AudioProcessor:
    """
    YouTube動画から音声ボタンを生成するメインクラス
    """
    
    def __init__(self, settings: Settings):
        self.settings = settings
        self.logger = logging.getLogger(__name__)
        
        # クライアント初期化
        self.storage_client = CloudStorageClient(settings)
        self.firestore_client = FirestoreClient(settings)
        self.audio_analyzer = AudioAnalyzer()
        
        # 一時ディレクトリ
        self.temp_dir = Path(tempfile.mkdtemp())
        
        self.logger.info(f"AudioProcessor初期化完了: temp_dir={self.temp_dir}")
    
    def process_video(self, video_id: str) -> ProcessingResult:
        """
        動画を処理して音声ボタンを生成
        
        Args:
            video_id: YouTube動画ID
            
        Returns:
            ProcessingResult: 処理結果
        """
        try:
            self.logger.info(f"動画処理開始: {video_id}")
            
            # 1. Firestoreから動画メタデータ取得
            video_metadata = self.firestore_client.get_video_metadata(video_id)
            if not video_metadata:
                return ProcessingResult(
                    success=False,
                    buttons_created=0,
                    error_message=f"動画メタデータが見つかりません: {video_id}"
                )
            
            # 2. YouTube動画音声ダウンロード
            audio_file_path = self._download_audio(video_id)
            if not audio_file_path:
                return ProcessingResult(
                    success=False,
                    buttons_created=0,
                    error_message="音声ダウンロードに失敗しました"
                )
            
            # 3. 音声解析・セグメント抽出
            segments = self.audio_analyzer.extract_speech_segments(audio_file_path)
            self.logger.info(f"音声セグメント抽出完了: {len(segments)}個")
            
            # 4. 音声ボタン生成
            buttons = self._create_audio_buttons(video_id, audio_file_path, segments)
            self.logger.info(f"音声ボタン生成完了: {len(buttons)}個")
            
            # 5. Cloud Storageアップロード
            storage_urls = []
            for button in buttons:
                urls = self._upload_button_audio(video_id, button, audio_file_path)
                storage_urls.extend(urls)
            
            # 6. Firestoreメタデータ更新
            self.firestore_client.update_video_audio_buttons(video_id, buttons)
            
            # 7. 一時ファイル削除
            self._cleanup_temp_files()
            
            return ProcessingResult(
                success=True,
                buttons_created=len(buttons),
                storage_urls=storage_urls
            )
            
        except Exception as e:
            self.logger.error(f"動画処理エラー ({video_id}): {str(e)}", exc_info=True)
            self._cleanup_temp_files()
            
            return ProcessingResult(
                success=False,
                buttons_created=0,
                error_message=str(e)
            )
    
    def _download_audio(self, video_id: str) -> Optional[Path]:
        """
        YouTube動画から音声をダウンロード
        
        Args:
            video_id: YouTube動画ID
            
        Returns:
            Optional[Path]: ダウンロードした音声ファイルパス
        """
        try:
            output_path = self.temp_dir / f"{video_id}_audio.%(ext)s"
            
            # yt-dlp設定
            ydl_opts = {
                'format': 'bestaudio/best',
                'outtmpl': str(output_path),
                'extractaudio': True,
                'audioformat': 'opus',  # 高品質・高圧縮
                'audioquality': '128K',
                'no_warnings': True,
                'quiet': True,
            }
            
            youtube_url = f"https://www.youtube.com/watch?v={video_id}"
            
            self.logger.info(f"音声ダウンロード開始: {youtube_url}")
            
            with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                ydl.download([youtube_url])
            
            # ダウンロードされたファイルを探索
            for file_path in self.temp_dir.glob(f"{video_id}_audio.*"):
                if file_path.is_file():
                    self.logger.info(f"音声ダウンロード完了: {file_path}")
                    return file_path
            
            self.logger.error("ダウンロードファイルが見つかりません")
            return None
            
        except Exception as e:
            self.logger.error(f"音声ダウンロードエラー: {str(e)}", exc_info=True)
            return None
    
    def _create_audio_buttons(
        self, 
        video_id: str, 
        audio_file_path: Path, 
        segments: List[Dict[str, Any]]
    ) -> List[AudioButton]:
        """
        音声セグメントから音声ボタンを生成
        
        Args:
            video_id: 動画ID
            audio_file_path: 音声ファイルパス
            segments: 音声セグメント情報
            
        Returns:
            List[AudioButton]: 音声ボタンリスト
        """
        buttons = []
        
        # 最大20個までのボタンを生成
        max_buttons = min(20, len(segments))
        selected_segments = segments[:max_buttons]
        
        for i, segment in enumerate(selected_segments):
            button_id = f"{video_id}_btn_{i+1:02d}"
            
            button = AudioButton(
                id=button_id,
                title=f"音声ボタン{i+1}",
                start_time=segment['start_time'],
                end_time=segment['end_time'],
                duration=segment['duration'],
                audio_files={}  # 後でアップロード時に設定
            )
            
            buttons.append(button)
        
        return buttons
    
    def _upload_button_audio(
        self, 
        video_id: str, 
        button: AudioButton, 
        source_audio_path: Path
    ) -> List[str]:
        """
        音声ボタンのオーディオファイルをCloud Storageにアップロード
        
        Args:
            video_id: 動画ID
            button: 音声ボタン情報
            source_audio_path: 元音声ファイルパス
            
        Returns:
            List[str]: アップロードされたファイルのURL
        """
        uploaded_urls = []
        
        try:
            # 音声セグメント切り出し
            audio = AudioSegment.from_file(source_audio_path)
            
            start_ms = int(button.start_time * 1000)
            end_ms = int(button.end_time * 1000)
            segment = audio[start_ms:end_ms]
            
            # 複数フォーマットで保存
            formats = [
                {'ext': 'opus', 'format': 'opus', 'bitrate': '128k'},
                {'ext': 'aac', 'format': 'aac', 'bitrate': '128k'}
            ]
            
            for fmt in formats:
                # 一時ファイルに書き出し
                temp_file = self.temp_dir / f"{button.id}.{fmt['ext']}"
                
                if fmt['format'] == 'opus':
                    segment.export(temp_file, format="opus", bitrate=fmt['bitrate'])
                else:
                    segment.export(temp_file, format="mp4", codec="aac", bitrate=fmt['bitrate'])
                
                # Cloud Storageにアップロード
                storage_path = f"videos/{video_id}/buttons/{button.id}.{fmt['ext']}"
                url = self.storage_client.upload_audio_file(temp_file, storage_path)
                
                if url:
                    uploaded_urls.append(url)
                    
                    # ボタンオブジェクトにファイル情報追加
                    file_size = temp_file.stat().st_size
                    button.audio_files[fmt['format']] = {
                        'url': url,
                        'fileSize': file_size,
                        'bitrate': int(fmt['bitrate'].replace('k', '')) * 1000
                    }
                
                # 一時ファイル削除
                if temp_file.exists():
                    temp_file.unlink()
            
            return uploaded_urls
            
        except Exception as e:
            self.logger.error(f"音声ファイルアップロードエラー ({button.id}): {str(e)}", exc_info=True)
            return []
    
    def _cleanup_temp_files(self):
        """一時ファイルのクリーンアップ"""
        try:
            import shutil
            if self.temp_dir.exists():
                shutil.rmtree(self.temp_dir)
                self.logger.info(f"一時ファイル削除完了: {self.temp_dir}")
        except Exception as e:
            self.logger.warning(f"一時ファイル削除エラー: {str(e)}")