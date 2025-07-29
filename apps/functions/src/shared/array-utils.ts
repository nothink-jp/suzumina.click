/**
 * 配列操作関連のユーティリティ関数
 *
 * 複数のファイルで重複していた配列操作ロジックを統合
 */

/**
 * 配列を指定されたサイズのチャンクに分割
 *
 * @param array - 分割する配列
 * @param size - チャンクサイズ
 * @returns 分割された配列の配列
 */
export function chunkArray<T>(array: T[], size: number): T[][] {
	if (size <= 0) {
		throw new Error("Chunk size must be greater than 0");
	}

	const chunks: T[][] = [];
	for (let i = 0; i < array.length; i += size) {
		chunks.push(array.slice(i, i + size));
	}
	return chunks;
}
