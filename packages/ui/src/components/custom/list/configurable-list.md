# ConfigurableList Component

カスタマイズ可能なリストコンポーネント。フィルター、ソート、URL同期、サーバーサイドデータ取得機能を提供します。

## 特徴

- カスタムフィルター（select, boolean, multiselect, range等）
- カスタムソートオプション
- URL同期（ブラウザバック/フォワード対応）
- サーバーサイドデータ取得
- クライアントサイドフィルタリング
- デバウンス付き検索
- ローディング・エラー状態の表示
- レスポンシブデザイン

## 使用例

### 基本的な使用

```tsx
import { ConfigurableList } from "@suzumina.click/ui/components/custom/list";

const filters = {
  category: {
    type: "select",
    options: ["Electronics", "Books", "Clothing"],
    showAll: true,
  },
  inStock: {
    type: "boolean",
  },
};

const sorts = [
  { value: "createdAt", label: "新着順" },
  { value: "price", label: "価格順" },
];

function ProductList({ products }) {
  return (
    <ConfigurableList
      items={products}
      renderItem={(product) => <ProductCard product={product} />}
      filters={filters}
      sorts={sorts}
      defaultSort="createdAt"
    />
  );
}
```

### サーバーサイドデータ取得

```tsx
const fetchProducts = async (params) => {
  const response = await fetch(`/api/products?${new URLSearchParams(params)}`);
  return response.json();
};

function ProductList() {
  return (
    <ConfigurableList
      items={[]}
      renderItem={(product) => <ProductCard product={product} />}
      filters={filters}
      sorts={sorts}
      fetchFn={fetchProducts}
      dataAdapter={{
        toParams: (params) => ({
          page: params.page,
          limit: params.itemsPerPage,
          sort: params.sort,
          search: params.search,
          ...params.filters,
        }),
        fromResult: (result) => ({
          items: result.data,
          total: result.totalCount,
        }),
      }}
    />
  );
}
```

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| items | `T[]` | - | 表示するアイテムの配列 |
| renderItem | `(item: T, index: number) => ReactNode` | - | 各アイテムのレンダリング関数 |
| itemsPerPage | `number` | 12 | 1ページあたりの表示件数 |
| loading | `boolean` | false | ローディング状態 |
| error | `ListError` | undefined | エラー情報 |
| className | `string` | "" | 追加のCSSクラス |
| **ConfigurableList専用** |
| filters | `Record<string, FilterConfig>` | {} | フィルター設定 |
| sorts | `SortConfig[]` | [] | ソートオプション |
| defaultSort | `string` | undefined | デフォルトのソート |
| searchable | `boolean` | true | 検索機能の有効/無効 |
| searchPlaceholder | `string` | "検索..." | 検索プレースホルダー |
| urlSync | `boolean` | true | URL同期の有効/無効 |
| dataAdapter | `DataAdapter<T>` | undefined | データアダプター |
| fetchFn | `(params: any) => Promise<any>` | undefined | データ取得関数 |
| onError | `(error: ListError) => void` | undefined | エラーハンドラー |
| emptyMessage | `string` | "データがありません" | 空状態のメッセージ |
| loadingComponent | `ReactNode` | undefined | カスタムローディング |

## フィルター設定

### Select Filter
```tsx
{
  type: "select",
  options: ["Option1", "Option2", "Option3"],
  showAll: true,  // "すべて"オプションを表示
}
```

### Boolean Filter
```tsx
{
  type: "boolean",
}
```

### Multiselect Filter (予定)
```tsx
{
  type: "multiselect",
  options: ["Tag1", "Tag2", "Tag3"],
}
```

### Range Filter (予定)
```tsx
{
  type: "range",
}
```

## URL同期

URLパラメータと自動的に同期します：
- `?page=2` - ページ番号
- `?sort=price` - ソート
- `?search=keyword` - 検索キーワード
- `?category=Electronics` - フィルター

## パフォーマンス

- 検索入力は300msのデバウンス
- サーバーサイドデータ取得時は自動的にリクエストキャンセル
- 不要な再レンダリングを防ぐメモ化