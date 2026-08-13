import { PaginationLink } from "../../ui/pagination";

/**
 * 全ページへのリンクを折りたたみで置く（SPR-308 ③）。
 *
 * ページ送りは「現在ページ ±2 ＋ 先頭 ＋ 末尾」しかリンクしないため、末端ページへは
 * 2ページずつしか進めない。実測では 181 ページの一覧で最深 45 ホップ必要で、
 * 深いページはクローラに事実上発見されない。
 *
 * ページ送り自体に中間ページを混ぜる案は、番号が飛んで（1 4 8 9 …）人間には
 * 読みにくくなるため採らない。**クローラの都合と人間の UI を同じ場所で満たそうと
 * しないのが要点**で、ページ送りは従来どおりに保ち、全ページのリンクはここに置く。
 * これで到達深度は 1 ホップになる（どのページからでも任意のページへ直接リンクがある）。
 *
 * 折りたたみの中身も DOM には存在するのでクローラはリンクを辿れる。閉じた領域の
 * テキストはランキング上の重みが下がるが、ここで必要なのは発見であって重み付けではない。
 * ユーザーが実際に開いて使える機能なので隠しリンクにも当たらない。
 */

/** ページ送りが一度に見せられるページ数（現在ページの窓5 ＋ 先頭 ＋ 末尾） */
const PAGES_SHOWN_BY_PAGINATION = 7;

interface ConfigurableListPageJumpProps {
	currentPage: number;
	totalPages: number;
	onPageChange: (page: number) => void;
	/** ページ番号から実 URL を作る（未指定なら `#`）。ページ送りと同じものを受け取る */
	getPageHref?: (page: number) => string;
}

export function ConfigurableListPageJump({
	currentPage,
	totalPages,
	onPageChange,
	getPageHref,
}: ConfigurableListPageJumpProps) {
	// ページ送りに全ページが出ているなら、同じリンクを二度置く意味がない
	if (totalPages <= PAGES_SHOWN_BY_PAGINATION) return null;

	return (
		<details className="mt-3">
			<summary className="cursor-pointer text-center text-sm text-muted-foreground hover:text-foreground">
				ページを選んで移動（全{totalPages}ページ）
			</summary>
			<ul className="mt-3 flex flex-wrap justify-center gap-1">
				{Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
					<li key={`jump-${page}`}>
						<PaginationLink
							href={getPageHref?.(page) ?? "#"}
							size="icon-sm"
							isActive={currentPage === page}
							onClick={(e) => {
								e.preventDefault();
								onPageChange(page);
							}}
						>
							{page}
						</PaginationLink>
					</li>
				))}
			</ul>
		</details>
	);
}
