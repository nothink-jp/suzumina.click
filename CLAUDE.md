# suzumina.click プロジェクト概要

声優「涼花みなせ」のファンサイト - ユーザーが作成する音声ボタンの共有とDLsite作品情報を表示

## 🎯 プロジェクト概要

suzumina.clickは、声優「涼花みなせ」ファンコミュニティのためのWebプラットフォームです。YouTube動画の音声ボタン（タイムスタンプ参照）機能と、DLsiteからの最新作品情報閲覧機能を提供します。

### 開発状況

**✅ 完了済み**

- **データ収集インフラ**: YouTubeビデオ・DLsite作品情報の自動取得システム
- **インフラ基盤**: TerraformによるGCPリソース管理（2環境構成・コスト最適化）
- **共有型定義**: Zodスキーマを使用した型安全なデータ構造
- **開発環境**: 開発ツールを含むMonorepoセットアップ
- **本番Webアプリケーション** (`apps/web`): ページネーション付き動画・作品一覧表示
- **音声ボタン機能** (`apps/web`): タイムスタンプ参照システム（YouTube動画区間ブックマーク）


## 🏗️ アーキテクチャ

```console
外部サービス → Cloud Scheduler → Pub/Sub → Cloud Functions → Firestore → Next.js Webアプリ
     ↓              ↓              ↓         ↓              ↓           ↓
YouTube API    定期実行         非同期      データ収集      NoSQLストレージ  フロントエンド
DLsite         (Production環境)  メッセージ   (Function v2)   (型安全)      (App Router)
               ↓                                            ↓
              ユーザー音声参照作成 → タイムスタンプ保存 → YouTube埋め込み再生
                  ↓                    ↓              ↓
               (ブラウザUI)        Firestore保存    YouTube Player
               (時間指定)          (参照情報のみ)    (特定区間再生)
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
- **Google Cloud Firestore** - NoSQLデータベース (Native mode + 複合インデックス)
- **Google Cloud Storage** - ファイルストレージ (デプロイアーティファクト、将来の音声ファイル用)
- **Google Cloud Pub/Sub** - 非同期メッセージング (Scheduler → Functions)
- **Google Cloud Scheduler** - 定期実行タスク (Production環境のみ)
- **Google Secret Manager** - APIキー・シークレット管理
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
│   │   │   │   ├── buttons/     # 音声ボタン関連 (タイムスタンプ参照・完了)
│   │   │   │   └── search/      # 検索機能 (未実装)
│   │   │   ├── components/      # UIコンポーネント
│   │   │   │   ├── VideoList.tsx      # 動画一覧 (Server Component)
│   │   │   │   ├── AudioReferenceCreator.tsx # 音声参照作成 (Client Component)
│   │   │   │   ├── AudioReferenceCard.tsx   # 音声参照表示 (Server Component)
│   │   │   │   ├── YouTubePlayer.tsx        # YouTube埋め込み再生 (Client Component)
│   │   │   │   ├── Pagination.tsx     # ページネーション (Client Component)
│   │   │   │   └── ThumbnailImage.tsx # サムネイル画像
│   │   │   └── lib/             # ユーティリティ
│   │   │       └── firestore.ts # Firestore接続
│   │   ├── .storybook/           # Web App専用Storybook設定
│   │   └── package.json
├── packages/
│   ├── shared-types/             # 共有型定義 (重要)
│   │   ├── src/
│   │   │   ├── common.ts         # 共通型・ユーティリティ
│   │   │   ├── video.ts          # YouTube動画型定義
│   │   │   ├── work.ts           # DLsite作品型定義
│   │   │   ├── audio-reference.ts # 音声参照型定義（タイムスタンプベース）
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

### 音声参照データ (`FirestoreAudioReferenceData`)

- `id`, `title`, `description` - 基本情報
- `videoId`, `startTime`, `endTime` - YouTube動画参照情報
- `youtubeEmbedUrl` - 埋め込み再生URL
- `tags[]`, `category` - 分類情報
- `createdBy`, `isPublic` - ユーザー・公開設定
- `playCount` - 統計情報
- `createdAt`, `updatedAt` - 管理情報

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

**2. ユーザー音声参照作成フロー**
```
ユーザー (AudioReferenceCreator)
    │ ├─ YouTube動画選択
    │ ├─ 時間範囲指定 (開始・終了時刻)
    │ └─ メタデータ入力 (タイトル、タグ等)
    ↓ (Server Actions)
Next.js Server Actions
    │ ├─ タイムスタンプ検証
    │ ├─ YouTube埋め込みURL生成
    │ └─ メタデータ保存 (Firestore)
    ↓ (保存完了)
Firestore
    └─ audioReferences collection (参照メタデータ)
```

### フロントエンド表示 (Next.js 15 App Router)

**動画一覧ページ**
```
Page (Server Component)
├── データ取得 (Server Actions)
├── VideoList (Server Component)
│   ├── 動画リスト表示
│   └── Pagination (Client Component)
│       └── URL更新によるナビゲーション
```

**音声参照ページ (実装完了)**
```
Audio Reference Page (Server Component)
├── 音声参照データ取得 (Server Actions)
├── AudioReferenceCreator (Client Component)
│   ├── YouTube動画選択・時間指定
│   ├── メタデータ入力フォーム
│   └── Server Actions (参照作成)
└── AudioReferenceList (Server Component)
    ├── YouTubePlayer (Client Component)
    │   └── YouTube埋め込み再生 (特定区間)
    └── Pagination (Client Component)
```

1. **Server Component**: ページでデータ取得 (Server Actions)
2. **型変換**: `FirestoreData` → `FrontendData` (shared-types使用)
3. **Server Component**: VideoList・AudioReferenceListで表示ロジック
4. **Client Component**: インタラクション (Pagination, YouTubePlayer, AudioReferenceCreator)

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
- **ブラウザファースト**: YouTube埋め込みAPIを使用したクライアントサイド動画再生
- **ユーザー主導**: コンテンツ作成でのユーザーエンパワーメント

## 🎯 今後の予定

### 優先度順位

1. **DLsite作品表示機能**: 作品一覧ページの実装

2. **検索・フィルター**: 高度な検索機能（音声参照・動画・作品）

3. **レスポンシブUI**: モバイル対応

4. **音声ファイル機能**: 実音声アップロード（将来検討・法的評価後）

### 音声参照機能詳細 (実装完了)

**コア機能**
- ユーザーがYouTube動画の時間範囲を指定
- タイムスタンプベースの音声参照作成
- メタデータ入力 (タイトル、タグ、説明)
- YouTube埋め込みURL生成
- Firestoreへの参照メタデータ保存

**ユーザーインターフェース**
- 音声参照作成フォーム (AudioReferenceCreator)
- YouTube埋め込みプレイヤー (特定区間再生)
- メタデータ入力フォーム
- 音声参照一覧・検索機能
- 公開設定管理

## 📝 重要ファイル

- `docs/README.md` - 詳細仕様
- `docs/FIRESTORE_STRUCTURE.md` - Firestoreデータ構造
- `packages/shared-types/` - コア型定義 (音声参照型含む)
- `apps/functions/src/` - データ収集ロジック
- `apps/web/src/app/buttons/` - 音声参照機能 (実装完了)
- `apps/web/src/components/Audio*` - 音声参照関連UIコンポーネント
- `terraform/` - インフラ設定
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

# 対象コンポーネント例
apps/web/src/components/
├── Pagination.tsx ✅ RTL (ページネーションロジック)
├── SearchPanel.tsx ✅ RTL (検索・フィルタリング)
├── VideoList.tsx ✅ RTL (データ表示ロジック)
└── ErrorBoundary.tsx ✅ RTL (エラーハンドリング)
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

#### **テスト実装の優先順位**

**Phase 1: Storybook強化** (即効性高い)
```bash
# 既存Storybookインフラの活用
- Visual Regression Testing追加
- アクセシビリティテスト強化
- レスポンシブデザインテスト
```

**Phase 2: 重要コンポーネントのRTL** (品質向上)
```bash
# 最優先テスト対象
1. Pagination (既に実装済み) ✅
2. SearchPanel - 検索ロジック
3. VideoList - データ表示とエラーハンドリング
4. WorkCard - インタラクション
```

**Phase 3: Integration Tests** (Server Componentsとの結合)
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

#### **現在のテストカバレッジ**

- **テスト件数**: 258件
- **カバー済み**: Server Actions, データ変換, アルゴリズム
- **カバー対象**: ビジネスロジック, エラーハンドリング, 複雑な並び替え
- **今後の拡張**: UIコンポーネント, インタラクション, 統合テスト

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
