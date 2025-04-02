# Google Cloud Platform セキュリティ設計

このドキュメントでは、suzumina.clickのセキュリティ設計と機密情報の管理方法について説明します。

## 目次

- [セキュリティ概要](#セキュリティ概要)
- [認証と認可](#認証と認可)
- [環境変数の管理](#環境変数の管理)
- [Secret Managerの利用](#secret-managerの利用)
- [サービスアカウント管理](#サービスアカウント管理)
- [セキュリティのベストプラクティス](#セキュリティのベストプラクティス)
- [関連ドキュメント](#関連ドキュメント)

## セキュリティ概要

suzumina.clickのGCPデプロイでは、以下のセキュリティ原則に従います：

1. **最小権限の原則**: 各サービスには必要最小限の権限のみを付与
2. **機密情報の保護**: APIキーやパスワードなどの機密情報はSecret Managerで管理
3. **通信の暗号化**: すべての通信はHTTPSを強制
4. **認証と認可**: 適切なアクセス制御と認証メカニズムを実装
5. **定期的な監査**: セキュリティ設定の定期的なレビューと監査

## 認証と認可

### Webアプリケーション (Cloud Run)

開発環境では認証なしでアクセス可能に設定していますが、本番環境では以下の認証・認可方式を実装予定です：

- **エンドユーザー認証**: Firebase Authenticationを使用したユーザー認証
- **サービス間認証**: IAMサービスアカウントとOAuth 2.0を使用

### APIエンドポイント (Cloud Run Functions)

- **開発環境**: 認証なし（`--allow-unauthenticated`）
- **本番環境**: 以下のいずれかの認証方式を実装
  - IAM認証による制限（`--no-allow-unauthenticated`）
  - APIキー認証
  - JWTトークン認証
  - OAuth 2.0認証

### バッチジョブ (Cloud Run Jobs)

- **実行権限**: サービスアカウントベースのアクセス制御
- **スケジューラからの起動**: サービスアカウントを使用したOAuth認証

## 環境変数の管理

アプリケーションの設定と機密性の低い情報は環境変数で管理します：

1. **ローカル開発環境**:
   - `.env.local`ファイルで管理
   - `.gitignore`に追加し、リポジトリにはコミットしない

2. **デプロイ環境**:
   - Cloud Run、Cloud Functions、Cloud Run Jobsの環境変数として設定
   - CI/CDパイプラインでデプロイ時に設定

```yaml
# 環境変数設定例 (gcloud CLI)
gcloud run deploy web \
  --image asia-northeast1-docker.pkg.dev/suzumina-click-dev/suzumina/web:latest \
  --set-env-vars="NODE_ENV=production,API_URL=https://api-endpoint"
```

## Secret Managerの利用

APIキーやデータベース接続情報などの機密データはGoogle Cloud Secret Managerで管理します：

1. **Secret Managerリソース命名規則**:
   - 形式: `{service}-{purpose}-{env}`
   - 例: `youtube-api-key-dev`, `firebase-admin-key-prod`

2. **シークレットのアクセス管理**:
   - サービスアカウントに対して`Secret Manager Secret Accessor`ロールを付与
   - 必要最小限のシークレットにのみアクセス権を付与

3. **アプリケーションからシークレットへのアクセス**:

```typescript
// TypeScriptでのシークレットアクセス例
import { SecretManagerServiceClient } from '@google-cloud/secret-manager';

async function getSecret(secretName: string): Promise<string> {
  const client = new SecretManagerServiceClient();
  const name = `projects/suzumina-click-dev/secrets/${secretName}/versions/latest`;
  
  const [version] = await client.accessSecretVersion({ name });
  return version.payload?.data?.toString() || '';
}

// 利用例
const apiKey = await getSecret('youtube-api-key-dev');
```

```python
# Pythonでのシークレットアクセス例
from google.cloud import secretmanager

def get_secret(secret_name):
    client = secretmanager.SecretManagerServiceClient()
    name = f"projects/suzumina-click-dev/secrets/{secret_name}/versions/latest"
    response = client.access_secret_version(request={"name": name})
    return response.payload.data.decode("UTF-8")

# 利用例
api_key = get_secret("youtube-api-key-dev")
```

4. **シークレットのバージョン管理**:
   - シークレットの更新時には新しいバージョンを作成
   - アプリケーションは基本的に最新バージョン(`latest`)を参照
   - 必要に応じて特定バージョンを参照可能

## サービスアカウント管理

サービスアカウントは、GCPリソースやサービス間のアクセス制御に使用します：

1. **主要サービスアカウント**:
   - `github-actions-deployer@suzumina-click-dev.iam.gserviceaccount.com`: CI/CDデプロイ用
   - `app-runtime@suzumina-click-dev.iam.gserviceaccount.com`: アプリケーション実行用
   - `youtube-api-client@suzumina-click-dev.iam.gserviceaccount.com`: YouTube API連携用

2. **権限管理の原則**:
   - サービスアカウントには必要最小限の権限のみを付与
   - 事前定義ロールとカスタムロールを組み合わせて使用
   - 定期的に権限を監査し、不要な権限を削除

3. **サービスアカウントキーの管理**:
   - サービスアカウントキーの発行は最小限に留める
   - キーはSecret Managerで安全に保管
   - 使用しなくなったキーは迅速に取り消し

## セキュリティのベストプラクティス

以下のセキュリティベストプラクティスに従います：

1. **定期的なセキュリティ評価**:
   - 年に2回以上、セキュリティ設定の包括的なレビューを実施
   - 脆弱性スキャンと依存関係チェックを自動化

2. **コンテナセキュリティ**:
   - コンテナイメージの脆弱性スキャンを実施
   - 最小限のベースイメージを使用
   - 不要なパッケージやツールを含めない

3. **ネットワークセキュリティ**:
   - サービス間通信を可能な限りVPC内に制限
   - 外部向けエンドポイントではHTTPSを強制
   - 必要に応じてCloud Armorでのレート制限とDDoS対策

4. **監査とログ記録**:
   - すべての管理アクションとリソースアクセスを記録
   - 重要な操作に対するアラートを設定
   - ログは長期保存と分析のためにCloud Storageにエクスポート

## 関連ドキュメント

- [全体概要](GCP_OVERVIEW.md)
- [プロジェクト設定](GCP_PROJECT_SETUP.md)
- [CI/CD設計](GCP_CICD.md)
- [監視設計](GCP_MONITORING.md)

## 最終更新日

2025年4月2日
