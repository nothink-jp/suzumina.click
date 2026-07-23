/**
 * 新しいリストコンポーネントの型定義
 */

/**
 * 選択肢の型定義
 */
export interface Option {
	value: string;
	label: string;
}

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
 * ソート設定
 */
export interface SortOption {
	value: string;
	label: string;
}

export type SortConfig = string | SortOption;

/**
 * リストエラー
 */
export interface ListError {
	type: "fetch" | "parse" | "validation";
	message: string;
	retry?: () => void;
}

/**
 * 汎用リスト表示・ページング・状態の props（責務: 「ページ分割されたリストをどう描画するか」）。
 * どのリストでも使う関心事のみ。フィルタ/ソート/検索/取得などの用途特化は ListQueryProps 側に置く。
 */
export interface ListDisplayProps<T> {
	items: T[];
	renderItem: (item: T, index: number) => React.ReactNode;
	className?: string;
	/** 検索結果ゼロ時の要約テキスト（コントロールバーの件数表示欄に使う簡潔な文字列） */
	emptyMessage?: string;
	/**
	 * リスト本体が空のときに emptyMessage の代わりに描画するリッチな空状態
	 * （例: `<EmptyState icon={...} title="..." action={...} />`）。
	 * 未指定時は従来どおり emptyMessage をテキストのみで表示する。
	 */
	emptyState?: React.ReactNode;
	loadingComponent?: React.ReactNode;

	// リスト本体の見出し（スクリーンリーダー向け）。
	// ページ h1 と各カードの見出し（h3）の間を埋める中間 h2 として sr-only で描画し、
	// 見出しレベルの skip を防ぐ。指定時のみ描画。
	listHeading?: string;

	// レイアウト設定
	layout?: "list" | "grid" | "flex";
	gridColumns?: {
		default?: number;
		sm?: number;
		md?: number;
		lg?: number;
		xl?: number;
	};

	// 状態（外部から注入する loading / error）
	loading?: boolean;
	error?: ListError;

	// ページング設定
	itemsPerPage?: number;
	itemsPerPageOptions?: number[];

	// 初期総数（サーバーサイドレンダリング時）
	initialTotal?: number;
}

/**
 * 用途特化のクエリ（フィルタ/ソート/検索/URL同期）とサーバー連携の props
 * （責務: 「リストをどう絞り込み・並べ替え・取得するか」）。設定値は画面ごとに異なる。
 */
export interface ListQueryProps<T> {
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
	fetchFn: (params: unknown) => Promise<unknown>;

	// 取得エラーのコールバック
	onError?: (error: Error) => void;
}

/**
 * ConfigurableList 用のプロパティ。
 * 汎用表示（ListDisplayProps）と用途特化クエリ（ListQueryProps）の合成。
 * どちらの責務に属する prop かは各インターフェイス定義を参照。
 */
export type ConfigurableListProps<T> = ListDisplayProps<T> & ListQueryProps<T>;

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
