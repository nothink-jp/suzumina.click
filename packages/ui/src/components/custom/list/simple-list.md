# SimpleList Component

最もシンプルなリストコンポーネント。自動ページネーション、基本的なソート、タイトル検索機能を提供します。

## 特徴

- 自動ページネーション
- タイトル検索（title, name, label プロパティを自動検索）
- 日付ソート（createdAt, updatedAt, date プロパティを自動認識）
- ローディング・エラー状態の表示
- レスポンシブデザイン

## 使用例

```tsx
import { SimpleList } from "@suzumina.click/ui/components/custom/list";

interface Item {
  id: string;
  title: string;
  createdAt: string;
}

function MyList({ items }: { items: Item[] }) {
  return (
    <SimpleList
      items={items}
      renderItem={(item) => (
        <div key={item.id}>
          <h3>{item.title}</h3>
          <p>{new Date(item.createdAt).toLocaleDateString()}</p>
        </div>
      )}
      itemsPerPage={10}
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

## 自動機能

### 検索
アイテムが以下のプロパティを持つ場合、自動的に検索可能になります：
- `title`
- `name`
- `label`

### ソート
アイテムが以下のプロパティを持つ場合、自動的にソート可能になります：
- `createdAt`
- `updatedAt`
- `date`

## 制限事項

- フィルター機能なし（ConfigurableListを使用してください）
- カスタムソートなし（ConfigurableListを使用してください）
- URL同期なし（ConfigurableListを使用してください）