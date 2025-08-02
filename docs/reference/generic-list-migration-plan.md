# GenericListコンポーネント移行計画

## 概要

このドキュメントは、既存のリストページをGenericListコンポーネントに移行するための詳細な計画を示します。
段階的な移行により、リスクを最小限に抑えながら、コードの重複を削減し、保守性を向上させます。

## 移行対象と優先順位

### Phase 1: 基本的なリストページ（高優先度）

#### 1. 動画一覧ページ (`/videos`)
- **現在**: `VideoList`コンポーネント
- **複雑度**: 中
- **移行理由**: 比較的シンプルな構造で、GenericListの検証に適している
- **必要な作業**:
  - [ ] `getVideoTitles` ActionをGenericList形式に適合
  - [ ] VideoCardコンポーネントの調整
  - [ ] フィルター定義の作成（年齢制限、ソート）
  - [ ] URLパラメータマッピングの設定

#### 2. 音声ボタン一覧ページ (`/buttons`)
- **現在**: `AudioButtonsList`コンポーネント
- **複雑度**: 中
- **移行理由**: 動画一覧と同様の構造で、パターンの確立に適している
- **必要な作業**:
  - [ ] `getAudioButtons` ActionをGenericList形式に適合
  - [ ] AudioButtonCardコンポーネントの調整
  - [ ] フィルター定義の作成（タグ、作成者、ソート）
  - [ ] URLパラメータマッピングの設定

### Phase 2: 複雑なリストページ（中優先度）

#### 3. 作品一覧ページ (`/works`)
- **現在**: `WorksPageClient` + `WorkList`コンポーネント
- **複雑度**: 高
- **移行理由**: 最も複雑なフィルタリングとソート機能を持つ
- **必要な作業**:
  - [ ] `getWorks` ActionをGenericList形式に適合（すでに最適化済み）
  - [ ] WorkCardコンポーネントの調整
  - [ ] 複雑なフィルター定義の作成
    - カテゴリ（select）
    - 年齢制限（select）
    - 価格帯（range - 将来実装）
    - 発売年（dateRange - 将来実装）
  - [ ] ソートオプションの充実
    - 発売日順
    - 価格順
    - 評価順
    - 販売数順

### Phase 3: 詳細ページ内のリスト（中優先度）

#### 4. サークル詳細ページ (`/circles/[circleId]`)
- **現在**: `CirclePageClient`内のカスタム実装
- **複雑度**: 中
- **必要な作業**:
  - [ ] `getCircleWithWorksWithPagination`の分離
  - [ ] サークル作品用のGenericList設定
  - [ ] 既存UIとの統合

#### 5. クリエイター詳細ページ (`/creators/[creatorId]`)
- **現在**: `CreatorPageClient`内のカスタム実装
- **複雑度**: 中
- **必要な作業**:
  - [ ] `getCreatorWithWorksWithPagination`の分離
  - [ ] クリエイター作品用のGenericList設定
  - [ ] 既存UIとの統合

### Phase 4: 特殊なリストページ（低優先度）

#### 6. トップページ (`/`)
- **現在**: 複数の個別コンポーネント
- **複雑度**: 高（複数のリストを含む）
- **必要な作業**:
  - [ ] 各セクション用の軽量GenericList実装
  - [ ] ページネーションなしの設定
  - [ ] 「もっと見る」リンクの統合

#### 7. 検索結果ページ (`/search`)
- **現在**: `SearchPageContent`
- **複雑度**: 高（横断検索）
- **必要な作業**:
  - [ ] タブ切り替えとGenericListの統合
  - [ ] 各コンテンツタイプ用の設定
  - [ ] 統合検索結果の表示

## 移行手順

### 各ページの移行ステップ

1. **準備**
   - 既存コンポーネントの動作確認とテスト作成
   - 必要なフィルター定義とソートオプションの洗い出し
   - URLパラメータの仕様確認

2. **Action関数の適合**
   ```typescript
   // 既存のAction
   export async function getVideoTitles(params: VideoQueryParams) {
     // ...
   }
   
   // GenericList用に適合
   export async function fetchVideos(params: ListParams): Promise<ListResult<VideoTitle>> {
     const result = await getVideoTitles({
       page: params.page,
       limit: params.limit,
       sort: params.sort,
       // フィルターのマッピング
       ...params.filters
     });
     
     return {
       items: result.videos,
       totalCount: result.total,
       filteredCount: result.filtered || result.total,
     };
   }
   ```

3. **ページコンポーネントの更新**
   ```typescript
   export default async function VideosPage({ searchParams }: PageProps) {
     const config: ListConfig = {
       baseUrl: "/videos",
       filters: [
         {
           key: "ageRestriction",
           type: "select",
           label: "年齢制限",
           options: [
             { value: "all", label: "すべて" },
             { value: "all-ages", label: "全年齢" },
             { value: "r18", label: "R18" },
           ],
           defaultValue: "all",
         },
       ],
       sorts: [
         { value: "newest", label: "新着順" },
         { value: "oldest", label: "古い順" },
       ],
       defaultSort: "newest",
       paginationConfig: {
         itemsPerPage: 12,
         itemsPerPageOptions: [12, 24, 48],
       },
     };
     
     return (
       <GenericList
         config={config}
         fetchData={fetchVideos}
         renderItem={(video) => <VideoCard video={video} />}
       />
     );
   }
   ```

4. **テストとデバッグ**
   - 既存機能の動作確認
   - URLパラメータの同期確認
   - パフォーマンステスト

5. **段階的リリース**
   - Feature flagによる段階的有効化
   - A/Bテストの実施
   - ユーザーフィードバックの収集

## 成功指標

### 技術的指標
- [ ] コード行数の削減率: 目標50%以上
- [ ] ページロード時間: 現状維持または改善
- [ ] Firestoreリード数: 現状維持または削減

### ビジネス指標
- [ ] ページ離脱率: 現状維持または改善
- [ ] 検索・フィルター使用率: 向上
- [ ] ユーザー満足度: 維持または向上

## リスクと対策

### リスク1: 既存機能の破壊
- **対策**: 包括的なE2Eテストの作成
- **対策**: Feature flagによる段階的移行

### リスク2: パフォーマンス劣化
- **対策**: 移行前後のパフォーマンス計測
- **対策**: 問題発生時の即時ロールバック体制

### リスク3: ユーザー体験の変化
- **対策**: UIの最小限の変更
- **対策**: ユーザーテストの実施

## タイムライン

### Phase 1: 2週間
- Week 1: 動画一覧ページの移行
- Week 2: 音声ボタン一覧ページの移行

### Phase 2: 2週間
- Week 3: 作品一覧ページの移行
- Week 4: テストとバグ修正

### Phase 3: 2週間
- Week 5: サークル・クリエイター詳細の移行
- Week 6: 統合テスト

### Phase 4: 2週間
- Week 7: トップページ・検索結果の移行
- Week 8: 最終調整とドキュメント整備

## 次のステップ

1. このドキュメントのレビューと承認
2. Phase 1の動画一覧ページから移行開始
3. 各フェーズ完了後の振り返りと計画の調整

---

最終更新: 2025-08-02