# Audio Processor - Cloud Run Jobs

suzumina.clickプロジェクト用の音声処理Cloud Run Jobs実装です。YouTube動画から音声を抽出し、音声ボタンとしてCloud Storageに保存します。

## 🎯 機能概要

- YouTube動画音声のダウンロード（yt-dlp）
- 音声セグメント自動抽出・解析
- 複数フォーマット変換（Opus, AAC）
- Cloud Storage自動アップロード
- Firestore メタデータ管理

## 🏗️ アーキテクチャ

```
Cloud Tasks → Cloud Run Jobs → [yt-dlp + FFmpeg] → Cloud Storage
                ↓
            Firestore (メタデータ更新)
```

## 📁 プロジェクト構造

```
apps/audio-processor/
├── Dockerfile              # Cloud Run Jobs用コンテナ
├── requirements.txt         # Python依存関係
├── .env.example            # 環境変数設定例
├── README.md               # このファイル
├── config/
│   └── settings.py         # 設定管理
└── src/
    ├── main.py             # メインエントリーポイント
    ├── audio_processor.py  # 音声処理メインクラス
    └── utils/
        ├── logger.py           # ログ設定
        ├── cloud_storage.py    # Cloud Storage統合
        ├── firestore_client.py # Firestore統合
        └── audio_analyzer.py   # 音声解析・セグメント抽出
```

## 🚀 Cloud Run Jobs デプロイ

### 1. 環境変数設定

```bash
# .envファイル作成
cp .env.example .env

# 必須環境変数を設定
export GOOGLE_CLOUD_PROJECT="suzumina-click-firebase"
export AUDIO_BUCKET_NAME="suzumina-click-audio-files"
```

### 2. Dockerイメージビルド

```bash
# プロジェクトルートから実行
cd apps/audio-processor

# イメージビルド
docker build -t audio-processor .

# Google Container Registryにプッシュ
docker tag audio-processor gcr.io/${GOOGLE_CLOUD_PROJECT}/audio-processor
docker push gcr.io/${GOOGLE_CLOUD_PROJECT}/audio-processor
```

### 3. Cloud Run Jobs作成

```bash
# Cloud Run Jobs作成
gcloud run jobs create audio-processor \\
    --image gcr.io/${GOOGLE_CLOUD_PROJECT}/audio-processor \\
    --region us-central1 \\
    --memory 16Gi \\
    --cpu 4 \\
    --max-retries 1 \\
    --parallelism 1 \\
    --task-timeout 3600 \\
    --set-env-vars="GOOGLE_CLOUD_PROJECT=${GOOGLE_CLOUD_PROJECT}" \\
    --set-env-vars="AUDIO_BUCKET_NAME=${AUDIO_BUCKET_NAME}" \\
    --set-env-vars="CLOUD_RUN_JOB=true"
```

## 🔧 ローカル開発

### 1. 依存関係インストール

```bash
# Python仮想環境作成
python -m venv venv
source venv/bin/activate  # Linux/Mac
# venv\\Scripts\\activate  # Windows

# 依存関係インストール
pip install -r requirements.txt
```

### 2. 環境設定

```bash
# GCP認証
gcloud auth application-default login

# 環境変数設定
export GOOGLE_CLOUD_PROJECT="suzumina-click-firebase"
export AUDIO_BUCKET_NAME="suzumina-click-audio-files"
```

### 3. ローカル実行

```bash
# HTTPサーバーモードで起動
python src/main.py

# 特定動画の処理実行
curl -X POST http://localhost:8080 \\
    -H "Content-Type: application/json" \\
    -d '{"videoId": "YOUR_VIDEO_ID"}'
```

## 📊 音声処理フロー

### 1. 音声ダウンロード
- yt-dlpでYouTube動画から高品質音声抽出
- Opus形式での一時保存

### 2. セグメント解析
- 無音区間での自動分割
- 音量・長さベースフィルタリング
- 最適セグメント選択（最大20個）

### 3. フォーマット変換
- **Opus**: 128kbps（プライマリ）
- **AAC**: 128kbps（フォールバック）

### 4. ストレージ保存
```
gs://suzumina-click-audio-files/
└── videos/
    └── {videoId}/
        └── buttons/
            ├── {videoId}_btn_01.opus
            ├── {videoId}_btn_01.aac
            ├── {videoId}_btn_02.opus
            └── {videoId}_btn_02.aac
```

### 5. メタデータ更新
- Firestore `youtubeVideos` コレクション更新
- `audioButtons` コレクションに個別保存

## ⚙️ 設定項目

| 環境変数 | 説明 | デフォルト |
|---------|------|-----------|
| `GOOGLE_CLOUD_PROJECT` | GCPプロジェクトID | - |
| `AUDIO_BUCKET_NAME` | 音声ファイル保存バケット | - |
| `MAX_AUDIO_BUTTONS` | 最大音声ボタン数 | 20 |
| `MIN_SEGMENT_DURATION` | 最小セグメント長（秒） | 1.0 |
| `MAX_SEGMENT_DURATION` | 最大セグメント長（秒） | 10.0 |
| `OPUS_BITRATE` | Opusビットレート | 128k |
| `AAC_BITRATE` | AACビットレート | 128k |
| `LOG_LEVEL` | ログレベル | INFO |

## 🔍 監視・ログ

### Cloud Logging
- 構造化JSON形式でログ出力
- video_id, button_id等のコンテキスト情報
- 処理時間・エラー詳細の記録

### メトリクス
- 処理成功率
- 平均処理時間
- 生成ボタン数
- エラー種別

## 🛠️ トラブルシューティング

### よくある問題

1. **YouTube動画ダウンロード失敗**
   - プライベート動画・地域制限をチェック
   - yt-dlpバージョン更新

2. **FFmpeg変換エラー**
   - 音声コーデックサポート確認
   - メモリ使用量チェック

3. **Cloud Storage アップロード失敗**
   - IAM権限確認
   - バケット存在確認

### デバッグモード

```bash
# ログレベル変更
export LOG_LEVEL=DEBUG

# 詳細ログで実行
python src/main.py
```

## 📋 TODO

- [ ] 処理進捗のリアルタイム更新
- [ ] 音声品質の自動最適化
- [ ] バッチ処理モード
- [ ] 処理結果のメール通知

## 🔗 関連ドキュメント

- [音声ボタン機能設計](../../docs/AUDIO_BUTTON_DESIGN.md)
- [Terraformインフラ設定](../../terraform/)
- [共有型定義](../../packages/shared-types/)

---

**最終更新**: 2025年6月16日  
**バージョン**: 1.0.0