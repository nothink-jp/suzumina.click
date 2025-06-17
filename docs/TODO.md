# suzumina.click 開発TODO

声優「涼花みなせ」ファンサイトの開発タスク管理

## 🎯 ユーザー音声ボタン機能 (4週間開発計画)

**開始予定**: 2025年6月17日  
**完了予定**: 2025年7月14日  
**開発方針**: ユーザー主導の音声ボタン作成・共有システム

### Week 1: 基盤実装 (6月17日〜6月23日)

#### 1.1 型定義・データ構造
- [ ] `packages/shared-types/src/audio-button.ts` 作成
  - [ ] `AudioButtonSchema` Zod定義
  - [ ] `FrontendAudioButton` 型定義
  - [ ] Firestore変換ユーティリティ
- [ ] `packages/shared-types/src/video.ts` 拡張
  - [ ] `audioButtonCount`, `hasAudioButtons` フィールド追加
- [ ] 型定義ビルド・テスト

#### 1.2 Web Audio API基盤
- [ ] `apps/web/src/lib/audio-extractor.ts` 作成
  - [ ] AudioContext初期化
  - [ ] MediaRecorder基本実装
  - [ ] 音声フォーマット変換（Opus/AAC）
- [ ] ブラウザ互換性テスト（Chrome, Firefox, Safari）
- [ ] 音声処理エラーハンドリング

#### 1.3 Server Actions基盤
- [ ] `apps/web/src/app/audio/actions.ts` 作成
  - [ ] `createAudioButton` Action
  - [ ] `uploadAudioFile` Action
  - [ ] Cloud Storage統合
- [ ] Firestoreクライアント設定
- [ ] ファイルアップロード検証・セキュリティ

### Week 2: UI基盤・データ管理 (6月24日〜6月30日)

#### 2.1 音声アップローダーコンポーネント
- [ ] `apps/web/src/components/AudioUploader.tsx` 作成
  - [ ] ドラッグ&ドロップ機能
  - [ ] ファイル選択UI
  - [ ] アップロード進捗表示
  - [ ] エラー状態表示
- [ ] ファイル形式・サイズ制限
- [ ] アップロード前プレビュー機能

#### 2.2 音声プレイヤーコンポーネント
- [ ] `packages/ui/src/components/audio-player.tsx` 作成
  - [ ] 再生/一時停止ボタン
  - [ ] 再生進捗バー
  - [ ] 音量調整
  - [ ] ブラウザ音声フォーマット対応
- [ ] Storybookストーリー作成
- [ ] レスポンシブデザイン対応

#### 2.3 Firestoreデータ統合
- [ ] `apps/web/src/lib/firestore-audio.ts` 作成
  - [ ] 音声ボタンCRUD操作
  - [ ] クエリ・フィルタリング機能
  - [ ] ページネーション対応
- [ ] Firestoreセキュリティルール更新
- [ ] 複合インデックス設定

### Week 3: ユーザーインターフェース完成 (7月1日〜7月7日)

#### 3.1 音声ボタン作成ページ
- [ ] `apps/web/src/app/audio/create/page.tsx` 作成
  - [ ] AudioUploader統合
  - [ ] メタデータ入力フォーム
  - [ ] タグ・カテゴリ選択
  - [ ] プレビュー機能
- [ ] YouTube動画連携機能
- [ ] 作成フロー完成

#### 3.2 音声ボタン一覧ページ
- [ ] `apps/web/src/app/audio/page.tsx` 作成
  - [ ] 音声ボタン一覧表示
  - [ ] 検索・フィルタリング
  - [ ] ページネーション
  - [ ] ソート機能（人気順・新着順）
- [ ] 音声ボタンカードUI
- [ ] 無限スクロール検討

#### 3.3 音声ボタン詳細ページ
- [ ] `apps/web/src/app/audio/[id]/page.tsx` 作成
  - [ ] 音声プレイヤー
  - [ ] メタデータ表示
  - [ ] 関連動画リンク
  - [ ] 統計情報（再生回数等）
- [ ] 共有機能（URL、SNS）
- [ ] お気に入り機能検討

### Week 4: 統合・テスト・最適化 (7月8日〜7月14日)

#### 4.1 ナビゲーション統合
- [ ] メインナビゲーションに音声ボタンメニュー追加
- [ ] 動画詳細ページから音声ボタン作成へのリンク
- [ ] パンくずナビゲーション
- [ ] 404ページ対応

#### 4.2 パフォーマンス最適化
- [ ] 音声ファイル遅延読み込み
- [ ] 画像最適化（サムネイル）
- [ ] バンドルサイズ最適化
- [ ] Core Web Vitals測定・改善

#### 4.3 テスト・品質保証
- [ ] 音声アップロード機能テスト
- [ ] ブラウザ互換性テスト
- [ ] アクセシビリティチェック
- [ ] セキュリティ検証
- [ ] パフォーマンステスト

#### 4.4 本番デプロイ準備
- [ ] 環境変数設定
- [ ] Cloud Storage権限設定
- [ ] Terraform設定更新
- [ ] 監視・アラート設定
- [ ] ドキュメント更新

## 🔧 技術スタック

### フロントエンド
- **Next.js 15** + React 19 (App Router)
- **TypeScript** (型安全性)
- **Tailwind CSS v4** (スタイリング)
- **Radix UI** (UIコンポーネント)

### 音声処理
- **Web Audio API** (ブラウザ音声処理)
- **MediaRecorder API** (音声録音)
- **Opus/AAC** (音声フォーマット)

### バックエンド
- **Next.js Server Actions** (ファイルアップロード)
- **Google Cloud Storage** (音声ファイル保存)
- **Google Cloud Firestore** (メタデータ管理)

## 📋 完成基準

### 機能要件
- [ ] ユーザーが音声ファイルをアップロード可能
- [ ] 音声ボタンのメタデータ設定（タイトル、タグ、説明）
- [ ] 音声ボタン一覧表示・検索・フィルタリング
- [ ] 音声ボタン再生・共有機能
- [ ] 動画との関連付け機能

### 非機能要件
- [ ] ファイルサイズ上限: 10MB
- [ ] 対応音声フォーマット: MP3, AAC, Opus, FLAC
- [ ] ブラウザ対応: Chrome, Firefox, Safari (最新3バージョン)
- [ ] モバイル対応: iOS Safari, Android Chrome
- [ ] ページ読み込み時間: 3秒以内

### 品質要件
- [ ] TypeScript型安全性100%
- [ ] アクセシビリティ: WCAG 2.1 AA準拠
- [ ] SEO対応: meta tags, structured data
- [ ] パフォーマンス: Core Web Vitals Good評価

## 🚀 次フェーズ予定 (7月15日以降)

### Phase 2: 高度な機能 (2週間)
- 音声編集機能（切り抜き、フェード）
- ユーザー認証・プロフィール
- コメント・レーティング機能
- 管理者機能（モデレーション）

### Phase 3: コミュニティ機能 (2週間)
- ユーザーフォロー機能
- プレイリスト作成
- 音声ボタンコレクション
- SNS連携強化

## 📊 進捗追跡

**現在の状況**: 設計完了、実装準備中  
**完了タスク**: 0 / 48  
**進捗率**: 0%

---

**最終更新**: 2025年6月17日  
**次回更新予定**: 2025年6月24日（Week 1完了時）  
**担当**: suzumina.click開発チーム