# suzumina.click - 総合ドキュメント

声優「涼花みなせ」ファンサイト - Discord認証ベースの音声ボタン共有プラットフォーム

## 🎯 プロジェクト概要

suzumina.clickは、「すずみなふぁみりー」Discordサーバーメンバー専用のファンサイトです。YouTube動画のタイムスタンプベース音声参照機能とDLsite作品情報を提供する、型安全でモダンなWebアプリケーションです。

### ✅ 実装完了機能

- **Discord Guild認証システム**: NextAuth + Discord OAuth + ギルドメンバーシップ確認
- **ユーザー管理**: Firestore基盤のプロファイル・ロール管理 (member/moderator/admin)
- **管理者インターフェース**: ユーザー管理・動画管理・作品管理の包括的Admin UI
- **音声ボタンシステム**: YouTube動画タイムスタンプベースの音声ボタン作成・共有（オレンジグラデーションデザイン）
- **お気に入りシステム**: 音声ボタンのお気に入り登録・管理機能
- **データ収集**: YouTube動画・DLsite作品の自動取得・更新システム
- **統合検索システム**: 全コンテンツ横断検索・高度フィルタリング・15+パラメータ検索・タブ型結果表示
- **DLsite作品詳細表示**: トラック・ファイル・クリエイター・特典情報の包括的表示
- **高解像度画像対応**: DLsite詳細ページからの高品質画像取得・表示
- **包括的テスト**: 703+件のテストスイートによる品質保証
- **E2Eテスト**: Playwright による多ブラウザ対応のエンドツーエンドテスト

## 🏗️ アーキテクチャ概要

```
Discord OAuth → NextAuth.js → Next.js App (Cloud Run)
     ↓              ↓              ↓
Guild確認        JWT Session    Server Actions + Admin UI
     ↓              ↓              ↓
Firestore Users → Session管理 → データ操作 + 管理機能
                                  ↓              ↓
Cloud Functions (定期実行) → Firestore (videos/works/audioButtons)
     ↓                            ↓
YouTube/DLsite APIs         フロントエンド表示 + 管理画面
```

## 🛠️ 技術スタック

### フロントエンド
- **Next.js 15.3.4** (App Router) + **React 19.1.0** + **TypeScript 5.8.3**
- **Tailwind CSS v4** + **Radix UI** (shadcn/ui) + **Storybook** (UI Package一本化)

### 認証・バックエンド
- **NextAuth.js** (Discord OAuth + Guild認証 + 管理者権限)
- **Google Cloud Firestore** (ユーザー管理 + データストレージ + 音声ボタン)
- **Google Cloud Functions v2** (データ収集 + Node.js 22)
- **Google Secret Manager** (認証情報管理)

### インフラ・DevOps
- **Terraform** (Infrastructure as Code)
- **GitHub Actions** (CI/CD + Workload Identity)
- **Cloud Run** (コンテナデプロイ)
- **pnpm 10** (Workspace・Monorepo)
- **Playwright** (E2Eテスト + 多ブラウザ対応)
- **Biome** (リンター・フォーマッター)
- **Vitest** (単体テスト + カバレッジ)

## 📊 データ構造

### コレクション構成

- **`users`**: Discord認証ユーザー情報・権限管理 (member/moderator/admin)
- **`audioButtons`**: 音声ボタンメタデータ (YouTube タイムスタンプ + 作成者情報の統合システム)
- **`users/{userId}/favorites`**: ユーザーごとのお気に入り音声ボタン (サブコレクション)
- **`videos`**: YouTube動画情報 (自動収集)
- **`dlsiteWorks`**: DLsite作品情報 (自動収集・トラック/ファイル/クリエイター/特典データ含む)

### 認証・権限システム

- **Guild確認**: 「すずみなふぁみりー」Discord サーバーメンバーのみアクセス可
- **ロールベース制御**: member/moderator/admin による機能制限
- **JWT セッション**: NextAuth.js によるステートレス認証

## 🚀 開発・デプロイメント

### 開発環境詳細

**基本セットアップ**: [メインREADME](../README.md#⚡-3分でクイックスタート)を参照

**Discord OAuth詳細設定**:
1. [Discord Developer Portal](https://discord.com/developers/applications)でアプリケーション作成
2. **Redirect URIs設定**:
   ```
   # 開発環境
   http://localhost:3000/api/auth/callback/discord
   # 本番環境
   https://suzumina.click/api/auth/callback/discord
   ```
3. **Guild ID**: `959095494456537158` (すずみなふぁみりー)
4. **詳細なTerraformデプロイ**: [インフラアーキテクチャ](./INFRASTRUCTURE_ARCHITECTURE.md)参照

**包括的品質管理**:
```bash
# 開発ワークフロー
pnpm check && pnpm test && pnpm build    # 品質ゲート
pnpm test:coverage                        # カバレッジ分析
pnpm test:e2e                            # エンドツーエンドテスト

# パッケージ別テスト
cd apps/admin && pnpm test               # Admin機能テスト (47件)
cd packages/ui && pnpm test             # UIコンポーネントテスト
```

## 📁 詳細プロジェクト構造

**概要**: [メインREADME](../README.md)で基本構造を確認

### アプリケーション層詳細

```
apps/
├── web/                        # Next.js 15 メインWebアプリ
│   ├── src/auth.ts             # NextAuth.js + Discord OAuth設定
│   ├── src/app/
│   │   ├── auth/               # 認証関連ページ (login/callback/error)
│   │   ├── buttons/            # 音声ボタン機能 (作成・一覧・詳細)
│   │   ├── favorites/          # お気に入りシステム
│   │   ├── users/              # ユーザープロフィール
│   │   ├── about/privacy/terms/ # 静的ページ
│   │   └── api/                # API Routes (auth/buttons/contact/health)
│   ├── src/components/         # 25+ UIコンポーネント
│   │   ├── AudioButtonCreator.tsx   # 音声ボタン作成UI
│   │   ├── FavoriteButton.tsx       # お気に入り機能
│   │   ├── SiteHeader.tsx          # サイトヘッダー・ナビゲーション
│   │   └── UserMenu.tsx            # ユーザーメニュー・認証
│   ├── src/actions/            # Server Actions
│   │   └── favorites.ts        # お気に入り登録・削除
│   ├── src/lib/                # ライブラリ・ユーティリティ
│   │   ├── favorites-firestore.ts  # お気に入りFirestore操作
│   │   ├── audio-buttons-firestore.ts # 音声ボタンCRUD
│   │   ├── user-firestore.ts       # ユーザー管理
│   │   └── security-logger.ts      # セキュリティログ
│   └── e2e/                    # Playwright E2Eテスト
├── admin/                      # 管理者専用アプリ (0インスタンス運用)
│   ├── src/app/page.tsx        # 管理者ダッシュボード
│   ├── src/components/         # 管理者UI (ユーザー・コンテンツ管理)
│   ├── src/lib/auth-client.ts  # Firestore認証クライアント
│   └── src/__tests__/          # 管理者機能テスト (47件)
└── functions/                  # Cloud Functions v2 (Node.js 22)
    ├── src/dlsite.ts          # DLsite作品自動収集
    └── src/youtube.ts         # YouTube動画自動収集
```

### パッケージ層詳細

```
packages/
├── shared-types/               # Zodスキーマ + TypeScript型定義
│   ├── src/user.ts             # ユーザー・認証関連型
│   ├── src/audio-button.ts     # 音声ボタン・YouTube参照型
│   ├── src/favorite.ts         # お気に入りシステム型
│   ├── src/search-filters.ts   # 高度検索フィルタリング型・ユーティリティ
│   ├── src/video.ts            # YouTube動画データ型
│   └── src/dlsite.ts           # DLsite作品データ型
├── ui/                         # 共有UIコンポーネント + Storybook
│   ├── components/ui/          # shadcn/ui (51個)
│   ├── components/custom/      # 独自UI (audio-button等)
│   ├── components/design-tokens/ # デザイントークン
│   └── .storybook/             # UI開発環境
└── typescript-config/          # 共有TypeScript設定
```

## 🔒 セキュリティ

- **Discord Guild認証**: 特定サーバーメンバーのみアクセス許可
- **NextAuth.js**: JWT ベースセッション・CSRF保護
- **権限ベース制御**: ユーザーロールによる機能制限
- **Secret Manager**: 認証情報の安全な管理
- **Server Actions**: サーバーサイドのみでFirestore操作

## 🎯 今後の開発予定

### Phase 5: 運用最適化・機能拡張 (完了)
- ✅ お気に入りシステムの完全実装
- ✅ 音声ボタンのオレンジグラデーションデザイン実装
- ✅ Storybook UI Package一本化
- ✅ 高度な検索・フィルタリング機能 (v0.2.4 - 15+パラメータ検索実装完了)
- ✅ モバイル対応・レスポンシブUI強化
- DLsite作品表示機能の強化

### Phase 6: コミュニティ機能 (計画中)
- ユーザープロファイル・統計機能
- コメント・評価システム
- プレイリスト機能
- 音声ファイルアップロード機能

## 📚 技術ドキュメント

### 🗺️ ドキュメントマップ
```
📋 このREADME (中央ハブ)
├── 🚀 すぐ始める
│   ├── メインREADME (3分スタート)
│   └── QUICK_REFERENCE (コマンド集)
├── 👨‍💻 開発者向け
│   ├── DEVELOPMENT (設計原則・品質基準)
│   ├── FIRESTORE_STRUCTURE (DB設計)
│   └── パッケージREADME (UI/Admin/Terraform)
├── ⚙️ インフラ・運用
│   ├── INFRASTRUCTURE_ARCHITECTURE (全体設計)
│   ├── DEPLOYMENT_STRATEGY (デプロイ戦略)
│   ├── WEB_DEPLOYMENT (運用コマンド)
│   └── GITHUB_ACTIONS_DEPLOYMENT (CI/CD)
└── 📋 プロジェクト管理
    ├── TODO (ロードマップ)
    ├── CHANGELOG (変更履歴)
    └── RELEASE_PROCESS (リリース管理)
```

### データベース・アーキテクチャ
- **[FIRESTORE_STRUCTURE.md](./FIRESTORE_STRUCTURE.md)** - Firestoreスキーマ・インデックス・セキュリティルール
- **[INFRASTRUCTURE_ARCHITECTURE.md](./INFRASTRUCTURE_ARCHITECTURE.md)** - GCPインフラ全体設計・認証設定

### 開発・運用
- **[DEVELOPMENT.md](./DEVELOPMENT.md)** - 設計原則・コーディング規約・品質基準
- **[QUICK_REFERENCE.md](./QUICK_REFERENCE.md)** - コマンド集・即座参照・トラブルシューティング
- **[DEPLOYMENT_STRATEGY.md](./DEPLOYMENT_STRATEGY.md)** - デプロイ戦略・CI/CDパイプライン
- **[RELEASE_PROCESS.md](./RELEASE_PROCESS.md)** - リリース管理・品質ゲート

### プロジェクト管理
- **[TODO.md](./TODO.md)** - 開発ロードマップ・今後の計画・タスク管理
- **[CHANGELOG.md](./CHANGELOG.md)** - 詳細変更履歴・バージョン情報

## 🤝 コントリビューション

1. Discord「すずみなふぁみりー」サーバーへの参加
2. [開発ガイドライン](./DEVELOPMENT.md)の確認
3. `pnpm check` によるコード品質確認
4. 包括的テストの実行・追加

### 🎯 読者別学習パス

#### **新規参加者**
[メインREADME](../README.md) → **このページ** → [DEVELOPMENT.md](./DEVELOPMENT.md)

#### **開発者**
[DEVELOPMENT.md](./DEVELOPMENT.md) → [QUICK_REFERENCE.md](./QUICK_REFERENCE.md) → [FIRESTORE_STRUCTURE.md](./FIRESTORE_STRUCTURE.md)

#### **インフラ・運用**
[INFRASTRUCTURE_ARCHITECTURE.md](./INFRASTRUCTURE_ARCHITECTURE.md) → [DEPLOYMENT_STRATEGY.md](./DEPLOYMENT_STRATEGY.md) → [WEB_DEPLOYMENT.md](./WEB_DEPLOYMENT.md)

---

**作成者**: suzumina.click 開発チーム  
**最終更新**: 2025年7月1日  
**バージョン**: v0.2.4 (高度検索フィルタリング完全実装 + 15+パラメータ検索 + コード品質最適化)