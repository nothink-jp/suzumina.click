# YouTube Data API連携用Cloud Run Functions実装計画

YouTube Data API連携のためのPython版Cloud Run Functions実装計画です。

## 目的

YouTube Data APIにアクセスするCloud Run Functions (Python)を実装し、Webアプリケーションから利用可能なAPIエンドポイントを提供します。

## 実装概要

```
Next.js Webアプリ → Cloud Run Functions (Python) → YouTube Data API
                                  ↓
                     Firestore（キャッシュ/データ保存）
```

## ディレクトリ構造と主要ファイル

```
apps/functions-python/
├── src/
│   ├── main.py                # エントリーポイント
│   ├── api/youtube.py         # YouTube関連API
│   ├── lib/youtube_api.py     # API操作ライブラリ
│   └── utils/error_handler.py # エラーハンドリング
└── test/
    └── test_youtube_api.py    # テストコード
```

## 主要コンポーネント

### 依存パッケージ

- functions-framework==3.5.0
- google-api-python-client==2.124.0
- google-cloud-secret-manager==2.22.0
- google-cloud-firestore==2.15.0

### APIエンドポイント

| エンドポイント | 用途 | パラメータ |
|--------------|------|----------|
| GET /api/youtube/channel | チャンネル情報取得 | channel_id |
| GET /api/youtube/videos | 最新動画一覧取得 | channel_id, max_results |
| GET /api/youtube/video/{video_id} | 動画詳細取得 | video_id |
| GET /api/youtube/search | 動画検索 | query, max_results |

### YouTubeAPI クラス主要メソッド

- `__init__()`: YouTube APIクライアント初期化
- `get_channel_info(channel_id)`: チャンネル情報取得
- `get_latest_videos(channel_id, max_results=10)`: 最新動画取得
- `get_video_details(video_id)`: 動画詳細取得
- `search_videos(query, max_results=10)`: 動画検索

### キャッシュ戦略とエラーハンドリング

| データタイプ | キャッシュ期間 | HTTP エラー | 状況 |
|------------|--------------|------------|-----|
| チャンネル情報 | 24時間 | 400 | パラメータ不足/不正 |
| 動画一覧 | 1時間 | 404 | リソース不存在 |
| 動画詳細 | 1時間 | 500 | サーバー内部エラー |
| 検索結果 | 30分 | | |

## テストとデプロイコマンド

```bash
# テスト実行
python -m pytest
# ローカル実行
functions-framework --target=main --debug
# デプロイ
gcloud functions deploy youtube-api --gen2 --runtime=python312 --region=asia-northeast1
```

### 今後の展望

1. 認証機能の追加（本番環境でのアクセス制限）
2. キャッシュ戦略の最適化（アクセスパターンに応じた調整）
3. モニタリング強化（詳細なメトリクス収集）
4. コメント取得API追加（動画コメントの取得・分析）
