# Google Cloud Platform APIエンドポイント設計 (Cloud Run サービス)

このドキュメントでは、suzumina.clickのAPIエンドポイント実装設計の概要を説明します。

## アーキテクチャ概要

suzumina.clickのバックエンドAPIは**Cloud Run サービス**を使用し、コンテナ化されたアプリケーションとしてデプロイします。主にPython (FastAPI) で実装します。

**基本構成**:

- ユーザー/Webアプリ → **Cloud Run サービス** → データストア/外部API
- サーバーレスアーキテクチャ採用
- 言語選択の柔軟性（TypeScript/Python）
- マイクロサービス指向設計

## TypeScript実装

### プロジェクト構造

*(注: 現在はPython実装が主ですが、TypeScript実装も将来的にはCloud Runサービスへの移行を検討します)*

```
src/index.ts    - エントリーポイント
src/api/        - API関数
src/lib/        - 共通ライブラリ
src/utils/      - ユーティリティ
test/           - テスト
```

### エントリーポイント例

```typescript
import { http } from '@google-cloud/functions-framework';
import { hello } from './api/hello';

http('app', async (req, res) => {
  const path = req.path.toLowerCase();

  if (path === '/api/hello') {
    return hello(req, res);
  }
  res.status(404).send({ error: 'Not Found' });
});
```

## Python実装 (FastAPI on Cloud Run)

### プロジェクト構造 (apps/functions-python)

```
Dockerfile      - コンテナビルド定義
pyproject.toml  - 依存関係定義 (uv + FastAPI, Uvicorn)
src/main.py     - FastAPIエントリーポイント (ルーター)
src/api/        - API関数定義
src/lib/        - 共通ライブラリ
src/utils/      - ユーティリティ
test/           - テストコード
```

### エントリーポイント例 (src/main.py)

```python
from fastapi import FastAPI
from src.api.hello import hello

# FastAPIアプリケーションインスタンスを作成
app = FastAPI()

@app.get("/api/hello")
async def route_hello():
    return hello()
```

## デプロイ設定

| 設定項目       | 値                     | 備考                                   |
|----------------|------------------------|----------------------------------------|
| コンテナイメージ | Dockerfileで定義       | Python 3.12 slimベース                 |
| メモリ | 512MB | 必要に応じて調整                       |
| インスタンス数 | 最小0、最大自動        | スケーリング設定                       |
| タイムアウト | 60秒 | リクエスト処理のタイムアウト           |

### デプロイコマンド例

```bash
# 1. Cloud Build を使用してコンテナイメージをビルド & Artifact Registry に push
# gcloud builds submit --tag gcr.io/YOUR_PROJECT_ID/suzumina-api-py ./apps/functions-python

# 2. Cloud Run サービスとしてデプロイ
gcloud run deploy suzumina-api-py \
  --image gcr.io/YOUR_PROJECT_ID/suzumina-api-py:latest \
  --region=asia-northeast1 \
  --allow-unauthenticated # 必要に応じて認証を設定
```

## 関連ドキュメント

- [全体概要](GCP_OVERVIEW.md)
- [Webアプリケーション設計](GCP_WEB_APP.md)
- [外部API連携設計](GCP_EXTERNAL_APIS.md)

最終更新日: 2025年4月3日 (Cloud Run サービス移行)
