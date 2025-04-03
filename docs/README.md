# 設計ドキュメント

このディレクトリには、suzumina.clickプロジェクトの設計ドキュメントが含まれています。

## ドキュメント一覧

- [プロジェクト分析](PROJECT_ANALYSIS.md) - プロジェクトのアーキテクチャと設計方針
- [GCP概要](gcp/GCP_OVERVIEW.md) - Google Cloud Platformのデプロイ概要
- [変更履歴](CHANGELOG.md) - プロジェクトの重要な変更履歴

## GCP関連ドキュメント

- [プロジェクト設定](gcp/GCP_PROJECT_SETUP.md) - GCPプロジェクトの基本設定
- [Webアプリケーション設計](gcp/GCP_WEB_APP.md) - Cloud Runを使用したNext.jsアプリケーション
- [API設計](gcp/GCP_CLOUD_RUN_FUNCTIONS.md) - Cloud Run Functionsを使用したAPI実装
- [CI/CD設計](gcp/GCP_CICD.md) - GitHub Actionsによる継続的デリバリー
- [外部API連携設計](gcp/GCP_EXTERNAL_APIS.md) - YouTube Data APIなどの外部サービス連携
- [実装計画](gcp/GCP_ROADMAP.md) - 段階的な実装ロードマップ
- [ストレージ設計](gcp/GCP_STORAGE.md) - FirestoreとCloud Storageの利用方針
- [セキュリティ設計](gcp/GCP_SECURITY.md) - 環境変数と機密情報の管理
- [監視設計](gcp/GCP_MONITORING.md) - ログ収集と監視アラートの設定
- [ベストプラクティス](gcp/GCP_BEST_PRACTICES.md) - サービスと言語選択のガイドライン
- [全体デプロイ設計](gcp/GCP_DEPLOYMENT_DESIGN.md) - GCPコンポーネント、サービス/言語選択、ストレージ、CI/CD等の全体設計

## ドキュメント規約

1. すべての設計ドキュメントはこのディレクトリに配置します
2. ドキュメントは常にMarkdown形式で作成します
3. 各ドキュメントは明確な目的と構造を持つようにします
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

### 実装計画

- 特定の機能やコンポーネントの実装詳細を記述
- 具体的なコード例や技術的アプローチを含む
- タイムラインや優先順位を明確化
- 依存関係や前提条件を明示
