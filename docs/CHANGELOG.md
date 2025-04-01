# 変更履歴

このドキュメントでは、プロジェクトの重要な変更履歴を記録します。
[Keep a Changelog](https://keepachangelog.com/ja/1.0.0/)の形式に従います。

## [Unreleased]

### 削除

- packages/ui パッケージを削除
- shadcn/uiへの移行計画を中止（packages/uiの削除に伴い不要となったため）

### 開発ツール

- markdownlint-cli2の導入によるMarkdownの一貫性確保

## [0.1.0] - 2025-04-01

### アーキテクチャ

- モノレポ構造の採用
- Bunパッケージマネージャーの導入
- Turboビルドシステムの統合

### 開発環境設定

- Biomeによるリントとフォーマットのルールセットアップ
- CSpellによる一貫した命名規則の導入
- TypeScript設定の共通化

### インフラストラクチャ

- Next.js App Routerの採用
- サーバーレスアーキテクチャの基盤構築
- マイクロサービス指向の設計方針確立
