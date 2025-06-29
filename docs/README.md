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
- **包括的テスト**: 400+件のテストスイートによる品質保証
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
- **`dlsiteWorks`**: DLsite作品情報 (自動収集)

### 認証・権限システム

- **Guild確認**: 「すずみなふぁみりー」Discord サーバーメンバーのみアクセス可
- **ロールベース制御**: member/moderator/admin による機能制限
- **JWT セッション**: NextAuth.js によるステートレス認証

## 🚀 開発・デプロイメント

### クイックスタート

```bash
# リポジトリクローン・依存関係インストール
git clone https://github.com/your-org/suzumina.click.git
cd suzumina.click && pnpm install

# 共有型ビルド (必須)
pnpm --filter @suzumina.click/shared-types build

# 開発サーバー起動
cd apps/web && pnpm dev

# E2Eテスト実行
cd apps/web && pnpm test:e2e
```

### 認証設定

1. **Discord OAuth アプリ作成** ([Discord Developer Portal](https://discord.com/developers/applications))
2. **環境変数設定**:
   ```bash
   DISCORD_CLIENT_ID="your-client-id"
   DISCORD_CLIENT_SECRET="your-client-secret"
   NEXTAUTH_SECRET="generated-secret"
   NEXTAUTH_URL="https://suzumina.click"
   ```
3. **Terraform デプロイ** (`terraform/AUTH_DEPLOYMENT_GUIDE.md` 参照)

### テスト・品質管理

```bash
pnpm test              # 全テスト実行 (400+件)
pnpm test:coverage     # カバレッジ付きテスト
pnpm test:e2e          # E2Eテスト実行 (Playwright)
pnpm check             # Lint + Format (Biome)
pnpm build             # 全パッケージビルド
```

## 📁 プロジェクト構造

```
suzumina.click/
├── apps/
│   ├── web/                    # Next.js Webアプリ (認証+管理機能)
│   │   ├── src/auth.ts         # NextAuth + Discord認証設定
│   │   ├── src/app/auth/       # 認証関連ページ
│   │   ├── src/app/admin/      # 管理者インターフェース
│   │   ├── src/app/buttons/    # 音声ボタン機能
│   │   ├── src/app/favorites/  # お気に入り機能
│   │   ├── src/components/     # UIコンポーネント (認証・音声・お気に入り・管理)
│   │   ├── src/actions/        # Server Actions (お気に入り操作等)
│   │   ├── src/lib/favorites-firestore.ts # お気に入りFirestore操作
│   │   ├── src/lib/user-firestore.ts # ユーザー管理
│   │   ├── e2e/                # E2Eテスト (Playwright)
│   │   └── playwright.config.ts # E2E設定
│   └── functions/              # Cloud Functions (データ収集)
├── packages/
│   ├── shared-types/           # 共有型定義 (ユーザー・音声・YouTube・DLsite)
│   │   ├── src/audio-button.ts # 音声ボタン型定義
│   │   └── src/favorite.ts     # お気に入り型定義
│   └── ui/                     # 共有UIコンポーネント
├── terraform/                  # インフラ定義 (認証機能含む)
│   └── AUTH_DEPLOYMENT_GUIDE.md # Discord認証デプロイガイド
└── docs/                       # 統合ドキュメント
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
- DLsite作品表示機能の強化
- 高度な検索・フィルタリング機能
- モバイル対応・レスポンシブUI強化

### Phase 6: コミュニティ機能 (計画中)
- ユーザープロファイル・統計機能
- コメント・評価システム
- プレイリスト機能
- 音声ファイルアップロード機能

## 📚 詳細ドキュメント

- **[FIRESTORE_STRUCTURE.md](./FIRESTORE_STRUCTURE.md)** - データベース詳細構造
- **[POLICY.md](./POLICY.md)** - 開発ポリシー・コーディング規約
- **[TODO.md](./TODO.md)** - 開発ロードマップ・タスク管理
- **[CHANGELOG.md](./CHANGELOG.md)** - バージョン履歴
- **[terraform/AUTH_DEPLOYMENT_GUIDE.md](../terraform/AUTH_DEPLOYMENT_GUIDE.md)** - Discord認証デプロイガイド

## 🤝 コントリビューション

1. Discord「すずみなふぁみりー」サーバーへの参加
2. 開発ポリシー ([POLICY.md](./POLICY.md)) の確認
3. `pnpm check` によるコード品質確認
4. 包括的テストの実行・追加

---

**作成者**: suzumina.click 開発チーム  
**最終更新**: 2025年6月28日  
**バージョン**: v0.2.2 (お気に入りシステム + 音声ボタンデザイン刷新 + Storybook一本化)