/**
 * Pagination component for ConfigurableList
 */

import {
	Pagination,
	PaginationContent,
	PaginationEllipsis,
	PaginationItem,
	PaginationLink,
	PaginationNext,
	PaginationPrevious,
} from "../../ui/pagination";

interface ConfigurableListPaginationProps {
	currentPage: number;
	totalPages: number;
	hasPrev: boolean;
	hasNext: boolean;
	onPageChange: (page: number) => void;
}

export function ConfigurableListPagination({
	currentPage,
	totalPages,
	hasPrev,
	hasNext,
	onPageChange,
}: ConfigurableListPaginationProps) {
	const maxVisiblePages = 5;
	const halfVisible = Math.floor(maxVisiblePages / 2);

	// ページ番号の範囲を計算
	let startPage = Math.max(1, currentPage - halfVisible);
	const endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);

	// 開始ページを調整
	if (endPage - startPage < maxVisiblePages - 1) {
		startPage = Math.max(1, endPage - maxVisiblePages + 1);
	}

	return (
		<Pagination className="mt-8">
			<PaginationContent>
				{/* Previous ボタン */}
				<PaginationItem>
					<PaginationPrevious
						href="#"
						onClick={(e) => {
							e.preventDefault();
							if (hasPrev) {
								onPageChange(currentPage - 1);
							}
						}}
						className={!hasPrev ? "pointer-events-none opacity-50" : "cursor-pointer"}
					/>
				</PaginationItem>

				{/* 最初のページと省略記号 */}
				{startPage > 1 && (
					<PaginationItem key="page-1">
						<PaginationLink
							href="#"
							onClick={(e) => {
								e.preventDefault();
								onPageChange(1);
							}}
						>
							1
						</PaginationLink>
					</PaginationItem>
				)}
				{startPage > 2 && (
					<PaginationItem key="ellipsis-start">
						<PaginationEllipsis />
					</PaginationItem>
				)}

				{/* ページ番号 */}
				{Array.from({ length: endPage - startPage + 1 }, (_, i) => startPage + i).map((page) => (
					<PaginationItem key={`page-${page}`}>
						<PaginationLink
							href="#"
							isActive={currentPage === page}
							onClick={(e) => {
								e.preventDefault();
								onPageChange(page);
							}}
						>
							{page}
						</PaginationLink>
					</PaginationItem>
				))}

				{/* 最後のページと省略記号 */}
				{endPage < totalPages && (
					<>
						{endPage < totalPages - 1 && (
							<PaginationItem key="ellipsis-end">
								<PaginationEllipsis />
							</PaginationItem>
						)}
						<PaginationItem key={`page-${totalPages}`}>
							<PaginationLink
								href="#"
								onClick={(e) => {
									e.preventDefault();
									onPageChange(totalPages);
								}}
							>
								{totalPages}
							</PaginationLink>
						</PaginationItem>
					</>
				)}

				{/* Next ボタン */}
				<PaginationItem>
					<PaginationNext
						href="#"
						onClick={(e) => {
							e.preventDefault();
							if (hasNext) {
								onPageChange(currentPage + 1);
							}
						}}
						className={!hasNext ? "pointer-events-none opacity-50" : "cursor-pointer"}
					/>
				</PaginationItem>
			</PaginationContent>
		</Pagination>
	);
}
