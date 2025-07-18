# suzumina.click - 技術ドキュメント

声優「涼花みなせ」ファンサイト（v0.3.4）

## 概要

「すずみなふぁみりー」Discordメンバー専用のファンサイト。YouTube動画の音声ボタン共有とDLsite作品情報を提供します。

## 主要機能

- **Discord認証**: NextAuth + Guild確認
- **音声ボタン**: YouTube動画タイムスタンプ参照システム
- **お気に入り**: 音声ボタンの登録・管理
- **検索機能**: 全コンテンツ横断検索・高度フィルタ
- **DLsite連携**: 作品情報・高解像度画像対応
- **管理機能**: ユーザー・コンテンツ管理UI
- **収益化**: Google AdSense統合・packages/ui統合（v0.3.4）

## 技術スタック

- **Frontend**: Next.js 15 + React + TypeScript + Tailwind CSS v4
- **Backend**: Cloud Functions + Firestore
- **Auth**: NextAuth.js + Discord OAuth
- **Infrastructure**: Terraform + Google Cloud Platform

## データベース

### Firestore コレクション

- `users` - Discord認証ユーザー情報・権限管理
- `audioButtons` - 音声ボタンメタデータ
- `users/{userId}/favorites` - お気に入り音声ボタン
- `videos` - YouTube動画情報
- `dlsiteWorks` - DLsite作品情報

詳細: [Firestore構造](./FIRESTORE_STRUCTURE.md)

## 開発ガイド

### 基本セットアップ

```bash
git clone <repository-url>
cd suzumina.click
pnpm install
pnpm --filter @suzumina.click/web dev
```

### 品質管理

```bash
pnpm check && pnpm test && pnpm build
pnpm test:coverage
pnpm test:e2e
```

## ドキュメント

- **開発ガイド**: [DEVELOPMENT.md](./DEVELOPMENT.md)
- **データベース**: [FIRESTORE_STRUCTURE.md](./FIRESTORE_STRUCTURE.md)
- **デプロイ**: [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md)
- **Git運用**: [GIT_WORKFLOW.md](./GIT_WORKFLOW.md)
- **変更履歴**: [CHANGELOG.md](./CHANGELOG.md)

## プロジェクト構造

```
suzumina.click/
├── apps/
│   ├── web/                    # Next.js 15 フロントエンド
│   └── functions/              # Cloud Functions バックエンド
├── packages/
│   ├── shared-types/           # 共有型定義
│   ├── ui/                     # UIコンポーネント（v0.3.3統合）
│   └── typescript-config/      # TypeScript設定
```

## ライセンス

MIT License - 個人運営の非公式ファンサイト（v0.3.4）