import json
import traceback
import logging

def handle_error(error):
    """
    APIエラーの標準ハンドラー
    
    Args:
        error: 発生した例外
        
    Returns:
        tuple: (レスポンス本文, ステータスコード, ヘッダー)
    """
    logging.error(f"Error: {str(error)}")
    logging.error(traceback.format_exc())
    
    if isinstance(error, ValueError):
        return json.dumps({
            'error': 'Bad Request',
            'message': str(error)
        }), 400, {'Content-Type': 'application/json'}
    
    return json.dumps({
        'error': 'Internal Server Error',
        'message': str(error)
    }), 500, {'Content-Type': 'application/json'}