# Changelog

All notable changes to the suzumina.click project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.2.2] - 2025-06-28

### Added
- ✅ **お気に入りシステム完全実装**
  - `users/{userId}/favorites` サブコレクション追加
  - FavoriteButton コンポーネント実装
  - Server Actions でお気に入り登録・削除機能
  - Firestore セキュリティルール更新

### Changed
- 🎨 **音声ボタンデザイン刷新**
  - 白ボタンから orange gradient (minase colors) デザインに変更
  - inline flex layout への変更（カルーセルから flex-wrap レイアウト）
  - Tailwind CSS v4 @layer utilities 対応

### Improved
- 📚 **Storybook 一本化**
  - Web App Storybook 削除
  - UI Package Storybook のみに統合
  - デザイントークン (color palette, typography, spacing) の体系化

### Fixed
- 🧪 **テスト修正**
  - aria-label テスト期待値更新
  - FeaturedAudioButtonsCarousel テスト修正 (flex-wrap layout 対応)
  - 全 400+ テストが正常実行

### Technical
- 型定義追加: `packages/shared-types/src/favorite.ts`
- Firestore インデックス最適化
- 品質メトリクス: Lint 0エラー・0警告達成済み

## [0.2.1] - 2025-06-23

### Added
- 管理者インターフェース実装
- ユーザー管理機能
- 動画・作品管理画面
- Discord OAuth 認証システム完成

### Changed
- audioReferences → audioButtons 統合
- Firestore データ構造最適化

## [0.2.0] - 2025-06-20

### Added
- YouTube 動画タイムスタンプ参照システム
- 音声ボタン作成・共有機能
- DLsite 作品情報表示機能
- Cloud Functions データ収集システム

### Infrastructure
- Terraform インフラ管理
- Google Cloud Platform 本番環境構築
- CI/CD パイプライン実装

## [0.1.0] - 2025-06-15

### Added
- 初期プロジェクト設定
- Next.js 15 + TypeScript + Tailwind CSS v4
- pnpm Workspace モノレポ構成
- 基本的な UI コンポーネント (shadcn/ui)

### Infrastructure
- Firestore データベース設計
- 共有型定義パッケージ
- テスト環境構築

---

## 開発チーム
- **メイン開発**: suzumina.click 開発チーム
- **コントリビューター**: すずみなふぁみりー Discord コミュニティ

## リリースノート
各リリースの詳細な変更内容は [GitHub Releases](https://github.com/your-org/suzumina.click/releases) をご覧ください。