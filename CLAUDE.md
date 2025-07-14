# suzumina.click プロジェクト概要

声優「涼花みなせ」のファンサイト - ユーザーが作成する音声ボタンの共有とDLsite作品情報を表示

> **📋 プロジェクト情報**: 基本情報・クイックスタートは [README.md](./README.md) をご覧ください。  
> このファイルは開発者向けの詳細仕様・Claude AI向けの指示を含んでいます。

## 🎯 プロジェクト概要

suzumina.clickは、声優「涼花みなせ」ファンコミュニティのためのWebプラットフォームです。YouTube動画の音声参照機能、DLsite作品情報閲覧、お気に入りシステム、そして包括的な管理者機能を提供します。

### 🚀 現在のステータス

**本番稼働中の完成システム (v0.3.3)**

- **Webアプリケーション**: Next.js 15 + TypeScript + Tailwind CSS v4
- **認証システム**: Discord OAuth + ギルドメンバーシップ確認
- **データ収集**: YouTube Data API + DLsite Individual Info API (100% API-Only・高解像度画像対応・詳細情報解析)
- **音声システム**: YouTube動画タイムスタンプ参照システム + v0モック準拠デザイン
- **統合検索システム**: 全コンテンツ横断検索・高度フィルタリング・URL状態管理 (2025年7月実装完了)
- **お気に入りシステム**: 音声ボタンのお気に入り登録・管理機能
- **管理者機能**: ユーザー・コンテンツ管理インターフェース
- **インフラ**: Terraform + Google Cloud Platform (本番稼働)
- **品質保証**: 410+件のテストスイート + E2Eテスト (Server Actions移行完了)
- **最新アーキテクチャ**: Cloud Functions エンタープライズレベルディレクトリ構造 (2025年7月4日完了)
- **最新機能**: DLsite作品詳細情報表示強化 + 高解像度画像対応 (2025年7月実装)
- **アーキテクチャ革新**: 100% API-Only アーキテクチャ実現・旧HTMLスクレイピングシステム完全廃止 (2025年7月8日完了)
- **画像システム強化**: DLsiteサムネイル表示システム完全修正・プロトコル相対URL正規化完了 (2025年7月12日完了)
- **パフォーマンス最適化**: P99レイテンシ改善・Next.js最適化・検索API高速化 (2025年7月12日完了)
- **Individual Info API統合完了**: Phase 2段階的活用・ID付きクリエイター情報・URL正規化・型安全性向上 (2025年7月12日完了)
- **収益化システム**: Google AdSense統合・CSP対応・Cookie同意システム強化 (2025年7月13日完了)

## 🏗️ システム構成

### 基本アーキテクチャ

```
Monorepo構成 (pnpm workspace)
├── apps/
│   ├── web/                     # Next.js 15 フロントエンド
│   │   ├── src/app/             # App Router
│   │   ├── src/components/      # React コンポーネント
│   │   └── src/lib/            # ユーティリティ・共通処理
│   └── functions/              # Cloud Functions バックエンド
│       ├── src/endpoints/      # API エンドポイント
│       ├── src/services/       # ビジネスロジック
│       └── src/infrastructure/ # インフラ層
├── packages/
│   ├── shared-types/           # 型定義共有
│   ├── typescript-config/      # TypeScript設定
│   └── ui/                     # UI コンポーネントライブラリ
└── docs/                       # ドキュメント
```

### 主要技術スタック

- **フロントエンド**: Next.js 15 + React + TypeScript + Tailwind CSS v4
- **バックエンド**: Cloud Functions + Node.js + TypeScript
- **データベース**: Cloud Firestore + Cloud Storage
- **認証**: NextAuth.js + Discord OAuth
- **API**: YouTube Data API v3 + DLsite Individual Info API
- **テスト**: Vitest + Playwright E2E
- **Linter/Formatter**: Biome
- **インフラ**: Terraform + Google Cloud Platform

## 📊 データ収集システム

### DLsite統合データ収集

**実装場所**: `apps/functions/src/endpoints/dlsite-individual-info-api.ts`

- **実行頻度**: 毎時0分（Cloud Scheduler）
- **処理内容**: Individual Info API による基本データ更新
- **特徴**: 重複API呼び出し完全排除・リージョン差異対応


## 🗄️ データベース構造

### 主要Firestoreコレクション

1. **`dlsiteWorks`**: 作品基本データ
   - 型: `OptimizedFirestoreDLsiteWorkData`
   - 内容: 作品情報・価格・評価・詳細情報

2. **`dlsiteMetadata`**: 統合メタデータ
   - 型: `UnifiedDataCollectionMetadata`
   - 内容: データ収集状態管理

## 🧪 テスト戦略

### テストスイート構成

- **単体テスト**: 410+件（Vitest）
- **E2Eテスト**: Playwright
- **API テスト**: Next.js API Routes
- **統合テスト**: Cloud Functions

### テスト実行

```bash
# Web アプリケーション
pnpm --filter @suzumina.click/web test

# Cloud Functions
pnpm --filter @suzumina.click/functions test

# E2E テスト
pnpm --filter @suzumina.click/web test:e2e
```

## 🔧 開発環境

### 必要な環境変数

```bash
# Web アプリケーション (.env.local)
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-nextauth-secret
DISCORD_CLIENT_ID=your-discord-client-id
DISCORD_CLIENT_SECRET=your-discord-client-secret
GOOGLE_CLOUD_PROJECT=suzumina-click
YOUTUBE_API_KEY=your-youtube-api-key

# Public環境変数 (Next.js)
NEXT_PUBLIC_GA_MEASUREMENT_ID=G-XXXXXXXXXX
NEXT_PUBLIC_GTM_ID=GTM-XXXXXXX
NEXT_PUBLIC_ADSENSE_CLIENT_ID=ca-pub-xxxxxxxxxxxxxxxx
```

### 開発サーバー起動

```bash
# Web開発サーバー
pnpm --filter @suzumina.click/web dev
```

## 📋 重要な実装指示

### Claude AI向けの指示

1. **パッケージマネージャー**: **pnpm必須・npm禁止** - 全コマンドは`pnpm`で実行する
2. **ファイル操作**: ALWAYS prefer editing existing files over creating new ones
3. **テスト実行**: 変更後は必ずテストを実行（lint/typecheck含む）
4. **型安全性**: TypeScript strict mode準拠
5. **コード品質**: Biome設定に従う
6. **セキュリティ**: 秘密情報の露出防止

### 主要な実装パターン

- **Server Actions**: データ操作・フォーム処理の優先パターン
- **API Route**: 外部システム連携・統合処理のみ使用
- **Cloud Function**: GCF v2 CloudEvent Handler
- **Firestore操作**: バッチ処理・エラーハンドリング必須
- **型定義**: shared-types パッケージ利用

### 禁止事項

- 新規ファイル作成（明示的に必要な場合のみ）
- ドキュメント自動生成（*.md, README等）
- 不必要なコメント追加
- 機密情報のコミット

## 🚀 デプロイ

### インフラ管理

- **Terraform**: `terraform/` ディレクトリ
- **Cloud Functions**: 自動デプロイ（GitHub Actions）
- **Web App**: Cloud Run

### 本番環境

- **URL**: https://suzumina.click
- **インフラ**: Google Cloud Platform
- **監視**: Cloud Monitoring + Logging

## 🔗 重要なファイル

### 設定ファイル

- `package.json`: Monorepo workspace設定
- `tsconfig.json`: TypeScript設定
- `biome.json`: Biome (Linter/Formatter) 設定
- `vitest.config.ts`: テスト設定

### ドキュメント

- `docs/FIRESTORE_STRUCTURE.md`: データベース構造
- `docs/DEVELOPMENT.md`: 開発環境・原則
- `docs/UBIQUITOUS_LANGUAGE.md`: ユビキタス言語定義・ドメイン用語集

## 開発指針と設計原則

### 設計原則

- YAGNI原則、DRY原則、KISS原則に従う
- 型安全性を最優先
- テスト駆動開発
- セキュリティファースト

### Claude AI向け重要指示

1. **pnpm必須**: **npmコマンド絶対禁止** - 全操作は`pnpm`で実行する（例: `pnpm test`, `pnpm dev`）
2. **ファイル編集優先**: 新規ファイル作成は最小限に抑え、既存ファイルの編集を優先
3. **テスト実行**: コード変更後は必ずテストを実行（lint/typecheck含む）
4. **型安全性**: TypeScript strict mode準拠
5. **品質管理**: Biome設定に従う
6. **セキュリティ**: 機密情報の露出防止
7. **Firebaseコマンド禁止**: Firebaseは有効化されていないため、firebaseコマンドの使用は厳禁
8. **ユビキタス言語準拠**: `docs/UBIQUITOUS_LANGUAGE.md` の定義に従った一貫した用語使用

### 開発コマンド

```bash
# テスト実行
pnpm test

# Lint/Typecheck
pnpm lint
pnpm typecheck

# 開発サーバー
pnpm dev
```

### 既知の問題・制約

- salesCount機能は完全廃止済み（2025年7月）
- リージョン差異対応により和集合による完全データ収集を実現
- YouTube Player API のpostMessage警告は機能に影響しない（Google側の内部通信）
- AdSense統合により一部ブラウザでCSP警告が表示される場合があるが動作に問題なし

---

## 📝 変更ログ

### v0.3.3 (2025-07-14)

- **管理者UIシステム完全リニューアル**: モダンNext.js 15アーキテクチャ・レスポンシブデザイン実装
- **UIコンポーネントライブラリ統合**: packages/ui完全移行・Storybook統合・包括的テストスイート
- **音声ボタンシステム高精度化**: 0.1秒精度対応・リアルタイムプレビュー・包括的テスト追加
- **パフォーマンス最適化強化**: Image & Font最適化・Critical CSS実装・Next.js画像設定最適化
- **セキュリティ強化**: 未使用設定削除・GitHub Actions権限最適化・CodeQLアラート対応

### v0.3.2 (2025-07-13)

- **Google AdSense統合完了**: GoogleAdSenseScriptコンポーネント・CSP対応・収益化機能実装
- **セキュリティ強化**: Content Security Policy包括的更新・YouTube API連携最適化
- **パフォーマンス最適化**: Cloud Run設定最適化（CPU 2vCPU・メモリ 2Gi・最小インスタンス 1）
- **Cookie同意システム強化**: パーソナライゼーション対応・GDPR準拠・設定ページリファクタリング
- **プライバシーポリシー・利用規約更新**: 広告配信・データ利用条項追加

### v0.3.1 (2025-07-09)

- DLsite統合データ収集システム最適化
- salesCount機能完全廃止
