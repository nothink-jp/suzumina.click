/**
 * 新しいリストコンポーネントの型定義
 */

/**
 * データソースの基本構造
 * filteredCountは削除し、items.lengthから算出
 */
export interface ListDataSource<T> {
	items: T[];
	total: number;
}

/**
 * データアダプターパターン
 * 既存のAPIと新しいコンポーネントをつなぐ
 */
export interface DataAdapter<T, P = any> {
	/** リストパラメータをAPI用のパラメータに変換 */
	toParams: (listParams: StandardListParams) => P;
	/** APIの結果をリストデータソースに変換 */
	fromResult: (result: P) => ListDataSource<T>;
}

/**
 * 標準化されたリストパラメータ
 */
export interface StandardListParams {
	page: number;
	itemsPerPage: number;
	sort?: string;
	search?: string;
	filters: Record<string, any>;
}

/**
 * フィルター設定（簡潔版）
 */
export interface FilterConfig {
	type: "select" | "multiselect" | "range" | "date" | "boolean";

	// 選択肢（selectとmultiselectで使用）
	options?: string[] | Array<{ value: string; label: string }>;

	// "all"オプションの自動生成
	showAll?: boolean;

	// "all"が選択された時の値（デフォルト: undefined）
	emptyValue?: any;

	// バリデーション
	validate?: (value: any) => boolean;

	// 他のフィルターへの依存
	dependsOn?: string;
	enabled?: (filters: Record<string, any>) => boolean;
}

/**
 * ソート設定（簡潔版）
 */
export type SortConfig = string | { value: string; label: string };

/**
 * リストエラー
 */
export interface ListError {
	type: "fetch" | "parse" | "validation";
	message: string;
	retry?: () => void;
}

/**
 * SimpleList用のプロパティ
 */
export interface SimpleListProps<T> {
	items: T[];
	renderItem: (item: T, index: number) => React.ReactNode;
	itemsPerPage?: number;
	loading?: boolean;
	error?: ListError;
	className?: string;
}

/**
 * ConfigurableList用のプロパティ
 */
export interface ConfigurableListProps<T> extends SimpleListProps<T> {
	// フィルター設定
	filters?: Record<string, FilterConfig>;

	// ソート設定
	sorts?: SortConfig[];
	defaultSort?: string;

	// 検索設定
	searchable?: boolean;
	searchPlaceholder?: string;

	// URL同期
	urlSync?: boolean;

	// データアダプター（既存APIとの接続用）
	dataAdapter?: DataAdapter<T>;
	fetchFn?: (params: any) => Promise<any>;

	// カスタマイズ
	onError?: (error: ListError) => void;
	emptyMessage?: string;
	loadingComponent?: React.ReactNode;

	// レイアウト設定
	layout?: "list" | "grid";
	gridColumns?: {
		default?: number;
		sm?: number;
		md?: number;
		lg?: number;
		xl?: number;
	};

	// ページサイズ設定
	itemsPerPageOptions?: number[];
}

/**
 * AdvancedList用のコントローラー
 */
export interface ListController<T> {
	// 状態
	items: T[];
	loading: boolean;
	error: ListError | null;

	// フィルター
	filters: Record<string, any>;
	setFilter: (key: string, value: any) => void;
	resetFilters: () => void;

	// ソート
	sort: string;
	setSort: (sort: string) => void;

	// 検索
	search: string;
	setSearch: (search: string) => void;

	// ページネーション
	page: number;
	totalPages: number;
	setPage: (page: number) => void;

	// データ操作
	refresh: () => Promise<void>;
}
