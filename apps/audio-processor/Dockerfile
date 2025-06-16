# Cloud Run Jobs用 音声処理Dockerイメージ
# yt-dlp + FFmpeg + Python環境

FROM python:3.11-slim

# 作業ディレクトリ設定
WORKDIR /app

# システムパッケージのインストール
# - FFmpeg: 音声変換処理
# - curl: ダウンロード処理
# - git: yt-dlp依存関係
RUN apt-get update && apt-get install -y \
    ffmpeg \
    curl \
    git \
    && rm -rf /var/lib/apt/lists/*

# Python依存関係のインストール
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# アプリケーションコードのコピー
COPY src/ ./src/
COPY config/ ./config/

# 実行権限設定
RUN chmod +x src/main.py

# 環境変数設定
ENV PYTHONPATH=/app
ENV PYTHONUNBUFFERED=1

# Cloud Run Jobs用のポート設定（必須）
EXPOSE 8080

# アプリケーション実行
CMD ["python", "src/main.py"]