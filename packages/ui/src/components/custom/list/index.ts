/**
 * リストコンポーネントのエクスポート
 */

export { ConfigurableList } from "./configurable-list";
export { useListData } from "./core/hooks/useListData";
export { useListUrl } from "./core/hooks/useListUrl";
// Core types and utilities
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
	createDataAdapter,
	wrapLegacyFetchData,
} from "./core/utils/dataAdapter";
export {
	generateOptions,
	generateYearOptions,
	getDefaultFilterValues,
	hasActiveFilters,
	isFilterEnabled,
	normalizeOptions,
	transformFilterValue,
	validateFilterValue,
} from "./core/utils/filterHelpers";
// Compatibility layer
export { GenericListCompat, type GenericListCompatProps } from "./generic-list-compat";
// Migration helpers
export {
	checkMigrationReadiness,
	generateMigrationGuide,
	migrateFetchDataResponse,
	migrateFilters,
	migrateListConfig,
	migrateSorts,
} from "./migration-helpers";
// Components
export { SimpleList } from "./simple-list";
