# suzumina.click

[![Version](https://img.shields.io/github/package-json/v/nothink-jp/suzumina.click)](https://suzumina.click)
[![Status](https://img.shields.io/badge/status-production-green)](https://suzumina.click)

声優「涼花みなせ」ファンコミュニティの非公式ファンサイト

🌐 **[suzumina.click](https://suzumina.click)**

## 概要

声優「涼花みなせ」さんのファンコミュニティサイトです。YouTube動画の音声ボタン作成・共有とDLsite作品情報の閲覧機能を提供します。

> 本サイトは個人運営の非公式ファンサイトです。涼花みなせさんや関係者様とは一切関係ありません。

## 主要機能

- **Discord認証** - Discordアカウントでログイン（全ユーザー利用可能）
- **音声ボタンシステム** - YouTube動画の特定箇所を参照・再生
- **お気に入り機能** - 音声ボタンのお気に入り登録・管理
- **DLsite作品情報** - 涼花みなせさんの音声作品情報表示
- **統合検索** - 全コンテンツの横断検索・フィルタリング
- **管理機能** - ユーザー・コンテンツ管理（管理者用）

## 技術スタック

> 正確なバージョンは各パッケージの `package.json` を正とする（このドキュメントに版数を固定しない）。

- **Frontend**: Next.js App Router + TypeScript + Tailwind CSS
- **Backend**: Cloud Functions + Firestore
- **Auth**: NextAuth.js + Discord OAuth
- **Infrastructure**: Terraform + Google Cloud Platform

## 開発環境セットアップ

```bash
# リポジトリクローン
git clone <repository-url> && cd suzumina.click

# 依存関係インストール
pnpm install

# 開発サーバー起動（Firestore Emulator・ADC 不要）
pnpm dev:local
```

## ローカル開発の Firestore（2 系統）

ローカルは Firestore の接続先を用途で使い分けます。どちらかが上位互換ではありません。

### Firestore Emulator（既定 / 推奨）

```bash
pnpm dev:local    # Emulator 起動 + フィクスチャ投入 + web dev をワンショット
```

- **ADC 不要・本番に触れない・オフライン可・無課金**。`@google-cloud/firestore` が
  `FIRESTORE_EMULATOR_HOST` を見て Emulator に自動接続します（gcloud 版 Emulator を使用し、`firebase` コマンドは不要）。
- データは**ハイブリッド方式**：公開系コレクションのサニタイズ済みフィクスチャ
  （`apps/functions/src/tools/firestore-local/fixtures/*.json`、コミット対象）を `pnpm seed` で投入します。
  鮮度更新は `pnpm seed:dump`（本番から再取得。このときだけ ADC を 1 回使用）。
- 個別操作: `pnpm emulator`（Emulator のみ）/ `pnpm seed`（投入のみ）/ `pnpm seed:dump`（本番→フィクスチャ更新）。
- 安全弁: 本番ビルド（`NODE_ENV=production`）で `FIRESTORE_EMULATOR_HOST` が設定されていると接続を拒否します。

向いている用途: UI・機能開発、破壊的操作を伴う実験、スクリーンショット／E2E（決定論的）。

### 本番 Firestore 直結（ADC）

```bash
gcloud auth application-default login          # 初回のみ
pnpm --filter @suzumina.click/web dev          # 本番 Firestore に直接接続
```

- 本番の最新・全件データ（ユーザー系やサブコレクション含む）を扱えますが、**本番に直接読み書き**します。
- 次の用途ではこちらを使います:
  1. 本番データ起因の不具合調査（実データが無いと再現しない類）
  2. 新規クエリのインデックス検証（Emulator は複合インデックスを強制しないため、本番で要確認）
  3. ユーザー系・サブコレクション（価格履歴など）を含む網羅確認

## 開発コマンド

```bash
# 一括検証（lint + typecheck + test。CI と同一判定）
pnpm verify

# 個別
pnpm test
pnpm lint && pnpm typecheck
pnpm build
```

## ドキュメント

- **開発ガイド**: [docs/guides/development.md](docs/guides/development.md)
- **技術仕様**: [CLAUDE.md](CLAUDE.md)
- **アーキテクチャ**: [docs/reference/architecture.md](docs/reference/architecture.md)
- **データベース**: [docs/reference/database-schema.md](docs/reference/database-schema.md)

## ライセンス

MIT License - 個人運営の非公式ファンサイト
