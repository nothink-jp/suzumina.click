import type { ReactNode } from "react";
import { cn } from "../../lib/utils";

interface ListPageLayoutProps {
	children: ReactNode;
	className?: string;
}

/**
 * リストページ用の共通レイアウトコンポーネント
 * - 背景色を統一（bg-background）
 * - コンテナサイズを統一（max-w-7xl）
 * - 余白を統一
 */
export function ListPageLayout({ children, className }: ListPageLayoutProps) {
	return <div className={cn("min-h-screen bg-background", className)}>{children}</div>;
}

interface ListPageHeaderProps {
	title: string;
	description?: string;
	children?: ReactNode;
	className?: string;
}

/**
 * リストページ用のヘッダーコンポーネント
 * - タイトルとサブタイトルのスタイルを統一
 * - 白背景に影付き
 */
export function ListPageHeader({ title, description, children, className }: ListPageHeaderProps) {
	return (
		<header className={cn("bg-white shadow-sm", className)}>
			<div className="max-w-7xl mx-auto px-4 py-6">
				<div className="flex items-center justify-between">
					<div>
						<h1 className="text-4xl font-bold text-foreground mb-2">{title}</h1>
						{description && <p className="text-muted-foreground">{description}</p>}
					</div>
					{children && <div className="flex items-center gap-4">{children}</div>}
				</div>
			</div>
		</header>
	);
}

interface ListPageContentProps {
	children: ReactNode;
	className?: string;
}

/**
 * リストページ用のメインコンテンツエリア
 * - 最大幅とパディングを統一
 */
export function ListPageContent({ children, className }: ListPageContentProps) {
	return <main className={cn("max-w-7xl mx-auto px-4 py-8", className)}>{children}</main>;
}

interface ListPageGridProps {
	children: ReactNode;
	className?: string;
	columns?: {
		default?: number;
		sm?: number;
		md?: number;
		lg?: number;
		xl?: number;
	};
}

// Tailwind v4 はソース中の「完全なクラス文字列」しか検出しない。
// `grid-cols-${n}` のような動的生成はクラスが生成されるか否かが他ファイル依存になり
// 非決定的（依存更新で列数が変わる不具合の原因）。breakpoint × 列数(1–12) を静的に列挙する。
const GRID_COLS: Record<number, string> = {
	1: "grid-cols-1",
	2: "grid-cols-2",
	3: "grid-cols-3",
	4: "grid-cols-4",
	5: "grid-cols-5",
	6: "grid-cols-6",
	7: "grid-cols-7",
	8: "grid-cols-8",
	9: "grid-cols-9",
	10: "grid-cols-10",
	11: "grid-cols-11",
	12: "grid-cols-12",
};
const SM_GRID_COLS: Record<number, string> = {
	1: "sm:grid-cols-1",
	2: "sm:grid-cols-2",
	3: "sm:grid-cols-3",
	4: "sm:grid-cols-4",
	5: "sm:grid-cols-5",
	6: "sm:grid-cols-6",
	7: "sm:grid-cols-7",
	8: "sm:grid-cols-8",
	9: "sm:grid-cols-9",
	10: "sm:grid-cols-10",
	11: "sm:grid-cols-11",
	12: "sm:grid-cols-12",
};
const MD_GRID_COLS: Record<number, string> = {
	1: "md:grid-cols-1",
	2: "md:grid-cols-2",
	3: "md:grid-cols-3",
	4: "md:grid-cols-4",
	5: "md:grid-cols-5",
	6: "md:grid-cols-6",
	7: "md:grid-cols-7",
	8: "md:grid-cols-8",
	9: "md:grid-cols-9",
	10: "md:grid-cols-10",
	11: "md:grid-cols-11",
	12: "md:grid-cols-12",
};
const LG_GRID_COLS: Record<number, string> = {
	1: "lg:grid-cols-1",
	2: "lg:grid-cols-2",
	3: "lg:grid-cols-3",
	4: "lg:grid-cols-4",
	5: "lg:grid-cols-5",
	6: "lg:grid-cols-6",
	7: "lg:grid-cols-7",
	8: "lg:grid-cols-8",
	9: "lg:grid-cols-9",
	10: "lg:grid-cols-10",
	11: "lg:grid-cols-11",
	12: "lg:grid-cols-12",
};
const XL_GRID_COLS: Record<number, string> = {
	1: "xl:grid-cols-1",
	2: "xl:grid-cols-2",
	3: "xl:grid-cols-3",
	4: "xl:grid-cols-4",
	5: "xl:grid-cols-5",
	6: "xl:grid-cols-6",
	7: "xl:grid-cols-7",
	8: "xl:grid-cols-8",
	9: "xl:grid-cols-9",
	10: "xl:grid-cols-10",
	11: "xl:grid-cols-11",
	12: "xl:grid-cols-12",
};

/**
 * リストページ用のグリッドレイアウト
 * - レスポンシブなグリッド表示
 * - カラム数をカスタマイズ可能（1〜12。範囲外は無視）
 */
export function ListPageGrid({
	children,
	className,
	columns = {
		default: 1,
		md: 2,
		lg: 3,
	},
}: ListPageGridProps) {
	const gridClasses = cn(
		"grid gap-6",
		GRID_COLS[columns.default ?? 1] ?? GRID_COLS[1],
		columns.sm && SM_GRID_COLS[columns.sm],
		columns.md && MD_GRID_COLS[columns.md],
		columns.lg && LG_GRID_COLS[columns.lg],
		columns.xl && XL_GRID_COLS[columns.xl],
		className,
	);

	return <div className={gridClasses}>{children}</div>;
}

interface ListPageStatsProps {
	currentPage: number;
	totalPages: number;
	totalCount: number;
	itemsPerPage: number;
	className?: string;
}

/**
 * リストページ用の統計情報表示
 * - ページング情報と件数表示
 */
export function ListPageStats({
	currentPage,
	totalPages: _totalPages,
	totalCount,
	itemsPerPage,
	className,
}: ListPageStatsProps) {
	const startItem = (currentPage - 1) * itemsPerPage + 1;
	const endItem = Math.min(currentPage * itemsPerPage, totalCount);

	return (
		<div className={cn("mt-6 text-sm text-muted-foreground text-center", className)}>
			{totalCount.toLocaleString()}件中 {startItem.toLocaleString()}〜{endItem.toLocaleString()}
			件を表示
		</div>
	);
}

interface ListPageEmptyStateProps {
	icon?: ReactNode;
	title: string;
	description?: string;
	action?: ReactNode;
	className?: string;
}

/**
 * リストページ用の空状態表示
 * - アイコン、メッセージ、アクションボタンを統一
 */
export function ListPageEmptyState({
	icon,
	title,
	description,
	action,
	className,
}: ListPageEmptyStateProps) {
	return (
		<div className={cn("text-center py-12", className)}>
			{icon && <div className="mx-auto w-24 h-24 mb-4 text-muted-foreground">{icon}</div>}
			<p className="text-muted-foreground text-lg">{title}</p>
			{description && <p className="text-muted-foreground mt-2">{description}</p>}
			{action && <div className="mt-4">{action}</div>}
		</div>
	);
}
