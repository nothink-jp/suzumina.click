# Google Cloud Platform APIエンドポイント設計

このドキュメントでは、suzumina.clickのAPIエンドポイント実装設計の概要を説明します。

## アーキテクチャ概要

suzumina.clickのバックエンドAPIはCloud Functions (2nd gen)を使用し、TypeScriptまたはPythonで実装します。

**基本構成**:

- ユーザー/Webアプリ → Cloud Functions → データストア/外部API
- サーバーレスアーキテクチャ採用
- 言語選択の柔軟性（TypeScript/Python）
- マイクロサービス指向設計

## TypeScript実装

### プロジェクト構造

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

## Python実装

### プロジェクト構造

```
src/main.py     - エントリーポイント
src/api/        - API関数定義
src/lib/        - 共通ライブラリ
src/utils/      - ユーティリティ
test/           - テストコード
```

### サンプル実装

```python
import functions_framework

@functions_framework.http
def hello(request):
    return {"message": "Hello from Python Cloud Functions!"}
```

## デプロイ設定

| 設定項目 | 値 |
|---------|-----|
| ランタイム | Node.js 22 / Python 3.12 |
| メモリ | 512MB |
| インスタンス数 | 最小0、最大自動 |
| タイムアウト | 60秒 |

### デプロイコマンド例

```bash
gcloud functions deploy app \
  --gen2 \
  --runtime=nodejs22 \
  --region=asia-northeast1 \
  --allow-unauthenticated
```

## 関連ドキュメント

- [全体概要](GCP_OVERVIEW.md)
- [Webアプリケーション設計](GCP_WEB_APP.md)
- [外部API連携設計](GCP_EXTERNAL_APIS.md)

最終更新日: 2025年4月2日
