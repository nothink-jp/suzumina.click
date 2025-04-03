# Google Cloud Platform デプロイ概要

このドキュメントは、suzumina.clickのGoogle Cloud Platform（GCP）デプロイに関する概要を説明します。詳細な設計については、各トピック別のドキュメントを参照してください。

## 全体アーキテクチャ

```mermaid
flowchart TD
    A["ユーザー"] --> B["Cloud Run - Next.js Web App"]
    D["Cloud Scheduler"] --> E["Cloud Run Jobs - バッチ処理"]
    E <--> F["Cloud Firestore - 構造化データ"]
    E <--> J["Cloud Storage - 大容量ファイル"]
    E <--> K["YouTube Data API"]
    G["GitHub Actions"] --> H["CI/CD Pipeline"]
    H --> B
    H --> E
    I["GCP Secret Manager"] --> B
    I --> E
```

## ドキュメント一覧

suzumina.clickのGCPデプロイに関する詳細設計は、以下のドキュメントに分割されています：

1. **[全体デプロイ設計](GCP_DEPLOYMENT_DESIGN.md)** - GCPコンポーネント、サービス/言語選択、ストレージ、CI/CD等の全体設計
2. **[プロジェクト設定](GCP_PROJECT_SETUP.md)** - GCPプロジェクトの基本設定とAPI有効化
3. **[Webアプリケーション設計](GCP_WEB_APP.md)** - Cloud Runを使用したNext.jsアプリケーションのデプロイ
4. **[CI/CD設計](GCP_CICD.md)** - GitHub Actionsを使用した継続的インテグレーション/デリバリー
5. **[セキュリティ設計](GCP_SECURITY.md)** - 環境変数と機密情報の管理
6. **[ベストプラクティス](GCP_BEST_PRACTICES.md)** - サービスと言語選択のガイドライン
7. **[外部API連携設計](GCP_EXTERNAL_APIS.md)** - YouTube Data APIなどの外部サービスとの連携
8. **[ストレージ設計](GCP_STORAGE.md)** - FirestoreとCloud Storageの利用方針

各ドキュメントは独立して参照できますが、全体像を把握するためには、このオーバービュードキュメントから始めることをお勧めします。

## 主要コンポーネント

| コンポーネント | 使用サービス | 主な目的 |
|--------------|------------|--------|
| Webフロントエンド | Cloud Run | ユーザーインターフェース提供 |
| バッチ処理 | Cloud Run Jobs | 定期的なデータ同期と処理 |
| データベース | Firestore | 構造化データの保存 |
| オブジェクトストレージ | Cloud Storage | 大容量ファイルの保存 |
| CI/CD | GitHub Actions | 自動デプロイとテスト |
| シークレット管理 | Secret Manager | 認証情報と機密データの管理 |
| スケジューラ | Cloud Scheduler | バッチジョブのトリガー |

## デプロイ環境

- **開発環境**: `suzumina-click-dev`
- **本番環境**: `suzumina-click-prod`（計画中）
- **リージョン**: `asia-northeast1`（東京）

## 最終更新日

2025年4月2日
