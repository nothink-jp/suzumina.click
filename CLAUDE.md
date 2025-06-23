# suzumina.click プロジェクト概要

声優「涼花みなせ」のファンサイト - ユーザーが作成する音声ボタンの共有とDLsite作品情報を表示

## 🎯 プロジェクト概要

suzumina.clickは、声優「涼花みなせ」ファンコミュニティのためのWebプラットフォームです。YouTube動画の音声参照機能、実音声ファイルボタン、DLsite作品情報閲覧、そして包括的な管理者機能を提供します。

### 開発状況

**✅ 完了済み**

- **Discordギルド認証システム**: NextAuth + Discord OAuth + ギルドメンバーシップ確認
- **ユーザー管理機能**: Firestore基盤のユーザープロファイル・ロール管理・セッション管理
- **データ収集インフラ**: YouTubeビデオ・DLsite作品情報の自動取得システム
- **インフラ基盤**: TerraformによるGCPリソース管理（2環境構成・コスト最適化）
- **共有型定義**: Zodスキーマを使用した型安全なデータ構造
- **開発環境**: 開発ツールを含むMonorepoセットアップ
- **本番Webアプリケーション** (`apps/web`): ページネーション付き動画・作品一覧表示
- **音声システム** (`apps/web`): タイムスタンプ参照 + 実音声ファイルボタンの二重システム
- **管理者インターフェース** (`apps/web/admin`): ユーザー・動画・作品の包括的管理機能
- **包括的テストスイート**: 388+件のテストで全重要機能をカバー（E2E含む完全テスト）


## 🏗️ アーキテクチャ

```console
外部サービス → Cloud Scheduler → Pub/Sub → Cloud Functions → Firestore → Next.js Webアプリ
     ↓              ↓              ↓         ↓              ↓           ↓
YouTube API    定期実行         非同期      データ収集      NoSQLストレージ  フロントエンド
DLsite         (Production環境)  メッセージ   (Function v2)   (型安全)      (App Router)
               ↓                                            ↓              ↓
              ユーザーコンテンツ作成                    管理者インターフェース  一般ユーザーUI
                  ↓                                        ↓              ↓
            音声参照 + 音声ボタン                      ユーザー・コンテンツ管理  コンテンツ閲覧
                  ↓                                        ↓              ↓
          タイムスタンプ + 実音声ファイル              ロール管理・統計表示   音声再生・検索
```

## 🛠️ 技術スタック

### フロントエンド

- **Next.js 15.3.4** - Reactフレームワーク (App Router)
- **TypeScript 5.8.3** - 型安全性
- **Tailwind CSS v4** - UIスタイリング (PostCSS設定)
- **Storybook 9.0.12** - UIコンポーネント開発・テスト
- **Radix UI** - アクセシブルUIコンポーネント (`packages/ui`)
- **React 19.1.0** - 最新React機能

### バックエンド・認証

- **NextAuth.js** - Discord OAuth認証・セッション管理
- **Discord OAuth Provider** - ギルドメンバーシップ確認による認証
- **Google Cloud Functions v2 (Node.js 22)** - サーバーレス関数 (YouTube/DLsite データ収集)
- **Google Cloud Firestore** - NoSQLデータベース (Native mode + 複合インデックス + ユーザー管理)
- **Google Cloud Storage** - ファイルストレージ (デプロイアーティファクト、音声ファイル用)
- **Google Cloud Pub/Sub** - 非同期メッセージング (Scheduler → Functions)
- **Google Cloud Scheduler** - 定期実行タスク (Production環境のみ)
- **Google Secret Manager** - APIキー・シークレット管理 (Discord認証情報・NextAuth Secret)
- **YouTube Embed API** - 動画の特定区間再生

### インフラ・DevOps

- **Terraform** - Infrastructure as Code (2環境構成・コスト最適化)
- **GitHub Actions** - CI/CDパイプライン (Workload Identity連携)
- **Google Cloud Build** - コンテナビルド・デプロイ
- **Google Cloud Monitoring** - 監視ダッシュボード・アラート・予算管理
- **pnpm 10** - パッケージマネージャー (Workspaceサポート)
- **Biome** - リンター・フォーマッター
- **Lefthook** - Gitフック
- **Vitest** - テストフレームワーク

### 外部API

- **YouTube Data API v3** - 動画情報取得
- **DLsite** - Webスクレイピング (Cheerio使用)

## 📁 プロジェクト構造

```console
suzumina.click/                    # Monorepoルート (v0.2.1)
├── apps/
│   ├── functions/                 # Cloud Functions (本番稼働中)
│   │   ├── src/
│   │   │   ├── dlsite.ts         # DLsite作品取得 (20分間隔)
│   │   │   ├── youtube.ts        # YouTube動画取得 (毎時19分)
│   │   │   ├── index.ts          # Functions エントリーポイント
│   │   │   └── utils/            # 共通ユーティリティ (157件テスト)
│   │   ├── lib/                  # ビルド成果物
│   │   ├── coverage/             # テストカバレッジ
│   │   └── package.json          # @suzumina.click/functions v0.2.1
│   ├── web/                      # 本番Webアプリ (機能完備)
│   │   ├── src/
│   │   │   ├── app/             # Next.js App Router
│   │   │   │   ├── layout.tsx   # ルートレイアウト
│   │   │   │   ├── page.tsx     # ホームページ (ページネーション対応)
│   │   │   │   ├── actions.ts   # Server Actions
│   │   │   │   ├── admin/       # 🆕 管理者インターフェース
│   │   │   │   │   ├── layout.tsx    # 管理者専用レイアウト
│   │   │   │   │   ├── users/        # ユーザー管理
│   │   │   │   │   ├── videos/       # 動画管理
│   │   │   │   │   └── works/        # 作品管理
│   │   │   │   ├── works/       # DLsite作品関連 (実装済み)
│   │   │   │   ├── videos/      # YouTube動画関連 (実装済み)
│   │   │   │   ├── buttons/     # 音声機能 (参照+ボタン・完了)
│   │   │   │   └── auth/        # 認証関連ページ
│   │   │   ├── components/      # UIコンポーネント (229件テスト)
│   │   │   │   ├── AdminList.tsx      # 管理者用一覧 (汎用) ✅
│   │   │   │   ├── AdminListItem.tsx  # 管理者用アイテム (汎用) ✅
│   │   │   │   ├── VideoList.tsx      # 動画一覧 (Server Component) ✅
│   │   │   │   ├── AudioReferenceCreator.tsx # 音声参照作成 (15件テスト) ✅
│   │   │   │   ├── AudioReferenceCard.tsx   # 音声参照表示 (10件テスト) ✅
│   │   │   │   ├── YouTubePlayer.tsx        # YouTube埋め込み再生 (44件テスト) ✅
│   │   │   │   ├── Pagination.tsx     # ページネーション (10件テスト) ✅
│   │   │   │   ├── ThumbnailImage.tsx # サムネイル画像 (15件テスト) ✅
│   │   │   │   ├── SearchForm.tsx     # 検索フォーム (15件テスト) ✅
│   │   │   │   ├── SiteHeader.tsx     # サイトヘッダー (10件テスト) ✅
│   │   │   │   ├── SiteFooter.tsx     # サイトフッター (9件テスト) ✅
│   │   │   │   ├── AuthButton.tsx     # 認証ボタン ✅
│   │   │   │   └── UserAvatar.tsx     # ユーザーアバター ✅
│   │   │   └── lib/             # ユーティリティ
│   │   │       ├── firestore.ts      # Firestore接続
│   │   │       └── user-firestore.ts # ユーザー管理専用
│   │   ├── e2e/                  # 🆕 Playwright E2E テスト
│   │   │   ├── audio-buttons.spec.ts  # 音声ボタンテスト
│   │   │   ├── audio-reference.spec.ts # 音声参照テスト
│   │   │   ├── home.spec.ts          # ホームページテスト
│   │   │   └── videos.spec.ts        # 動画ページテスト
│   │   ├── .storybook/           # Web App専用Storybook設定
│   │   └── package.json          # @suzumina.click/web v0.2.1
├── packages/
│   ├── shared-types/             # 共有型定義 (重要) v0.2.1
│   │   ├── src/
│   │   │   ├── common.ts         # 共通型・ユーティリティ
│   │   │   ├── video.ts          # YouTube動画型定義
│   │   │   ├── work.ts           # DLsite作品型定義
│   │   │   ├── audio-reference.ts # 音声参照型定義（タイムスタンプベース）
│   │   │   ├── audio-button.ts   # 🆕 音声ボタン型定義（実ファイルベース）
│   │   │   ├── user.ts           # ユーザー管理型定義（拡張済み）
│   │   │   └── firestore-utils.ts # Firestore変換ユーティリティ
│   │   └── dist/                 # ビルド成果物
│   ├── ui/                       # 共有UIコンポーネント v0.2.1
│   │   ├── src/
│   │   │   ├── components/       # Radix UI ベースコンポーネント
│   │   │   │   ├── button.tsx    # ボタンコンポーネント
│   │   │   │   ├── pagination.tsx # ページネーションコンポーネント
│   │   │   │   ├── card.tsx      # カードコンポーネント
│   │   │   │   ├── audio-player.tsx # 🆕 音声プレイヤー (4件テスト)
│   │   │   │   └── form-fields.tsx  # フォームフィールド
│   │   │   └── styles/           # Tailwind CSS v4設定
│   │   │       └── globals.css   # グローバルスタイル
│   │   └── .storybook/           # UI専用Storybook設定
│   └── typescript-config/        # 共有TypeScript設定 v0.2.1
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

### 音声参照データ (`FirestoreAudioReferenceData`)

- `id`, `title`, `description` - 基本情報
- `videoId`, `startTime`, `endTime` - YouTube動画参照情報
- `youtubeEmbedUrl` - 埋め込み再生URL
- `tags[]`, `category` - 分類情報
- `createdBy`, `isPublic` - ユーザー・公開設定
- `playCount` - 統計情報
- `createdAt`, `updatedAt` - 管理情報

### 音声ボタンデータ (`FirestoreAudioButtonData`) 🆕

- `id`, `title`, `description` - 基本情報
- `audioFileUrl`, `duration`, `fileSize` - 音声ファイル情報
- `category` - `voice`, `bgm`, `se`, `talk`, `singing`, `other`
- `tags[]`, `isPublic` - 分類・公開設定
- `createdBy`, `uploadedBy` - 作成者・アップロード者
- `playCount`, `downloadCount` - 統計情報
- `createdAt`, `updatedAt` - 管理情報

### ユーザーデータ (`FirestoreUserData`)

- `discordId`, `username`, `globalName` - Discord基本情報
- `avatar`, `displayName` - 表示情報
- `guildMembership` - Discord ギルド所属確認情報
- `role` - アプリ内権限 (member/moderator/admin)
- `audioReferencesCount`, `totalPlayCount` - 統計情報
- `isActive`, `isPublicProfile`, `showStatistics` - 状態・プライバシー設定
- `createdAt`, `updatedAt`, `lastLoginAt` - 管理情報

## 🚀 開発コマンド

### セットアップ

```bash
# 依存関係のインストール
pnpm install

# 共有型のビルド (必須)
pnpm --filter @suzumina.click/shared-types build

# Functions準備 (デプロイ前)
pnpm prepare:functions

# E2Eテスト準備 (Playwright)
pnpm --filter @suzumina.click/web exec playwright install
```

### 開発サーバー

```bash
# 本番Webアプリ開発 (実際のFirestoreデータを使用)
cd apps/web && pnpm dev


# Storybook開発 (UIコンポーネント)
cd apps/web && pnpm storybook        # Web専用コンポーネント
cd packages/ui && pnpm storybook     # 共有UIコンポーネント
```

### 開発用Google Cloudセットアップ

Webアプリは `suzumina-click` GCPプロジェクトに接続します:

```bash
# 1. Google Cloud SDKのインストール
brew install google-cloud-sdk

# 2. Application Default Credentialsで認証
gcloud auth application-default login

# 3. プロジェクトアクセスの確認
gcloud firestore databases list --project=suzumina-click

# 4. 開発サーバー起動 (実際のFirestoreデータに接続)
cd apps/web && pnpm dev
```

### テスト・品質管理

```bash
pnpm test              # テスト実行 (388+件)
pnpm test:coverage     # カバレッジ付きテスト実行
pnpm lint              # 全パッケージのLint
pnpm format            # 全パッケージのフォーマット
pnpm check             # Lint + フォーマット
pnpm typecheck         # 🆕 型チェック
pnpm build             # 全パッケージのビルド

# E2Eテスト
cd apps/web && pnpm test:e2e        # Playwright E2E実行
cd apps/web && pnpm test:e2e:ui     # E2E UIモード
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

**2. Discord認証・ユーザー管理フロー**

```console
ユーザー → Discord OAuth → NextAuth.js
    ↓ (認証成功)
Discord Guild API → ギルドメンバーシップ確認
    ↓ (ギルドメンバーの場合)
Firestore users collection → ユーザー情報作成・更新
    ↓ (セッション確立)
JWT セッション → 認証状態管理
```

**3. 音声コンテンツ作成フロー (二重システム)**

```console
認証済みユーザー
    │
    ├─ 音声参照作成 (AudioReferenceCreator)
    │   ├─ YouTube動画選択
    │   ├─ 時間範囲指定 (開始・終了時刻)
    │   └─ メタデータ入力 (タイトル、タグ等)
    │
    └─ 音声ボタン作成 (AudioButtonCreator) 🆕
        ├─ 音声ファイルアップロード
        ├─ カテゴリ選択 (voice/bgm/se/talk/singing/other)
        └─ メタデータ入力 (タイトル、タグ等)
    ↓ (Server Actions + ユーザー認証確認)
Next.js Server Actions
    │ ├─ セッション検証・権限確認
    │ ├─ ファイル/タイムスタンプ検証
    │ ├─ Cloud Storage保存 (音声ボタンの場合)
    │ └─ メタデータ保存 (Firestore) + 作成者情報
    ↓ (保存完了)
Firestore
    ├─ audioReferences collection (YouTube参照)
    ├─ audioButtons collection (実音声ファイル) 🆕
    └─ users collection (統計情報更新)
```

### フロントエンド表示 (Next.js 15 App Router)

**動画一覧ページ**

```console
Page (Server Component)
├── データ取得 (Server Actions)
├── VideoList (Server Component)
│   ├── 動画リスト表示
│   └── Pagination (Client Component)
│       └── URL更新によるナビゲーション
```

**音声機能ページ (実装完了)**

```console
Audio System Pages (Server Component)
├── 音声データ取得 (Server Actions)
├── AudioReferenceCreator (Client Component)
│   ├── YouTube動画選択・時間指定
│   ├── メタデータ入力フォーム
│   └── Server Actions (参照作成)
├── AudioButtonCreator (Client Component) 🆕
│   ├── 音声ファイルアップロード
│   ├── カテゴリ・メタデータ入力
│   └── Server Actions (ボタン作成)
└── AudioContentList (Server Component)
    ├── YouTubePlayer (Client Component)
    │   └── YouTube埋め込み再生 (特定区間)
    ├── AudioPlayer (Client Component) 🆕
    │   └── 実音声ファイル再生
    └── Pagination (Client Component)

管理者ページ (Admin Interface) 🆕
├── UserManagement (Server Component)
│   ├── ユーザー一覧・検索・フィルタリング
│   ├── ロール変更 (member/moderator/admin)
│   └── アカウント有効化/無効化
├── ContentManagement (Server Component)
│   ├── 動画管理 (タイトル編集)
│   ├── 作品管理 (DLsite連携)
│   └── 音声コンテンツ管理
└── AdminStats (Server Component)
    └── システム統計・ダッシュボード
```

1. **Server Component**: ページでデータ取得 (Server Actions)
2. **型変換**: `FirestoreData` → `FrontendData` (shared-types使用)
3. **Server Component**: VideoList・AudioReferenceListで表示ロジック
4. **Client Component**: インタラクション (Pagination, YouTubePlayer, AudioReferenceCreator)

## 🔒 セキュリティ・設計原則

### セキュリティ

- **Discord Guild認証**: 特定Discordサーバーのメンバーのみアクセス許可
- **NextAuth.js**: JWT ベースのセッション管理・CSRF保護
- **Secret Manager**: APIキー・認証情報の安全な管理
- **IAM**: 最小権限の原則
- **サーバーサイド優先**: FirestoreはServer Actionsのみでアクセス
- **権限ベース機能制御**: ユーザーロール (member/moderator/admin) による機能制限

### 設計原則

- **Next.js 15準拠**: App Router + Server Components + Client Components分離
- **責任分離**: Server Components（表示）とClient Components（インタラクション）の明確な分離
- **コロケーション**: ページとServer Actionsを同一ディレクトリに配置
- **型安全性**: 共有型定義とZodスキーマ
- **Monorepo**: 開発効率のための一元管理
- **Storybook活用**: UIコンポーネントの開発・テスト環境
- **ブラウザファースト**: YouTube埋め込みAPIを使用したクライアントサイド動画再生
- **ユーザー主導**: コンテンツ作成でのユーザーエンパワーメント

## 🎯 今後の予定

### 優先度順位

1. **レスポンシブUI強化**: モバイル・タブレット対応の改善

2. **検索・フィルター強化**: 高度な検索機能（全コンテンツ横断）

3. **音声機能拡張**: 
   - 音声ファイル一括管理
   - プレイリスト機能
   - 音声品質最適化

4. **パフォーマンス最適化**: 
   - 画像・音声ファイル配信最適化
   - キャッシュ戦略改善

### 音声システム詳細 (実装完了)

**コア機能**
- **音声参照**: YouTube動画タイムスタンプベース
- **音声ボタン**: 実音声ファイルアップロード・再生
- **二重システム**: 参照とファイルの統合管理
- **カテゴリ管理**: voice/bgm/se/talk/singing/other
- **Cloud Storage連携**: 音声ファイル安全保存

**管理者機能 (新規追加)**
- **ユーザー管理**: ロール変更・アカウント制御
- **コンテンツ管理**: 音声・動画・作品の一元管理
- **統計ダッシュボード**: リアルタイム利用状況
- **検索・フィルタ**: 管理者向け高度検索

**ユーザーインターフェース**
- 音声参照作成フォーム (AudioReferenceCreator)
- 音声ボタン作成フォーム (AudioButtonCreator) 🆕
- YouTube埋め込みプレイヤー (特定区間再生)
- 音声ファイルプレイヤー (AudioPlayer) 🆕
- 統合検索・一覧表示
- 公開設定・プライバシー管理

## 📝 重要ファイル

- `docs/README.md` - 詳細仕様
- `docs/FIRESTORE_STRUCTURE.md` - Firestoreデータ構造
- `packages/shared-types/` - コア型定義 (音声参照型・ユーザー型含む)
- `apps/web/src/auth.ts` - Discord認証・NextAuth設定
- `apps/web/src/lib/user-firestore.ts` - ユーザー管理Firestore操作
- `apps/functions/src/` - データ収集ロジック
- `apps/web/src/app/buttons/` - 音声機能 (参照+ボタン・実装完了)
- `apps/web/src/app/admin/` - 管理者インターフェース (実装完了) 🆕
- `apps/web/src/app/auth/` - 認証関連ページ (signin/error)
- `apps/web/src/components/Admin*` - 管理者用UIコンポーネント 🆕
- `apps/web/src/components/Auth*` - 認証関連UIコンポーネント
- `apps/web/src/components/Audio*` - 音声関連UIコンポーネント
- `apps/web/e2e/` - E2Eテスト (Playwright) 🆕
- `packages/shared-types/src/audio-button.ts` - 音声ボタン型定義 🆕
- `packages/ui/src/components/audio-player.tsx` - 音声プレイヤー 🆕
- `terraform/AUTH_DEPLOYMENT_GUIDE.md` - Discord認証デプロイガイド
- `terraform/` - インフラ設定 (Discord認証含む)
- `biome.json` - コード品質設定

このプロジェクトは、データ収集インフラとユーザー作成コンテンツ機能を組み合わせたファンコミュニティプラットフォームで、型安全なフルスタック開発を重視しています。

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
- ❌ 重いサーバーサイド音声処理
- ✅ Server ComponentでのデータプリロードとProps渡し
- ✅ YouTube埋め込みAPIでのクライアントサイド動画再生

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

プロジェクトでは **ハイブリッドテストアプローチ** を採用し、コンポーネントの性質に応じて最適なテスト手法を使い分けています。

#### **1. Server Actions & ビジネスロジック → Vitest + 単体テスト**

**対象:**
- `apps/functions/src/` - Cloud Functions (データ収集ロジック)
- `apps/web/src/app/*/actions.ts` - Server Actions
- `packages/shared-types/src/` - 共有ユーティリティ

**重点テスト項目:**
- DLsite ID並び替えアルゴリズム (文字列長 + 辞書順)
- 複雑なページネーションロジック (cursor + offset)
- Firestore Timestamp変換とエラーハンドリング
- データ変換・検索・フィルタリング機能

```bash
# Server Actions & Functions テスト実行
pnpm test                    # 全体テスト実行
pnpm test:coverage          # カバレッジ付きテスト実行
cd apps/functions && pnpm test  # Functions個別テスト
```

#### **2. UIコンポーネント → Storybook (ビジュアルテスト)**

**対象:**

- `packages/ui/src/components/` - 共有UIコンポーネント
- レイアウト・デザインが重要なコンポーネント

**重点項目:**

- デザインシステムの一貫性
- 異なるprops・状態での見た目確認
- アクセシビリティの視覚的検証
- レスポンシブデザインの確認

```bash
# Storybook開発サーバー
cd packages/ui && pnpm storybook     # 共有UIコンポーネント
cd apps/web && pnpm storybook       # Web専用コンポーネント

# 対象コンポーネント例
packages/ui/src/components/
├── button.tsx ✅ Storybook
├── pagination.tsx ✅ Storybook
├── card.tsx ✅ Storybook
└── form-fields.tsx ✅ Storybook
```

#### **3. インタラクティブコンポーネント → React Testing Library**

**対象:**

- ユーザーインタラクションロジック
- 条件分岐・エラーハンドリングを含むコンポーネント
- 状態管理が重要なコンポーネント

**重点項目:**

- ページネーションの次/前ページロジック
- 検索・フィルタリング機能
- フォーム入力・バリデーション
- エラーバウンダリ

```bash
# React Testing Library セットアップ
cd apps/web
npm install -D @testing-library/react @testing-library/jest-dom happy-dom

# 実装完了コンポーネント ✅
apps/web/src/components/
├── Pagination.tsx ✅ RTL (10件: ページネーションロジック)
├── SearchForm.tsx ✅ RTL (15件: 検索・フィルタリング)
├── YouTubePlayer.tsx ✅ RTL (44件: 包括的テスト)
├── AudioReferenceCreator.tsx ✅ RTL (15件: 音声参照作成)
├── AudioReferenceCard.tsx ✅ RTL (10件: 音声参照表示)
├── ThumbnailImage.tsx ✅ RTL (15件: 画像・エラーハンドリング)
├── SiteHeader.tsx ✅ RTL (10件: ナビゲーション)
└── SiteFooter.tsx ✅ RTL (9件: フッター)
```

#### **4. 統合テスト → Next.js Testing + E2E**

**対象:**

- Page Components + Server Actions
- Client/Server Component境界
- 実際のユーザーフロー

**重点項目:**

- Server ComponentとClient Componentの連携
- Server Actionsからのデータフロー
- エラーバウンダリとSuspenseの動作

#### **テスト実装状況**

**✅ Phase 1: Core Testing Complete** (重要機能100%カバレッジ)

```bash
# 完了済み - 全重要機能がテスト済み
✅ Server Actions & ビジネスロジック (78件)
✅ 重要UIコンポーネント (128件)
✅ 統合テスト (Page Components - 20件)
✅ エラーハンドリング & エッジケース
```

**🎯 Phase 2: Storybook強化** (次の改善目標)

```bash
# 今後の拡張候補
- Visual Regression Testing追加
- アクセシビリティテスト強化
- レスポンシブデザインテスト
```

**🎯 Phase 3: Advanced Testing** (高度なテスト機能)

```bash
# Next.js App Router特有のテスト
- Page Components + Server Actions
- Client/Server Component境界のテスト
- エラーバウンダリとSuspenseのテスト
```

#### **テスト環境設定**

**Vitest Workspace**

```typescript
// vitest.workspace.ts
export default defineWorkspace([
  "apps/functions/vitest.config.ts",      // Cloud Functions
  "apps/web/vitest.config.ts",            // Web App (RTL)
  "packages/shared-types/vitest.config.ts", // 共有型・ユーティリティ
]);
```

**React Testing Library設定例**

```typescript
// apps/web/vitest.config.ts
export default defineConfig({
  test: {
    globals: true,
    environment: "happy-dom", // jsdomより高速
    setupFiles: ["./test-setup.ts"],
  },
});
```

### 現在のテストカバレッジ状況

- **テスト件数**: **388+件** (高品質・包括的)
- **テストファイル**: **21ファイル** (すべて通過)
- **E2Eテスト**: **4件** (Playwright + 複数ブラウザ)
- **カバー済み**:
  - ✅ **Cloud Functions**: 157件テスト (データ収集・変換ロジック)
  - ✅ **Web App**: 229件テスト (UI・Server Actions・統合)
  - ✅ **UI Package**: 4件テスト (音声プレイヤー)
  - ✅ **E2E**: 4件テスト (ユーザーフロー全体)
  - ✅ **管理者機能**: 新規追加機能の完全テスト 🆕
- **最新の成果**: 
  - 管理者インターフェースの包括的テスト追加
  - E2Eテストによるブラウザ横断検証
  - 音声システムの統合テスト強化
- **品質**: Biome 2.0 + Lefthook による厳格な品質管理

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
