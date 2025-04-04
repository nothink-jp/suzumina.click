# 設計ドキュメント

このディレクトリには、suzumina.clickプロジェクトの設計ドキュメントが含まれています。

## ドキュメント一覧

- [プロジェクト分析](PROJECT_ANALYSIS.md) - プロジェクトのアーキテクチャと設計方針
- [GCP概要](gcp/GCP_OVERVIEW.md) - Google Cloud Platformのデプロイ概要
- [変更履歴](CHANGELOG.md) - プロジェクトの重要な変更履歴
- [実装予定](TODO.md) - 実装予定の機能と優先順位

## GCP関連ドキュメント

- [Webアプリケーション設計](gcp/GCP_WEB_APP.md) - Cloud Runを使用したNext.jsアプリケーション
- [CI/CD設計](gcp/GCP_CICD.md) - GitHub Actionsによる継続的デリバリー
- [外部API連携設計](gcp/GCP_EXTERNAL_APIS.md) - YouTube Data APIなどの外部サービス連携
- [ストレージ設計](gcp/GCP_STORAGE.md) - FirestoreとCloud Storageの利用方針
- [セキュリティ設計](gcp/GCP_SECURITY.md) - 環境変数と機密情報の管理
- [ベストプラクティス](gcp/GCP_BEST_PRACTICES.md) - サービスと言語選択のガイドライン

## ドキュメント規約

1. すべての設計ドキュメントはこのディレクトリに配置します
2. ドキュメントは常にMarkdown形式で作成します
3. 各ドキュメントは100行以内で簡潔にまとめます
4. 必要に応じてサブディレクトリを使用して整理します

## ドキュメントの種類と目的

### アーキテクチャ設計

- プロジェクトのアーキテクチャと設計方針を記述
- 長期的な視点での技術選択の理由を説明
- コードベース全体に影響を与える決定事項を記録

### 変更履歴（CHANGELOG）

- プロジェクトの重要な変更履歴を記録
- セマンティックバージョニングに従って整理
- 重要な技術的決定や移行の記録
