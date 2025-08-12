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
export interface DataAdapter<T, TParams = unknown> {
	/** リストパラメータをAPI用のパラメータに変換 */
	toParams: (listParams: StandardListParams) => TParams;
	/** APIの結果をリストデータソースに変換 */
	fromResult: (result: unknown) => ListDataSource<T>;
}

/**
 * 標準化されたリストパラメータ
 */
export interface StandardListParams {
	page: number;
	itemsPerPage: number;
	sort?: string;
	search?: string;
	filters: Record<string, unknown>;
}

/**
 * フィルター設定（簡潔版）
 */
export interface FilterConfig {
	type: "select" | "multiselect" | "range" | "date" | "dateRange" | "boolean" | "tags";

	// フィルターの表示ラベル
	label?: string;

	// プレースホルダーテキスト
	placeholder?: string;

	// 選択肢（selectとmultiselectで使用）
	options?: string[] | Array<{ value: string; label: string }>;

	// 範囲設定（rangeで使用）
	min?: number;
	max?: number;
	step?: number;

	// 日付範囲設定（dateRangeで使用）
	minDate?: string;
	maxDate?: string;

	// "all"オプションの自動生成
	showAll?: boolean;

	// "all"が選択された時の値（デフォルト: undefined）
	emptyValue?: unknown;

	// バリデーション
	validate?: (value: unknown) => boolean;

	// 他のフィルターへの依存
	dependsOn?: string;
	enabled?: (filters: Record<string, unknown>) => boolean;

	// デフォルト値
	defaultValue?: unknown;
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
 * ConfigurableList用のプロパティ
 */
export interface ConfigurableListProps<T> {
	items: T[];
	renderItem: (item: T, index: number) => React.ReactNode;
	itemsPerPage?: number;
	loading?: boolean;
	error?: ListError;
	className?: string;
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
	fetchFn?: (params: unknown) => Promise<unknown>;

	// カスタマイズ
	onError?: (error: ListError) => void;
	emptyMessage?: string;
	loadingComponent?: React.ReactNode;

	// レイアウト設定
	layout?: "list" | "grid" | "flex";
	gridColumns?: {
		default?: number;
		sm?: number;
		md?: number;
		lg?: number;
		xl?: number;
	};

	// ページサイズ設定
	itemsPerPageOptions?: number[];

	// 初期総数（サーバーサイドレンダリング時）
	initialTotal?: number;
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
	filters: Record<string, unknown>;
	setFilter: (key: string, value: unknown) => void;
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
