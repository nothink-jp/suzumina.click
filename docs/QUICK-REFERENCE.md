# クイックリファレンス

suzumina.click 開発者向け即座参照ドキュメント

## ⚡ 緊急コマンド

```bash
# 📦 セットアップ
pnpm install && pnpm --filter @suzumina.click/shared-types build
gcloud auth application-default login

# 🚀 開発開始
cd apps/web && pnpm dev

# ✅ 品質チェック (コミット前必須) - Git フック自動実行
pnpm check         # Lint + フォーマット + 型チェック (0エラー・0警告達成済み)
pnpm test          # 単体テスト (400+件)

# 🏗️ 本番ビルド
pnpm build

# 🔍 テスト + カバレッジ
pnpm test:coverage

# 🎨 Storybook (UIコンポーネント・デザイントークン)
cd packages/ui && pnpm storybook

# 🔧 管理者権限設定
cd apps/web && node scripts/setup-admin.js <DISCORD_USER_ID>
```

## 🔐 認証・環境変数

### 必須環境変数

```bash
# Discord OAuth (必須)
DISCORD_CLIENT_ID="your-client-id"
DISCORD_CLIENT_SECRET="your-client-secret"

# NextAuth.js (必須)
NEXTAUTH_SECRET="$(openssl rand -base64 32)"
NEXTAUTH_URL="https://suzumina.click"

# Google Cloud (開発時)
GOOGLE_CLOUD_PROJECT="suzumina-click"

# 管理者権限設定 (任意)
DEFAULT_ADMIN_DISCORD_IDS="discord_id1,discord_id2,discord_id3"
```

### Discord設定

- **Guild ID**: `959095494456537158` (すずみなふぁみりー)
- **Redirect URI**: `https://suzumina.click/api/auth/callback/discord`
- **Scopes**: `identify email guilds`

## 📁 重要ファイル・ディレクトリ

```bash
# 🔑 認証関連
apps/web/src/auth.ts                    # NextAuth設定
apps/web/src/lib/user-firestore.ts      # ユーザー管理
packages/shared-types/src/user.ts       # ユーザー型定義

# 🎵 音声参照機能
apps/web/src/app/buttons/               # 音声参照ページ・Actions
packages/shared-types/src/audio-button.ts     # 音声ボタン型定義

# 🎨 UI・デザインシステム
packages/ui/src/components/ui/          # shadcn/ui コンポーネント (51個)
packages/ui/src/components/custom/      # 独自UIコンポーネント
packages/ui/src/components/design-tokens/  # デザイントークンStorybook

# 🧪 テスト
apps/web/src/components/*.test.tsx       # コンポーネントテスト
packages/shared-types/src/*.test.ts     # 型・ユーティリティテスト

# 🏗️ インフラ
terraform/                              # Terraform定義
terraform/AUTH_DEPLOYMENT_GUIDE.md      # Discord認証デプロイ
```

## 🎯 開発フロー

### 1. 機能開発

```bash
# ブランチ作成
git checkout -b feature/new-feature

# 開発・テスト
cd apps/web && pnpm dev
pnpm test --watch

# 品質チェック
pnpm check
```

### 2. コミット・PR

```bash
# 品質チェック (必須)
pnpm check && pnpm test

# コミット (Conventional Commits)
git commit -m "feat: add user profile page"

# プッシュ・PR作成
git push origin feature/new-feature
```

### 3. デプロイ

**推奨: GitHub Actions自動デプロイ**
```bash
# mainブランチにプッシュすると自動デプロイ
git push origin main
```

**手動デプロイ:**
- GitHub「Actions」タブ → 「Deploy to Cloud Run」を実行

**レガシー方式（非推奨）:**
```bash
# ⚠️ 非推奨: GitHub Actionsを使用してください
# cd terraform && terraform apply
```

**デプロイ確認:**
```bash
# Cloud Run サービス確認
gcloud run services describe suzumina-click-web --region=asia-northeast1

# ログ確認
gcloud logging read "resource.type=cloud_run_revision" --limit=20
```

## 🧪 テスト戦略

### 現在のカバレッジ

- **テスト件数**: 400+件
- **Server Actions**: 78件 ✅
- **UIコンポーネント**: 128件 ✅
- **統合テスト**: 20件 ✅

### テスト実行

```bash
# 全テスト実行
pnpm test

# 特定パッケージ
cd apps/web && pnpm test
cd packages/shared-types && pnpm test

# カバレッジ
pnpm test:coverage

# Watch モード
pnpm test --watch
```

## 🔧 よく使うコマンド

### パッケージ管理

```bash
# 依存関係追加
pnpm add package-name --filter @suzumina.click/web
pnpm add -D package-name --filter @suzumina.click/shared-types

# 全パッケージ更新
pnpm update

# セキュリティ監査
pnpm audit
```

### 開発ツール

```bash
# Storybook
cd packages/ui && pnpm storybook       # UI + デザイントークン (一本化)

# 型チェック
pnpm --filter @suzumina.click/web tsc --noEmit

# 共有型ビルド
pnpm --filter @suzumina.click/shared-types build
```

### デザイントークン

```bash
# Storybook でデザイントークン確認
cd packages/ui && pnpm storybook

# 対象ファイル
packages/ui/src/components/design-tokens/
├── color-palette.stories.tsx    # suzuka/minase colors
├── typography.stories.tsx       # フォント・行間
├── spacing.stories.tsx          # 4px基準スペーシング
├── borders-shadows.stories.tsx  # 角丸・シャドウ
└── icons.stories.tsx           # Lucide React icons
```

### ブランドカラー

```typescript
// suzuka colors (メインピンク)
bg-suzuka-50   # #fff5fa
bg-suzuka-500  # #ff4785 (ブランドメイン)
bg-suzuka-950  # #3d0820

// minase colors (サブオレンジ)  
bg-minase-50   # #fff8f3
bg-minase-500  # #ff7e2d (ブランドサブ)
bg-minase-950  # #431407
```

### Cloud関連

```bash
# 認証
gcloud auth application-default login

# Firestore確認
gcloud firestore databases list --project=suzumina-click

# Logs確認
gcloud logging read "resource.type=cloud_run_revision" --limit=20

# Secret確認
gcloud secrets versions access latest --secret="DISCORD_CLIENT_ID"
```

## 🐛 トラブルシューティング

### よくある問題

```bash
# 1. 共有型ビルドエラー
pnpm --filter @suzumina.click/shared-types build

# 2. Node modules問題
rm -rf node_modules */node_modules */*/node_modules
pnpm install

# 3. Next.js キャッシュクリア
cd apps/web && rm -rf .next

# 4. テスト失敗
pnpm test --run  # Watch モード無効

# 5. 認証エラー
# Discord Developer Portal で Redirect URI 確認
# Secret Manager で認証情報確認
```

### 緊急時の対応

```bash
# 1. 本番エラー: ログ確認
gcloud logging read "resource.type=cloud_run_revision severity=ERROR" --limit=50

# 2. 認証エラー: セッション確認
# NextAuth Debug モード有効化: NODE_ENV=development

# 3. DB接続エラー: Firestore確認
gcloud firestore operations list

# 4. 緊急ロールバック
cd terraform && terraform apply -var="image_tag=previous-version"
```

## 📊 モニタリング

### 重要メトリクス

- **認証成功率**: >95%
- **ページ表示速度**: <3秒
- **テストカバレッジ**: >80%
- **月次コスト**: <5000円

### 確認方法

```bash
# Cloud Monitoring
gcloud monitoring dashboards list

# パフォーマンス
cd apps/web && pnpm build && pnpm analyze

# コスト
gcloud billing budgets list
```

---

**🚨 緊急時連絡**: GitHub Issues または Discord「すずみなふぁみりー」サーバー  
**📝 最終更新**: 2025年6月28日 (v0.2.2 - お気に入りシステム + 音声ボタンデザイン刷新)