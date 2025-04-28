# TODOリスト

このファイルでは、今後実施予定のタスクを管理します。完了したタスクは [CHANGELOG.md](./CHANGELOG.md) に移動しています。

## 今後のタスク

### 動画ページ実装（v0.2.0）

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

#### 音声クリップ機能の実装（v0.3.0）

以下のタスクは音声クリップ機能の実装に関するものです。詳細な計画は [AUDIO_CLIP_DESIGN.md](./AUDIO_CLIP_DESIGN.md) を参照してください。

##### フェーズ1: データモデルとAPI実装

- [x] 音声クリップ用のFirestoreスキーマ設計
- [x] 型定義の作成 (`src/lib/audioclips/types.ts`)
- [x] Firestoreセキュリティルールの更新
- [x] クライアントAPIの実装 (`src/lib/audioclips/api.ts`)
- [x] サーバーサイドAPIの実装
  - [x] 音声クリップ一覧/作成 (`src/app/api/audioclips/route.ts`)
  - [x] 個別クリップ操作 (`src/app/api/audioclips/[clipId]/route.ts`)
  - [x] 再生回数更新 (`src/app/api/audioclips/[clipId]/play/route.ts`)
  - [x] お気に入り登録/解除 (`src/app/api/audioclips/[clipId]/favorite/route.ts`)

##### フェーズ2: 基本UIコンポーネント実装

- [ ] AudioClipButtonコンポーネントの実装 (`src/components/audioclips/AudioClipButton.tsx`)
- [ ] AudioClipPlayerコンポーネントの実装 (`src/components/audioclips/AudioClipPlayer.tsx`)
- [ ] AudioClipListコンポーネントの実装 (`src/components/audioclips/AudioClipList.tsx`)
- [ ] 動画詳細ページへの統合 (`src/app/videos/[videoId]/page.tsx`)

##### フェーズ3: 音声クリップ作成機能実装

- [ ] AudioClipCreatorコンポーネントの実装 (`src/components/audioclips/AudioClipCreator.tsx`)
- [ ] YouTubeプレーヤーとの連携
- [ ] プレビュー機能の実装

##### フェーズ4: 拡張機能実装

- [ ] お気に入り機能の実装
- [ ] タグ機能の実装
- [ ] 検索・フィルタリング機能の実装

### インフラストラクチャ最適化（v0.1.4）

インフラ関連の最適化と改善を行います。

- [x] CI/CDパイプラインの重複デプロイ解決（2025年4月28日）
  - mainブランチへのpush時にWebとFunctionsが二重デプロイされる問題を修正
  - CI成功時の統合デプロイ自動トリガーを削除
  - パスベースの個別デプロイのみを実行するよう変更
- [ ] ビルドキャッシュの最適化
- [ ] メトリクスダッシュボードの改善
- [ ] セキュリティスキャンの自動化
- [ ] 障害時自動ロールバック機能の実装

### v0.1.3リリース完了項目（アーカイブ済み）

以下のタスクは完了し、v0.1.3リリースに含まれています：

- Cloud Code (VS Code拡張) の導入
- Cloud Run メトリクス監視の設定
- コスト最適化の実施
- 開発環境セットアップガイドの更新

詳細は [CHANGELOG.md](./CHANGELOG.md) を参照してください。
