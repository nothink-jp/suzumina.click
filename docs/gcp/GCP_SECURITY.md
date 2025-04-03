# Google Cloud Platform セキュリティ設計

このドキュメントでは、suzumina.clickのセキュリティ設計概要を説明します。

## セキュリティ原則

1. **最小権限の原則**: 各サービスに必要最小限の権限のみ付与
2. **機密情報の保護**: 機密情報はSecret Manager管理
3. **通信の暗号化**: すべての通信にHTTPS強制
4. **認証と認可**: 適切なアクセス制御と認証実装
5. **定期的な監査**: セキュリティ設定の定期レビュー

## 認証と認可

### 各サービスの認証方式

- **Webアプリ**: 開発環境は認証なし、本番環境はFirebase Authentication
- **APIエンドポイント**: 開発環境は認証なし、本番環境はIAM認証/JWTトークン
- **バッチジョブ**: サービスアカウントベースのアクセス制御

## 環境変数の管理

- **ローカル開発**: `.env.local`ファイル（`.gitignore`に追加）
- **デプロイ環境**: CI/CDパイプラインで各サービスの環境変数として設定

## Secret Managerの利用

- **命名規則**: `{service}-{purpose}-{env}`（例：`youtube-api-key-dev`）
- **アクセス管理**: サービスアカウントに最小限のシークレットアクセス権を付与
- **バージョン管理**: 更新時に新バージョン作成、通常は最新版を参照

### シークレットアクセス例（TypeScript）

```typescript
import { SecretManagerServiceClient } from '@google-cloud/secret-manager';

async function getSecret(secretName: string): Promise<string> {
  const client = new SecretManagerServiceClient();
  const name = `projects/suzumina-click-dev/secrets/${secretName}/versions/latest`;
  const [version] = await client.accessSecretVersion({ name });
  return version.payload?.data?.toString() || '';
}
```

## サービスアカウント管理

### 主要サービスアカウント

- `github-actions-deployer`: CI/CDデプロイ用
- `app-runtime`: アプリケーション実行用
- `youtube-api-client`: YouTube API連携用

### ベストプラクティス

- 必要最小限の権限のみ付与
- 定期的な権限監査と整理
- サービスアカウントキーの発行最小化

## 関連ドキュメント

- [全体概要](GCP_OVERVIEW.md)
- [プロジェクト設定](GCP_PROJECT_SETUP.md)
- [CI/CD設計](GCP_CICD.md)

最終更新日: 2025年4月3日
