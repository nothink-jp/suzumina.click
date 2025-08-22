/**
 * ConfigurableListのフッター部分（ページネーション）
 */

import { ConfigurableListPagination } from "./ConfigurableListPagination";

interface ConfigurableListFooterProps {
	totalPages: number;
	currentPage: number;
	hasPrev: boolean;
	hasNext: boolean;
	onPageChange: (page: number) => void;
	total: number;
	startIndex: number;
	endIndex: number;
}

export function ConfigurableListFooter({
	totalPages,
	currentPage,
	hasPrev,
	hasNext,
	onPageChange,
	total,
	startIndex,
	endIndex,
}: ConfigurableListFooterProps) {
	if (totalPages <= 1) return null;

	return (
		<>
			<ConfigurableListPagination
				currentPage={currentPage}
				totalPages={totalPages}
				hasPrev={hasPrev}
				hasNext={hasNext}
				onPageChange={onPageChange}
			/>
			<div className="mt-2 text-center text-sm text-muted-foreground">
				{total}件中 {startIndex + 1}〜{Math.min(endIndex, total)}
				件を表示
			</div>
		</>
	);
}
