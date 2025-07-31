# ユビキタス言語定義

> **📋 目的**: suzumina.clickプロジェクトのドメイン専門用語とビジネス概念の統一定義  
> **📅 最終更新**: 2025年7月22日  
> **🎯 適用範囲**: 開発チーム・ドキュメント・コード・ユーザーインターフェース  
> **🔗 参照**: CLAUDE.md から常時参照・Claude AI の用語統一指針

## 🎯 ドメイン概念

### 涼花みなせエコシステム

| 用語 | 定義 | 英語表記 | 備考 |
|------|------|----------|------|
| **涼花みなせ** | 本プロジェクトの中心となる声優（すずか みなせ） | Suzuka Minase | プロジェクト名の由来 |
| **ファンサイト** | 涼花みなせファンコミュニティのためのWebプラットフォーム | Fan Site | suzumina.clickの正式な位置付け |
| **ファンコミュニティ** | 涼花みなせファンの集まり・交流の場 | Fan Community | Discord連携による認証済みコミュニティ |
| **非営利運営** | 広告収益を目的としないファンサイト運営方針 | Non-profit Operation | v0.3.4+、AdSense/Amazon Associates削除済み |

## 🎵 音声システム

### 音声ボタン (Audio Button)

| 用語 | 定義 | 英語表記 | 技術的補足 |
|------|------|----------|------------|
| **音声ボタン** | YouTubeタイムスタンプを参照してワンクリックで音声再生できる機能 | Audio Button | `audioButtons` コレクション |
| **音声参照** | YouTube動画の特定時間範囲を指定して音声コンテンツを作成すること | Audio Reference | 開始時刻・終了時刻・再生時間で定義 |
| **タイムスタンプ参照** | YouTube動画内の特定時間を秒単位で指定する仕組み | Timestamp Reference | `startTime`, `endTime` フィールド |
| **ソース動画** | 音声ボタンの音声データ元となるYouTube動画 | Source Video | `sourceVideoId` で参照 |

### 音声分類・管理

| 用語 | 定義 | 英語表記 | 実装詳細 |
|------|------|----------|----------|
| **カテゴリ** | 音声ボタンの分類（挨拶・リアクション等） | Category | 必須フィールド・固定値リスト |
| **タグ** | 音声ボタンの自由な分類キーワード | Tag | 最大10個・各30文字以内 |
| **公開/非公開設定** | 音声ボタンの表示可否設定 | Public/Private Setting | `isPublic` フィールド |
| **お気に入り** | ユーザーが音声ボタンを個人リストに保存する機能 | Favorite | `users/{userId}/favorites` サブコレクション |

### 音声統計・エンゲージメント

| 用語 | 定義 | 英語表記 | 実装詳細 |
|------|------|----------|----------|
| **再生回数** | 音声ボタンが再生された累計回数 | Play Count | `playCount` フィールド・非負整数 |
| **いいね数** | ユーザーからのいいね評価数 | Like Count | `likeCount` フィールド・非負整数 |
| **お気に入り数** | 音声ボタンをお気に入り登録したユーザー数 | Favorite Count | `favoriteCount` フィールド・非負整数 |
| **再生時間** | 音声ボタンの再生継続時間（秒） | Duration | 終了時刻 - 開始時刻 |
| **作成者** | 音声ボタンを作成したユーザー | Creator | `createdBy`（Discord ID）, `createdByName`（表示名） |

## 🎬 動画システム

### 動画基本情報

| 用語 | 定義 | 英語表記 | データソース |
|------|------|----------|-------------|
| **YouTube動画** | 涼花みなせ関連のYouTube動画コンテンツ | YouTube Video | YouTube Data API v3 |
| **動画ID** | YouTubeが各動画に付与する一意識別子 | Video ID | 11文字の英数字文字列 |
| **チャンネル** | 涼花みなせ関連のYouTubeチャンネル | Channel | 特定チャンネルのみ監視 |
| **公開日時** | 動画がYouTubeで公開された日時 | Published At | ISO 8601形式 |

### 動画種別分類

| 用語 | 定義 | 英語表記 | 判定条件 |
|------|------|----------|----------|
| **ライブ配信アーカイブ** | 配信終了後に保存された15分超過の配信動画 | Live Archive | `actualEndTime`存在 + 時間>15分 |
| **プレミア公開動画** | 予約公開またはライブチャット付きで公開された15分以下の動画 | Premiere Video | 未終了または時間≤15分 |
| **通常動画** | 一般的にアップロードされた動画 | Regular Video | `liveStreamingDetails`不存在 |
| **配信中・配信予定** | 現在配信中または配信予定の動画 | Live/Upcoming | `liveBroadcastContent`="live"/"upcoming" |
| **15分閾値** | プレミア公開と配信アーカイブを区別する時間基準（900秒） | 15-minute Threshold | 音声ボタン作成可否の判定基準 |

### 3層タグシステム

| 用語 | 定義 | 英語表記 | 実装詳細 |
|------|------|----------|----------|
| **3層タグシステム** | プレイリスト・ユーザー・カテゴリの3層構造によるタグ分類システム | Three-Layer Tag System | Phase 1-5実装完了 |
| **プレイリストタグ** | YouTubeプレイリスト名から自動生成されるタグ | Playlist Tag | `playlistTags` フィールド・自動更新 |
| **ユーザータグ** | 認証ユーザーが自由に編集可能な手動タグ | User Tag | `userTags` フィールド・最大10個 |
| **YouTubeカテゴリ** | YouTube投稿者が選択したカテゴリの日本語表示 | YouTube Category | `categoryId` 既存フィールド活用 |

### タグ表示・分類

| 用語 | 定義 | 英語表記 | UI/UX仕様 |
|------|------|----------|----------|
| **タグ優先度** | 3層タグの表示順序（プレイリスト>ユーザー>カテゴリ） | Tag Priority | 視覚的区別とサイズ差別化 |
| **タグ編集権限** | 認証ユーザーのみユーザータグ編集可能 | Tag Edit Permission | Discord認証必須 |
| **タグクリック検索** | タグをクリックして該当動画を検索する機能 | Tag Click Search | 統合検索ページへ遷移 |
| **タグハイライト表示** | 検索結果でのタグ強調表示機能 | Tag Highlighting | HighlightTextコンポーネント |

### タグ管理・統計

| 用語 | 定義 | 英語表記 | 管理機能 |
|------|------|----------|----------|
| **3層タグ統計** | 各層別のタグ使用頻度・動画数統計 | Three-Layer Tag Statistics | ThreeLayerTagStatsDisplay |
| **プレイリストタグ管理** | 管理者によるプレイリストタグ表示制御 | Playlist Tag Management | PlaylistTagManagementInterface |
| **タグ表示設定** | 特定タグの表示/非表示制御機能 | Tag Visibility Setting | admin/playlistTagSettings |
| **一括タグ操作** | 複数タグの同時設定変更機能 | Bulk Tag Operation | 管理画面での効率化機能 |

## 📚 DLsite作品システム

### 作品基本情報

| 用語 | 定義 | 英語表記 | データ形式 |
|------|------|----------|-----------|
| **DLsite作品** | DLsiteで販売される涼花みなせ参加作品 | DLsite Work | Individual Info API取得 |
| **作品ID** | DLsiteが付与する作品識別子 | Work ID / Product ID | "RJ" + 8桁数字 (例: RJ01037463) |
| **作品タイトル** | DLsite作品の正式名称 | Work Title | `work_name` フィールド |
| **サークル** | 作品を制作・販売する同人サークル | Circle | `maker_name` フィールド |
| **サークルID** | DLsiteサークルの一意識別子 | Circle ID | "RG" + 5桁数字 (例: RG23954) |

### 作品分類・カテゴリ

| 用語 | 定義 | 英語表記 | 値の例 |
|------|------|----------|-------|
| **作品タイプ** | DLsite公式の作品種別分類 | Work Type | SOU(ボイス・ASMR), RPG, MOV(動画), MNG(マンガ) |
| **年齢制限** | 作品の対象年齢区分 | Age Rating | 全年齢(1), R-15(2), 成人向け(3) |
| **ジャンル** | DLsite公式のジャンルタグ | Genre | 癒し, ASMR, 耳舐め, ささやき等 |
| **独占配信** | DLsite独占販売作品 | DLsite Exclusive | `work_options.OLY` |

### 価格・評価・統計

| 用語 | 定義 | 英語表記 | 単位・形式 |
|------|------|----------|----------|
| **価格** | 作品の販売価格 | Price | 円(JPY)・税込表示 |
| **割引率** | キャンペーン等による価格割引 | Discount Rate | パーセンテージ |
| **評価** | ユーザーレビューによる星評価 | Rating | 1-5星・10-50スケール内部値 |
| **ランキング** | DLsite公式ランキング順位 | Ranking | 日間・週間・月間・年間・総合 |
| **ウィッシュリスト数（廃止）** | DLsite API提供終了のため削除 | Wishlist Count (Deprecated) | 2025年7月廃止 |

### 価格履歴システム

| 用語 | 定義 | 英語表記 | 技術的詳細 |
|------|------|----------|----------|
| **価格履歴** | 作品価格の日別変動記録 | Price History | `dlsiteWorks/{workId}/priceHistory` サブコレクション |
| **dlsiteWorksコレクション** | DLsite作品データを格納するFirestoreコレクション | dlsiteWorks Collection | **注意: "works"ではなく"dlsiteWorks"** |
| **価格推移チャート** | 価格変動をグラフィカルに表示する機能 | Price Trend Chart | Recharts統合・インタラクティブ表示 |
| **定価** | 作品の通常販売価格 | Regular Price | キャンペーン適用前価格 |
| **セール価格** | 割引キャンペーン適用後の価格 | Discount Price | `discount_rate` 適用後価格 |
| **公式価格** | DLsite API `official_price` フィールド値 | Official Price | セール中の元価格参照用 |
| **価格変動検出** | 前日比での価格変更自動検出 | Price Change Detection | `priceChanged` フラグ |
| **キャンペーン検出** | 新しい割引キャンペーンの開始検出 | Campaign Detection | `newCampaign` フラグ |
| **多通貨対応** | JPY/USD/EUR/CNY/TWD/KRW価格表示 | Multi-currency Support | `LocalePrice[]` 形式 |
| **価格統計** | 期間内最安値・最高値・平均価格等の統計情報 | Price Statistics | 最安値・最高値・平均・変動率 |
| **二重割引問題** | Individual Info APIでの割引率重複適用バグ | Double Discount Issue | RJ01414353で発見・修正済み |

## 👥 サークル・クリエイターシステム

### サークル基本情報

| 用語 | 定義 | 英語表記 | データソース |
|------|------|----------|-------------|
| **サークル** | DLsite作品を制作・販売する同人サークル | Circle | Individual Info API `maker_id`/`maker_name` |
| **サークルID** | DLsiteサークルの一意識別子 | Circle ID | \"RG\" + 5桁数字 (例: RG23954) |
| **サークル名** | サークルの正式名称 | Circle Name | `maker_name` フィールド |
| **サークル名（英語）** | サークルの英語名称 | Circle Name (English) | `maker_name_en` フィールド |
| **関連作品数** | サークルが制作した作品の総数 | Work Count | 統計情報・非正規化データ |

### クリエイター基本情報

| 用語 | 定義 | 英語表記 | データソース |
|------|------|----------|-------------|
| **クリエイター** | 作品制作に関わった人物 | Creator | Individual Info API `creaters` オブジェクト |
| **クリエイターID** | DLsiteクリエイターの一意識別子 | Creator ID | 数字ID・個別ページ作成用 |
| **クリエイター名** | クリエイターの表示名 | Creator Name | `creater.name` フィールド |
| **声優(CV)** | 作品で声を担当した声優 | Voice Actor | `voice_by` フィールド・ID付き |
| **シナリオライター** | 作品のシナリオを執筆した人物 | Scenario Writer | `scenario_by` フィールド・ID付き |
| **イラストレーター** | 作品のイラストを担当した人物 | Illustrator | `illust_by` フィールド・ID付き |
| **音楽制作者** | 作品の音楽を担当した人物 | Music Composer | `music_by` フィールド・ID付き |
| **その他クリエイター** | 上記以外の役割を担当した人物 | Other Creator | `others_by`, `directed_by` フィールド |

### クリエイタータイプ・役割

| 用語 | 定義 | 英語表記 | 技術的詳細 |
|------|------|----------|------------|
| **クリエイタータイプ** | クリエイターの作品における役割分類 | Creator Type | voice/illustration/scenario/music/other |
| **voice** | 声優・ボイス担当 | Voice | `CreatorType` enum値 |
| **illustration** | イラスト・グラフィック担当 | Illustration | `CreatorType` enum値 |
| **scenario** | シナリオ・脚本担当 | Scenario | `CreatorType` enum値 |
| **music** | 音楽・サウンド担当 | Music | `CreatorType` enum値 |
| **other** | その他・監督等 | Other | `CreatorType` enum値 |
| **複数役割** | 一人のクリエイターが複数の役割を担当 | Multiple Roles | types配列で管理 |

### データ管理・マッピング

| 用語 | 定義 | 英語表記 | 実装詳細 |
|------|------|----------|------------|
| **クリエイターワークマッピング** | クリエイターと作品の関連情報を効率的にクエリするための非正規化データ | Creator Work Mapping | `creatorWorkMappings` コレクション |
| **マッピングID** | クリエイター-作品マッピングの一意識別子 | Mapping ID | `{creatorId}_{workId}` 形式 |
| **バッチ収集** | 複数の作品からサークル・クリエイター情報を一括収集する処理 | Batch Collection | `batchCollectCircleAndCreatorInfo` 関数 |
| **Fire-and-Forget更新** | メイン処理に影響しない非同期でのサークル・クリエイター情報更新 | Fire-and-Forget Update | エラー発生時もメイン処理継続 |
| **非正規化データ** | クエリ効率化のための重複データ保存 | Denormalized Data | circleId, creatorName等の複製保存 |

## 🔄 シリーズ・翻訳・エディション

| 用語 | 定義 | 英語表記 | 実装詳細 |
|------|------|----------|----------|
| **シリーズ** | 同一テーマで展開される作品群 | Series | `series_id`, `title_name` |
| **翻訳版** | 他言語に翻訳された作品 | Translation | `translation_info` 管理 |
| **親作品** | 翻訳・エディションの元となる作品 | Parent Work | `is_parent`, `child_worknos` |
| **子作品** | 翻訳・エディション展開された作品 | Child Work | `is_child`, `original_workno` |
| **エディション** | 同一作品の異なる配信形式 | Edition | PC版・APK版・モバイル版等 |

## 🏗️ 技術・システム概念

### データ収集・API

| 用語 | 定義 | 英語表記 | 技術詳細 |
|------|------|----------|----------|
| **Individual Info API** | DLsite作品情報取得専用API | Individual Info API | 100% API-Only アーキテクチャの中核 |
| **API-Only アーキテクチャ** | スクレイピングを一切使わずAPIのみでデータ取得する設計 | API-Only Architecture | 本プロジェクトの特徴的アーキテクチャ |
| **統合データ収集** | 複数データソースからの統一的なデータ取得処理 | Unified Data Collection | 15分間隔実行 |
| **時系列データ** | 価格・ランキング等の時間経過による変化を記録 | Time Series Data | 日次集計・永続保存 |

### 認証・ユーザー管理

| 用語 | 定義 | 英語表記 | 実装方式 |
|------|------|----------|----------|
| **Discord認証** | Discordアカウントによるユーザー認証 | Discord Authentication | NextAuth.js + Discord OAuth |
| **ギルドメンバーシップ** | 特定Discordサーバーのメンバー資格確認 | Guild Membership | Discord Bot Token認証 |
| **ユーザーロール** | システム内でのユーザー権限レベル | User Role | member, moderator, admin |
| **レート制限** | ユーザーの操作頻度制限 | Rate Limiting | 24時間20回作成制限等 |

### アーキテクチャ・インフラ

| 用語 | 定義 | 英語表記 | 技術スタック |
|------|------|----------|-------------|
| **Monorepo** | 複数アプリケーションを単一リポジトリで管理 | Monorepo | pnpm workspace |
| **Server Actions** | Next.js 15のサーバーサイド処理機能 | Server Actions | フォーム処理・データ操作の主要手段 |
| **Cloud Functions** | Google Cloudのサーバーレス関数実行環境 | Cloud Functions | バックエンドAPI・データ収集処理 |
| **Firestore** | Googleのマネージドドキュメント型データベース | Cloud Firestore | メインデータストレージ |

### データ処理・変換

| 用語 | 定義 | 英語表記 | 目的 |
|------|------|----------|------|
| **型安全性** | TypeScript strict modeによる実行時エラー防止 | Type Safety | Zodスキーマ・shared-types活用 |
| **データ変換** | APIレスポンスからFirestore保存形式への変換 | Data Transformation | individual-info-to-work-mapper |
| **バッチ処理** | 大量データの効率的な一括処理 | Batch Processing | Firestore 500件制限対応 |

## 🎯 作品評価システム

### 評価基本概念

| 用語 | 定義 | 英語表記 | 実装詳細 |
|------|------|----------|----------|
| **作品評価** | DLsite作品に対するユーザーの評価 | Work Evaluation | `evaluations` コレクション |
| **評価タイプ** | 評価の種別（排他的選択） | Evaluation Type | top10/star/ng の3種類 |
| **10選評価** | ユーザーの特別な10作品を順位付け | Top 10 Evaluation | 1位～10位のランキング形式 |
| **星評価** | 3段階の通常評価 | Star Rating | 1星(普通)・2星(良い)・3星(とても良い) |
| **NG評価** | 苦手・非表示対象の作品評価 | NG Evaluation | 作品を非表示化する評価 |

### 10選ランキングシステム

| 用語 | 定義 | 英語表記 | 技術的補足 |
|------|------|----------|------------|
| **10選ランキング** | ユーザーの上位10作品の順位付けシステム | Top 10 Ranking | 最大10作品・順位重複不可 |
| **順位** | 10選内での作品の位置 | Rank | 1位～10位の整数値 |
| **スタック型挿入** | 新作品挿入時の既存作品下位シフト方式 | Stack-type Insertion | 指定位置挿入・下位自動シフト |
| **押し出し** | 10選満杯時の最下位作品除外処理 | Push-out | 11位相当作品の10選除外 |

### 評価状態・操作

| 用語 | 定義 | 英語表記 | UI/UX仕様 |
|------|------|----------|----------|
| **評価変更** | 既存評価から別タイプへの変更 | Evaluation Change | ラジオボタン選択・即時反映 |
| **楽観的更新** | サーバー処理前のUI即時更新 | Optimistic Update | レスポンス向上・エラー時復帰 |
| **評価削除** | 設定済み評価の完全削除 | Evaluation Removal | 未評価状態への復帰 |
| **評価表示** | 現在の評価状態の視覚的表示 | Evaluation Display | バッジ・アイコン・色分け |

### 評価データ管理

| 用語 | 定義 | 英語表記 | 実装詳細 |
|------|------|----------|----------|
| **複合キー** | ユーザーID_作品IDの一意識別子 | Composite Key | `{userId}_{workId}` 形式 |
| **排他的評価** | 1作品につき1評価タイプのみ許可 | Exclusive Evaluation | 同時複数評価タイプ禁止 |
| **トランザクション更新** | 評価・10選データの整合性保証更新 | Transactional Update | Firestore Transaction使用 |
| **評価統計** | 作品別・ユーザー別の評価集計情報 | Evaluation Statistics | 将来のレコメンド機能基盤 |
| **リアルタイム性** | データの即座反映・最新状態維持 | Real-time Updates | API優先・キャッシュ無効化 |

### データ品質管理

| 用語 | 定義 | 英語表記 | 実装詳細 |
|------|------|----------|----------|
| **データ品質検証** | 価格データの整合性・妥当性チェック | Data Quality Validation | `price-data-quality-checker.ts` |
| **自動修正** | 検出された問題データの自動修正処理 | Auto-fix | `price-data-fixer.ts` |
| **品質問題分類** | データ品質問題の種別分類システム | Quality Issue Classification | double_discount, price_inconsistency等 |
| **重要度評価** | 品質問題の影響度評価システム | Severity Assessment | low, medium, high, critical |
| **DRY RUN** | 実データ変更なしでの修正シミュレーション | Dry Run | データ修正前の安全確認 |

## 🎨 UI/UX概念

### 検索・フィルタリング

| 用語 | 定義 | 英語表記 | 実装範囲 |
|------|------|----------|----------|
| **統合検索** | 音声ボタン・DLsite作品・YouTube動画の横断検索 | Unified Search | 15+パラメータ対応 |
| **高度フィルタリング** | 複数条件を組み合わせた詳細検索 | Advanced Filtering | カテゴリ・日付・評価等 |
| **タブ型結果表示** | 検索結果をコンテンツ種別でタブ分け表示 | Tabbed Results | 3種類コンテンツ対応 |
| **URL状態管理** | 検索条件をURLパラメータで永続化 | URL State Management | ブックマーク・共有対応 |

### 表示・インタラクション

| 用語 | 定義 | 英語表記 | デザイン指針 |
|------|------|----------|-------------|
| **v0モック準拠デザイン** | v0.devで作成されたモックアップを基準とするUI設計 | v0 Mock-compliant Design | 一貫したデザインシステム |
| **レスポンシブデザイン** | デバイス画面サイズに応じた最適表示 | Responsive Design | モバイルファースト |
| **プログレッシブエンハンスメント** | 基本機能から段階的に機能強化 | Progressive Enhancement | アクセシビリティ重視 |
| **ワンクリック再生** | 音声ボタンの中核的UX・クリック一回で即座再生 | One-Click Playback | YouTube埋め込み活用 |
| **ローディングスケルトン** | コンテンツ読み込み中の視覚的プレースホルダー | Loading Skeleton | GenericCarousel構造準拠 |
| **カルーセル表示** | 横スクロール可能なコンテンツ一覧表示形式 | Carousel Display | 新着作品・新着動画で使用 |

## 📊 品質保証・テスト

| 用語 | 定義 | 英語表記 | 実装ツール |
|------|------|----------|-----------|
| **テストスイート** | プロジェクト全体の自動化テスト群 | Test Suite | 960+件・Vitest使用 |
| **E2Eテスト** | エンドツーエンドの統合テスト | End-to-End Test | Playwright・多ブラウザ対応 |
| **型安全性テスト** | TypeScript strict modeでの型チェック | Type Safety Testing | コンパイル時エラー防止 |
| **カバレッジ** | テストによるコード実行範囲の割合 | Code Coverage | shared-types:50%, functions:78% |

## 📈 運用・監視概念

| 用語 | 定義 | 英語表記 | 監視対象 |
|------|------|----------|----------|
| **P99レイテンシ** | レスポンス時間の99パーセンタイル値 | P99 Latency | 1.5秒以下目標 |
| **処理成功率** | データ収集・API呼び出しの成功割合 | Success Rate | 100%達成目標 |
| **データ整合性** | 複数データソース間の情報一致性 | Data Consistency | リアルタイム監視 |
| **自動スケーリング** | 負荷に応じたリソース自動調整 | Auto Scaling | Cloud Functions・Firestore |

## 🔄 開発プロセス・原則

### 設計原則

| 原則 | 定義 | 英語表記 | 適用例 |
|------|------|----------|-------|
| **YAGNI原則** | "You Aren't Gonna Need It" - 必要になるまで実装しない | YAGNI Principle | 不要機能の事前実装回避 |
| **DRY原則** | "Don't Repeat Yourself" - コードの重複排除 | DRY Principle | shared-types活用・関数共通化 |
| **KISS原則** | "Keep It Simple, Stupid" - シンプルな設計の維持 | KISS Principle | 複雑な設計の回避 |

### 開発・運用方針

| 用語 | 定義 | 英語表記 | 実装方針 |
|------|------|----------|----------|
| **API優先設計** | スクレイピングよりAPIを優先するデータ取得戦略 | API-First Design | Individual Info API活用 |
| **ユーザー中心設計** | ユーザーのニーズを最優先とする機能開発 | User-Centered Design | 不要機能の積極的廃止 |
| **継続的改善** | 定期的な性能・品質の見直しと向上 | Continuous Improvement | P99レイテンシ改善等 |
| **型安全性重視** | TypeScript strict modeによる堅牢性確保 | Type Safety First | コンパイル時エラー排除 |

---

## 📋 用語使用ガイドライン

### ドキュメント作成時

1. **一貫性**: 同じ概念には必ず同じ用語を使用
2. **正確性**: 技術的な詳細も含めて正確な定義を参照
3. **明確性**: 曖昧な表現を避け、このドキュメントの定義に従う

### コード実装時

1. **変数・関数名**: 英語表記を参考にした命名
2. **コメント**: 日本語用語で概念を説明
3. **型定義**: shared-typesパッケージの統一型を使用

### ユーザーインターフェース

1. **表示テキスト**: 日本語用語を使用
2. **エラーメッセージ**: ユーザーが理解しやすい表現
3. **ヘルプ・ガイド**: この定義に基づいた一貫した説明

---

> **📝 更新ルール**: 新しい概念の追加や既存定義の変更時は、このドキュメントを必ず更新し、関連するコード・ドキュメントとの整合性を保つこと。