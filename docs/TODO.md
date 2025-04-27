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

#### 将来的な拡張（フェーズ3以降）
- [ ] 音声クリップ用のFirestoreスキーマ設計
- [ ] 音声クリップ管理機能の実装
- [ ] 音声ボタンUIの実装

### v0.1.3リリース完了項目（アーカイブ済み）

以下のタスクは完了し、v0.1.3リリースに含まれています：

- Cloud Code (VS Code拡張) の導入
- Cloud Run メトリクス監視の設定
- コスト最適化の実施
- 開発環境セットアップガイドの更新

詳細は [CHANGELOG.md](./CHANGELOG.md) を参照してください。
