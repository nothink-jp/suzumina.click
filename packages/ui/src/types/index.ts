/**
 * UIコンポーネント共通の型定義
 */

// 基本的なプロップス
export interface BaseComponentProps {
	className?: string;
	children?: React.ReactNode;
}

// データ表示系のプロップス
export interface DataDisplayProps<T> extends BaseComponentProps {
	data: T;
	loading?: boolean;
	error?: Error | null;
}

// リスト表示系のプロップス
export interface ListDisplayProps<T> extends BaseComponentProps {
	items: T[];
	loading?: boolean;
	error?: Error | null;
	emptyMessage?: string;
}

// フィルター系のプロップス
export interface FilterProps<T> extends BaseComponentProps {
	value: T;
	onChange: (value: T) => void;
	disabled?: boolean;
}

// ページネーション系のプロップス
export interface PaginationProps extends BaseComponentProps {
	currentPage: number;
	totalPages: number;
	onPageChange: (page: number) => void;
	disabled?: boolean;
}

// ソート系のプロップス
export interface SortProps<T> extends BaseComponentProps {
	sortBy: T;
	sortOrder: "asc" | "desc";
	onSortChange: (sortBy: T, sortOrder: "asc" | "desc") => void;
	disabled?: boolean;
}

// 検索系のプロップス
export interface SearchProps extends BaseComponentProps {
	query: string;
	onQueryChange: (query: string) => void;
	placeholder?: string;
	disabled?: boolean;
}

// モーダル・ダイアログ系のプロップス
export interface ModalProps extends BaseComponentProps {
	isOpen: boolean;
	onClose: () => void;
	title?: string;
	description?: string;
}

// アクション系のプロップス
export interface ActionProps extends BaseComponentProps {
	onClick: () => void;
	disabled?: boolean;
	loading?: boolean;
}

// フォーム系のプロップス
export interface FormFieldProps<T> extends BaseComponentProps {
	name: string;
	value: T;
	onChange: (value: T) => void;
	error?: string;
	required?: boolean;
	disabled?: boolean;
}
