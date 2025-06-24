# suzumina.click プロジェクト概要

声優「涼花みなせ」のファンサイト - ユーザーが作成する音声ボタンの共有とDLsite作品情報を表示

## 🎯 プロジェクト概要

suzumina.clickは、声優「涼花みなせ」ファンコミュニティのためのWebプラットフォームです。YouTube動画の音声参照機能、実音声ファイルボタン、DLsite作品情報閲覧、そして包括的な管理者機能を提供します。

### 🚀 現在のステータス

**本番稼働中の完成システム**

- **Webアプリケーション**: Next.js 15 + TypeScript + Tailwind CSS v4
- **認証システム**: Discord OAuth + ギルドメンバーシップ確認
- **データ収集**: YouTube Data API + DLsite スクレイピング (自動実行)
- **音声システム**: タイムスタンプ参照 + 実音声ファイルボタンの二重システム
- **管理者機能**: ユーザー・コンテンツ管理インターフェース
- **インフラ**: Terraform + Google Cloud Platform (本番稼働)
- **品質保証**: 400+件のテストスイート + E2Eテスト

## 🏗️ システム構成

```text
外部API → Cloud Scheduler → Cloud Functions → Firestore → Next.js App
  ↓            ↓              ↓              ↓           ↓
YouTube     定期実行         データ収集      NoSQL       フロントエンド
DLsite      (本番環境)       (自動化)       ストレージ    (認証・音声・管理)
```

## 🛠️ 技術スタック

### フロントエンド

- **Next.js 15** (App Router) + **TypeScript 5.8** + **React 19**
- **Tailwind CSS v4** + **Radix UI** (shadcn/ui)
- **NextAuth.js** (Discord OAuth認証)

### バックエンド・インフラ

- **Google Cloud Functions v2** (Node.js 22) - データ収集
- **Google Cloud Firestore** - メインデータベース
- **Google Cloud Storage** - ファイル保存
- **Terraform** - インフラ管理
- **GitHub Actions** - CI/CDパイプライン

### 開発・品質管理

- **pnpm Workspace** - Monorepo管理
- **Vitest** - テストフレームワーク
- **Storybook** - UIコンポーネント開発
- **Biome** - リンター・フォーマッター

## 📁 プロジェクト構造

```text
suzumina.click/ (v0.2.1)
├── apps/
│   ├── functions/          # Cloud Functions (本番稼働)
│   │   ├── src/dlsite.ts   # DLsite作品収集
│   │   └── src/youtube.ts  # YouTube動画収集
│   └── web/                # Next.js Webアプリ
│       ├── src/app/        # App Router
│       │   ├── admin/      # 管理者インターフェース
│       │   ├── buttons/    # 音声機能
│       │   ├── videos/     # 動画一覧
│       │   └── works/      # 作品一覧
│       ├── src/components/ # UIコンポーネント
│       └── e2e/            # E2Eテスト
├── packages/
│   ├── shared-types/       # 共有型定義 (Zodスキーマ)
│   ├── ui/                 # 共有UIコンポーネント
│   └── typescript-config/  # TypeScript設定
├── terraform/              # インフラ定義
└── docs/                   # プロジェクトドキュメント
```

## 📊 データ構造

### 主要コレクション

- **videos**: YouTube動画データ (`FirestoreYouTubeVideoData`)
- **works**: DLsite作品データ (`FirestoreDLsiteWorkData`)
- **audioReferences**: 音声参照 (YouTube区間指定)
- **audioButtons**: 音声ボタン (実ファイル)
- **users**: ユーザーデータ (Discord認証・ロール管理)

### 音声システム (二重構成)

1. **音声参照**: YouTube動画の特定区間を参照
2. **音声ボタン**: Cloud Storageにアップロードされた実音声ファイル

## 🚀 開発コマンド

### セットアップ

```bash
# 基本セットアップ
pnpm install
pnpm --filter @suzumina.click/shared-types build

# Google Cloud認証 (開発時)
gcloud auth application-default login
```

### 開発サーバー

```bash
# Webアプリ開発
cd apps/web && pnpm dev

# Storybook UI開発
cd apps/web && pnpm storybook      # Web専用
cd packages/ui && pnpm storybook   # 共有UI
```

### 品質管理

```bash
pnpm check        # Lint + フォーマット + 型チェック
pnpm test         # 全テスト実行 (400+件)
pnpm build        # 全ビルド
```

### 依存関係管理

```bash
# 安全更新 (推奨)
pnpm update && pnpm audit --fix

# 現状確認
pnpm outdated && pnpm audit
```

## 🔄 データフロー

### 自動データ収集 (本番稼働)

```text
Cloud Scheduler (定期実行)
    ↓
Cloud Functions (fetchYouTubeVideos/fetchDLsiteWorks)
    ↓
Firestore Database (型安全データ保存)
```

### ユーザー認証

```text
Discord OAuth → NextAuth.js → ギルドメンバーシップ確認 → セッション確立
```

### 音声コンテンツ作成

```text
認証済みユーザー → AudioCreator → Server Actions → Firestore/Cloud Storage
```

## 🔒 セキュリティ・設計原則

### セキュリティ

- Discord ギルド認証による限定アクセス
- NextAuth.js JWT セッション管理
- Google Secret Manager による認証情報管理
- 最小権限の原則 (IAM・Firestore Rules)

### 設計原則

- **Next.js 15準拠**: Server/Client Components適切分離
- **型安全性**: TypeScript strict + Zodスキーマ
- **責任分離**: 表示ロジックとインタラクション分離
- **コロケーション**: 関連コードの近接配置
- **テスト駆動**: 重要機能の包括的テスト

## 🎯 今後の改善予定

1. **レスポンシブUI強化**: モバイル・タブレット対応
2. **検索・フィルター強化**: 全コンテンツ横断検索
3. **音声機能拡張**: プレイリスト・一括管理
4. **パフォーマンス最適化**: キャッシュ・配信戦略

## 📚 ドキュメント

### 開発者向け

- `docs/DEVELOPMENT.md` - 包括的開発ガイド
- `docs/QUICK-REFERENCE.md` - コマンドリファレンス
- `docs/FIRESTORE_STRUCTURE.md` - データベース構造

### 運用・デプロイ

- `docs/DEPLOYMENT_STRATEGY.md` - デプロイ戦略
- `docs/WEB_DEPLOYMENT.md` - Web App デプロイ手順
- `docs/AUTH_DEPLOYMENT_GUIDE.md` - Discord認証セットアップ
- `docs/TERRAFORM_GUIDE.md` - インフラ構築ガイド

### プロジェクト管理

- `docs/README.md` - 詳細プロジェクト仕様
- `docs/CHANGELOG.md` - 変更履歴
- `docs/TODO.md` - 開発ロードマップ

## 🚨 重要コマンド

コミット前の必須チェック:

```bash
pnpm check  # Lint + フォーマット + 型チェック + テスト
```

このプロジェクトは、型安全なフルスタック開発を重視したファンコミュニティプラットフォームです。
データ収集インフラとユーザー作成コンテンツ機能を組み合わせ、高品質な開発体験を提供します。