# suzumina.click

[![Version](https://img.shields.io/badge/version-v0.3.4-blue)](https://suzumina.click)
[![Status](https://img.shields.io/badge/status-production-green)](https://suzumina.click)

声優「涼花みなせ」ファンコミュニティの非公式ファンサイト

🌐 **[suzumina.click](https://suzumina.click)**

## 概要

Discord「すずみなふぁみりー」メンバー専用のファンコミュニティサイトです。YouTube動画の音声ボタン作成・共有とDLsite作品情報の閲覧機能を提供します。

> 本サイトは個人運営の非公式ファンサイトです。涼花みなせさんや関係者様とは一切関係ありません。

## 主要機能

- **Discord認証** - 「すずみなふぁみりー」メンバーのみアクセス可能
- **音声ボタンシステム** - YouTube動画の特定箇所を参照・再生
- **お気に入り機能** - 音声ボタンのお気に入り登録・管理
- **DLsite作品情報** - 涼花みなせさんの音声作品情報表示
- **統合検索** - 全コンテンツの横断検索・フィルタリング
- **管理機能** - ユーザー・コンテンツ管理（管理者用）

## 技術スタック

- **Frontend**: Next.js 15 + TypeScript + Tailwind CSS v4
- **Backend**: Cloud Functions + Firestore
- **Auth**: NextAuth.js + Discord OAuth
- **Infrastructure**: Terraform + Google Cloud Platform

## 開発環境セットアップ

```bash
# リポジトリクローン
git clone <repository-url> && cd suzumina.click

# 依存関係インストール
pnpm install

# 開発サーバー起動
pnpm --filter @suzumina.click/web dev
```

## 開発コマンド

```bash
# テスト実行
pnpm test

# Lint・型チェック
pnpm lint && pnpm typecheck

# ビルド
pnpm build
```

## ドキュメント

- **開発ガイド**: [docs/DEVELOPMENT.md](docs/DEVELOPMENT.md)
- **技術仕様**: [CLAUDE.md](CLAUDE.md)
- **データベース**: [docs/FIRESTORE_STRUCTURE.md](docs/FIRESTORE_STRUCTURE.md)

## ライセンス

MIT License - 個人運営の非公式ファンサイト（v0.3.4）
