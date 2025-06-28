# suzumina.click プロジェクト概要

声優「涼花みなせ」のファンサイト - ユーザーが作成する音声ボタンの共有とDLsite作品情報を表示

## 🎯 プロジェクト概要

suzumina.clickは、声優「涼花みなせ」ファンコミュニティのためのWebプラットフォームです。YouTube動画の音声参照機能、DLsite作品情報閲覧、お気に入りシステム、そして包括的な管理者機能を提供します。

### 🚀 現在のステータス

**本番稼働中の完成システム (v0.2.2)**

- **Webアプリケーション**: Next.js 15 + TypeScript + Tailwind CSS v4
- **認証システム**: Discord OAuth + ギルドメンバーシップ確認
- **データ収集**: YouTube Data API + DLsite スクレイピング (自動実行)
- **音声システム**: YouTube動画タイムスタンプ参照システム + v0モック準拠デザイン
- **お気に入りシステム**: 音声ボタンのお気に入り登録・管理機能
- **管理者機能**: ユーザー・コンテンツ管理インターフェース
- **インフラ**: Terraform + Google Cloud Platform (本番稼働)
- **品質保証**: 400+件のテストスイート + E2Eテスト
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
suzumina.click/ (v0.2.2)
├── apps/
│   ├── functions/          # Cloud Functions (本番稼働)
│   │   ├── src/dlsite.ts   # DLsite作品収集
│   │   └── src/youtube.ts  # YouTube動画収集
│   └── web/                # Next.js Webアプリ
│       ├── src/app/        # App Router
│       │   ├── admin/      # 管理者インターフェース
│       │   ├── buttons/    # 音声機能
│       │   ├── favorites/  # お気に入り機能
│       │   ├── videos/     # 動画一覧
│       │   └── works/      # 作品一覧
│       ├── src/components/ # UIコンポーネント
│       │   └── FavoriteButton.tsx # お気に入りボタン
│       ├── src/actions/    # Server Actions
│       │   └── favorites.ts # お気に入り関連
│       ├── src/lib/        # ライブラリ・ユーティリティ
│       │   └── favorites-firestore.ts # お気に入りFirestore操作
│       └── e2e/            # E2Eテスト
├── packages/
│   ├── shared-types/       # 共有型定義 (Zodスキーマ)
│   │   └── src/favorite.ts # お気に入り型定義
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

- **videos**: YouTube動画データ (`FirestoreYouTubeVideoData`)
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

### ユーザー認証・管理者機能

```text
Discord OAuth → NextAuth.js → ギルドメンバーシップ確認 → ロール判定 → セッション確立
                                                      ↓
                                      環境変数DEFAULT_ADMIN_DISCORD_IDS → 管理者権限付与
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
- 環境変数による管理者権限設定
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
✅ ロジックテスト → Unit Tests (Vitest) 
✅ 統合テスト    → E2E Tests (Playwright)
✅ 型安全性     → TypeScript strict
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
✅ 工数対効果を重視した段階的品質管理
```

## 🎯 今後の改善予定

1. **レスポンシブUI強化**: モバイル・タブレット対応
2. **検索・フィルター強化**: 全コンテンツ横断検索
3. **音声機能拡張**: プレイリスト・一括管理
4. **パフォーマンス最適化**: キャッシュ・配信戦略
5. **お気に入り機能拡張**: カテゴリ分類・共有機能

## 🆕 最新実装内容 (2025年6月)

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

#### **技術実装詳細**
- ✅ **Tailwind CSS v4対応**: @layer utilities によるカスタムカラー実装
- ✅ **primary/secondary更新**: suzuka-500/minase-500 をテーマカラーに設定
- ✅ **型安全性**: 全変更でTypeScript strict mode維持
- ✅ **テスト完全対応**: aria-label変更に伴うテスト更新完了

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

### 品質管理

```bash
# 包括的品質チェック（コミット前推奨）
pnpm check        # 全パッケージ: Lint + フォーマット + 型チェック

# 個別品質チェック
pnpm lint         # 全パッケージ: Biome lint (0エラー・0警告達成済み)
pnpm typecheck    # 全パッケージ: TypeScript型チェック
pnpm test         # 全パッケージ: 単体テスト実行

# 依存関係管理
pnpm update && pnpm audit --fix  # 安全な依存関係更新
```


## 📊 品質メトリクス（2025年6月現在）

- **Lint状態**: 全パッケージ 0エラー・0警告 ✅
- **依存関係**: 最新バージョン（React 19等）✅  
- **テストカバレッジ**: 207件のテストスイート (8件スキップ) ✅
- **型安全性**: TypeScript strict mode ✅
- **新機能**: お気に入りシステム完全実装 ✅
- **デザインシステム**: minaseカラーシステム + インライン音声ボタン ✅
- **レイアウト**: しぐれういボタン風 flex-wrap 配置システム ✅

### 最新コミット情報

- **ff250d4**: minase色システム + 音声ボタンUI更新
- **5d50ded**: v0モック準拠インライン flex レイアウト変換

このプロジェクトは、型安全なフルスタック開発を重視したファンコミュニティプラットフォームです。
データ収集インフラとユーザー作成コンテンツ機能を組み合わせ、高品質な開発体験を提供します。
