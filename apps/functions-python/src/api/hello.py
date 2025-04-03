def hello():
    """
    シンプルな動作確認用APIエンドポイント
    """
    # FastAPIは辞書を自動的にJSONレスポンスに変換する
    return {
        'message': 'Hello from Python Cloud Run Functions!',
        'service': 'suzumina.click YouTube API'
    }