# TODOリスト

## 完了済み

- [x] v0.1.1 へのバージョンアップ (全パッケージ)
- [x] DeepSource 基本設定 (`.deepsource.toml` 作成・更新)
- [x] DeepSource テストカバレッジ連携 (CI設定含む)
- [x] Cloud Run デプロイ時のポート設定修正 (`Dockerfile` から `ENV PORT` を削除)
- [x] UIライブラリを shadcn/ui から HeroUI へ移行
- [x] HeroUI を利用した基本コンポーネントの実装 (Button, Card, Avatar, Alert)
- [x] packages/ui のエントリーポイント作成と exports 更新

## 優先度: 高

### NextAuthデータベース移行（Firestore → SQLite/PostgreSQL）

- [x] Drizzle ORMとSQLiteの依存関係追加
- [x] データベーススキーマの定義
- [x] NextAuth用のDrizzleアダプターの実装
- [x] NextAuth設定の更新
- [x] テストの更新
- [x] ~~データ移行スクリプトの作成と実行~~ → コスト削減のため移行スクリプトは作成せず、新規DBから開始
- [x] 開発環境でのSQLite動作確認
- [x] 検証ステップの実施
  - [x] Firestore依存コードの完全な削除確認
  - [x] 依存関係のクリーンアップ（@google-cloud/firestore削除）
  - [x] 環境変数の整理
  - [x] 機能検証（認証フロー、ユーザーデータ操作）
  - [x] パフォーマンス検証
  - [x] セキュリティ検証

### ドキュメント整理

- [x] 認証システム関連ドキュメントの更新（Firestoreからの移行反映）
- [x] 本番環境PostgreSQL移行計画の作成
- [x] 環境定義の整理（ローカル開発環境とGCP環境の明確化）
- [ ] External APIs関連ドキュメントは実装後に作成

## 優先度: 中

### 共有UIコンポーネント (HeroUI + Storybook)

- [ ] HeroUI を利用したデザインシステムの整備 (継続)
- [ ] Storybookのセットアップと設定
- [ ] アクセシビリティ対応 (継続的な確認)

### 本番環境PostgreSQL対応

- [x] PostgreSQL用のスキーマとコード修正
  - [x] `pgTable`を使用したスキーマ定義の更新
  - [x] データベース接続コードの環境分岐対応
  - [x] マイグレーション設定の更新
- [x] ローカル開発環境でのSQLite動作確認
  - [x] SQLiteの設定
  - [x] マイグレーションスクリプトのテスト
  - [x] 認証フローのテスト
- [x] GCP開発環境（suzumina-click-dev）のセットアップ
  - [x] Terraformコードの作成
  - [x] Cloud SQLインスタンスの設定
  - [x] ネットワーク設定とセキュリティ設定
  - [x] バックアップ設定
  - [x] テストスクリプトの作成
- [x] デプロイ計画の作成
  - [x] GCP開発環境へのデプロイ手順
  - [x] GCP本番環境へのデプロイ手順
  - [x] モニタリング設定の作成
  - [x] ロールバック計画の作成

## 優先度: 低

### モニタリング

- [ ] エラートラッキングの実装
- [ ] パフォーマンスモニタリングの設定
- [ ] ユーザー行動分析の導入

### セキュリティ

- [ ] 依存関係の脆弱性チェック自動化
- [ ] コードスキャンの自動化 (DeepSource)
  - [ ] DeepSource Secrets Analyzer の有効化検討
  - [ ] DeepSource GitHub App 連携確認
  - [ ] DeepSource DSN の GitHub Secrets 設定 (ユーザー作業)
- [ ] (旧) コードスキャンの自動化

### ドキュメント

- [ ] APIドキュメントの自動生成設定
- [ ] Storybookによるコンポーネントカタログの作成

### テストカバレッジの改善

- [ ] auth.tsのカバレッジ向上
  - [ ] NextAuth設定のモックとテスト (詳細設定)
  - [ ] コールバック関数のモックとテスト (エラーケース)
  - [ ] Drizzle操作のモックとテスト (エラーケース)
- [ ] Drizzleアダプターのテストカバレッジ確保

### E2Eテスト環境の構築

- [ ] Playwrightのセットアップ
- [ ] 認証フローのE2Eテスト

### インフラストラクチャ

- [ ] Cloud Run Jobsの実装
  - [ ] バッチ処理の基本構造設計
  - [ ] Cloud Schedulerの設定

### その他 (優先度見直し)

- [ ] YouTube Data API連携 (Cloud Run Jobsの一部として検討、優先度: 低)
