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
外部サービス → Cloud Scheduler → Pub/Sub → Cloud Functions → Firestore → Next.js Webアプリ
     ↓              ↓              ↓         ↓              ↓           ↓
YouTube API    定期実行         非同期      データ収集      NoSQLストレージ  フロントエンド
DLsite         (毎時/20分間隔)  メッセージ   (Function v2)   (型安全)      (App Router)
               ↓                         ↓
              Cloud Tasks → Cloud Run Jobs → Cloud Storage
                  ↓              ↓              ↓
               音声処理キュー    重い計算処理    音声ファイル保存
               (非同期実行)    (4CPU/16GB)    (ライフサイクル管理)
```

## 🛠️ 技術スタック

### フロントエンド

- **Next.js 15.3.3** - Reactフレームワーク (App Router)
- **TypeScript 5.8.3** - 型安全性
- **Tailwind CSS v4** - UIスタイリング (PostCSS設定)
- **Storybook 9.0.10** - UIコンポーネント開発・テスト
- **Radix UI** - アクセシブルUIコンポーネント (`packages/ui`)
- **React 19.1.0** - 最新React機能

### バックエンド

- **Google Cloud Functions v2 (Node.js 22)** - サーバーレス関数 (YouTube/DLsite データ収集)
- **Google Cloud Run Jobs** - 重い計算処理 (音声抽出: 4CPU/16GB)
- **Google Cloud Firestore** - NoSQLデータベース (Native mode + 複合インデックス)
- **Google Cloud Storage** - ファイルストレージ (音声ファイル、デプロイアーティファクト)
- **Google Cloud Tasks** - タスクキューイング (音声処理の非同期実行)
- **Google Cloud Pub/Sub** - 非同期メッセージング (Scheduler → Functions)
- **Google Cloud Scheduler** - 定期実行タスク (毎時/20分間隔)
- **Google Secret Manager** - APIキー・シークレット管理
- **Google Artifact Registry** - Dockerコンテナレジストリ

### インフラ・DevOps

- **Terraform** - Infrastructure as Code (GCPリソース管理)
- **GitHub Actions** - CI/CDパイプライン (Workload Identity連携)
- **Google Cloud Build** - コンテナビルド・デプロイ
- **Google Cloud Monitoring** - 監視ダッシュボード・アラート
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
│   │   │   │   ├── VideoList.tsx      # 動画一覧 (Server Component)
│   │   │   │   ├── Pagination.tsx     # ページネーション (Client Component)
│   │   │   │   └── ThumbnailImage.tsx # サムネイル画像
│   │   │   └── lib/             # ユーティリティ
│   │   │       └── firestore.ts # Firestore接続
│   │   ├── .storybook/           # Web App専用Storybook設定
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
│   ├── shared-types/             # 共有型定義 (重要)
│   │   ├── src/
│   │   │   ├── common.ts         # 共通型・ユーティリティ
│   │   │   ├── video.ts          # YouTube動画型定義
│   │   │   ├── work.ts           # DLsite作品型定義
│   │   │   └── firestore-utils.ts # Firestore変換ユーティリティ
│   │   └── dist/                 # ビルド成果物
│   └── ui/                       # 共有UIコンポーネント
│       ├── src/
│       │   ├── components/       # Radix UI ベースコンポーネント
│       │   │   ├── button.tsx    # ボタンコンポーネント
│       │   │   └── pagination.tsx # ページネーションコンポーネント
│       │   └── styles/           # Tailwind CSS v4設定
│       │       └── globals.css   # グローバルスタイル
│       └── .storybook/           # UI専用Storybook設定
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
# 本番Webアプリ開発 (実際のFirestoreデータを使用)
cd apps/web && pnpm dev

# v0モック開発 (UIリファレンス)
cd apps/v0-suzumina.click && pnpm dev

# Storybook開発 (UIコンポーネント)
cd apps/web && pnpm storybook        # Web専用コンポーネント
cd packages/ui && pnpm storybook     # 共有UIコンポーネント
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

**1. 定期データ収集フロー**
```
Cloud Scheduler (定期実行)
    ↓ (Pub/Sub message)
Pub/Sub Topics (非同期メッセージング)
    ↓ (CloudEvent trigger)
Cloud Functions v2 (Node.js 22)
    │
    ├─ fetchYouTubeVideos (毎時19分) → YouTube Data API v3
    └─ fetchDLsiteWorks (6,26,46分/時間) → DLsite Webスクレイピング
    ↓ (データ保存)
Firestore Database (Native mode)
    ├─ videos collection (型安全データ + 複合インデックス)
    └─ works collection (メタデータ + ライフサイクル管理)
```

**2. 音声処理フロー (将来実装)**
```
fetchYouTubeVideos (Cloud Function)
    ↓ (音声処理タスク送信)
Cloud Tasks Queue (レート制限: 1/秒, 同時実行3タスク)
    ↓ (HTTPリクエスト)
Cloud Run Jobs - Audio Processor
    │ (4 CPU cores, 16GB memory, 1時間タイムアウト)
    │ ├─ YouTube動画から音声抽出
    │ ├─ 音声セグメンテーション
    │ └─ フォーマット変換 (Opus, AAC)
    ↓ (処理済み音声ファイル)
Cloud Storage - Audio Files Bucket
    └─ ライフサイクル: 30日→Nearline, 90日→Coldline, 365日→削除
```

### フロントエンド表示 (Next.js 15 App Router)

```
Page (Server Component)
├── データ取得 (Server Actions)
├── VideoList (Server Component)
│   ├── 動画リスト表示
│   └── Pagination (Client Component)
│       └── URL更新によるナビゲーション
```

1. **Server Component**: ページでデータ取得 (Server Actions)
2. **型変換**: `FirestoreData` → `FrontendData` (shared-types使用)
3. **Server Component**: VideoListで表示ロジック
4. **Client Component**: Paginationでインタラクション

## 🔒 セキュリティ・設計原則

### セキュリティ

- **Secret Manager**: APIキー管理
- **IAM**: 最小権限の原則
- **サーバーサイド優先**: FirestoreはServer Actionsのみでアクセス

### 設計原則

- **Next.js 15準拠**: App Router + Server Components + Client Components分離
- **責任分離**: Server Components（表示）とClient Components（インタラクション）の明確な分離
- **コロケーション**: ページとServer Actionsを同一ディレクトリに配置
- **型安全性**: 共有型定義とZodスキーマ
- **Monorepo**: 開発効率のための一元管理
- **Storybook活用**: UIコンポーネントの開発・テスト環境

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

### Next.js 15 コンポーネント設計

**Server Components (推奨)**
- データ取得・表示ロジック
- SEO対応が必要な部分
- 静的なUI部分

**Client Components (必要時のみ)**
- ユーザーインタラクション
- ブラウザAPIの使用
- 状態管理が必要な部分

**アンチパターン**
- ❌ Client ComponentでServer Actionsを直接呼び出し
- ❌ UIコンポーネント内でのデータ取得ロジック
- ✅ Server ComponentでのデータプリロードとProps渡し

### Storybook開発

- **apps/web/.storybook**: Web専用コンポーネント
- **packages/ui/.storybook**: 共有UIコンポーネント
- Next.js App Routerモック設定済み（`useRouter`対応）

### コード品質

- コミット前に `pnpm check` を実行
- TypeScript strict modeに従う
- 全データ構造で共有型を使用
- 重要な機能にはテストを記述
- Storybookでコンポーネントテスト

### Gitワークフロー

- conventional commitsを使用
- pre-commitフック (Lefthook) を実行
- コミットは集中的で原子的に保つ

### テスト戦略

- ユーティリティ・関数の単体テスト
- データフローの統合テスト
- Storybookでのビジュアルテスト
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
