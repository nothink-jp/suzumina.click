# suzumina.click

[![Build Status](https://github.com/your-org/suzumina.click/workflows/CI/badge.svg)](https://github.com/your-org/suzumina.click/actions)
[![Test Coverage](https://img.shields.io/badge/coverage-80%2B%25-green)](https://github.com/your-org/suzumina.click)
[![Security](https://img.shields.io/badge/security-0%20vulnerabilities-green)](https://github.com/your-org/suzumina.click)
[![Version](https://img.shields.io/badge/version-v0.3.0-blue)](https://github.com/your-org/suzumina.click/releases)

声優「涼花みなせ」ファンサイト - Discord認証ベースの音声ボタン共有プラットフォーム

🌐 **[suzumina.click で体験する](https://suzumina.click)**

## 🌟 プロジェクト概要

**suzumina.click**は、「すずみなふぁみりー」Discordサーバーメンバー専用のファンサイトです。YouTube動画のタイムスタンプベース音声参照機能とDLsite作品情報を提供する、現代的で型安全なWebアプリケーションです。

### ✨ 主要機能

- 🔐 **Discord Guild認証** - 特定サーバーメンバーのみアクセス可能
- 🎵 **音声ボタンシステム** - YouTube動画タイムスタンプベースの音声参照・共有
- ❤️ **お気に入りシステム** - 音声ボタンのお気に入り登録・管理
- 👑 **管理者インターフェース** - ユーザー・コンテンツ管理の包括的Admin UI
- 📊 **自動データ収集** - YouTube動画・DLsite作品の自動取得・更新
- 🛡️ **セキュリティ** - Firestore ルール・JWT認証・最小権限の原則

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

## 📊 プロジェクト状況

### ✅ 実装完了機能
- Discord Guild認証システム
- 音声ボタン作成・共有・お気に入り機能
- 管理者ダッシュボード・ユーザー管理
- 自動データ収集（YouTube・DLsite）
- 400+件のテストスイート
- Playwright E2Eテスト

### 📈 品質メトリクス
- **Lint状態**: 0エラー・0警告 ✅
- **テストカバレッジ**: 400+件のテストスイート ✅
- **セキュリティ**: 脆弱性0件 ✅
- **TypeScript**: strict mode + Zod schema検証 ✅

## 🎯 次に何をしますか？

| やりたいこと | ドキュメント |
|-------------|-------------|
| **🚀 開発を始める** | [開発ガイド](docs/DEVELOPMENT.md) → [コマンド集](docs/QUICK_REFERENCE.md) |
| **🏗️ アーキテクチャを理解** | [詳細仕様](docs/README.md) → [インフラ構成](docs/INFRASTRUCTURE_ARCHITECTURE.md) |
| **⚙️ インフラを管理** | [デプロイ戦略](docs/DEPLOYMENT_STRATEGY.md) → [Terraform](terraform/README.md) |
| **🧪 テストを実行** | [Admin Testing](apps/admin/README-TESTING.md) → E2E Guide |

## 📚 詳細ドキュメント

📖 **包括的な技術仕様**: [docs/README.md](docs/README.md)  
📋 **変更履歴**: [CHANGELOG.md](docs/CHANGELOG.md) | **開発計画**: [TODO.md](docs/TODO.md)

## 🤝 開発参加

```bash
# 必須チェック（コミット前）
pnpm check && pnpm test

# UI開発
cd packages/ui && pnpm storybook
```

**参加手順**: Discord「すずみなふぁみりー」参加 → [開発ガイド](docs/DEVELOPMENT.md)確認 → Issue/PR作成

## 🔗 リンク

- **本番サイト**: [suzumina.click](https://suzumina.click)
- **Discord**: すずみなふぁみりー（Guild ID: 959095494456537158）
- **ドキュメント**: [包括的ドキュメント](docs/)
- **変更履歴**: [CHANGELOG](docs/CHANGELOG.md)

---

**開発者**: suzumina.click 開発チーム  
**ライセンス**: MIT  
**バージョン**: v0.3.0（UI/UX改善・デザイン統一性向上）