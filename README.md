# suzumina.click

[![Build Status](https://github.com/your-org/suzumina.click/workflows/CI/badge.svg)](https://github.com/your-org/suzumina.click/actions)
[![Test Coverage](https://img.shields.io/badge/coverage-80%2B%25-green)](https://github.com/your-org/suzumina.click)
[![Security](https://img.shields.io/badge/security-0%20vulnerabilities-green)](https://github.com/your-org/suzumina.click)
[![Version](https://img.shields.io/badge/version-v0.3.0-blue)](https://github.com/your-org/suzumina.click/releases)

声優「涼花みなせ」ファンコミュニティの非公式ファンサイト - YouTube動画参照システム・DLsite作品情報プラットフォーム

🌐 **[suzumina.click で体験する](https://suzumina.click)**

## 🌟 プロジェクト概要

**suzumina.click**は、「すずみなふぁみりー」Discordサーバーメンバー専用の非公式ファンコミュニティサイトです。YouTube動画の特定場面を参照・再生できるボタンシステムとDLsite作品情報の参照・表示機能を提供する、現代的で型安全なWebアプリケーションです。

> **重要**: 本サイトは個人が趣味で運営する非公式ファンサイトです。涼花みなせさんや関係者様とは一切関係ありません。

### ✨ 主要機能

- 🔐 **Discord Guild認証** - 特定サーバーメンバーのみアクセス可能
- 🎵 **YouTube再生ボタンシステム** - YouTube動画の特定場面を参照・再生（YouTube埋め込みプレイヤー使用）
- ❤️ **お気に入りシステム** - 音声ボタンのお気に入り登録・管理
- 🛒 **DLsite作品情報参照** - 涼花みなせさんの音声作品情報を参照・表示（DLsite公式サイトにリンク）
- 🔍 **統合検索システム** - 全コンテンツ横断検索・高度フィルタリング・URL状態管理
- 👑 **管理者インターフェース** - ユーザー・コンテンツ管理の包括的Admin UI
- 📊 **自動データ収集** - YouTube動画・DLsite作品情報の自動取得・更新
- 🛡️ **セキュリティ** - Firestore ルール・JWT認証・最小権限の原則

### 🔒 コンテンツ利用方針

- **YouTube動画**: 埋め込みプレイヤーによる参照・再生のみ（音声ファイルの保存・ダウンロードは一切行いません）
- **DLsite作品情報**: 公開情報の参照・表示のみ（音声・画像データの複製・転載・再配布は一切行いません）
- **著作権**: すべての音声・画像の著作権は原著作者に帰属します

### 🛠️ 技術スタック

- **Frontend**: Next.js 15 (App Router) + React 19 + TypeScript 5.8 + Tailwind CSS v4
- **Backend**: Google Cloud Functions v2 + Firestore + Secret Manager  
- **Authentication**: NextAuth.js + Discord OAuth + Guild認証
- **Infrastructure**: Terraform + Google Cloud Platform + GitHub Actions
- **Development**: pnpm Workspace + Biome + Vitest + Storybook + Playwright

## ⚡ 3分でクイックスタート

```bash
# 1. セットアップ
git clone https://github.com/your-org/suzumina.click.git && cd suzumina.click
pnpm install && pnpm --filter @suzumina.click/shared-types build

# 2. 認証設定
gcloud auth application-default login

# 3. 開発開始
cd apps/web && pnpm dev
```

💡 **詳細な環境設定**: [開発ガイド](docs/DEVELOPMENT.md) | **即座参照**: [コマンドリスト](docs/QUICK_REFERENCE.md)

## 📊 プロジェクト状況（2025年7月更新）

### ✅ 実装完了機能
- Discord Guild認証システム（本番稼働）
- YouTube再生ボタン作成・共有・お気に入り機能（本番稼働）
- 統合検索システム（全コンテンツ横断検索・高度フィルタリング）
- 管理者ダッシュボード・ユーザー管理（専用アプリ分離）
- 自動データ収集（YouTube・DLsite）Cloud Functions v2
- DLsite作品詳細情報表示強化（高解像度画像対応）
- Server Actions最適化（Fire-and-Forget パターン）

### 📈 品質メトリクス（2025年7月現在）
- **Lint状態**: 全パッケージ 0エラー・0警告 ✅
- **テストカバレッジ**: 703+件のテストスイート ✅
- **セキュリティ**: 脆弱性0件 ✅  
- **TypeScript**: strict mode + Zod schema検証 ✅
- **SEO・OGP**: 包括的最適化実装済み ✅
- **DLsite誤認防止**: ライティング完全対応済み ✅

### 🚀 最新実装内容（v0.3.0）
- **データ構造最適化**: OptimizedFirestoreDLsiteWorkData統合実装
- **Cloud Functions エンタープライズ構造**: 責任分離アーキテクチャ（42ファイル移行完了）
- **SEO・OGP完全対応**: 動的metadata・Twitter Card・Open Graph実装
- **DLsite誤認防止ライティング**: 「切り抜き」→「参照・再生」等の表現統一

## 🎯 次に何をしますか？

| やりたいこと | ドキュメント |
|-------------|-------------|
| **🚀 開発を始める** | [開発ガイド](docs/DEVELOPMENT.md) → [コマンド集](docs/QUICK_REFERENCE.md) |
| **🏗️ アーキテクチャを理解** | [詳細仕様](docs/README.md) → [インフラ構成](docs/INFRASTRUCTURE_ARCHITECTURE.md) |
| **⚙️ デプロイ・運用** | [デプロイガイド](docs/DEPLOYMENT_GUIDE.md) → [Terraform](terraform/README.md) |
| **🔧 Git運用** | [Git ワークフロー](docs/GIT_WORKFLOW.md) → Session Branch戦略 |
| **🧪 テスト実行** | [Admin Testing](apps/admin/README.md#テスト) → E2E Guide |
| **📊 データ構造** | [Firestore構造](docs/FIRESTORE_STRUCTURE.md) → 統合データ型 |

## 📚 詳細ドキュメント

📖 **包括的な技術仕様**: [docs/README.md](docs/README.md)  
📋 **変更履歴**: [CHANGELOG.md](docs/CHANGELOG.md) | **開発計画**: [TODO.md](docs/TODO.md)

## 🤝 開発参加

```bash
# 必須チェック（コミット前）
pnpm check && pnpm test

# UI開発
cd packages/ui && pnpm storybook

# 品質管理
pnpm build && pnpm test:coverage
```

**参加手順**: Discord「すずみなふぁみりー」参加 → [開発ガイド](docs/DEVELOPMENT.md)確認 → Issue/PR作成

## 🔗 リンク

- **本番サイト**: [suzumina.click](https://suzumina.click)
- **管理者サイト**: [admin.suzumina.click](https://admin.suzumina.click)（管理者専用）
- **Discord**: すずみなふぁみりー（Guild ID: 959095494456537158）
- **ドキュメント**: [包括的ドキュメント](docs/)
- **変更履歴**: [CHANGELOG](docs/CHANGELOG.md)

## 📝 ライセンス・免責事項

**開発者**: suzumina.click 開発チーム  
**ライセンス**: MIT  
**バージョン**: v0.3.0（データ構造最適化・SEO対応・DLsite誤認防止完了）

### 免責事項
- 本サイトは個人が趣味で運営する非公式ファンサイトです
- 涼花みなせさんや関係者様とは一切関係ありません
- すべての音声・画像の著作権は原著作者に帰属します
- 音声・画像データの複製・転載・再配布は一切行いません

---

**💡 Tip**: 開発時は [Session Branch戦略](docs/GIT_WORKFLOW.md) で `git claude-start` → 開発 → `git claude-done` の流れをご活用ください