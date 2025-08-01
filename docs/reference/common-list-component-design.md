# 共通リストコンポーネント設計

## 概要

suzumina.clickにおける共通リストコンポーネントの設計ドキュメント。
パフォーマンス最適化と実装の統一性を目的として、各種リストページで使用される共通コンポーネントを設計する。

## 適用対象ページ一覧

### 1. メインコンテンツリスト

| ページ | パス | 現在のコンポーネント | データ取得Action | 主な機能 |
|--------|------|---------------------|------------------|----------|
| トップページ | `/` | HomePage | getLatestAudioButtons, getLatestVideos, getLatestWorks | 各種コンテンツの新着表示 |
| 作品一覧 | `/works` | WorksPageClient + WorkList | getWorks | 作品の検索・フィルタリング・ページネーション |
| 動画一覧 | `/videos` | VideoList | getVideoTitles | 動画の検索・フィルタリング・ページネーション |
| 音声ボタン一覧 | `/buttons` | AudioButtonsList | getAudioButtons | ボタンの検索・フィルタリング・ページネーション |
| 検索結果 | `/search` | SearchPageContent | 複数Actions | 横断検索結果の表示 |

### 2. 詳細ページ内のリスト

| ページ | パス | 現在のコンポーネント | データ取得Action | 主な機能 |
|--------|------|---------------------|------------------|----------|
| サークル詳細 | `/circles/[circleId]` | CirclePageClient | getCircleWithWorksWithPagination | サークルの作品一覧 |
| クリエイター詳細 | `/creators/[creatorId]` | CreatorPageClient | getCreatorWithWorksWithPagination | クリエイターの作品一覧 |
| お気に入り | `/favorites` | (未確認) | (未確認) | ユーザーのお気に入りリスト |
| ユーザー詳細 | `/users/[userId]` | (未確認) | (未確認) | ユーザーが作成したボタン一覧 |

## 共通要件

### 1. パフォーマンス要件
- Firestoreクエリ最適化（サーバーサイドフィルタリング）
- 必要最小限のドキュメント読み取り
- 効率的なページネーション（offset/cursor-based）
- Server Component優先での実装

### 2. 機能要件
- ページネーション（ページ番号表示、前後ナビゲーション）
- ソート機能（新着順、古い順、価格順、評価順など）
- フィルタリング（カテゴリ、タグ、年齢制限など）
- 検索機能（テキスト検索）
- 表示件数切り替え（12/24/48件）
- レスポンシブデザイン

### 3. UI/UX要件
- 統一されたレイアウト
- スケルトンローディング
- エラーハンドリング
- 空状態の表示
- アクセシビリティ対応

## 現状の問題点

1. **実装の重複**
   - 各リストページで同様のロジックが重複実装されている
   - ページネーション、フィルタリング、ソートの実装が統一されていない

2. **パフォーマンスの不均一**
   - 一部のページではFirestoreクエリが最適化されていない
   - クライアントサイドフィルタリングが残っている箇所がある

3. **UIの不統一**
   - ページによってレイアウトやスタイルが異なる
   - ユーザー体験の一貫性が欠けている

## 設計方針

### 1. コンポーネント構成

```
GenericListLayout
├── ListHeader
│   ├── Title
│   ├── Description
│   └── ViewToggle (Grid/List)
├── ListFilters
│   ├── SearchInput
│   ├── SortSelect
│   ├── FilterDropdowns
│   └── LimitSelect
├── ListContent
│   ├── LoadingState
│   ├── EmptyState
│   ├── ErrorState
│   └── ItemGrid/ItemList
└── ListPagination
    ├── PageNumbers
    ├── PrevNext
    └── PageInfo
```

### 2. データフロー

```typescript
interface ListPageProps<T> {
  // サーバーサイドで取得した初期データ
  initialData: T[];
  totalCount: number;
  filteredCount?: number;
  
  // ページ設定
  pageConfig: {
    basePath: string;
    itemsPerPage: number;
    currentPage: number;
  };
  
  // フィルター設定
  filterConfig?: {
    search?: boolean;
    sort?: SortOption[];
    filters?: FilterDefinition[];
  };
  
  // レンダリング設定
  renderConfig: {
    itemComponent: React.ComponentType<{ item: T }>;
    gridCols?: { mobile: number; tablet: number; desktop: number };
    emptyMessage?: string;
  };
}
```

### 3. 実装戦略

#### Phase 1: 基盤コンポーネントの作成
1. `GenericListLayout`コンポーネントの実装
2. 共通ユーティリティ関数の整備（URL生成、パラメータ処理）
3. 共通型定義の整備

#### Phase 2: 段階的移行
1. 作品一覧ページから移行開始（最も複雑なケース）
2. 動画一覧、音声ボタン一覧への展開
3. 詳細ページ内のリストへの適用
4. トップページ、検索結果ページへの適用

#### Phase 3: 最適化と改善
1. パフォーマンスモニタリング
2. ユーザビリティテスト
3. アクセシビリティ改善

## 期待される効果

1. **開発効率の向上**
   - コードの重複削減（推定50-70%削減）
   - 新機能追加の容易化
   - バグ修正の一元化

2. **パフォーマンスの改善**
   - 全ページでFirestoreクエリ最適化
   - 統一されたキャッシュ戦略
   - Bundle size削減

3. **ユーザー体験の向上**
   - 一貫性のあるUI/UX
   - 予測可能な操作性
   - 高速なページ遷移

## 既存コンポーネントの分析

### packages/uiの既存コンポーネント

#### 1. レイアウトコンポーネント（すでに汎用化済み）
- `ListPageLayout` - ページ全体のレイアウト
- `ListPageHeader` - ページヘッダー
- `ListPageContent` - コンテンツエリア 
- `ListPageGrid` - グリッド表示
- `ListPageStats` - 統計情報
- `ListPageEmptyState` - 空状態

これらは**そのまま活用可能**。

#### 2. 制御コンポーネント（部分的に汎用化済み）
- `ListDisplayControls` - ソート・表示件数制御
- `SearchFilterPanel` - 検索・フィルターUI
- `Pagination` (shadcn/ui) - ページネーション

これらは**統合・改善が必要**。

### apps/webの実装

- `WorkList`, `VideoList`, `AudioButtonsList` など
- 各リストで同様のロジックを個別実装
- URLパラメータ処理、フィルター状態管理が重複

## 推奨アーキテクチャ

### 1. コンポーネントの配置

```
packages/ui/
├── components/
│   ├── custom/
│   │   ├── list-page-layout.tsx      (既存・維持)
│   │   ├── generic-list/              (新規)
│   │   │   ├── generic-list.tsx      
│   │   │   ├── use-list-state.ts     
│   │   │   ├── use-url-params.ts     
│   │   │   └── types.ts              
│   │   └── ...
│   └── ui/                            (既存・維持)
```

### 2. 新しい汎用リストコンポーネント

```typescript
// packages/ui/src/components/custom/generic-list/generic-list.tsx
interface GenericListProps<T> {
  // データ
  items: T[];
  totalCount: number;
  
  // 設定
  config: {
    baseUrl: string;
    itemsPerPageOptions?: number[];
    sortOptions?: SortOption[];
    filterDefinitions?: FilterDefinition[];
  };
  
  // レンダリング
  renderItem: (item: T) => React.ReactNode;
  renderEmptyState?: () => React.ReactNode;
  
  // Server Actions
  fetchData: (params: ListParams) => Promise<ListResult<T>>;
}
```

### 3. 共通ロジックの抽出

```typescript
// packages/ui/src/components/custom/generic-list/use-list-state.ts
export function useListState<T>(config: ListConfig) {
  // URLパラメータとの同期
  // フィルター状態管理
  // ページネーション計算
  // ソート・フィルター処理
}
```

### 4. 段階的移行戦略

#### Phase 1: 共通ロジックの抽出（packages/ui）
1. `useListState` - 状態管理フック
2. `useUrlParams` - URLパラメータ同期フック  
3. 共通型定義

#### Phase 2: 汎用コンポーネント実装（packages/ui）
1. `GenericList` - 汎用リストコンポーネント
2. 既存の`ListPageLayout`系と統合
3. テスト・ドキュメント作成

#### Phase 3: 既存リストの移行（apps/web）
1. `WorkList` → `GenericList`を使用
2. `VideoList` → `GenericList`を使用
3. その他のリストも順次移行

## 利点

1. **コードの集約**
   - 共通ロジックをpackages/uiに集約
   - apps/webは業務ロジックに集中

2. **保守性の向上**
   - バグ修正・機能追加が一箇所で完結
   - テストも集約化

3. **再利用性**
   - 新しいリストページの追加が容易
   - 一貫性のあるUX

## 次のステップ

1. Phase 1の実装開始（共通フックの作成）
2. 既存コンポーネントとの互換性確認
3. 段階的移行の詳細計画作成