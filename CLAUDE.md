# suzumina.click プロジェクト概要

声優「涼花みなせ」のファンサイト - YouTubeビデオから音声ボタンを作成し、DLsite作品情報を表示

## 🎯 プロジェクト概要

suzumina.clickは、声優「涼花みなせ」ファンコミュニティのためのWebプラットフォームです。YouTubeビデオから抽出した音声ボタンの作成・共有機能と、DLsiteからの最新作品情報閲覧機能を提供します。

### 開発状況

**✅ 完了済み**

- **データ収集インフラ**: YouTubeビデオ・DLsite作品情報の自動取得システム
- **インフラ基盤**: TerraformによるGCPリソース管理
- **共有型定義**: Zodスキーマを使用した型安全なデータ構造
- **開発環境**: 開発ツールを含むMonorepoセットアップ
- **本番Webアプリケーション** (`apps/web`): ページネーション付き動画一覧表示

**🚧 進行中**

- **音声ボタン機能**: YouTubeビデオからの音声抽出（今後の機能）

**📝 参考**

- **v0モック** (`apps/v0-suzumina.click`): Vercel v0で作成したUI実装リファレンス

## 🏗️ アーキテクチャ

```console
外部サービス → Cloud Functions → Firestore → Next.js Webアプリ
     ↓              ↓              ↓           ↓
YouTube API    スケジュール実行   データストレージ  フロントエンド
DLsite         データ収集        (型安全)      (SSR/CSR)
               (毎時/20分間隔)
```

## 🛠️ 技術スタック

### フロントエンド

- **Next.js 15.2.4** - Reactフレームワーク (App Router)
- **TypeScript 5.8.3** - 型安全性
- **Tailwind CSS** - UIスタイリング
- **Radix UI** - アクセシブルUIコンポーネント (v0アプリのみ)
- **React Hook Form + Zod** - フォーム管理・バリデーション (v0アプリのみ)

### バックエンド

- **Google Cloud Functions (Node.js 22)** - サーバーレス関数
- **Google Cloud Firestore** - NoSQLデータベース
- **Google Cloud Pub/Sub** - 非同期メッセージング
- **Google Cloud Scheduler** - スケジュールタスク実行

### インフラ・DevOps

- **Terraform** - Infrastructure as Code
- **pnpm 10** - パッケージマネージャー (Workspaceサポート)
- **Biome** - リンター・フォーマッター
- **Lefthook** - Gitフック
- **Vitest** - テストフレームワーク

### 外部API

- **YouTube Data API v3** - 動画情報取得
- **DLsite** - Webスクレイピング (Cheerio使用)

## 📁 プロジェクト構造

```
suzumina.click/                    # Monorepoルート
├── apps/
│   ├── functions/                 # Cloud Functions (本番準備完了)
│   │   ├── src/
│   │   │   ├── dlsite.ts         # DLsite作品取得 (20分間隔)
│   │   │   ├── youtube.ts        # YouTube動画取得 (毎時19分)
│   │   │   ├── index.ts          # Functions エントリーポイント
│   │   │   └── utils/            # 共通ユーティリティ
│   │   ├── lib/                  # ビルド成果物
│   │   ├── coverage/             # テストカバレッジ
│   │   └── package.json          # Functions依存関係
│   ├── web/                      # 本番Webアプリ (開発完了)
│   │   ├── src/
│   │   │   ├── app/             # Next.js App Router
│   │   │   │   ├── layout.tsx   # ルートレイアウト
│   │   │   │   ├── page.tsx     # ホームページ (ページネーション対応)
│   │   │   │   ├── actions.ts   # Server Actions
│   │   │   │   ├── works/       # DLsite作品関連 (未実装)
│   │   │   │   ├── videos/      # YouTube動画関連 (未実装)
│   │   │   │   └── search/      # 検索機能 (未実装)
│   │   │   ├── components/      # UIコンポーネント
│   │   │   │   ├── VideoList.tsx      # 動画一覧コンポーネント
│   │   │   │   ├── Pagination.tsx     # ページネーションUI
│   │   │   │   └── ThumbnailImage.tsx # サムネイル画像
│   │   │   └── lib/             # ユーティリティ
│   │   │       └── firestore.ts # Firestore接続
│   │   ├── __tests__/           # テストファイル (未実装)
│   │   └── package.json
│   └── v0-suzumina.click/        # v0モック (UIリファレンス)
│       ├── app/                  # App Router (モック)
│       ├── components/           # UIコンポーネント
│       │   ├── ui/              # shadcn/ui コンポーネント
│       │   ├── site-header.tsx  # ヘッダーコンポーネント
│       │   ├── search-panel.tsx # 検索パネル
│       │   ├── video-card.tsx   # ビデオカード
│       │   └── work-card.tsx    # 作品カード
│       └── package.json
├── packages/
│   └── shared-types/             # 共有型定義 (重要)
│       ├── src/
│       │   ├── common.ts         # 共通型・ユーティリティ
│       │   ├── video.ts          # YouTube動画型定義
│       │   ├── work.ts           # DLsite作品型定義
│       │   └── firestore-utils.ts # Firestore変換ユーティリティ
│       └── dist/                 # ビルド成果物
├── terraform/                    # インフラ定義 (本番)
│   ├── function_*.tf             # Cloud Functions設定
│   ├── scheduler.tf              # スケジュール実行設定
│   ├── firestore_*.tf            # Firestore設定
│   └── variables.tf              # 変数定義
├── docs/                         # プロジェクトドキュメント
│   ├── README.md                 # 詳細プロジェクト仕様
│   ├── POLICY.md                 # 開発ポリシー
│   ├── TODO.md                   # タスク管理
│   ├── CHANGELOG.md              # 変更履歴
│   └── FIRESTORE_STRUCTURE.md    # Firestoreデータ構造
├── coverage/                     # 全体テストカバレッジ
├── biome.json                    # リンター・フォーマッター設定
├── lefthook.yml                  # Gitフック設定
├── mise.toml                     # 開発環境ツール管理
├── pnpm-workspace.yaml           # pnpm Workspace設定
├── vitest.workspace.ts           # テスト設定
└── package.json                  # Workspace設定
```

## 📊 データ構造

### YouTube動画データ (`FirestoreYouTubeVideoData`)

- `id`, `title`, `description` - 基本情報
- `publishedAt`, `duration` - 時間関連データ
- `thumbnailUrl`, `viewCount`, `likeCount` - 表示情報
- `tags`, `channelId` - メタデータ
- `lastFetchedAt`, `createdAt`, `updatedAt` - 管理情報

### DLsite作品データ (`FirestoreDLsiteWorkData`)

- `productId` (RJ123456), `title`, `circle` - 基本情報
- `author[]`, `category`, `workUrl` - 詳細情報
- `price`, `rating`, `salesCount` - 販売情報
- `tags`, `thumbnailUrl` - 表示情報
- `lastFetchedAt`, `createdAt`, `updatedAt` - 管理情報

## 🚀 開発コマンド

### セットアップ

```bash
# 依存関係のインストール
pnpm install

# 共有型のビルド (必須)
pnpm --filter @suzumina.click/shared-types build

# Functions準備 (デプロイ前)
pnpm prepare:functions
```

### 開発サーバー

```bash
# v0モック開発
cd apps/v0-suzumina.click && pnpm dev

# 本番Webアプリ開発 (実際のFirestoreデータを使用)
cd apps/web && pnpm dev
```

### 開発用Google Cloudセットアップ

Webアプリは `suzumina-click-firebase` GCPプロジェクトに接続します:

```bash
# 1. Google Cloud SDKのインストール
brew install google-cloud-sdk

# 2. Application Default Credentialsで認証
gcloud auth application-default login

# 3. プロジェクトアクセスの確認
gcloud firestore databases list --project=suzumina-click-firebase

# 4. 開発サーバー起動 (実際のFirestoreデータに接続)
cd apps/web && pnpm dev
```

### テスト・品質管理

```bash
pnpm test              # テスト実行
pnpm test:coverage     # カバレッジ付きテスト実行
pnpm lint              # 全パッケージのLint
pnpm format            # 全パッケージのフォーマット
pnpm check             # Lint + フォーマット
pnpm build             # 全パッケージのビルド
```

### Cloud Functions

```bash
cd apps/functions
pnpm build             # TypeScriptビルド
pnpm test              # Functions単体テスト
```

## 🔄 データフロー

### 自動データ収集 (本番)

1. **YouTube動画**: Cloud Scheduler → Pub/Sub → fetchYouTubeVideos (毎時19分)
2. **DLsite作品**: Cloud Scheduler → Pub/Sub → fetchDLsiteWorks (6,26,46分の1時間3回)

### フロントエンド表示

1. **Next.js Server Actions** → **@google-cloud/firestore** → **Firestore**
2. **型変換**: `FirestoreData` → `FrontendData` (shared-types使用)
3. **UI描画**: Reactコンポーネントでの表示

## 🔒 セキュリティ・設計原則

### セキュリティ

- **Secret Manager**: APIキー管理
- **IAM**: 最小権限の原則
- **サーバーサイド優先**: FirestoreはServer Actionsのみでアクセス

### 設計原則

- **Vercel準拠**: App Router + Server Actions
- **コロケーション**: ページとActionsを同一ディレクトリに配置
- **型安全性**: 共有型定義とZodスキーマ
- **Monorepo**: 開発効率のための一元管理

## 🎯 今後の予定

1. **DLsite作品表示機能**: 作品一覧ページの実装
2. **音声ボタン機能**: YouTubeビデオからの音声抽出
3. **検索・フィルター**: 高度な検索機能
4. **レスポンシブUI**: モバイル対応

## 📝 重要ファイル

- `docs/README.md` - 詳細仕様
- `docs/FIRESTORE_STRUCTURE.md` - Firestoreデータ構造
- `packages/shared-types/` - コア型定義
- `apps/functions/src/` - データ収集ロジック
- `terraform/` - インフラ設定
- `biome.json` - コード品質設定

このプロジェクトは、自動データ収集インフラ上に構築されたユーザー向けWebアプリケーションの型安全なフルスタック開発を重視しています。

## 🔧 開発ガイドライン

### コード品質

- コミット前に `pnpm check` を実行
- TypeScript strict modeに従う
- 全データ構造で共有型を使用
- 重要な機能にはテストを記述

### Gitワークフロー

- conventional commitsを使用
- pre-commitフック (Lefthook) を実行
- コミットは集中的で原子的に保つ

### テスト戦略

- ユーティリティ・関数の単体テスト
- データフローの統合テスト
- カバレッジレポートの自動生成

## 🚨 重要: リント・テスト実行コマンド

コミット前またはPR作成前には必ず以下を実行してください:

```bash
# 全体チェック (推奨)
pnpm check

# 個別実行
pnpm lint              # 全パッケージのLint
pnpm format            # 全パッケージのフォーマット
pnpm test              # 全体テスト実行
```
