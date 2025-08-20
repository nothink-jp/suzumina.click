/**
 * 型安全なプロパティアクセスユーティリティ
 */

/**
 * オブジェクトから検索可能なテキストを取得
 * title, name, label, description などの一般的なプロパティを探す
 */
export function getSearchableText(item: unknown): string | null {
	if (!item || typeof item !== "object") return null;

	const obj = item as any;

	// 一般的な検索対象プロパティ
	const searchableProps = ["title", "name", "label", "description", "text"];

	for (const prop of searchableProps) {
		if (obj[prop] && typeof obj[prop] === "string") {
			return obj[prop];
		}
	}

	// ネストされたオブジェクトもチェック
	if (obj.data) {
		return getSearchableText(obj.data);
	}

	return null;
}

/**
 * オブジェクトから日付プロパティを取得
 * createdAt, updatedAt, date などの一般的な日付プロパティを探す
 */
export function getDateProperty(item: unknown): Date | null {
	if (!item || typeof item !== "object") return null;

	const obj = item as any;

	// 一般的な日付プロパティ
	const dateProps = ["createdAt", "updatedAt", "date", "publishedAt", "modifiedAt"];

	for (const prop of dateProps) {
		if (obj[prop]) {
			// Date オブジェクトの場合
			if (obj[prop] instanceof Date) {
				return obj[prop];
			}
			// 文字列の場合、パースを試みる
			if (typeof obj[prop] === "string") {
				const date = new Date(obj[prop]);
				if (!Number.isNaN(date.getTime())) {
					return date;
				}
			}
			// Firestore Timestamp の場合
			if (obj[prop].toDate && typeof obj[prop].toDate === "function") {
				return obj[prop].toDate();
			}
		}
	}

	// ネストされたオブジェクトもチェック
	if (obj.data) {
		return getDateProperty(obj.data);
	}

	return null;
}

/**
 * オブジェクトから数値プロパティを取得
 */
export function getNumericProperty(item: unknown, propertyPath: string): number | null {
	if (!item || typeof item !== "object") return null;

	const obj = item as any;
	const parts = propertyPath.split(".");

	let current = obj;
	for (const part of parts) {
		if (current[part] === undefined) return null;
		current = current[part];
	}

	if (typeof current === "number") {
		return current;
	}

	if (typeof current === "string") {
		const num = Number.parseFloat(current);
		if (!Number.isNaN(num)) {
			return num;
		}
	}

	return null;
}

/**
 * オブジェクトから文字列プロパティを取得
 */
export function getStringProperty(item: unknown, propertyPath: string): string | null {
	if (!item || typeof item !== "object") return null;

	const obj = item as any;
	const parts = propertyPath.split(".");

	let current = obj;
	for (const part of parts) {
		if (current[part] === undefined) return null;
		current = current[part];
	}

	if (typeof current === "string") {
		return current;
	}

	if (current && typeof current.toString === "function") {
		return current.toString();
	}

	return null;
}

/**
 * オブジェクトからフィルター可能な値を取得
 * プロパティパスに対応
 */
export function getFilterableValue(item: unknown, propertyPath: string): unknown {
	if (!item || typeof item !== "object") return undefined;

	const obj = item as any;
	const parts = propertyPath.split(".");

	let current = obj;
	for (const part of parts) {
		if (current === null || current === undefined) return undefined;
		current = current[part];
	}

	return current;
}
