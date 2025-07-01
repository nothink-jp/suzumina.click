# suzumina.click プロジェクト概要

声優「涼花みなせ」のファンサイト - ユーザーが作成する音声ボタンの共有とDLsite作品情報を表示

> **📋 プロジェクト情報**: 基本情報・クイックスタートは [README.md](./README.md) をご覧ください。  
> このファイルは開発者向けの詳細仕様・リポジトリ指示を含んでいます。

## 🎯 プロジェクト概要

suzumina.clickは、声優「涼花みなせ」ファンコミュニティのためのWebプラットフォームです。YouTube動画の音声参照機能、DLsite作品情報閲覧、お気に入りシステム、そして包括的な管理者機能を提供します。

### 🚀 現在のステータス

**本番稼働中の完成システム (v0.2.3)**

- **Webアプリケーション**: Next.js 15 + TypeScript + Tailwind CSS v4
- **認証システム**: Discord OAuth + ギルドメンバーシップ確認
- **データ収集**: YouTube Data API + DLsite スクレイピング (自動実行)
- **音声システム**: YouTube動画タイムスタンプ参照システム + v0モック準拠デザイン
- **統合検索システム**: 全コンテンツ横断検索・高度フィルタリング・URL状態管理 (2025年7月実装完了)
- **お気に入りシステム**: 音声ボタンのお気に入り登録・管理機能
- **管理者機能**: ユーザー・コンテンツ管理インターフェース
- **インフラ**: Terraform + Google Cloud Platform (本番稼働)
- **品質保証**: 677+件のテストスイート + E2Eテスト (高度フィルタリング17件追加)
- **最新機能**: しぐれういボタン風インライン音声ボタンレイアウト (2025年6月実装)

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
- **デザインシステム**: 涼花みなせブランドカラー (suzuka/minase) + 包括的デザイントークン
- **NextAuth.js** (Discord OAuth認証)

### バックエンド・インフラ

- **Google Cloud Functions v2** (Node.js 22) - データ収集
- **Google Cloud Firestore** - メインデータベース
- **Google Cloud Storage** - ファイル保存
- **Google Cloud Logging** - 構造化ログ出力・運用監視
- **Terraform** - インフラ管理
- **GitHub Actions** - CI/CDパイプライン

### 開発・品質管理

- **pnpm Workspace** - Monorepo管理
- **Vitest** - テストフレームワーク
- **Storybook** - UIコンポーネント開発 (UI Package一本化)
- **Biome** - リンター・フォーマッター

## 📁 プロジェクト構造

```text
suzumina.click/ (v0.2.3)
├── apps/
│   ├── functions/          # Cloud Functions (本番稼働)
│   │   ├── src/dlsite.ts   # DLsite作品収集
│   │   └── src/youtube.ts  # YouTube動画収集
│   ├── admin/              # 管理者専用アプリ (分離済み)
│   │   ├── src/app/        # 管理者ダッシュボード・管理機能
│   │   ├── src/components/ # 管理者UI (LoginButton等)
│   │   ├── src/lib/        # データヘルパー・バリデーションユーティリティ
│   │   ├── src/__tests__/  # 60+件のユニットテスト (data-helpers/validation)
│   │   ├── src/providers/  # セッション管理
│   │   └── tsconfig.test.json # テスト用TypeScript設定 (二段階型チェック)
│   └── web/                # Next.js Webアプリ
│       ├── src/app/        # App Router
│       │   ├── buttons/    # 音声機能 (一覧・作成・詳細)
│       │   ├── favorites/  # お気に入り機能
│       │   ├── search/     # 統合検索機能 (全コンテンツ横断検索)
│       │   ├── videos/     # 動画一覧・詳細
│       │   ├── works/      # 作品一覧・詳細
│       │   ├── users/      # ユーザープロフィール
│       │   ├── about/      # サイト情報
│       │   ├── contact/    # お問い合わせ
│       │   ├── privacy/    # プライバシーポリシー
│       │   ├── terms/      # 利用規約
│       │   ├── auth/       # 認証関連ページ
│       │   └── api/        # API Routes (auth/audio-buttons/contact/health/metrics/search)
│       ├── src/components/ # UIコンポーネント (25+個)
│       │   ├── SearchFilters.tsx # 高度検索フィルターUI
│       ├── src/components/ # UIコンポーネント (25+個)
│       │   ├── AudioButtonCreator.tsx # 音声ボタン作成
│       │   ├── FavoriteButton.tsx # お気に入りボタン
│       │   ├── SiteHeader.tsx # サイトヘッダー
│       │   └── UserMenu.tsx # ユーザーメニュー
│       ├── src/actions/    # Server Actions
│       │   └── favorites.ts # お気に入り関連
│       ├── src/lib/        # ライブラリ・ユーティリティ
│       │   ├── favorites-firestore.ts # お気に入りFirestore操作
│       │   ├── audio-buttons-firestore.ts # 音声ボタンFirestore操作
│       │   ├── user-firestore.ts # ユーザーFirestore操作
│       │   └── security-logger.ts # セキュリティログ
│       ├── e2e/            # E2Eテスト (Playwright)
│       └── scripts/        # 管理者セットアップスクリプト
├── packages/
│   ├── shared-types/       # 共有型定義 (Zodスキーマ)
│   │   ├── src/favorite.ts # お気に入り型定義
│   │   └── src/search-filters.ts # 高度検索フィルター型定義
│   ├── ui/                 # 共有UIコンポーネント
│   │   ├── components/ui/           # shadcn/ui (51個)
│   │   ├── components/custom/       # 独自UI (audio-button等)
│   │   └── components/design-tokens/ # デザイントークン (Storybook)
│   └── typescript-config/  # TypeScript設定
├── terraform/              # インフラ定義
└── docs/                   # プロジェクトドキュメント
```

## 📊 データ構造

### 主要コレクション

- **videos**: YouTube動画データ (`FirestoreVideoData`)
- **works**: DLsite作品データ (`FirestoreDLsiteWorkData`)
- **audioButtons**: 音声ボタン (YouTube区間指定システム)
- **users**: ユーザーデータ (Discord認証・ロール管理)
- **users/{userId}/favorites**: お気に入り音声ボタン (サブコレクション)

### 音声システム

**音声ボタン**: YouTube動画の特定区間を参照するシステム
- タイムスタンプ指定による音声再生
- お気に入り登録・管理機能
- 統計情報 (再生数・いいね数・お気に入り数)
- **新デザイン**: minaseカラーグラデーション + インライン可変幅レイアウト
- **配置方式**: flex-wrap による自然な配置 (しぐれういボタン風)

## 🎨 デザインシステム

### ブランドカラーパレット

#### **suzuka colors (メインテーマ)**
- **suzuka-500**: `#ff4785` - 涼花みなせメインピンク
- **suzuka-50～950**: 10段階のピンク系グラデーション
- 用途: プライマリボタン、アクセント、ブランディング

#### **minase colors (サブテーマ)**
- **minase-500**: `#ff7e2d` - 涼花みなせオレンジ
- **minase-50～950**: 10段階のオレンジ系グラデーション  
- 用途: セカンダリボタン、ハイライト、CTA
- **主要実装**: 音声ボタンのグラデーション背景 (from-minase-400 to-minase-500)

### デザイントークン構成

- **Color Palette**: suzuka/minase colors + semantic colors
- **Typography**: フォントサイズ・行間・ウェイトの体系的定義
- **Spacing**: 4px基準の一貫したスペーシングシステム
- **Borders & Shadows**: 角丸・ボーダー・シャドウの統一ルール
- **Icons**: Lucide React アイコンセット（200+アイコン）
- **Tailwind CSS v4対応**: @layer utilities による完全なカスタムカラー実装

### Storybook デザイントークン

```text
packages/ui/src/components/design-tokens/
├── color-palette.stories.tsx    # カラーパレット一覧
├── typography.stories.tsx       # フォント・テキストスタイル
├── spacing.stories.tsx          # マージン・パディング・ギャップ
├── borders-shadows.stories.tsx  # ボーダー・角丸・シャドウ
└── icons.stories.tsx           # アイコン一覧・使用例
```

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
cd packages/ui && pnpm storybook   # UIコンポーネント開発 (一本化)
```

### 品質管理

```bash
pnpm check        # Lint + フォーマット + 型チェック
pnpm test         # 全テスト実行 (660+件)
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

### ユーザー認証・管理者機能

```text
Discord OAuth → NextAuth.js → ギルドメンバーシップ確認 → ロール判定 → セッション確立
                                                      ↓
                                      Firestoreロールベース認証 → 管理者権限判定
```

### 音声コンテンツ作成

```text
認証済みユーザー → AudioCreator → Server Actions → Firestore/Cloud Storage
```

## 🔒 セキュリティ・設計原則

### セキュリティ

- Discord ギルド認証による限定アクセス
- NextAuth.js JWT セッション管理  
- ロールベースアクセス制御 (member/moderator/admin)
- Firestoreベース管理者権限管理 (環境変数依存削除)
- Google Secret Manager による認証情報管理
- 最小権限の原則 (IAM・Firestore Rules)
- 完全な@google-cloud パッケージ統一（Firebase依存関係削除完了）

### 設計原則

- **Next.js 15準拠**: Server/Client Components適切分離
- **型安全性**: TypeScript strict + Zodスキーマ
- **責任分離**: 表示ロジックとインタラクション分離
- **コロケーション**: 関連コードの近接配置
- **テスト駆動**: 重要機能の包括的テスト

## 🎨 コンポーネント設計・Storybook戦略

### コンポーネント分離基準

#### **`@packages/ui/components/ui/` (shadcn/ui)**
```
✅ 純粋なデザインシステムコンポーネント
- button, card, input, dialog など (51個)
- 一切のビジネスロジックを含まない
- プロジェクト間で完全に再利用可能
- shadcn CLI による自動管理
```

#### **`@packages/ui/components/custom/` (拡張UIコンポーネント)**
```
✅ プロジェクト再利用可能な独自コンポーネント
- simple-audio-button (YouTube音声再生 + minaseグラデーションデザイン)
- audio-only-player (非表示YouTube Player)
- youtube-player (YouTube IFrame API統合)
- 汎用性があるが suzumina.click 特化機能
- UI Package内で Storybook 管理
- インライン flex レイアウト対応 (可変幅ボタン)
```

#### **`@apps/web/src/components/` (アプリケーション特化)**
```
✅ suzumina.click 特有のビジネスロジック
- AudioButtonCreator (音声ボタン作成機能)
- AudioButtonWithFavoriteClient (お気に入り機能付き音声ボタン)
- FeaturedAudioButtonsCarousel (flex-wrap レイアウトによる音声ボタン一覧)
- FavoriteButton (お気に入り機能)
- SiteHeader, MobileMenu (サイト固有ナビゲーション)
- AdminList, ThumbnailImage (ドメイン特化)
- Next.js 固有API依存 (useRouter, Image等)
- E2E テストでカバー
```

### Storybook一本化戦略

#### **UI Package Storybook** (唯一の Storybook)
```typescript
// 対象：全UIコンポーネント + デザイントークン
title: "UI/Button"                    // shadcn/ui標準
title: "Custom/AudioButton"           // プロジェクト拡張
title: "Design Tokens/Color Palette"  // デザイントークン

// 目的：デザインシステム・API文書化
- 全バリアント・プロパティの体系的テスト
- デザイントークン（色・スペース・タイポグラフィ）の視覚的ドキュメント
- 視覚的回帰テスト (Chromatic対応)
- コンポーネント単体の品質保証
```

#### **品質保証の役割分担**
```typescript
✅ UI一貫性     → UI Package Storybook
✅ ロジックテスト → Unit Tests (Vitest) - 660+件
✅ 統合テスト    → E2E Tests (Playwright)
✅ 型安全性     → TypeScript strict (二段階チェック)
✅ Adminテスト   → tsconfig.test.json (テスト用緩和設定)
```

### shadcn/ui管理方針

#### **components.json設定**
```json
// 両パッケージで統一された設定
"aliases": {
  "ui": "@suzumina.click/ui/components/ui"
}
```

#### **新規コンポーネント追加**
```bash
# UI Package での実行
cd packages/ui && pnpm dlx shadcn@latest add <component>

# 自動的に ui/ サブディレクトリに配置
# Web App からは @suzumina.click/ui/components/ui/* でインポート
```

#### **Storybook ストーリー作成**
```typescript
// 新規 shadcn/ui コンポーネント追加時は必ずストーリー作成
// 既存の button.stories.tsx をテンプレートとして活用
// 主要バリアント・状態を網羅的にテスト
```

### 個人開発最適化

#### **Chromatic 活用範囲**
```
優先度：高 → 必須管理
- Button, Card, Input (基盤UI)
- AudioButton (独自性高)
- Dialog, Alert (UX重要)

優先度：中 → 段階的追加
- 複雑なshadcn/uiコンポーネント

優先度：低 → 後回し/除外
- 単純なコンポーネント (Badge, Separator等)
- 使用頻度が低いコンポーネント
```

#### **メンテナンス方針**
```
✅ Web App Storybook削除完了
✅ UI Package Storybook一本化
✅ E2E テストによるビジネスロジック品質保証
✅ Adminアプリの包括的ユニットテスト実装
✅ 未使用コードの系統的削除 (18ファイル削除完了)
✅ 工数対効果を重視した段階的品質管理
```

## 🛡️ 管理者機能詳細 (分離済み専用アプリ)

### 🏗️ 管理者アプリ (apps/admin) 
独立したNext.js アプリケーションとして分離・運用

#### **アクセス方式**
- **専用URL**: admin.suzumina.click (独立デプロイ)
- **0インスタンス運用**: 通常時はインスタンス0、アクセス時のみ起動
- **Firestore認証**: Firestoreのrole="admin"かつisActive=trueによる認証
- **環境変数非依存**: DEFAULT_ADMIN_DISCORD_IDS完全削除済み

### 管理者ダッシュボード
- **統計情報**: ユーザー数・動画数・作品数・音声ボタン数・お問い合わせ数のリアルタイム表示
- **クイックアクション**: 各管理機能への迅速アクセス
- **システム情報**: バージョン情報・環境情報・稼働状況
- **ログイン管理者表示**: 現在の管理者セッション情報

### ユーザー管理 (実装済み)
- **ユーザー一覧**: 全ユーザーの表示・検索・フィルタリング
- **ロール管理**: member/moderator/admin のロール変更
- **アクティブ状態管理**: ユーザーのアクティブ/非アクティブ切り替え
- **統計情報**: ロール別ユーザー数・アクティブユーザー数のリアルタイム表示
- **編集機能**: ユーザー情報の編集ダイアログ（ロール・アクティブ状態）

### 音声ボタン管理 (実装済み)
- **一覧表示**: 全音声ボタンの管理・検索・フィルタリング
- **詳細管理**: 個別ボタンの編集・削除・公開制御
- **統計確認**: 再生数・いいね数・お気に入り数の確認
- **品質管理**: 不適切コンテンツの検出・削除

### 動画・作品管理 (実装済み)
- **一覧表示**: 動画・作品の管理画面
- **詳細編集**: 個別データの編集・更新機能
- **データ同期状況**: Cloud Functions による自動収集状況の監視
- **統計確認**: 収集データの品質・完全性チェック

### お問い合わせ管理 (実装済み)
- **状態管理**: 新規・確認中・対応済みのステータス管理
- **優先度管理**: 高・中・低の優先度設定
- **詳細表示**: お問い合わせ内容の詳細確認ダイアログ
- **管理者メモ**: 対応履歴・メモの記録機能
- **統計表示**: ステータス別・優先度別の件数表示

### セキュリティ機能
- **Firestore認証**: role="admin" + isActive=true での動的認証
- **セッション管理**: NextAuth.js JWT + Cookie ベースセッション
- **Edge Runtime対応**: 動的インポートによるFirestore接続
- **アクセス制御**: 管理者のみアクセス可能な独立アプリケーション

### テスト戦略 (2025年6月30日追加)
- **包括的ユニットテスト**: 60+件のテストスイート実装済み
  - **データヘルパー関数**: formatDate, formatRole, sortByField等の29件
  - **バリデーション機能**: validateEmail, validateUserData等の26件
  - **基本機能**: 認証・セットアップ・環境設定の5件
- **二段階型チェック**: tsconfig.test.json による緩和設定
  - 本番コード: TypeScript strict mode
  - テストコード: 実用性重視の緩和モード
- **品質基準**: Lint 0エラー・型チェック完全パス・全テスト成功

## 🌐 API Routes 詳細

### 認証関連 (`/api/auth/*`)
- **NextAuth**: `/api/auth/[...nextauth]` - Discord OAuth認証エンドポイント

### 統合検索API (`/api/search`) 🆕
- **統合検索**: 全コンテンツ横断検索（音声ボタン・動画・作品）
- **並列実行**: Promise.all による高速検索・エラーハンドリング
- **高度フィルタリング**: 15+パラメータによる詳細検索サポート
  - **日付範囲**: 今日・今週・今月・過去30日・カスタム範囲
  - **数値範囲**: 再生数・いいね数・お気に入り数・音声長
  - **タグフィルター**: 複数タグのAND/OR検索
  - **ソート**: 関連度・新着・人気・再生数順

### コンテンツAPI (`/api/audio-buttons`)
- **音声ボタン取得**: 公開音声ボタンの検索・フィルタリング
- **統計更新**: 再生数・いいね数の更新エンドポイント

### フォーム処理 (`/api/contact`)
- **お問い合わせ投稿**: フォーム送信データの処理・Firestore保存
- **スパム防止**: レート制限・入力検証

### 監視・運用
- **ヘルスチェック**: `/api/health` - アプリケーション稼働状況確認
- **メトリクス**: `/api/metrics` - パフォーマンス・利用統計データ

## 🎯 今後の改善予定

1. **レスポンシブUI強化**: モバイル・タブレット対応
2. **検索・フィルター強化**: 全コンテンツ横断検索
3. **音声機能拡張**: プレイリスト・一括管理
4. **パフォーマンス最適化**: キャッシュ・配信戦略
5. **お気に入り機能拡張**: カテゴリ分類・共有機能

## 🆕 最新実装内容 (2025年7月)

### 高度検索フィルタリング完全実装 (v0.2.4 - 2025年7月1日)

#### **包括的フィルタリングシステム**
- ✅ **15+フィルターパラメータ**: 日付範囲・数値範囲・タグ・並び順の完全実装
- ✅ **Zodスキーマ検証**: UnifiedSearchFiltersによる型安全なフィルター処理
- ✅ **リアルタイムUI**: ポップオーバー型フィルターパネル・アクティブフィルター表示
- ✅ **URL状態同期**: フィルター状態の永続化・ブックマーク対応

#### **高度フィルタリング機能詳細**
- ✅ **日付範囲フィルター**: プリセット（今日・今週・今月・過去30日）+ カスタム範囲選択
- ✅ **数値範囲フィルター**: 再生数・いいね数・お気に入り数・音声長の最小値/最大値指定
- ✅ **タグフィルター強化**: 複数タグの「いずれか」「すべて」含む検索モード
- ✅ **並び順オプション**: 関連度・新着・古い・人気（いいね）・再生数順

#### **コード品質・テスト強化**
- ✅ **17件新規テスト追加**: フィルターAPI・UIコンポーネント・ユーティリティ関数
- ✅ **複雑度削減**: getActiveFilterDescriptions等の関数を小さなヘルパーに分割
- ✅ **型安全性維持**: TypeScript strict mode + Zod schema による完全検証

### 統合検索機能完全実装 (v0.2.3 - 2025年6月30日)

#### **全コンテンツ横断検索システム**
- ✅ **統合検索API**: `/api/search` エンドポイントによる音声ボタン・動画・作品の並列検索
- ✅ **高速処理**: Promise.all による並列実行・認知複雑度削減（25→15）
- ✅ **エラーハンドリング**: 個別検索エラー時の部分結果表示・構造化ログ出力

#### **検索ページUI・UX**
- ✅ **タブ型検索結果**: 統合結果・個別カテゴリタブによる効率的結果表示
- ✅ **URL状態管理**: 検索クエリ・フィルタ状態のURL同期・ブックマーク対応
- ✅ **人気タグ機能**: ワンクリック検索・ユーザビリティ向上
- ✅ **レスポンシブ対応**: モバイル・タブレット完全対応・v0サンプル準拠デザイン

#### **包括的テスト実装**
- ✅ **17件新規テスト**: コンポーネント7件・API10件の徹底的品質保証
- ✅ **E2Eテスト**: 6シナリオによる完全ユーザーフロー検証
- ✅ **エラーケース対応**: エッジケース・エラーケース網羅的カバレッジ

### 音声ボタンデザイン完全リニューアル

#### **v0モック準拠デザイン**
- ✅ **カラーシステム**: 白いボタンからminaseオレンジグラデーションに変更
- ✅ **レイアウト**: ブロック要素からインライン flex に変更
- ✅ **可変幅**: コンテンツ長に応じてボタン幅が動的変更
- ✅ **二分割構造**: 再生ボタン部分 + 情報ボタン部分のセパレート設計

#### **しぐれういボタン風配置**
- ✅ **flex-wrap レイアウト**: カルーセルから自然な折り返し配置に変更
- ✅ **統一実装**: トップページ・ボタン検索ページ両方に適用
- ✅ **レスポンシブ対応**: gap-3 による適切な間隔調整

### トップページデザイン改善

#### **v0モック準拠の配色**
- ✅ **セクション順序変更**: 音声ボタン → 動画 → 作品の順に配置
- ✅ **背景色のブランド化**: suzukaカラーによる暖かみのある配色
  - ヒーローセクション: bg-suzuka-50
  - セクション背景: bg-suzuka-100 と標準背景の交互配置
- ✅ **フッターデザイン**: minase-800 による濃いブラウン系背景

### 管理者機能の完全実装

#### **全管理機能の実装完了**
- ✅ **ユーザー管理**: 編集ダイアログによるロール・状態管理
- ✅ **お問い合わせ管理**: 詳細表示・ステータス・優先度・メモ機能
- ✅ **音声ボタン・動画・作品管理**: 編集・削除機能の実装
- ✅ **トースト通知**: Sonnerによる操作フィードバック
- ✅ **リアルタイム更新**: 編集後の即時反映

#### **技術実装詳細**
- ✅ **Tailwind CSS v4対応**: @layer utilities によるカスタムカラー実装
- ✅ **primary/secondary更新**: suzuka-500/minase-500 をテーマカラーに設定
- ✅ **型安全性**: 全変更でTypeScript strict mode維持
- ✅ **テスト完全対応**: 660+件のテストスイート（管理者機能含む）
- ✅ **デバッグログ削除**: トップページの不要なログ出力を削除

## 📚 ドキュメント

### 開発者向け

- `docs/DEVELOPMENT.md` - 包括的開発ガイド
- `docs/QUICK-REFERENCE.md` - コマンドリファレンス
- `docs/FIRESTORE_STRUCTURE.md` - データベース構造

### 運用・デプロイ

- `docs/DEPLOYMENT_STRATEGY.md` - デプロイ戦略
- `docs/WEB_DEPLOYMENT.md` - Web App デプロイ手順
- `docs/INFRASTRUCTURE_ARCHITECTURE.md` - 包括的インフラ構築・運用ガイド

### プロジェクト管理

- `docs/README.md` - 詳細プロジェクト仕様
- `docs/CHANGELOG.md` - 変更履歴
- `docs/TODO.md` - 開発ロードマップ

## 🚨 重要コマンド

### 品質管理

```bash
# 包括的品質チェック（コミット前推奨）
pnpm check        # 全パッケージ: Lint + フォーマット + 型チェック

# 個別品質チェック
pnpm lint         # 全パッケージ: Biome lint (Admin: 3警告許容・他0エラー達成済み)
pnpm typecheck    # 全パッケージ: TypeScript型チェック
pnpm test         # 全パッケージ: 単体テスト実行

# 依存関係管理
pnpm update && pnpm audit --fix  # 安全な依存関係更新
```


## 📊 品質メトリクス（2025年6月現在）

- **Lint状態**: 全パッケージ 0エラー・5警告（全て許容範囲）✅
- **依存関係**: 最新バージョン（React 19、Next.js 15等）✅  
- **テストカバレッジ**: 677+件のテストスイート（高度フィルタリング17件追加）✅
- **型安全性**: TypeScript strict mode + Zod schema 検証 ✅
- **ドキュメント整合性**: 実装とドキュメントの98%一致 ✅
- **デザインシステム**: suzuka/minase ブランドカラー統合 ✅
- **管理者機能**: 包括的ダッシュボード + セキュリティログ ✅
- **API Routes**: 認証・統合検索・コンテンツ・監視の完全実装 ✅

### アーキテクチャ品質

- **Next.js 15**: App Router + Server Actions 完全対応 ✅
- **コンポーネント設計**: UI Package 51個 + Custom 9個 + Web App 25+個 ✅
- **TypeScript設定**: 共有設定パッケージによる一貫性 ✅
- **セキュリティ**: Discord OAuth + ロールベース + アクセスログ ✅
- **パフォーマンス**: LCP最適化 + 画像最適化 + バンドル分割 ✅

### 最新変更内容 (2025年7月1日)

#### **高度検索フィルタリング実装完了**
- **包括的フィルターシステム**: 15+パラメータによる詳細検索機能実装
- **新ファイル追加**: search-filters.ts型定義・SearchFilters.tsx UIコンポーネント・17件テスト
- **コード品質向上**: 複雑度削減・ヘルパー関数抽出・Lint完全パス
- **型安全性強化**: Zodスキーマによる完全なフィルター検証システム

#### **以前の変更 (2025年6月30日)**
- **未使用コード削除**: @apps/以下の18個のファイル・ディレクトリを削除
- **Admin app テスト強化**: 60+件のユニットテスト追加（データヘルパー・バリデーション）
- **二段階型チェック**: 本番コード（厳格）・テストコード（緩和）の分離設計
- **品質管理**: Lint 0エラー・TypeScript完全パス・677+件テストスイート達成

#### **以前の実装 (2025年6月29日)**
- **管理者機能完全実装**: ユーザー・お問い合わせ管理の編集機能追加
- **UI/UX改善**: v0モック準拠のトップページデザイン
- **背景色統一**: suzuka/minaseカラーによるブランディング強化

このプロジェクトは、型安全なフルスタック開発を重視したファンコミュニティプラットフォームです。
データ収集インフラとユーザー作成コンテンツ機能を組み合わせ、高品質な開発体験を提供します。
