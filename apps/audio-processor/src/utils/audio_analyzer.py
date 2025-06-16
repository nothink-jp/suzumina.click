"""
音声解析ユーティリティ
音声ファイルから音声ボタン用セグメントを抽出
"""

import logging
from typing import List, Dict, Any, Tuple
from pathlib import Path
import numpy as np
from pydub import AudioSegment
from pydub.silence import split_on_silence, detect_nonsilent

class AudioAnalyzer:
    """
    音声解析・セグメント抽出クラス
    """
    
    def __init__(self):
        self.logger = logging.getLogger(__name__)
        
        # 音声解析パラメータ
        self.min_silence_len = 500  # 無音とみなす最小長さ（ミリ秒）
        self.silence_thresh = -40   # 無音の閾値（dB）
        self.min_segment_duration = 1.0  # 最小セグメント長（秒）
        self.max_segment_duration = 10.0  # 最大セグメント長（秒）
        self.target_segments = 20   # 目標セグメント数
    
    def extract_speech_segments(self, audio_file_path: Path) -> List[Dict[str, Any]]:
        """
        音声ファイルから発話セグメントを抽出
        
        Args:
            audio_file_path: 音声ファイルパス
            
        Returns:
            List[Dict[str, Any]]: セグメント情報リスト
        """
        try:
            self.logger.info(f"音声解析開始: {audio_file_path}")
            
            # 音声ファイル読み込み
            audio = AudioSegment.from_file(audio_file_path)
            self.logger.info(f"音声読み込み完了: 長さ={len(audio)}ms, チャンネル={audio.channels}")
            
            # モノラルに変換（処理軽量化）
            if audio.channels > 1:
                audio = audio.set_channels(1)
            
            # 1. 無音区間で分割
            speech_segments = self._split_by_silence(audio)
            self.logger.info(f"無音分割完了: {len(speech_segments)}セグメント")
            
            # 2. セグメント長フィルタリング
            filtered_segments = self._filter_by_duration(speech_segments)
            self.logger.info(f"長さフィルタリング完了: {len(filtered_segments)}セグメント")
            
            # 3. 音量ベースフィルタリング
            volume_filtered = self._filter_by_volume(filtered_segments, audio)
            self.logger.info(f"音量フィルタリング完了: {len(volume_filtered)}セグメント")
            
            # 4. 最適なセグメント選択
            selected_segments = self._select_best_segments(volume_filtered)
            self.logger.info(f"セグメント選択完了: {len(selected_segments)}セグメント")
            
            return selected_segments
            
        except Exception as e:
            self.logger.error(f"音声解析エラー: {str(e)}", exc_info=True)
            return []
    
    def _split_by_silence(self, audio: AudioSegment) -> List[Dict[str, Any]]:
        """
        無音区間で音声を分割
        
        Args:
            audio: 音声データ
            
        Returns:
            List[Dict[str, Any]]: セグメント情報
        """
        # 非無音区間を検出
        nonsilent_ranges = detect_nonsilent(
            audio,
            min_silence_len=self.min_silence_len,
            silence_thresh=self.silence_thresh
        )
        
        segments = []
        for i, (start_ms, end_ms) in enumerate(nonsilent_ranges):
            duration_ms = end_ms - start_ms
            
            segment = {
                'index': i,
                'start_time': start_ms / 1000.0,  # 秒に変換
                'end_time': end_ms / 1000.0,
                'duration': duration_ms / 1000.0,
                'start_ms': start_ms,
                'end_ms': end_ms,
            }
            segments.append(segment)
        
        return segments
    
    def _filter_by_duration(self, segments: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """
        セグメント長でフィルタリング
        
        Args:
            segments: セグメントリスト
            
        Returns:
            List[Dict[str, Any]]: フィルタ済みセグメント
        """
        filtered = []
        
        for segment in segments:
            duration = segment['duration']
            
            # 長すぎるセグメントは分割
            if duration > self.max_segment_duration:
                # 最大長で分割
                num_splits = int(np.ceil(duration / self.max_segment_duration))
                split_duration = duration / num_splits
                
                for i in range(num_splits):
                    split_start = segment['start_time'] + (i * split_duration)
                    split_end = min(split_start + split_duration, segment['end_time'])
                    
                    if split_end - split_start >= self.min_segment_duration:
                        split_segment = {
                            'index': segment['index'] * 100 + i,  # ユニークなインデックス
                            'start_time': split_start,
                            'end_time': split_end,
                            'duration': split_end - split_start,
                            'start_ms': int(split_start * 1000),
                            'end_ms': int(split_end * 1000),
                            'is_split': True,
                        }
                        filtered.append(split_segment)
            
            # 適切な長さのセグメント
            elif duration >= self.min_segment_duration:
                filtered.append(segment)
        
        return filtered
    
    def _filter_by_volume(self, segments: List[Dict[str, Any]], audio: AudioSegment) -> List[Dict[str, Any]]:
        """
        音量でセグメントをフィルタリング
        
        Args:
            segments: セグメントリスト
            audio: 元音声データ
            
        Returns:
            List[Dict[str, Any]]: フィルタ済みセグメント
        """
        filtered = []
        
        for segment in segments:
            start_ms = segment['start_ms']
            end_ms = segment['end_ms']
            
            # セグメント音声を抽出
            segment_audio = audio[start_ms:end_ms]
            
            # 音量計算
            rms = segment_audio.rms
            db = segment_audio.dBFS
            
            # 音量情報を追加
            segment['rms'] = rms
            segment['db'] = db
            
            # 音量が低すぎるセグメントを除外
            if db > -50:  # -50dB以上
                filtered.append(segment)
        
        return filtered
    
    def _select_best_segments(self, segments: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """
        最適なセグメントを選択
        
        Args:
            segments: セグメントリスト
            
        Returns:
            List[Dict[str, Any]]: 選択されたセグメント
        """
        if len(segments) <= self.target_segments:
            return segments
        
        # 音量とバランス良い長さでスコアリング
        for segment in segments:
            # 音量スコア（正規化）
            volume_score = max(0, (segment['db'] + 50) / 50)  # -50dB〜0dBを0〜1に正規化
            
            # 長さスコア（3〜5秒が最適）
            duration = segment['duration']
            if 3.0 <= duration <= 5.0:
                duration_score = 1.0
            elif duration < 3.0:
                duration_score = duration / 3.0
            else:
                duration_score = max(0.5, 8.0 / duration)
            
            # 総合スコア
            segment['score'] = (volume_score * 0.7) + (duration_score * 0.3)
        
        # スコア順でソートして上位を選択
        sorted_segments = sorted(segments, key=lambda x: x['score'], reverse=True)
        selected = sorted_segments[:self.target_segments]
        
        # 時系列順に再ソート
        selected.sort(key=lambda x: x['start_time'])
        
        return selected
    
    def get_audio_info(self, audio_file_path: Path) -> Dict[str, Any]:
        """
        音声ファイルの基本情報を取得
        
        Args:
            audio_file_path: 音声ファイルパス
            
        Returns:
            Dict[str, Any]: 音声情報
        """
        try:
            audio = AudioSegment.from_file(audio_file_path)
            
            return {
                'duration_ms': len(audio),
                'duration_sec': len(audio) / 1000.0,
                'channels': audio.channels,
                'sample_rate': audio.frame_rate,
                'sample_width': audio.sample_width,
                'frame_count': audio.frame_count(),
                'max_dBFS': audio.max_dBFS,
                'rms': audio.rms,
                'file_size': audio_file_path.stat().st_size,
            }
            
        except Exception as e:
            self.logger.error(f"音声情報取得エラー: {str(e)}", exc_info=True)
            return {}