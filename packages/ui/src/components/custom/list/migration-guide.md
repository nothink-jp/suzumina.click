# GenericList → 新リストコンポーネント移行ガイド

このガイドでは、既存のGenericListから新しいリストコンポーネントへの移行方法を説明します。

## 移行戦略

### 1. 互換性レイヤーを使用（推奨）

既存のコードを変更せずに、新しいコンポーネントの恩恵を受けられます。

```typescript
// 変更前
import { GenericList } from "@suzumina.click/ui/components/custom/generic-list";

// 変更後（importを変更するだけ）
import { GenericList } from "@suzumina.click/ui/components/custom/list/generic-list-compat";
```

### 2. ConfigurableListへの直接移行

より多くの機能と改善されたAPIを利用できます。

```typescript
// 変更前
import { GenericList } from "@suzumina.click/ui/components/custom/generic-list";

const MyList = () => {
  const config = {
    filters: [
      { key: "category", type: "select", label: "カテゴリー", options: [...] }
    ],
    sorts: [{ value: "createdAt", label: "作成日" }],
    searchConfig: { placeholder: "検索..." }
  };

  return <GenericList config={config} fetchData={fetchData} renderItem={renderItem} />;
};

// 変更後
import { ConfigurableList } from "@suzumina.click/ui/components/custom/list";
import { migrateListConfig } from "@suzumina.click/ui/components/custom/list/migration-helpers";

const MyList = () => {
  const oldConfig = { /* 既存のconfig */ };
  const newProps = migrateListConfig(oldConfig);

  return (
    <ConfigurableList
      {...newProps}
      items={[]}
      fetchFn={fetchData}
      dataAdapter={{
        toParams: (params) => params,
        fromResult: (result) => ({
          items: result.items,
          total: result.filteredCount
        })
      }}
      renderItem={renderItem}
    />
  );
};
```

## サポート状況

### ✅ 完全サポート
- selectフィルター
- booleanフィルター
- ソート機能
- 検索機能
- ページネーション
- URL同期
- サーバーサイドデータ取得

### ⚠️ 部分サポート（手動移行が必要）
- 依存フィルター（dependsOn） - 基本的な機能のみ
- カスタムバリデーション
- transform関数

### ❌ 未サポート（今後追加予定）
- multiselectフィルター
- rangeフィルター
- dateRangeフィルター
- customフィルター
- getDynamicOptions
- カスタムURLパラメータマッピング
- itemsPerPageOptions

## 移行チェックリスト

1. **移行準備状況の確認**
```typescript
import { checkMigrationReadiness } from "@suzumina.click/ui/components/custom/list/migration-helpers";

const { ready, warnings, unsupportedFeatures } = checkMigrationReadiness(config);
if (!ready) {
  console.log("Unsupported features:", unsupportedFeatures);
}
```

2. **互換性レイヤーでテスト**
   - importを変更
   - 動作確認
   - エラーがないか確認

3. **段階的な移行**
   - 互換性レイヤーで安定動作を確認
   - 必要に応じてConfigurableListへ移行
   - 未サポート機能は手動で実装

## トラブルシューティング

### フィルターが表示されない
- フィルタータイプがサポートされているか確認
- console.warnでの警告を確認

### データが取得できない
- fetchDataの戻り値が正しい形式か確認
- dataAdapterが正しく設定されているか確認

### URL同期が動作しない
- urlSync={true}が設定されているか確認
- Next.jsのuseSearchParamsが利用可能か確認

## 移行例

### 動画一覧ページの移行

```typescript
// Before (GenericList)
<GenericList
  config={{
    title: "動画一覧",
    baseUrl: "/videos",
    filters: [
      {
        key: "year",
        type: "select",
        label: "年代",
        options: yearOptions,
      }
    ],
    sorts: [
      { value: "releasedAt", label: "配信日" },
      { value: "reviewCount", label: "レビュー数" }
    ]
  }}
  fetchData={fetchVideos}
  renderItem={(video) => <VideoCard video={video} />}
/>

// After (ConfigurableList)
<ConfigurableList
  items={[]}
  renderItem={(video) => <VideoCard video={video} />}
  filters={{
    year: {
      type: "select",
      options: yearOptions,
      showAll: true
    }
  }}
  sorts={[
    { value: "releasedAt", label: "配信日" },
    { value: "reviewCount", label: "レビュー数" }
  ]}
  fetchFn={fetchVideos}
  dataAdapter={{
    toParams: (params) => ({
      ...params,
      limit: params.itemsPerPage
    }),
    fromResult: (result) => ({
      items: result.items,
      total: result.filteredCount
    })
  }}
/>
```

## 利点

### パフォーマンス向上
- 不要な再レンダリングの削減
- デバウンス付き検索
- リクエストキャンセル機能

### 開発体験の向上
- より直感的なAPI
- TypeScript型の改善
- エラーハンドリングの強化

### 保守性の向上
- コンポーネントの責務が明確
- テストが書きやすい
- 拡張しやすい設計