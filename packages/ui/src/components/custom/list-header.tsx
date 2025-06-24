import type { ReactNode } from "react";
import { cn } from "../../lib/utils";

interface ListHeaderProps {
	title: string;
	totalCount: number;
	filteredCount?: number;
	currentPage?: number;
	totalPages?: number;
	className?: string;
	actions?: ReactNode;
}

/**
 * リスト表示用のヘッダーコンポーネント
 * - 件数表示とページング情報を統一
 * - フィルタ後の件数表示に対応
 * - アクションボタンの配置に対応
 */
export function ListHeader({
	title,
	totalCount,
	filteredCount,
	currentPage,
	totalPages,
	className,
	actions,
}: ListHeaderProps) {
	// フィルタが適用されているかどうか
	const isFiltered = filteredCount !== undefined && filteredCount !== totalCount;

	return (
		<div
			className={cn(
				"flex flex-col sm:flex-row sm:justify-between items-start sm:items-center mb-6 gap-2",
				className,
			)}
		>
			<div className="flex items-center gap-4">
				<h2 className="text-lg sm:text-xl font-semibold text-foreground">
					{title}{" "}
					{isFiltered ? (
						<span className="text-base font-normal">
							({filteredCount.toLocaleString()}件 / 全{totalCount.toLocaleString()}件)
						</span>
					) : (
						<span className="text-base font-normal">(全{totalCount.toLocaleString()}件)</span>
					)}
				</h2>
				{actions}
			</div>
			{currentPage && totalPages && totalPages > 1 && (
				<div className="text-sm text-muted-foreground">
					{currentPage}ページ / {totalPages}ページ
				</div>
			)}
		</div>
	);
}
