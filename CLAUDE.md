# suzumina.click プロジェクト概要

声優「涼花みなせ」のファンサイト - ユーザーが作成する音声ボタンの共有とDLsite作品情報を表示

> **📋 プロジェクト情報**: 基本情報・クイックスタートは [README.md](./README.md) をご覧ください。  
> このファイルは開発者向けの詳細仕様・Claude AI向けの指示を含んでいます。

## 🎯 プロジェクト概要

suzumina.clickは、声優「涼花みなせ」ファンコミュニティのためのWebプラットフォームです。YouTube動画の音声参照機能、DLsite作品情報閲覧、お気に入りシステム、そして包括的な管理者機能を提供します。

### 🚀 現在のステータス

**本番稼働中の完成システム (v0.3.1)**

- **Webアプリケーション**: Next.js 15 + TypeScript + Tailwind CSS v4
- **認証システム**: Discord OAuth + ギルドメンバーシップ確認
- **データ収集**: YouTube Data API + DLsite Individual Info API (100% API-Only・高解像度画像対応・詳細情報解析)
- **音声システム**: YouTube動画タイムスタンプ参照システム + v0モック準拠デザイン
- **統合検索システム**: 全コンテンツ横断検索・高度フィルタリング・URL状態管理 (2025年7月実装完了)
- **お気に入りシステム**: 音声ボタンのお気に入り登録・管理機能
- **管理者機能**: ユーザー・コンテンツ管理インターフェース
- **インフラ**: Terraform + Google Cloud Platform (本番稼働)
- **品質保証**: 703+件のテストスイート + E2Eテスト (WorkDetail強化完了)
- **最新アーキテクチャ**: Cloud Functions エンタープライズレベルディレクトリ構造 (2025年7月4日完了)
- **最新機能**: DLsite作品詳細情報表示強化 + 高解像度画像対応 (2025年7月実装)
- **アーキテクチャ革新**: 100% API-Only アーキテクチャ実現・旧HTMLスクレイピングシステム完全廃止 (2025年7月8日完了)
- **画像システム強化**: DLsiteサムネイル表示システム完全修正・プロトコル相対URL対応 (2025年7月8日完了)

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
│   ├── eslint-config/          # ESLint設定
│   └── typescript-config/      # TypeScript設定
└── docs/                       # ドキュメント
```

### 主要技術スタック

- **フロントエンド**: Next.js 15 + React + TypeScript + Tailwind CSS v4
- **バックエンド**: Cloud Functions + Node.js + TypeScript
- **データベース**: Cloud Firestore + Cloud Storage
- **認証**: NextAuth.js + Discord OAuth
- **API**: YouTube Data API v3 + DLsite Individual Info API
- **テスト**: Vitest + Playwright E2E
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

- **単体テスト**: 703+件（Vitest）
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
NEXTAUTH_SECRET=your-secret
DISCORD_CLIENT_ID=your-client-id
DISCORD_CLIENT_SECRET=your-client-secret

# Cloud Functions (.env)
GOOGLE_CLOUD_PROJECT=your-project-id
DLSITE_API_KEY=your-api-key
```

### 開発サーバー起動

```bash
# Web開発サーバー
pnpm --filter @suzumina.click/web dev

# Functions エミュレーター
pnpm --filter @suzumina.click/functions dev
```

## 📋 重要な実装指示

### Claude AI向けの指示

1. **ファイル操作**: ALWAYS prefer editing existing files over creating new ones
2. **テスト実行**: 変更後は必ずテストを実行（lint/typecheck含む）
3. **型安全性**: TypeScript strict mode準拠
4. **コード品質**: ESLint/Prettier設定に従う
5. **セキュリティ**: 秘密情報の露出防止

### 主要な実装パターン

- **API Route**: Next.js App Router パターン
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
- **Web App**: Vercel/Cloud Run

### 本番環境

- **URL**: https://suzumina.click
- **インフラ**: Google Cloud Platform
- **監視**: Cloud Monitoring + Logging

## 🔗 重要なファイル

### 設定ファイル

- `package.json`: Monorepo workspace設定
- `tsconfig.json`: TypeScript設定
- `eslint.config.js`: ESLint設定
- `tailwind.config.ts`: Tailwind CSS設定

### ドキュメント

- `docs/DLSITE_INCREMENTAL_UPDATE_DESIGN.md`: DLsite統合システム設計
- `docs/FIRESTORE_STRUCTURE.md`: データベース構造
- `docs/DEVELOPMENT.md`: 開発環境・原則

## 開発指針と設計原則

### 設計原則

- YAGNI原則、DRY原則、KISS原則に従う
- 型安全性を最優先
- テスト駆動開発
- セキュリティファースト

### Claude AI向け重要指示

1. **ファイル編集優先**: 新規ファイル作成は最小限に抑え、既存ファイルの編集を優先
2. **テスト実行**: コード変更後は必ずテストを実行（lint/typecheck含む）
3. **型安全性**: TypeScript strict mode準拠
4. **品質管理**: ESLint/Prettier設定に従う
5. **セキュリティ**: 機密情報の露出防止
6. **Firebaseコマンド禁止**: Firebaseは有効化されていないため、firebaseコマンドの使用は厳禁

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

---

## 📝 変更ログ

### v0.3.1 (2025-07-09)
- DLsite統合データ収集システム最適化
- salesCount機能完全廃止