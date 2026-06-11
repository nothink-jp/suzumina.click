/**
 * データアダプターのユーティリティ
 */

/**
 * ページネーション情報を計算
 */
export function calculatePagination(
	total: number,
	itemsPerPage: number,
	currentPage: number,
): {
	totalPages: number;
	hasNext: boolean;
	hasPrev: boolean;
	startIndex: number;
	endIndex: number;
} {
	const totalPages = Math.ceil(total / itemsPerPage);
	const startIndex = (currentPage - 1) * itemsPerPage;
	const endIndex = Math.min(startIndex + itemsPerPage, total);

	return {
		totalPages,
		hasNext: currentPage < totalPages,
		hasPrev: currentPage > 1,
		startIndex,
		endIndex,
	};
}
