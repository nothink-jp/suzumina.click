/**
 * Pagination component for ConfigurableList
 */

import {
	Pagination,
	PaginationContent,
	PaginationItem,
	PaginationLink,
	PaginationNext,
	PaginationPrevious,
} from "../../ui/pagination";
import { getPaginationPages } from "./pagination-pages";

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

	// どのページ番号を出すかは pagination-pages.ts が決める（クローラの到達深度に直結・SPR-308）
	const pages = getPaginationPages(currentPage, totalPages);

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

				{/* ページ番号（飛びのある番号列になる。飛ぶ先が省略区間の中間ページ） */}
				{pages.map((page) => (
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
