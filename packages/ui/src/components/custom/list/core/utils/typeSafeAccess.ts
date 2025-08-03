/**
 * 型安全なプロパティアクセスユーティリティ
 */

/**
 * オブジェクトから型安全にプロパティを取得
 */
export function getProperty<T, K extends keyof T>(obj: T, key: K): T[K] | undefined {
	if (obj && typeof obj === "object" && key in obj) {
		return obj[key];
	}
	return undefined;
}

/**
 * オブジェクトから複数のプロパティを試行して取得
 */
export function getPropertyFromPaths<T>(obj: T, paths: string[]): unknown | undefined {
	if (!obj || typeof obj !== "object") return undefined;

	for (const path of paths) {
		if (path in obj) {
			return (obj as Record<string, unknown>)[path];
		}
	}
	return undefined;
}

/**
 * 検索可能なテキストを取得
 */
export function getSearchableText(item: unknown): string | undefined {
	if (!item || typeof item !== "object") return undefined;

	const searchableProps = ["title", "name", "label"];
	for (const prop of searchableProps) {
		const value = (item as Record<string, unknown>)[prop];
		if (typeof value === "string") {
			return value;
		}
	}
	return undefined;
}

/**
 * 日付プロパティを取得
 */
export function getDateProperty(item: unknown): Date | undefined {
	if (!item || typeof item !== "object") return undefined;

	const dateProps = ["createdAt", "updatedAt", "date"];
	for (const prop of dateProps) {
		const value = (item as Record<string, unknown>)[prop];
		if (value instanceof Date) {
			return value;
		}
		if (typeof value === "string" || typeof value === "number") {
			const date = new Date(value);
			if (!Number.isNaN(date.getTime())) {
				return date;
			}
		}
	}
	return undefined;
}

/**
 * フィルター可能な値を取得
 */
export function getFilterableValue(item: unknown, key: string): unknown | undefined {
	if (!item || typeof item !== "object") return undefined;
	return (item as Record<string, unknown>)[key];
}
