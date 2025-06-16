# TODO・タスク管理

## 📋 概要

suzumina.clickプロジェクトのタスク管理、機能開発ロードマップ、および進行中の課題を管理するドキュメントです。

## 🎯 現在の開発フェーズ

**Phase 1: 基盤構築** (完了済み ✅)

- ✅ インフラ基盤の確立 (Terraform + GCP)
- ✅ データ収集機能の安定化 (Cloud Functions)
- ✅ 開発環境・ツール整備 (Monorepo + pnpm)

**Phase 2: 本格Webアプリ開発** (完了済み ✅)

- ✅ **apps/web の新規作成・実装** 
- ✅ Server Component + Client Component アーキテクチャ実装
- ✅ 動画一覧表示・ページネーション機能
- ✅ Storybook環境構築・UIコンポーネント開発

**Phase 3: 機能拡張** (進行中 🚧)

- 🚧 DLsite作品表示機能
- 🚧 音声ボタン機能開発
- 🚧 検索・フィルタリング機能

## 🚀 優先度別タスク

### 🔴 緊急・重要 (P0) - **機能拡張**

#### **DLsite作品表示機能**

- [ ] **作品一覧ページ実装**
  - [ ] Server Component による作品データ表示
  - [ ] ページネーション実装
  - [ ] カード型UI実装
  - [ ] ローディング・エラーステート
  - 期限: 2025年12月末

- [ ] **作品詳細ページ実装**
  - [ ] 作品情報の詳細表示
  - [ ] 画像ギャラリー機能
  - [ ] 関連作品表示
  - [ ] メタデータ表示
  - 期限: 2026年1月末

#### **音声ボタン機能** (将来実装)

- [ ] **音声抽出機能**
  - [ ] YouTube動画からの音声切り出し
  - [ ] タイムスタンプ指定UI
  - [ ] 音声ファイル処理・最適化
  - [ ] クラウドストレージ保存
  - 期限: 2026年6月末

- [ ] **音声ボタンUI**
  - [ ] ボタン作成・編集UI
  - [ ] 再生コントロール
  - [ ] ボタン一覧表示
  - [ ] 共有機能
  - 期限: 2026年7月末

### 🟡 重要 (P1) - 基盤安定化

#### **システム安定性向上**

- [ ] **Cloud Functions エラーハンドリング強化**
  - [ ] YouTube API クォータ超過時の適切な処理
  - [ ] DLsite スクレイピング失敗時のリトライ機能
  - [ ] Firestore書き込み失敗時の復旧処理
  - 期限: 2025年7月31日
  - 担当者: Backend Team

- [ ] **モニタリング・アラート設定**
  - [ ] Cloud Functions実行失敗時のアラート
  - [ ] Firestore書き込みエラーの通知
  - [ ] YouTube APIクォータ使用量の監視
  - 期限: 2025年8月15日
  - 担当者: DevOps Team

#### **セキュリティ強化**

- [ ] **Firestore セキュリティルール実装**
  - [ ] 読み取り専用アクセス制御
  - [ ] レート制限の実装
  - [ ] 不正アクセス検知
  - 期限: 2025年8月31日
  - 担当者: Backend Team

### 🟢 通常 (P2) - 機能拡張

#### **YouTube動画表示機能**

- [ ] **動画一覧表示**
  - [ ] YouTube動画データの表示
  - [ ] 埋め込み動画プレイヤー
  - [ ] 再生リスト機能
  - [ ] お気に入り機能 (将来)
  - 期限: 2025年9月15日
  - 担当者: Frontend Team

- [ ] **音声ボタン作成機能** (将来実装)
  - [ ] YouTube動画からの音声切り出し
  - [ ] タイムスタンプ指定機能
  - [ ] 音声ファイルの保存・管理
  - [ ] ユーザー作成ボタンの共有機能
  - 期限: 2025年10月31日
  - 担当者: Full Stack Team

#### **UI/UX改善**

- [ ] **レスポンシブデザイン最適化**
  - [ ] モバイル向けUI改善
  - [ ] タブレット表示対応
  - [ ] タッチジェスチャー対応
  - [ ] PWA対応検討
  - 期限: 2025年9月30日
  - 担当者: Frontend Team

- [ ] **ダークモード対応**
  - [ ] カラーテーマの実装
  - [ ] ユーザー設定の保存
  - [ ] システム設定連動
  - 期限: 2025年10月15日
  - 担当者: Frontend Team

### 🔵 将来対応 (P3) - 高度機能

#### **ユーザー機能**

- [ ] **ユーザー認証システム**
  - [ ] Google OAuth連携
  - [ ] ユーザープロフィール機能
  - [ ] お気に入り・ブックマーク機能
  - 期限: 2025年12月31日
  - 担当者: Full Stack Team

- [ ] **コメント・レビュー機能**
  - [ ] 作品レビュー投稿
  - [ ] 音声ボタンコメント
  - [ ] レーティングシステム
  - 期限: 2026年2月28日
  - 担当者: Full Stack Team

## ✅ **apps/web 実装完了仕様**

### **採用技術スタック**

```typescript
// 核心技術 (実装済み)
- Next.js 15.3.3 (App Router)
- TypeScript 5.8.3
- React 19.1.0
- Tailwind CSS v4 (PostCSS設定)

// UI/UX (実装済み)
- Storybook 9.0.10 (コンポーネント開発・テスト)
- @suzumina.click/ui (共有UIコンポーネント)
- Radix UI (アクセシブルコンポーネント)
- Lucide React (アイコン)

// アーキテクチャ (実装済み)
- Server Components (データ表示)
- Client Components (インタラクション)
- Server Actions (データ取得)
- @google-cloud/firestore (サーバーサイドのみ)

// 開発支援 (実装済み)
- @suzumina.click/shared-types (共有型定義)
- Biome (Lint/Format)
- Vitest (テスト)
```

### **実装済みディレクトリ構造**

```
apps/web/                     # 実装完了
├── src/
│   ├── app/                 # Next.js App Router (実装済み)
│   │   ├── globals.css     # グローバルスタイル
│   │   ├── layout.tsx      # ルートレイアウト
│   │   ├── page.tsx        # ホームページ
│   │   ├── actions.ts      # Server Actions
│   │   └── admin/videos/   # 動画管理ページ (実装済み)
│   │       └── page.tsx    # 動画一覧・ページネーション
│   ├── components/         # UIコンポーネント (実装済み)
│   │   ├── VideoList.tsx   # 動画一覧 (Server Component)
│   │   ├── Pagination.tsx  # ページネーション (Client Component)
│   │   └── ThumbnailImage.tsx # サムネイル画像
│   └── lib/                # ユーティリティ (実装済み)
│       └── firestore.ts    # Firestore接続
├── .storybook/             # Storybook設定 (実装済み)
├── package.json
├── tailwind.config.ts
├── next.config.mjs
└── tsconfig.json

packages/ui/                  # 共有UIコンポーネント (実装済み)
├── src/
│   ├── components/         # Radix UIベースコンポーネント
│   │   ├── button.tsx     # ボタンコンポーネント
│   │   └── pagination.tsx # ページネーションコンポーネント
│   └── styles/            # Tailwind CSS v4設定
│       └── globals.css    # グローバルスタイル
└── .storybook/            # UI専用Storybook設定
```

### **Next.js 15ベストプラクティス実装**

**✅ 実装済みポイント**
- **Server Component設計**: データ表示ロジックをServer Componentに集約
- **Client Component分離**: インタラクション（ページネーション）のみClient Component
- **コロケーション原則**: ページとServer Actionsを同ディレクトリに配置
- **Storybook環境**: Next.js App Router対応の開発環境
- **型安全性**: 共有型定義とZodスキーマの活用

**🎯 アーキテクチャ特徴**
- 責任の明確な分離（表示 vs インタラクション）
- URLベースのナビゲーション（Client ComponentでのServer Actions回避）
- サーバーサイド優先のデータ取得
- Storybook対応のコンポーネント設計

### **次期開発優先順位**

1. **Phase 3.1** (2025年後半): DLsite作品表示機能
2. **Phase 3.2** (2026年前半): 検索・フィルタリング機能
3. **Phase 3.3** (2026年後半): 音声ボタン機能実装

## 🐛 既知の課題・バグ

### 🟡 Medium

- [x] **apps/web基盤構築** (完了済み)
  - 問題: Next.js 15 + Server Components アーキテクチャの実装
  - 対応策: Server/Client Component分離、Storybook環境構築
  - 完了日: 2025年6月16日

- [ ] **Mobile Safari レイアウト崩れ** (将来対応)
  - 問題: iOS Safariでの一部UI不具合
  - 影響: モバイルユーザビリティ
  - 対応策: CSS修正、クロスブラウザテスト強化
  - 期限: 2025年9月30日

### 🔴 Critical (継続監視)

- [ ] **YouTube API クォータ制限**
  - 問題: 1日のクォータ制限により動画取得が停止する
  - 影響: データ収集の停止
  - 対応策: クォータ効率化、複数APIキー対応検討
  - 期限: 2025年7月31日

- [ ] **DLsite スクレイピング安定性**
  - 問題: DLsiteのHTML構造変更でパース失敗
  - 影響: 作品情報の取得停止
  - 対応策: パーサーの堅牢性向上、構造変化検知
  - 期限: 2025年8月15日

## 📊 技術的負債

### **最優先**

- [ ] **apps/web テストカバレッジ確保**
  - 目標: 新規作成時点から80%以上
  - 対象: コンポーネント、hooks、ビジネスロジック
  - 期限: 各機能実装と同時

- [ ] **型安全性の完全確保**
  - [ ] 共有型定義の最大活用
  - [ ] strict TypeScript設定
  - [ ] Runtime型検証 (Zod活用)
  - 期限: 2025年8月31日

## 📅 マイルストーン

### **2025年 Q2 (4-6月) - apps/web 基盤構築** ✅

**Phase 2.1: 基盤完成** (完了済み)

- [x] apps/web プロジェクト作成
- [x] Next.js 15 + Server Components アーキテクチャ実装
- [x] Firestore連携確立
- [x] 動画一覧・ページネーション機能実装
- [x] Storybook環境構築

### **2025年 Q4 (10-12月) - 機能拡充**

**Phase 3.1: DLsite作品表示** (10月〜12月)

- [ ] DLsite作品一覧・詳細表示
- [ ] 作品検索・フィルタリング機能
- [ ] 作品カテゴリ表示

### **2026年 Q1-Q2 (1-6月) - 高度機能**

**Phase 3.2: 音声ボタン機能** (1月〜6月)

- [ ] YouTube動画表示機能
- [ ] 音声抽出・ボタン作成機能 (プロトタイプ)
- [ ] ユーザー認証実装

## 🎯 成功指標 (KPI)

### **apps/web 開発成功指標** ✅

- **開発スピード**: Phase 2完了 (3ヶ月以内達成)
- **アーキテクチャ**: Next.js 15ベストプラクティス準拠
- **コンポーネント設計**: Server/Client Component適切な分離
- **開発環境**: Storybook環境構築完了

### **今後のビジネス指標**

- **DLsite機能リリース**: 2025年12月末
- **音声ボタン機能プロトタイプ**: 2026年6月末
- **正式版リリース**: 2026年12月末

## 📝 チーム体制・責任分担

### **apps/web 開発チーム**

- **Frontend Lead**: apps/web アーキテクチャ・実装責任
- **UI/UX Designer**: デザインシステム・ユーザビリティ
- **Full Stack Developer**: Firebase連携・API統合
- **QA Engineer**: テスト戦略・品質保証

### **支援チーム**

- **Backend Team**: Cloud Functions安定性保証
- **DevOps Team**: インフラ・モニタリング
- **Product Owner**: 要件定義・優先度判断

---

**最終更新**: 2025年6月16日  
**次回レビュー**: 2025年12月1日 (Phase 3.1進捗確認)  
**マイルストーン見直し**: 2026年1月1日 (Phase 3.2計画確認)
