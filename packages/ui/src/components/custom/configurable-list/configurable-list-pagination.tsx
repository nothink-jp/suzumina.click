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
	/**
	 * ページ番号から実 URL を作る。クローラが2ページ目以降を辿れるようにするため、
	 * 与えられた場合は各リンクの href に使う（SPR-308）。
	 * URL 同期していない一覧（urlSync=false）では URL に意味が無いため未指定＝`#` になる。
	 */
	getPageHref?: (page: number) => string;
}

export function ConfigurableListPagination({
	currentPage,
	totalPages,
	hasPrev,
	hasNext,
	onPageChange,
	getPageHref,
}: ConfigurableListPaginationProps) {
	// href はクローラの経路と、新しいタブで開く・戻る等のブラウザ標準動作のために置く。
	// クリック時は onPageChange 側が preventDefault するため href の遷移は起きない
	// （体感の挙動は変更前後で不変。use-list-url の pushState + popstate に App Router が
	// ハード遷移で応答するため、クリックは元々フルリロードになっている）。
	const hrefFor = (page: number) => getPageHref?.(page) ?? "#";

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
						href={hasPrev ? hrefFor(currentPage - 1) : "#"}
						aria-disabled={!hasPrev}
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
							href={hrefFor(1)}
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
							href={hrefFor(page)}
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
								href={hrefFor(totalPages)}
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
						href={hasNext ? hrefFor(currentPage + 1) : "#"}
						aria-disabled={!hasNext}
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
