# デプロイ戦略

suzumina.click の本番運用デプロイ戦略

## 🚀 現在の運用構成

**環境**: 本番のみ (Production)  
**ブランチ**: `main` からの自動デプロイ  
**CI/CD**: GitHub Actions  
**インフラ**: Google Cloud Platform

```text
開発 → main ブランチ → GitHub Actions → 本番デプロイ
  ↓         ↓              ↓           ↓
ローカル   統合・PR     自動テスト    本番環境
テスト    レビュー      + ビルド     自動リリース
```

## 📋 デプロイフロー

### 1. 開発・テスト

```bash
# ローカル開発・テスト
pnpm dev              # 開発サーバー
pnpm test             # 単体テスト実行
pnpm check            # Lint + 型チェック
```

### 2. 統合・リリース

```bash
# mainブランチにマージ → 自動デプロイ
git checkout main
git merge feature/new-feature
git push origin main  # → GitHub Actions 自動実行
```

### 3. 自動処理 (GitHub Actions)

1. **テスト実行**: 全テストスイート (400+件)
2. **ビルド**: Next.js アプリケーション
3. **デプロイ**: Cloud Run 本番環境
4. **ヘルスチェック**: デプロイ後確認

## 🔧 運用設定

### コスト最適化

```yaml
# Cloud Run 設定
CPU: 1 vCPU
Memory: 512Mi  
Min instances: 0
Max instances: 10
Request timeout: 300s
```

### 監視・アラート

- **Cloud Monitoring**: CPU・メモリ・エラー率
- **Cloud Logging**: アプリケーションログ
- **Uptime Check**: サービス可用性監視
- **Budget Alert**: 月次コスト監視 (上限 5,000円)

## 🚨 緊急時対応

### 即座ロールバック

```bash
# 前バージョンへのロールバック
gcloud run services update-traffic suzumina-click-web \
  --to-latest --region=asia-northeast1
```

### サービス停止 (緊急時)

```bash
# トラフィック停止
gcloud run services update-traffic suzumina-click-web \
  --to-revisions=REVISION_NAME=0 --region=asia-northeast1
```

## 📊 品質ゲート

### デプロイ前チェック

- ✅ 全テスト通過 (400+件)
- ✅ Lint・型チェック通過
- ✅ ビルド成功
- ✅ セキュリティスキャン (Dependabot)

### デプロイ後確認

- ✅ ヘルスチェック応答
- ✅ Firestore接続確認
- ✅ 認証機能動作確認
- ✅ 主要ページ表示確認

## 🔐 セキュリティ

### 認証情報管理

- **Secret Manager**: API キー・認証情報
- **Workload Identity**: GitHub Actions ↔ GCP 連携
- **最小権限**: サービスアカウント権限

### セキュリティ自動化

- **Dependabot**: 依存関係脆弱性監視
- **Code Scanning**: セキュリティ問題検出
- **Secret Scanning**: 認証情報漏洩防止

## 📚 関連ドキュメント

- `docs/INFRASTRUCTURE_ARCHITECTURE.md` - 包括的インフラ管理・認証設定
- `docs/WEB_DEPLOYMENT.md` - Cloud Run運用コマンド
- `docs/GITHUB_ACTIONS_DEPLOYMENT.md` - CI/CDパイプライン詳細
- `.github/workflows/` - CI/CD設定

運用の詳細は各専門ドキュメントを参照してください。