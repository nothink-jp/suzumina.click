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

/**
 * 配列から重複を除去
 *
 * @param array - 重複を除去する配列
 * @returns 重複のない配列
 */
export function deduplicate<T>(array: T[]): T[] {
	return [...new Set(array)];
}

/**
 * 配列から重複を除去（カスタムキー関数使用）
 *
 * @param array - 重複を除去する配列
 * @param keyFn - 比較キーを生成する関数
 * @returns 重複のない配列
 */
export function deduplicateBy<T>(array: T[], keyFn: (item: T) => string | number): T[] {
	const seen = new Set<string | number>();
	return array.filter((item) => {
		const key = keyFn(item);
		if (seen.has(key)) {
			return false;
		}
		seen.add(key);
		return true;
	});
}

/**
 * 配列をシャッフル（Fisher-Yates アルゴリズム）
 *
 * @param array - シャッフルする配列
 * @returns シャッフルされた新しい配列
 */
export function shuffle<T>(array: T[]): T[] {
	if (array.length === 0) {
		return [];
	}

	const shuffled = [...array];
	for (let i = shuffled.length - 1; i > 0; i--) {
		const j = Math.floor(Math.random() * (i + 1));
		// Fisher-Yates shuffle: 配列の境界内であることを保証
		if (j >= 0 && j < shuffled.length && i >= 0 && i < shuffled.length) {
			// 分割代入の代わりに一時変数を使用してTypeScriptの型安全性を確保
			const temp = shuffled[i] as T;
			shuffled[i] = shuffled[j] as T;
			shuffled[j] = temp;
		}
	}
	return shuffled;
}

/**
 * 配列を条件に基づいて分割
 *
 * @param array - 分割する配列
 * @param predicate - 条件関数
 * @returns [条件を満たす要素の配列, 条件を満たさない要素の配列]
 */
export function partition<T>(array: T[], predicate: (item: T) => boolean): [T[], T[]] {
	const truthy: T[] = [];
	const falsy: T[] = [];

	for (const item of array) {
		if (predicate(item)) {
			truthy.push(item);
		} else {
			falsy.push(item);
		}
	}

	return [truthy, falsy];
}
