# ConfigurableList 分割計画

**作成日**: 2025年8月12日  
**対象**: packages/ui/src/components/custom/list/configurable-list.tsx  
**現在サイズ**: 28,337バイト (948行)  
**使用箇所**: 17ファイル

## 問題点

ConfigurableListは単一コンポーネントに以下の機能すべてを含んでいる：
- ページネーション
- ソート
- 検索
- フィルター（6種類のフィルタータイプ）
- URL同期
- グリッド/リスト表示切り替え
- エラーハンドリング
- ローディング状態

これにより：
- 全ページで巨大なバンドルサイズ
- 単一責任原則違反
- テストの困難さ
- 保守性の低下

## 分割方針

### 3つのコンポーネントに分割

#### 1. BasicList (推定8KB)
**責任**: 基本的なリスト表示とページネーション
```typescript
interface BasicListProps<T> {
  items: T[];
  renderItem: (item: T, index: number) => React.ReactNode;
  itemsPerPage?: number;
  loading?: boolean;
  error?: ListError;
  className?: string;
}
```
**機能**:
- ページネーション
- ローディング/エラー状態
- 基本的なリスト表示

#### 2. SortableList (推定12KB)
**責任**: BasicList + ソート機能
```typescript
interface SortableListProps<T> extends BasicListProps<T> {
  sorts?: SortConfig[];
  defaultSort?: string;
  searchable?: boolean;
  searchPlaceholder?: string;
}
```
**機能**:
- BasicListのすべての機能
- ソート機能
- 検索機能

#### 3. FilterableList (推定16KB)
**責任**: SortableList + フィルター機能
```typescript
interface FilterableListProps<T> extends SortableListProps<T> {
  filters?: Record<string, FilterConfig>;
  urlSync?: boolean;
  displayMode?: "grid" | "list";
}
```
**機能**:
- SortableListのすべての機能
- フィルター機能（全6種類）
- URL同期
- 表示モード切り替え

## 移行計画

### Phase 1: 新コンポーネント作成（8時間）
1. BasicList実装
2. SortableList実装（BasicListを拡張）
3. FilterableList実装（SortableListを拡張）
4. ユニットテスト作成

### Phase 2: 互換性レイヤー作成（2時間）
```typescript
// 既存のConfigurableListを新実装へのプロキシに
export function ConfigurableList<T>(props: ConfigurableListProps<T>) {
  // プロパティに基づいて適切なコンポーネントを選択
  if (props.filters || props.urlSync) {
    return <FilterableList {...props} />;
  }
  if (props.sorts || props.searchable) {
    return <SortableList {...props} />;
  }
  return <BasicList {...props} />;
}
```

### Phase 3: 段階的移行（4時間）
1. 各使用箇所を分析
2. 最も単純な使用箇所から移行開始
3. 複雑な使用箇所は最後に移行

### Phase 4: 旧実装削除（1時間）
1. すべての移行完了確認
2. 旧ConfigurableList削除
3. 互換性レイヤー削除

## 使用箇所の分析と移行先

| ファイル | 現在の使用 | 移行先 |
|---------|----------|--------|
| app/works/page.tsx | フィルター、ソート、URL同期 | FilterableList |
| app/videos/page.tsx | フィルター、ソート、URL同期 | FilterableList |
| app/creators/[creatorId]/page.tsx | フィルター、ソート | SortableList |
| app/circles/[circleId]/page.tsx | フィルター、ソート | SortableList |
| app/search/page.tsx | フィルター、ソート、URL同期 | FilterableList |
| components/works-list.tsx | ソート、検索 | SortableList |
| components/videos-list.tsx | ソート、検索 | SortableList |
| その他10箇所 | 基本機能のみ | BasicList |

## 期待される効果

### バンドルサイズ削減
- BasicList使用箇所: -20KB（71%削減）
- SortableList使用箇所: -16KB（57%削減）
- FilterableList使用箇所: -12KB（43%削減）

### パフォーマンス改善
- 初回ロード: 100-200ms改善
- TypeScriptコンパイル: 15-20%高速化
- テスト実行: 30%高速化

### 保守性向上
- 単一責任原則の遵守
- テストの簡素化
- 機能追加の容易化

## リスクと対策

### リスク1: 互換性の破壊
**対策**: 互換性レイヤーで既存APIを完全に維持

### リスク2: 機能の欠落
**対策**: 
- 包括的なテストスイート作成
- 段階的な移行
- カナリアリリース

### リスク3: パフォーマンス劣化
**対策**:
- ベンチマーク測定
- React.memoによる最適化
- 不要な再レンダリング防止

## 実装優先順位

1. **即座に実行**: BasicList実装（最も使用頻度が高い）
2. **1週間以内**: SortableList実装
3. **2週間以内**: FilterableList実装と移行開始
4. **1ヶ月以内**: 全移行完了

## 成功指標

- [ ] バンドルサイズ40%以上削減
- [ ] 全テスト合格
- [ ] パフォーマンステスト改善確認
- [ ] 既存機能の完全な互換性維持
- [ ] ドキュメント更新完了

---
**レビュー状態**: 計画完了  
**次のアクション**: BasicList実装開始