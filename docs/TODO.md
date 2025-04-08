# TODOリスト

## 完了済み

- [x] v0.1.1 へのバージョンアップ (全パッケージ)
- [x] DeepSource 基本設定 (`.deepsource.toml` 作成・更新)
- [x] DeepSource テストカバレッジ連携 (CI設定含む)
- [x] Cloud Run デプロイ時のポート設定修正 (`Dockerfile` から `ENV PORT` を削除)

## 優先度: 高

### ドキュメント整理

- [ ] External APIs関連ドキュメントは実装後に作成

## 優先度: 中

### 共有UIコンポーネント (shadcn/ui + Storybook)

- [ ] shadcn/ui を利用したデザインシステムの整備
- [ ] shadcn/ui を利用した基本コンポーネントの実装
- [ ] Storybookのセットアップと設定
- [ ] アクセシビリティ対応

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
  - [ ] Firestore操作のモックとテスト (エラーケース)

### E2Eテスト環境の構築

- [ ] Playwrightのセットアップ
- [ ] 認証フローのE2Eテスト

### インフラストラクチャ

- [ ] Cloud Run Jobsの実装
  - [ ] バッチ処理の基本構造設計
  - [ ] Cloud Schedulerの設定

### その他 (優先度見直し)

- [ ] YouTube Data API連携 (Cloud Run Jobsの一部として検討、優先度: 低)
