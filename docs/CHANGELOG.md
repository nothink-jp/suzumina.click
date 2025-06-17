# Changelog

suzumina.clickプロジェクトの変更履歴

## [Unreleased]

### 🚀 新機能

- Next.js 15.3.3 + React 19.1.0 への更新
- Server Component/Client Component アーキテクチャの実装
- Storybook 9.0.10 環境構築（Web専用・共有UI）
- ページネーション付き動画一覧表示機能
- Tailwind CSS v4 + PostCSS設定

### ✨ 改善

- VideoListをServer Component化、責任分離の実現
- PaginationをClient Component化、インタラクション専用
- Next.js App Routerモック設定によるStorybook対応
- 共有UIコンポーネントライブラリ（packages/ui）の構築

### 🔧 技術的変更

- `@suzumina.click/ui`パッケージの新規作成
- Server Actions + Server Components設計パターンの採用
- Client ComponentでのServer Actions直接呼び出し回避
- URLベースナビゲーションによるページネーション実装

### 📖 ドキュメント

- CLAUDE.md: 最新アーキテクチャとプラクティスに更新
- docs/README.md: 技術スタック・開発状況の最新化
- docs/TODO.md: 完了済みタスクの整理、次期ロードマップ更新
- docs/POLICY.md: Next.js 15ベストプラクティスに準拠

## [v0.1.4] - 2024-01-15

### 🚀 新機能

- apps/web プロジェクト基盤構築
- Next.js 15 App Router の導入
- @google-cloud/firestore によるサーバーサイド接続
- 基本的な動画一覧表示機能

### 🔧 技術的変更

- monorepo構造でのWorkspace統合
- TypeScript strict mode設定
- Biome導入によるコード品質向上

## [v0.1.3] - 2024-01-01

### 🚀 新機能

- DLsite作品情報の自動取得システム
- Cloud Scheduler による定期実行設定
- Firestore への作品データ保存機能

### ✨ 改善

- YouTube動画取得処理の安定化
- エラーハンドリングの強化

## [v0.1.2] - 2023-12-15

### 🚀 新機能

- YouTube動画情報の自動取得機能
- Cloud Functions による定期実行
- Firestore データベース設計・実装

### 🔧 技術的変更

- Terraform によるインフラ構築
- Google Cloud Platform環境の整備

## [v0.1.1] - 2023-12-01

### 🚀 新機能

- apps/v0-suzumina.click モックアプリの作成
- v0 by Vercel による初期UI設計
- 基本的なプロジェクト構造の確立

### 📖 ドキュメント

- プロジェクト仕様書の作成
- 開発環境セットアップガイド

## [v0.1.0] - 2023-11-15

### 🎉 初回リリース

- プロジェクト開始
- monorepo構造の構築
- 基本的な開発環境の整備

---

## 凡例

- 🚀 新機能 (Features)
- ✨ 改善 (Enhancements)
- 🐛 バグ修正 (Bug Fixes)
- 🔧 技術的変更 (Technical Changes)
- 📖 ドキュメント (Documentation)
- 🎉 マイルストーン (Milestones)

## リンク

- [プロジェクト概要](../CLAUDE.md)
- [タスク管理](./TODO.md)
- [開発ポリシー](./POLICY.md)
