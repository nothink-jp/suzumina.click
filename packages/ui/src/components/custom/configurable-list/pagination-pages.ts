/**
 * ページ送りに出すページ番号を決める（SPR-308 ③）。
 *
 * ここが決めているのは見た目だけでなく**クローラの到達深度**。リンクが
 * 「現在ページ ±2 ＋ 先頭 ＋ 末尾」だけだと、末端のページへ到達するのに
 * 2ページずつしか進めず、ページ数に比例した深さが必要になる（実測: 181ページで
 * 最深45ホップ）。深いページは事実上発見されない。
 *
 * そこで**省略される区間の中間ページへリンクを1つ置く**（二分探索と同じ原理）。
 * 到達深度が O(log n) になり、実測は次のとおり:
 *
 * | 一覧 | ページ数 | 変更前 | 変更後 |
 * | -- | -- | -- | -- |
 * | /circles | 33 | 8 | 4 |
 * | /creators | 99 | 24 | 5 |
 * | 声優の作品一覧 | 181 | 45 | 6 |
 *
 * 表示上は「1 5 8 9 10 11 12 21 33」のように飛びのある番号列になる（従来の
 * 省略記号の位置が、そこへ飛べるリンクに変わる）。
 */

/** 現在ページの前後に出すページ数（現在ページを含む窓の幅） */
const WINDOW_SIZE = 5;

/**
 * 表示するページ番号を昇順で返す（重複なし）。
 *
 * 内訳は「先頭 ＋ 先頭側の中間 ＋ 現在ページの窓 ＋ 末尾側の中間 ＋ 末尾」。
 * 中間ページは省略区間が2ページ以上あるときだけ足す（1ページしか飛ばないなら
 * そのページ自体が中間なので、窓の外に別途足す意味がない）。
 */
export function getPaginationPages(currentPage: number, totalPages: number): number[] {
	if (totalPages <= 0) return [];

	const half = Math.floor(WINDOW_SIZE / 2);
	let startPage = Math.max(1, currentPage - half);
	const endPage = Math.min(totalPages, startPage + WINDOW_SIZE - 1);
	if (endPage - startPage < WINDOW_SIZE - 1) {
		startPage = Math.max(1, endPage - WINDOW_SIZE + 1);
	}

	const pages = new Set<number>([1, totalPages]);
	for (let page = startPage; page <= endPage; page++) pages.add(page);

	// 省略される区間の中間へ飛べるようにする（到達深度を O(log n) にする本体）
	if (startPage > 2) pages.add(Math.floor((1 + startPage) / 2));
	if (endPage < totalPages - 1) pages.add(Math.ceil((endPage + totalPages) / 2));

	return [...pages].sort((a, b) => a - b);
}
