/**
 * 新しいリストコンポーネントのエクスポート
 */

// フック
export { useListData } from "./core/hooks/useListData";
export { useListUrl } from "./core/hooks/useListUrl";
// 型定義
export type {
	ConfigurableListProps,
	DataAdapter,
	FilterConfig,
	ListController,
	ListDataSource,
	ListError,
	SimpleListProps,
	SortConfig,
	StandardListParams,
} from "./core/types";
export {
	calculatePagination,
	// データアダプター
	createDataAdapter,
	wrapLegacyFetchData,
} from "./core/utils/dataAdapter";
// ユーティリティ
export {
	generateOptions,
	generateYearOptions,
	getDefaultFilterValues,
	hasActiveFilters,
	isFilterEnabled,
	normalizeOptions,
	// フィルターヘルパー
	transformFilterValue,
	validateFilterValue,
} from "./core/utils/filterHelpers";

// コンポーネント（今後実装）
// export { SimpleList } from './components/SimpleList';
// export { ConfigurableList } from './components/ConfigurableList';
// export { AdvancedList } from './components/AdvancedList';
