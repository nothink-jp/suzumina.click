/**
 * 共通リストコンポーネントの型定義
 */

// フィルタータイプの定義
export type FilterType =
	| "select"
	| "multiselect"
	| "range"
	| "dateRange"
	| "search"
	| "boolean"
	| "custom";

// フィルター定義
export interface FilterDefinition {
	key: string;
	type: FilterType;
	label: string;
	placeholder?: string;
	options?: Array<{ value: string; label: string }>;
	defaultValue?: any;
	validation?: (value: any) => boolean;
	transform?: (value: any) => any;
	// 依存関係
	dependsOn?: string;
	getDynamicOptions?: (parentValue: any) => Array<{ value: string; label: string }>;
}

// ソート定義
export interface SortDefinition {
	value: string;
	label: string;
}

// ページネーション設定
export interface PaginationConfig {
	currentPage: number;
	itemsPerPage: number;
	itemsPerPageOptions?: number[];
}

// 検索設定
export interface SearchConfig {
	placeholder?: string;
	debounceMs?: number;
}

// リスト設定
export interface ListConfig {
	title?: string;
	baseUrl: string;
	filters?: FilterDefinition[];
	sorts?: SortDefinition[];
	defaultSort?: string;
	searchConfig?: SearchConfig;
	paginationConfig?: Partial<PaginationConfig>;
	// URLパラメータのカスタマイズ
	urlParamMapping?: {
		page?: string;
		limit?: string;
		sort?: string;
		search?: string;
		[key: string]: string | undefined;
	};
}

// リストパラメータ（URLやフィルターの値）
export interface ListParams {
	page: number;
	limit: number;
	sort?: string;
	search?: string;
	filters: Record<string, any>;
}

// リスト結果
export interface ListResult<T> {
	items: T[];
	totalCount: number;
	filteredCount: number;
}

// リスト状態
export interface ListState<T = any> {
	// データ
	items: T[];
	// 件数管理
	counts: {
		total: number;
		filtered: number;
		displayed: number;
	};
	// ページネーション
	pagination: {
		currentPage: number;
		itemsPerPage: number;
		totalPages: number;
	};
	// フィルター
	filters: Record<string, any>;
	// ソート
	sort: string;
	// 検索
	search: string;
	// ローディング状態
	isLoading: boolean;
	// エラー状態
	error: string | null;
}

// アクション型
export type ListAction =
	| { type: "SET_ITEMS"; payload: { items: any[]; totalCount: number; filteredCount: number } }
	| { type: "SET_PAGE"; payload: number }
	| { type: "SET_ITEMS_PER_PAGE"; payload: number }
	| { type: "SET_FILTER"; payload: { key: string; value: any } }
	| { type: "SET_FILTERS"; payload: Record<string, any> }
	| { type: "RESET_FILTERS" }
	| { type: "SET_SORT"; payload: string }
	| { type: "SET_SEARCH"; payload: string }
	| { type: "SET_LOADING"; payload: boolean }
	| { type: "SET_ERROR"; payload: string | null };
