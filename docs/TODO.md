# suzumina.click 開発TODO

声優「涼花みなせ」ファンサイトの開発タスク管理

## 🎯 Phase 2: UI統一・品質向上・本番デプロイ準備

**開始予定**: 2025年6月17日  
**完了予定**: 2025年7月7日 (3週間)  
**開発方針**: v0モックとの完全なデザイン統一、品質保証、本番環境へのデプロイ準備

### Week 1: デザイン統一・UI改善 (6月17日〜6月23日)

#### 1.1 v0モックとの見た目統一 ✅
- [x] `apps/v0-suzumina.click` のデザインシステム調査・分析
  - [x] カラーパレット・テーマ設定の抽出
  - [x] タイポグラフィ・フォント設定の確認
  - [x] コンポーネントサイズ・間隔の測定
  - [x] レイアウトグリッド・レスポンシブ設計の分析
- [x] `apps/web` への統一デザイン適用
  - [x] Tailwind CSS設定をshadcn/ui標準に統一
  - [x] カラーシステムの標準化（primary, secondary, accent等）
  - [x] M_PLUS_Rounded_1cフォントの適用
  - [x] 共通レイアウトパターンの適用
- [x] ページレベルでの見た目統一
  - [x] ホームページ (`/`) のデザイン統一（ヒーローセクション、検索フォーム追加）
  - [x] 動画一覧ページ (`/videos`) のレイアウト調整
  - [x] 作品一覧ページ (`/works`) のレイアウト調整
  - [x] 音声ボタンページ (`/buttons`) のデザイン統一

#### 1.2 コンポーネントレベルの見た目改善 ✅
- [x] ヘッダー・ナビゲーションのデザイン統一
  - [x] `SiteHeader` コンポーネントの標準色適用
  - [x] モバイル・デスクトップナビゲーションの統一
  - [x] shadcn/ui Sheet コンポーネント採用
- [x] カードコンポーネントの統一
  - [x] `VideoCard` の標準shadcn/ui色適用
  - [x] `WorkCard` の標準shadcn/ui色適用
  - [x] `AudioButtonCard` の標準shadcn/ui色適用
  - [x] ホバー効果・アニメーションの標準化
- [x] フォーム・入力要素の統一
  - [x] 検索パネル・フィルターUIの標準色適用
  - [x] 音声アップローダーのデザイン調整
  - [x] ボタン・インタラクション要素の統一

#### 1.3 レスポンシブデザインの完成 ✅
- [x] モバイルファーストデザインの確認
  - [x] 320px〜768px (スマートフォン) の表示最適化
  - [x] 768px〜1024px (タブレット) の表示最適化
  - [x] 1024px以上 (デスクトップ) の表示最適化
- [x] 各ページでのレスポンシブ確認
  - [x] 動画・作品一覧のグリッドレイアウト調整
  - [x] 音声ボタン一覧のモバイル表示改善
  - [x] 詳細ページのモバイル表示改善
- [x] タッチ・インタラクション最適化
  - [x] タップターゲットサイズの調整 (44px以上、全コンポーネントmin-h-[44px]適用)
  - [x] スワイプ・ピンチ操作の対応確認
  - [x] モバイル音声プレイヤーの使いやすさ向上

### Week 2: Storybook拡充・コンポーネント品質向上 (6月24日〜6月30日)

#### 2.1 既存コンポーネントのStorybook補完 ✅
- [x] `packages/ui` 共有コンポーネントのStorybook
  - [x] `AudioPlayer` の全ての状態・プロパティ対応
  - [x] `Button` の全てのバリアント・サイズ対応
  - [x] `Card` 系コンポーネントのStorybook
  - [x] `Badge` コンポーネントのStorybook
  - [x] `Pagination` コンポーネントのStorybook
- [x] `apps/web` 専用コンポーネントのStorybook
  - [x] `VideoCard` の全ての状態パターン（長いタイトル、多ボタン数等）
  - [x] `WorkCard` の全ての状態パターン（セール、ランキング、評価等）
  - [x] `AudioButtonCard` の全ての状態パターン（コンパクト、カテゴリ別等）
  - [x] `AudioUploader` の全ての状態・エラーパターン
  - [x] `SiteHeader` のナビゲーション状態
- [x] 複合コンポーネントのStorybook
  - [x] `VideoList` の読み込み・エラー・空状態
  - [x] `WorkList` の読み込み・エラー・空状態（新規作成）
  - [x] 検索・フィルターパネルの各種状態

#### 2.2 アクセシビリティ強化 ✅
- [x] Storybook a11y アドオンを使った検証
  - [x] 全コンポーネントのアクセシビリティスコア確認
  - [x] WCAG 2.1 AA準拠の確認・修正
  - [x] カラーコントラスト比の確認・調整
  - [x] キーボードナビゲーションの確認・改善
- [x] スクリーンリーダー対応
  - [x] aria-label, aria-describedby等の適切な設定
  - [x] セマンティックHTMLの使用確認
  - [x] フォーカス管理の改善
- [x] 音声プレイヤーのアクセシビリティ
  - [x] 音声コントロールのキーボード操作対応
  - [x] 再生状態の音声読み上げ対応
  - [x] 音量調整のアクセシビリティ改善

#### 2.3 パフォーマンス最適化 ✅
- [x] Core Web Vitals改善
  - [x] LCP (Largest Contentful Paint) 最適化
  - [x] FID (First Input Delay) 改善
  - [x] CLS (Cumulative Layout Shift) 削減
- [x] 画像・メディア最適化
  - [x] next/imageの適切な使用
  - [x] サムネイル画像の遅延読み込み
  - [x] 音声ファイルの効率的な読み込み
- [x] バンドル最適化
  - [x] 不要なJavaScriptの削除
  - [x] Code Splittingの確認・改善
  - [x] Tree Shakingの最適化

### Week 3: テスト拡充・Cloud Run デプロイ準備 (7月1日〜7月7日)

#### 3.1 React Testing Library によるコンポーネントテスト拡充 ✅
- [x] 優先度の高いコンポーネントのテスト
  - [x] `AudioPlayer` コンポーネントのインタラクションテスト
  - [x] `AudioUploader` の全ての操作フローテスト
  - [x] `Pagination` のナビゲーションロジックテスト
  - [x] 検索・フィルター機能のテスト
- [x] エラーハンドリングのテスト
  - [x] 音声読み込みエラーのテスト
  - [x] ネットワークエラー時の表示テスト
  - [x] バリデーションエラーのテスト
- [x] ユーザーインタラクションのテスト
  - [x] フォーム入力・送信のテスト
  - [x] モーダル・ドロップダウンのテスト
  - [x] レスポンシブ表示のテスト

#### 3.2 統合テスト・E2Eテストの実装 ✅
- [x] Page Components の統合テスト
  - [x] 動画一覧ページの表示・操作テスト
  - [x] 音声ボタン一覧ページの表示・操作テスト
  - [x] 音声ボタン作成フローのテスト
- [x] Server Actions の統合テスト
  - [x] 音声ファイルアップロードのテスト
  - [x] 音声ボタン作成・更新のテスト
  - [x] データ取得・フィルタリングのテスト
- [x] Playwright E2Eテストの実装
  - [x] 重要なユーザーフローのE2Eテスト
  - [x] 音声アップロード・再生のE2Eテスト
  - [x] レスポンシブデザインのテスト

#### 3.3 Cloud Run デプロイ準備・コンテナ化 ✅
- [x] `apps/web` のDockerfile作成
  - [x] Next.js 15 対応のマルチステージビルド
  - [x] 本番環境用の最適化設定
  - [x] セキュリティベストプラクティスの適用
  - [x] ヘルスチェックエンドポイントの実装
- [x] Cloud Run設定・デプロイパイプライン
  - [x] Terraform でのCloud Run設定
  - [x] GitHub Actions デプロイワークフローの作成
  - [x] 環境変数・シークレット管理の設定
  - [x] カスタムドメイン設定 (`suzumina.click`)
- [x] 本番環境監視・ロギング
  - [x] Cloud Logging設定
  - [x] エラートラッキング・アラート設定
  - [x] パフォーマンス監視ダッシュボード
  - [x] 本番デプロイ用の最終チェックリスト

## 🔧 技術スタック

### 新規追加技術
- **React Testing Library** - コンポーネント単体テスト
- **Playwright** - E2Eテスト・ブラウザテスト
- **Docker** - アプリケーションコンテナ化
- **Cloud Run** - サーバーレスコンテナ実行環境

### 既存技術 (継続使用)
- **Next.js 15** + React 19 (App Router)
- **TypeScript** (型安全性)
- **Tailwind CSS v4** (デザインシステム統一)
- **Storybook** (UIコンポーネント開発・テスト)
- **Google Cloud Platform** (インフラ)

## 📋 完成基準

### デザイン統一要件 ✅
- [x] v0モックとの視覚的一致度90%以上
- [x] 全ページでの一貫したデザインシステム
- [x] モバイル・デスクトップでの最適な表示
- [x] ダークモード完全対応

### 品質要件 ✅
- [x] Storybook: 全UIコンポーネントのストーリー完備
- [x] アクセシビリティ: WCAG 2.1 AA準拠
- [x] パフォーマンス: Core Web Vitals Good評価
- [x] テストカバレッジ: コンポーネント・統合テスト80%以上

### デプロイ要件 ✅
- [x] Cloud Run へのコンテナデプロイ成功
- [x] 本番ドメインでのHTTPS アクセス
- [x] 監視・ロギング・アラート設定完了
- [x] 本番環境での全機能動作確認

## 🚀 予定される成果物

### Phase 2完了時の状態 (7月7日) ✅ **完了済み**
- ✅ v0モックと統一されたデザインの本番Webアプリ
- ✅ 全コンポーネントのStorybook完備
- ✅ 包括的なテストスイート (単体・統合・E2E)
- ✅ Cloud Run本番環境への自動デプロイパイプライン
- ✅ 本番監視・ロギング・アラート体制
- ✅ タイムスタンプ参照システムの完全実装

### Phase 3予定 (7月8日以降)
- 高度なユーザー機能 (認証・プロフィール)
- コミュニティ機能 (コメント・いいね・フォロー)
- 管理者機能・モデレーション機能
- SNS連携・外部API統合

## 📊 進捗追跡

**現在の状況**: Phase 2 完全完了 - 全ての品質・デプロイ要件を満たす
**完了タスク**: 64 / 64  
**進捗率**: 100%

**✅ 完了済み (Week 1):**
- v0デザインシステム調査・分析完了
- shadcn/ui標準カラーシステム統一
- 全コンポーネントの色彩統一
- ホームページUI完全リニューアル

**✅ 完了済み (Week 2追加):**
- レスポンシブデザイン完全実装（モバイルファースト対応）
- 全コンポーネントでWCAG準拠タップターゲット実装（44px以上）
- Storybook コンポーネント補完完了（VideoCard, WorkCard, AudioButtonCard, VideoList, WorkList追加）

**🎯 完了済みの重点タスク:**
- [x] レスポンシブデザインの最適化 ✅
- [x] Storybookコンポーネント補完 ✅  
- [x] アクセシビリティ強化 ✅
- [x] パフォーマンス最適化 ✅

---

## 🎵 タイムスタンプ参照システム（音声ボタン機能）開発TODO

**開始**: 2025年6月19日  
**Phase 1完了**: 2025年6月19日  
**完了予定**: 2025年7月2日 (2週間)  
**開発方針**: 認証なし・匿名投稿による早期市場投入

### ✅ Phase 1: 基盤実装完了（2025年6月19日）

#### ✅ Day 1-2: データ構造・型定義
- [x] `AudioReference` 型定義を `packages/shared-types` に追加
  - [x] `audio-reference.ts` - AudioReferenceスキーマ定義
  - [x] `audio-reference-utils.ts` - Firestore変換ユーティリティ
  - [x] カテゴリ・検索・バリデーション関数の実装
- [x] Firestore変換ユーティリティ作成
  - [x] `convertToFrontendAudioReference`
  - [x] `convertCreateInputToFirestoreAudioReference` (匿名対応)
  - [x] `validateAudioReferenceCreation`
- [x] 認証なし設計の型定義調整
  - [x] `createdBy: 'anonymous'` 設定
  - [x] IPベースレート制限実装

#### ✅ Day 3-4: Server Actions実装
- [x] `createAudioReference` 実装
  - [x] バリデーション処理
  - [x] Firestore保存処理
  - [x] 動画統計更新
  - [x] キャッシュ無効化
  - [x] YouTube Data API v3統合
- [x] `getAudioReferences` 検索・取得機能
  - [x] カテゴリ・タグ・動画ID検索
  - [x] 並び順（新着・人気・再生数・いいね数順）
  - [x] ページネーション対応
  - [x] 高度なフィルタリング機能
- [x] 統計更新機能実装
  - [x] `updateAudioReferenceStats` (再生・いいね・表示回数)
  - [x] `updateVideoAudioButtonStats`
  - [x] 個別統計更新関数群

#### ✅ Day 5-7: 基本コンポーネント
- [x] `YouTubePlayer` コンポーネント
  - [x] YouTube IFrame API統合
  - [x] プレイヤー初期化・制御
  - [x] 時間更新イベント
  - [x] 状態管理
  - [x] カスタムhook `useYouTubePlayer`
- [x] `AudioReferenceCard` 基本版
  - [x] 音声ボタン表示
  - [x] YouTube動画再生機能
  - [x] いいね・統計機能
  - [x] サイズバリアント対応（sm/md/lg）
  - [x] ダイアログベース再生
  - [x] 共有機能
- [x] 音声ボタン一覧ページ拡張
  - [x] 既存 `/buttons` ページの更新
  - [x] 検索・フィルター機能
  - [x] 人気・最新セクション
  - [x] エラーハンドリング

### 🚧 Phase 2: 作成UI・統合・デプロイ（残り1週間）

#### 🎯 優先度1: 作成UI実装（2-3日） ✅
- [x] `AudioReferenceCreator` コンポーネント作成
  - [x] YouTube動画URL入力・検証機能実装
  - [x] YouTube Player統合（フル機能版 - 既存YouTubePlayerコンポーネント拡張）
  - [x] タイムスタンプ選択UI実装
    - [x] リアルタイム再生位置表示機能
    - [x] 開始・終了時間スライダー（shadcn/ui Slider使用）
    - [x] 現在時間設定ボタン機能
    - [x] 範囲プレビュー機能（1-30秒制限、AUDIO_BUTTON_DESIGN.md準拠）
  - [x] メタデータ入力フォーム実装
    - [x] タイトル・説明入力（最大文字数制限付き）
    - [x] カテゴリ選択（既存enum使用: voice/bgm/se/talk/singing/other）
    - [x] タグ入力コンポーネント（推奨タグ表示機能付き）
  - [x] 作成前プレビュー・バリデーション機能
  - [x] 既存createAudioReference Server Action連携・エラーハンドリング
- [x] `/buttons/create` ページ更新
  - [x] 工事中ページを `AudioReferenceCreator` に置き換え
  - [x] レスポンシブレイアウト実装
  - [x] ナビゲーション・パンくず改善

#### 🎯 優先度2: 詳細ページ・統合（2日） ✅
- [x] `/buttons/[id]` 詳細ページ実装
  - [x] 既存actions.tsの`getAudioReferenceById`実装（現在未実装）
  - [x] 既存YouTubePlayerコンポーネント使用（タイムスタンプ付き）
  - [x] メタデータ表示・統計情報表示
  - [x] 関連音声ボタン表示（同一動画・類似タグ）
  - [x] 既存社会的機能統合（いいね・共有 - updateAudioReferenceStats使用）
- [x] `/videos/[videoId]` ページ拡張
  - [x] 既存動画詳細ページに音声ボタンセクション追加
  - [x] 動画関連音声ボタン一覧（既存getAudioReferences使用）
  - [x] 「音声ボタンを作成」ボタン追加（当該動画のvideoId指定）

#### 🎯 優先度3: インフラ・デプロイ準備（2日） ✅
- [x] Firestore セキュリティルール
  - [x] `audioReferences` コレクション用ルール作成
  - [x] 匿名書き込み・読み取り許可設定
  - [x] レート制限・バリデーション強化
- [x] Firestore インデックス設定
  - [x] 検索・並び替え用複合インデックス
  - [x] `category + createdAt`, `playCount desc`, `likeCount desc`
  - [x] `videoId + isPublic` 等
- [x] 本番デプロイ準備
  - [x] YouTube API Key設定確認
  - [x] 環境変数・シークレット管理
  - [x] パフォーマンス・バンドル最適化確認

#### 🎯 優先度4: 品質・テスト（随時） ✅
- [x] コードクリーンアップ
  - [x] Lint・TypeScript エラー修正
  - [x] パフォーマンス最適化
  - [x] アクセシビリティ確認
- [x] 手動テスト
  - [x] 音声ボタン作成フロー
  - [x] 検索・フィルタリング・再生機能
  - [x] モバイル・レスポンシブ確認

### 📁 実装ファイル状況

#### ✅ 完了ファイル
```
packages/shared-types/src/
├── audio-reference.ts          # ✅ 型定義・スキーマ完全実装
├── audio-reference-utils.ts    # ✅ 変換・バリデーション・レート制限完全実装
└── index.ts                   # ✅ エクスポート更新完了

apps/web/src/
├── app/buttons/
│   ├── actions.ts             # ✅ Server Actions完全実装（CRUD、統計、検索機能）
│   ├── page.tsx              # ✅ 一覧ページ（AudioReference完全対応、検索・人気・最新機能）
│   ├── components/AudioButtonSearch.tsx # ✅ 検索機能（AudioReference完全対応）
│   ├── [id]/page.tsx         # ⚠️ 工事中ページ（getAudioReferenceById未実装）
│   └── create/page.tsx       # ⚠️ 工事中ページ（AudioReferenceCreator未実装）
├── components/
│   ├── AudioReferenceCard.tsx # ✅ 表示UI（完全機能、ダイアログ再生、統計、いいね機能）
│   └── YouTubePlayer.tsx     # ✅ YouTube IFrame API完全統合（カスタムhook含む）
└── lib/
    └── firestore-admin.ts     # ✅ Firestore管理クラス（Admin SDK統合）
```

#### 🚧 残り実装ファイル
```
apps/web/src/
├── app/buttons/
│   ├── create/page.tsx       # 🚧 AudioReferenceCreator統合予定（既存actions.ts使用）
│   └── [id]/page.tsx         # 🚧 詳細ページ実装予定（getAudioReferenceById追加必要）
├── app/videos/[videoId]/
│   └── page.tsx             # 🚧 音声ボタンセクション追加予定（既存getAudioReferences使用）
└── components/
    └── AudioReferenceCreator.tsx # 🚧 新規作成予定（AUDIO_BUTTON_DESIGN.md仕様準拠）

terraform/
└── firestore_security_rules.tf  # 🚧 セキュリティルール作成予定（匿名投稿対応）
```

### 技術仕様

#### データ型
- `AudioReference` - メイン型定義
- `CreateAudioReferenceInput` - 作成用型（AUDIO_BUTTON_DESIGN.md準拠）
- `AudioReferenceQuery` - 検索用型
- `AudioReferenceCategory` - カテゴリ列挙型（voice/bgm/se/talk/singing/other）

#### Firestoreコレクション
```
/audioReferences/{id}
├── title: string
├── videoId: string  
├── videoTitle: string
├── startTime: number
├── endTime: number
├── duration: number
├── category: string
├── tags?: string[]
├── description?: string
├── createdBy: 'anonymous'
├── createdAt: Timestamp
├── updatedAt: Timestamp
├── playCount: number
├── likeCount: number
└── isPublic: boolean
```

#### セキュリティ（認証なし版）
- **作成**: 誰でも可能（バリデーション付き）
- **読み取り**: 公開ボタンのみ
- **更新**: 統計情報のみ
- **削除**: 不可（匿名のため）
- **レート制限**: IPあたり1日20個まで

### 🎯 完了基準

- [x] **音声ボタンの表示・再生機能** - AudioReferenceCard + YouTubePlayer
- [x] **YouTube動画との統合** - YouTube IFrame API + Data API v3
- [x] **検索・フィルタリング機能** - 高度な検索システム
- [x] **統計・社会的機能** - いいね・再生・表示回数
- [x] **レスポンシブデザイン** - モバイルファースト対応
- [x] **Server Actions基盤** - 完全なバックエンドAPI（getAudioReferenceById含む）
- [x] **音声ボタン作成UI** - AudioReferenceCreator (Phase 2) ✅
- [x] **詳細ページ** - 個別音声ボタンページ + getAudioReferenceById実装 (Phase 2) ✅
- [x] **Firestoreセキュリティ** - 本番用ルール (Phase 2) ✅
- [x] **本番デプロイ** - インフラ設定完了 (Phase 2) ✅

### 📊 進捗状況

**Phase 1完了**: 2025年6月19日 ✅  
**Phase 2完了**: 2025年6月20日 ✅  
**総開発期間**: 2週間（認証なし・早期市場投入版）  
**進捗率**: 100% (Phase 1: 100%, Phase 2: 100%)

**✅ Phase 1 完了項目 (70%)**

- データ構造・型定義システム
- Server Actions完全実装
- YouTube Player統合
- AudioReferenceCard コンポーネント
- 検索・一覧ページ更新
- 基本的な品質・リント対応

**✅ Phase 2 完了項目 (30%→100%)**

- AudioReferenceCreator作成UI ✅
- 詳細ページ実装 ✅
- インフラ・セキュリティ設定 ✅
- 最終テスト・デプロイ ✅

---

**開始**: 2025年6月17日  
**担当**: suzumina.click開発チーム  
**前フェーズ**: 音声ボタン機能開発完了 (v0.1.5)