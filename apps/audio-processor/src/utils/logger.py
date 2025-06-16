"""
ログ設定ユーティリティ
Cloud Run Jobs用の構造化ログ出力
"""

import logging
import json
import sys
from typing import Dict, Any
from datetime import datetime

class JsonFormatter(logging.Formatter):
    """
    JSON形式でログを出力するフォーマッター
    Google Cloud Loggingに最適化
    """
    
    def format(self, record: logging.LogRecord) -> str:
        """
        ログレコードをJSON形式にフォーマット
        
        Args:
            record: ログレコード
            
        Returns:
            str: JSON形式のログメッセージ
        """
        log_entry = {
            'timestamp': datetime.utcnow().isoformat() + 'Z',
            'severity': record.levelname,
            'message': record.getMessage(),
            'logger': record.name,
            'module': record.module,
            'function': record.funcName,
            'line': record.lineno,
        }
        
        # 例外情報がある場合は追加
        if record.exc_info:
            log_entry['exception'] = self.formatException(record.exc_info)
        
        # 追加のコンテキスト情報
        if hasattr(record, 'video_id'):
            log_entry['video_id'] = record.video_id
        
        if hasattr(record, 'button_id'):
            log_entry['button_id'] = record.button_id
        
        if hasattr(record, 'processing_time'):
            log_entry['processing_time_ms'] = record.processing_time
        
        return json.dumps(log_entry, ensure_ascii=False)

def setup_logger(name: str = None, level: str = 'INFO') -> logging.Logger:
    """
    Cloud Run Jobs用のロガーをセットアップ
    
    Args:
        name: ロガー名（Noneの場合はルートロガー）
        level: ログレベル
        
    Returns:
        logging.Logger: 設定済みロガー
    """
    # ロガー取得
    logger = logging.getLogger(name)
    
    # 既にハンドラーが設定されている場合はスキップ
    if logger.handlers:
        return logger
    
    # ログレベル設定
    numeric_level = getattr(logging, level.upper(), logging.INFO)
    logger.setLevel(numeric_level)
    
    # ハンドラー作成
    handler = logging.StreamHandler(sys.stdout)
    handler.setLevel(numeric_level)
    
    # フォーマッター設定
    formatter = JsonFormatter()
    handler.setFormatter(formatter)
    
    # ハンドラー追加
    logger.addHandler(handler)
    
    # 親ロガーへの伝播を防ぐ
    logger.propagate = False
    
    return logger

class LoggerMixin:
    """
    ログ機能を追加するMixin
    """
    
    @property
    def logger(self) -> logging.Logger:
        """クラス用のロガーを取得"""
        if not hasattr(self, '_logger'):
            self._logger = setup_logger(self.__class__.__name__)
        return self._logger
    
    def log_processing_time(self, operation: str, start_time: float, end_time: float, **kwargs):
        """
        処理時間ログを出力
        
        Args:
            operation: 操作名
            start_time: 開始時刻
            end_time: 終了時刻
            **kwargs: 追加のコンテキスト情報
        """
        processing_time = (end_time - start_time) * 1000  # ミリ秒
        
        # ログレコードに追加情報を設定
        extra = {
            'processing_time': processing_time,
            **kwargs
        }
        
        self.logger.info(
            f"{operation} 完了: {processing_time:.2f}ms",
            extra=extra
        )