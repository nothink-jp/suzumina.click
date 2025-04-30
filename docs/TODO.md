# TODOリスト

このファイルでは、今後実施予定のタスクを管理します。完了したタスクは [CHANGELOG.md](./CHANGELOG.md) に移動しています。

## 今後のタスク

### 動画ページ実装（v0.1.4）

以下のタスクは動画ページの実装に関するものです。詳細な計画は [VIDEO_PAGE_PLAN.md](./VIDEO_PAGE_PLAN.md) を参照してください。

#### フェーズ1: 動画一覧ページの実装

- [x] 型定義の作成 (`src/lib/videos/types.ts`)
- [x] データ取得ロジックの実装 (`src/lib/videos/api.ts`)
- [x] 日付フォーマット関数の実装 (`src/utils/date-format.ts`)
- [x] VideoCardコンポーネントの実装 (`src/components/ui/VideoCard.tsx`)
- [x] VideoListコンポーネントの実装 (`src/app/_components/VideoList.tsx`)
- [x] トップページの更新 (`src/app/page.tsx`)

#### フェーズ2: 動画詳細ページの実装

- [x] YouTubeEmbedコンポーネントの実装 (`src/components/videos/YouTubeEmbed.tsx`)
- [x] VideoInfoコンポーネントの実装 (`src/components/videos/VideoInfo.tsx`)
- [x] 動画詳細ページの実装 (`src/app/videos/[videoId]/page.tsx`)

#### 開発環境の整備

- [x] Firebase Emulatorのセットアップ
- [x] サンプルデータ生成スクリプトの作成
- [x] エミュレーター使用方法のドキュメント作成

### 音声ボタン機能の実装（v0.1.4 - v0.1.5）

以下のタスクは音声ボタン機能の実装に関するものです。詳細な計画は [AUDIO_CLIP_DESIGN.md](./AUDIO_CLIP_DESIGN.md) を参照してください。

#### フェーズ1: データモデルとAPI実装

- [x] 音声ボタン用のFirestoreスキーマ設計
- [x] 型定義の作成 (`src/lib/audiobuttons/types.ts`)
- [x] Firestoreセキュリティルールの更新
- [x] クライアントAPIの実装 (`src/lib/audiobuttons/api.ts`)
- [x] サーバーサイドAPIの実装
  - [x] 音声ボタン一覧/作成 (`src/app/api/audiobuttons/route.ts`)
  - [x] 個別ボタン操作 (`src/app/api/audiobuttons/[buttonId]/route.ts`)
  - [x] 再生回数更新 (`src/app/api/audiobuttons/[buttonId]/play/route.ts`)
  - [x] お気に入り登録/解除 (`src/app/api/audiobuttons/[buttonId]/favorite/route.ts`)

#### フェーズ2: 基本UIコンポーネント実装

- [x] AudioButtonコンポーネントの実装 (`src/components/audiobuttons/AudioButton.tsx`)
- [x] AudioButtonPlayerコンポーネントの実装 (`src/components/audiobuttons/AudioButtonPlayer.tsx`)
- [x] AudioButtonListコンポーネントの実装 (`src/components/audiobuttons/AudioButtonList.tsx`)
- [x] 動画詳細ページへの統合 (`src/app/videos/[videoId]/page.tsx`)

#### フェーズ3: 音声ボタン作成機能実装

- [x] AudioButtonCreatorコンポーネントの実装 (`src/components/audiobuttons/AudioButtonCreator.tsx`)
- [x] YouTubeプレーヤーとの連携
- [x] プレビュー機能の実装

#### フェーズ4: 重複防止と可視化機能の実装（v0.1.5）

- [ ] 重複チェックロジックの実装 (`src/lib/audiobuttons/validation.ts`)
  - [ ] 時間範囲重複検出アルゴリズムの実装
  - [ ] クライアント側バリデーション機能の追加
  - [ ] サーバー側バリデーション機能の追加
- [ ] タイムライン可視化コンポーネントの実装
  - [ ] TimelineVisualizationコンポーネントの作成 (`src/components/audiobuttons/TimelineVisualization.tsx`)
  - [ ] 時間範囲のレンダリング機能
  - [ ] 現在再生位置の表示
  - [ ] マウスオーバー時の詳細表示
  - [ ] ドラッグによる時間範囲選択機能
- [ ] AudioButtonCreatorの拡張
  - [ ] TimelineVisualizationコンポーネントとの連携
  - [ ] 重複エラーのUI表示
  - [ ] 重複回避のためのガイダンス提供

#### フェーズ5: 拡張機能実装（v0.1.5）

- [ ] お気に入り機能の実装
- [ ] タグ機能の実装
- [ ] 検索・フィルタリング機能の実装

### インフラストラクチャ最適化（v0.1.4）

インフラ関連の最適化と改善を行います。（2025年5月3日完了）

- [x] CI/CDパイプラインの重複デプロイ解決（2025年4月28日）
  - mainブランチへのpush時にWebとFunctionsが二重デプロイされる問題を修正
  - CI成功時の統合デプロイ自動トリガーを削除
  - パスベースの個別デプロイのみを実行するよう変更
- [x] ビルドキャッシュの最適化（2025年5月3日）
  - Next.jsビルドキャッシュの最適化
  - pnpmキャッシュの最適化
- [x] メトリクスダッシュボードの改善（2025年5月3日）
  - Cloud Run、Cloud Functions、Firestoreの統合ダッシュボード
  - アラートポリシーの設定
- [x] セキュリティスキャンの自動化（2025年5月3日）
  - 依存関係の脆弱性スキャン
  - Dockerイメージのセキュリティスキャン
  - GitHub Dependabotとの統合
- [x] 障害時自動ロールバック機能の実装（2025年5月3日）
  - Cloud Runのリビジョン管理とトラフィック制御
  - ヘルスチェックに基づく自動ロールバック

### 利用規約同意機能の実装（v0.1.6）

以下のタスクは日本の法制度に準拠した利用規約同意機能の実装に関するものです。ユーザビリティに配慮し、画面下部に過度に干渉せずコンテンツを表示します。

#### フェーズ1: 利用規約・プライバシーポリシーの作成

- [ ] 日本の法律に準拠した利用規約の作成 (`src/app/terms/page.tsx`)
- [ ] プライバシーポリシーの作成 (`src/app/privacy/page.tsx`)
- [ ] Cookieポリシーの作成 (`src/app/cookies/page.tsx`)
- [ ] 年齢制限に関する説明ページの作成 (`src/app/age-verification/page.tsx`)

#### フェーズ2: 同意バナーコンポーネント実装

- [ ] ConsentBannerコンポーネントの実装 (`src/components/consent/ConsentBanner.tsx`)
  - [ ] 最小限の表示領域でユーザビリティを確保
  - [ ] 段階的な表示オプション（基本 → 詳細設定）
  - [ ] アクセシビリティ対応
  - [ ] 年齢確認機能の統合（18歳以上確認チェックボックス）
- [ ] ConsentManagerコンポーネントの実装 (`src/components/consent/ConsentManager.tsx`)
  - [ ] 同意設定の保存と管理
  - [ ] 設定変更インターフェース
  - [ ] 年齢確認状態の管理

#### フェーズ3: 同意状態管理の実装

- [ ] 同意状態管理ロジックの実装 (`src/lib/consent/store.ts`)
  - [ ] localStorageを使用した同意状態の保存
  - [ ] 同意履歴の管理
  - [ ] 年齢確認状態の保存と検証
- [ ] 同意検証ミドルウェアの実装 (`src/middleware/consent.ts`)
  - [ ] 同意状態に基づくフィーチャーアクセス制御
  - [ ] 未同意ユーザーへの適切な案内
  - [ ] 年齢制限コンテンツへのアクセス制御
- [ ] AgeVerificationコンポーネントの実装 (`src/components/consent/AgeVerification.tsx`)
  - [ ] 年齢確認UI（生年月日入力またはチェックボックス）
  - [ ] 検証ロジックの実装
  - [ ] 年齢確認失敗時の案内表示

#### フェーズ4: 統合とテスト

- [ ] レイアウトへの統合 (`src/app/layout.tsx`)
- [ ] 各種ブラウザでの表示テスト
- [ ] モバイル対応の確認
- [ ] アクセシビリティテスト
- [ ] 年齢制限コンテンツの表示/非表示テスト

#### フェーズ5: 監視と最適化

- [ ] 同意率の分析システム実装
- [ ] A/Bテスト機能の実装（同意率向上のための表示最適化）
- [ ] 法改正時の更新メカニズムの設計
- [ ] コンテンツ分類システムの実装（年齢制限フラグ付与）
