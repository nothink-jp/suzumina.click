import type { ReactNode } from "react";
import { cn } from "../../lib/utils";

interface ListPageLayoutProps {
	children: ReactNode;
	className?: string;
}

/**
 * リストページ用の共通レイアウトコンポーネント
 * - 背景色を統一（bg-gray-50）
 * - コンテナサイズを統一（max-w-7xl）
 * - 余白を統一
 */
export function ListPageLayout({ children, className }: ListPageLayoutProps) {
	return <div className={cn("min-h-screen bg-gray-50", className)}>{children}</div>;
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

/**
 * リストページ用のグリッドレイアウト
 * - レスポンシブなグリッド表示
 * - カラム数をカスタマイズ可能
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
		{
			[`grid-cols-${columns.default || 1}`]: true,
			[`sm:grid-cols-${columns.sm}`]: columns.sm,
			[`md:grid-cols-${columns.md}`]: columns.md,
			[`lg:grid-cols-${columns.lg}`]: columns.lg,
			[`xl:grid-cols-${columns.xl}`]: columns.xl,
		},
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
