#!/usr/bin/env python3
"""
Cloud Run Jobs 音声処理メインスクリプト
YouTube動画から音声ボタンを生成してCloud Storageに保存
"""

import os
import sys
import logging
import json
from typing import Dict, Any, Optional
from pathlib import Path

from audio_processor import AudioProcessor
from config.settings import Settings
from utils.logger import setup_logger

def main() -> int:
    """
    メイン処理関数
    
    Returns:
        int: 終了コード (0: 成功, 1: 失敗)
    """
    try:
        # ロガー設定
        logger = setup_logger()
        logger.info("音声処理Cloud Run Jobs開始")
        
        # 設定読み込み
        settings = Settings()
        logger.info(f"設定読み込み完了: project={settings.gcp_project}")
        
        # コマンドライン引数またはHTTPリクエストから処理対象を取得
        video_id = get_video_id_from_request()
        
        if not video_id:
            logger.error("処理対象のvideoIdが指定されていません")
            return 1
        
        logger.info(f"音声処理開始: videoId={video_id}")
        
        # 音声処理実行
        processor = AudioProcessor(settings)
        result = processor.process_video(video_id)
        
        if result.success:
            logger.info(f"音声処理完了: {result.buttons_created}個のボタンを作成")
            return 0
        else:
            logger.error(f"音声処理失敗: {result.error_message}")
            return 1
            
    except Exception as e:
        logger.error(f"予期しないエラーが発生しました: {str(e)}", exc_info=True)
        return 1

def get_video_id_from_request() -> Optional[str]:
    """
    リクエストから処理対象のvideoIdを取得
    
    Cloud Run Jobsは以下の方法でパラメータを受け取れる:
    1. 環境変数
    2. HTTPリクエストボディ（Cloud Tasksから）
    3. コマンドライン引数
    
    Returns:
        Optional[str]: videoId
    """
    # 1. 環境変数から取得
    video_id = os.getenv("VIDEO_ID")
    if video_id:
        return video_id
    
    # 2. HTTPリクエストボディから取得（簡易実装）
    try:
        # Cloud Run JobsはHTTPリクエストを受信可能
        import http.server
        import socketserver
        from urllib.parse import parse_qs
        
        # 実際の実装では、FlaskやFastAPIを使用することを推奨
        # ここでは簡易的にHTTPサーバーを起動
        
        # まずは環境変数を優先
        pass
    except:
        pass
    
    # 3. コマンドライン引数から取得
    if len(sys.argv) > 1:
        return sys.argv[1]
    
    return None

if __name__ == "__main__":
    # Cloud Run Jobsのための簡易HTTPサーバー設定
    port = int(os.getenv("PORT", 8080))
    
    if os.getenv("CLOUD_RUN_JOB"):
        # Cloud Run Jobs環境での実行
        exit_code = main()
        sys.exit(exit_code)
    else:
        # ローカル開発環境でのHTTPサーバー起動
        from http.server import HTTPServer, BaseHTTPRequestHandler
        import json
        
        class AudioProcessorHandler(BaseHTTPRequestHandler):
            def do_POST(self):
                content_length = int(self.headers.get('Content-Length', 0))
                post_data = self.rfile.read(content_length)
                
                try:
                    data = json.loads(post_data.decode('utf-8'))
                    video_id = data.get('videoId')
                    
                    if video_id:
                        # 環境変数に設定してメイン処理実行
                        os.environ['VIDEO_ID'] = video_id
                        exit_code = main()
                        
                        if exit_code == 0:
                            self.send_response(200)
                            self.send_header('Content-type', 'application/json')
                            self.end_headers()
                            response = {'status': 'success', 'videoId': video_id}
                            self.wfile.write(json.dumps(response).encode())
                        else:
                            self.send_response(500)
                            self.send_header('Content-type', 'application/json')
                            self.end_headers()
                            response = {'status': 'error', 'videoId': video_id}
                            self.wfile.write(json.dumps(response).encode())
                    else:
                        self.send_response(400)
                        self.send_header('Content-type', 'application/json')
                        self.end_headers()
                        response = {'error': 'videoId is required'}
                        self.wfile.write(json.dumps(response).encode())
                        
                except Exception as e:
                    self.send_response(500)
                    self.send_header('Content-type', 'application/json')
                    self.end_headers()
                    response = {'error': str(e)}
                    self.wfile.write(json.dumps(response).encode())
            
            def do_GET(self):
                self.send_response(200)
                self.send_header('Content-type', 'application/json')
                self.end_headers()
                response = {'status': 'Audio Processor Service Ready'}
                self.wfile.write(json.dumps(response).encode())
        
        # HTTPサーバー起動
        server = HTTPServer(('0.0.0.0', port), AudioProcessorHandler)
        print(f"Audio Processor HTTP Server starting on port {port}")
        server.serve_forever()