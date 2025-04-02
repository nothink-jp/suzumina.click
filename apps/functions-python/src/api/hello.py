import json
from flask import Request

def hello(request: Request):
    """
    シンプルな動作確認用APIエンドポイント
    """
    return json.dumps({
        'message': 'Hello from Python Cloud Functions!',
        'service': 'suzumina.click YouTube API'
    }), 200, {'Content-Type': 'application/json'}