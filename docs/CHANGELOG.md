# Changelog

suzumina.clickプロジェクトの変更履歴

## [Unreleased]

## [v0.2.1] - 2025-06-22

### 🔐 Discord認証システム完全実装

- **NextAuth.js + Discord OAuth**: 「すずみなふぁみりー」Discord サーバーメンバー専用認証
- **ギルドメンバーシップ確認**: Discord Guild API連携による自動メンバー確認
- **ユーザー管理システム**: Firestore users collection + プロファイル・統計管理
- **ロールベース権限制御**: member/moderator/admin による機能制限
- **認証UI・UX**: AuthButton, UserAvatar, サインイン/エラーページ完備
- **Session管理**: JWT ベース・CSRF保護・自動ログイン状態管理

### 🔧 インフラ・セキュリティ強化

- **Secret Manager統合**: Discord認証情報・NextAuth Secret の安全な管理
- **Terraform認証サポート**: AUTH_DEPLOYMENT_GUIDE.md によるデプロイ自動化
- **型安全性強化**: packages/shared-types に User関連型定義・バリデーション追加

### 📖 ドキュメント大幅刷新

- **統合ドキュメント**: docs/README.md - 全体概要・認証情報統合
- **クイックリファレンス**: docs/QUICK-REFERENCE.md - 即座参照可能な開発情報
- **開発ガイド統合**: docs/DEVELOPMENT.md - ポリシー・インフラ・認証を一元化
- **認証デプロイガイド**: terraform/AUTH_DEPLOYMENT_GUIDE.md - Discord認証設定手順

### ✨ コンポーネント・機能追加

- **AuthButton**: ユーザー情報表示・サインイン/アウト
- **UserAvatar**: Discord アバター表示 (カスタム/デフォルト対応)
- **UserProfile**: ユーザープロファイル管理
- **ProtectedRoute**: 認証必須ページ保護
- **SessionProvider**: Next.js App Router 対応セッション管理

## [v0.2.0] - 2025-06-20

### 🔄 重要なアーキテクチャ変更

- **音声ファイルシステム → タイムスタンプ参照システム移行**
  - 音声ファイルアップロード機能を廃止
  - YouTube動画の時間範囲参照によるタイムスタンプシステムを採用
  - 著作権リスク回避と軽量化を実現

### 🗑️ インフラ削除・最適化

- **不要Terraformリソース削除**
  - Cloud Storage音声ファイル関連バケット削除
  - Cloud Tasks API・関連IAM権限削除
  - 音声処理監視ダッシュボード・アラート削除
  - 月額コスト約2000円削減

### 📝 ドキュメント整備

- **CLAUDE.md・docs/全面更新**
  - 実装状況と仕様の完全同期
  - アーキテクチャ図・データフロー図更新
  - 開発ガイドライン現行化

## [v0.1.6] - 2025-06-20

### 🎵 新機能

- **タイムスタンプ参照システム完全実装** - YouTube動画の特定時間区間への参照による音声ボタン機能
- **AudioReferenceCreator** - 高機能音声ボタン作成UI（タイムスタンプ選択、プレビュー、メタデータ入力）
- **音声ボタン詳細ページ** - 個別音声ボタンの詳細表示、関連ボタン表示、YouTube Player統合
- **高度な検索・フィルタリング** - カテゴリ、タグ、動画ID、並び順による音声ボタン検索

### 🚀 デプロイ・インフラ

- **Cloud Run完全対応** - Next.js 15用Dockerfile、マルチステージビルド、本番最適化
- **GitHub Actions CI/CD** - 自動デプロイパイプライン、Workload Identity連携
- **Firestore セキュリティルール** - audioReferencesコレクション用本番ルール
- **監視・ロギング** - Cloud Logging、エラートラッキング、パフォーマンス監視

### ✨ UI・品質向上

- **v0デザイン統一** - shadcn/ui標準カラーシステム、レスポンシブデザイン完全対応
- **Storybook拡充** - 全UIコンポーネントのストーリー完備、ビジュアル回帰テスト
- **アクセシビリティ強化** - WCAG 2.1 AA準拠、44px以上タップターゲット実装
- **パフォーマンス最適化** - Core Web Vitals Good評価、バンドル最適化

### 🧪 テスト強化

- **React Testing Library** - 重要コンポーネントの完全テストカバレッジ
- **E2Eテスト** - Playwright による重要ユーザーフローテスト
- **統合テスト** - Server Actions、Page Components、データフロー検証

### 🔧 技術基盤

- **音声参照型システム** - 法的リスク回避のタイムスタンプベース設計
- **匿名投稿システム** - 認証なしでの早期市場投入対応
- **YouTube Data API v3統合** - 動画情報取得、バリデーション
- **レート制限・モデレーション** - IPベース投稿制限、スパム防止

### 📖 ドキュメント

- **Phase 2完了** - TODO.md、AUDIO_BUTTON_DESIGN.mdの完了状況更新
- **実装ガイド** - タイムスタンプ参照システムの技術仕様書
- **デプロイ手順** - Cloud Run本番デプロイの詳細ドキュメント

## [v0.1.5] - 2025-06-17

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
