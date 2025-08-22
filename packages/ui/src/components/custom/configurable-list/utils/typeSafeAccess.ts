/**
 * 型安全なプロパティアクセスユーティリティ
 */

// オブジェクトの基本型
type UnknownObject = Record<string, unknown>;

/**
 * オブジェクトから検索可能なテキストを取得
 * title, name, label, description などの一般的なプロパティを探す
 */
export function getSearchableText(item: unknown): string | null {
	if (!item || typeof item !== "object") return null;

	const obj = item as UnknownObject;

	// 一般的な検索対象プロパティ
	const searchableProps = ["title", "name", "label", "description", "text"];

	for (const prop of searchableProps) {
		const value = obj[prop];
		if (value && typeof value === "string") {
			return value;
		}
	}

	// ネストされたオブジェクトもチェック
	if (obj.data) {
		return getSearchableText(obj.data);
	}

	return null;
}

// Helper function to parse date value
function parseDateValue(value: unknown): Date | null {
	// Date オブジェクトの場合
	if (value instanceof Date) {
		return value;
	}

	// 文字列の場合、パースを試みる
	if (typeof value === "string") {
		const date = new Date(value);
		if (!Number.isNaN(date.getTime())) {
			return date;
		}
	}

	// Firestore Timestamp の場合
	if (
		typeof value === "object" &&
		value !== null &&
		"toDate" in value &&
		typeof (value as { toDate: unknown }).toDate === "function"
	) {
		return (value as { toDate: () => Date }).toDate();
	}

	return null;
}

/**
 * オブジェクトから日付プロパティを取得
 * createdAt, updatedAt, date などの一般的な日付プロパティを探す
 */
export function getDateProperty(item: unknown): Date | null {
	if (!item || typeof item !== "object") return null;

	const obj = item as UnknownObject;

	// 一般的な日付プロパティ
	const dateProps = ["createdAt", "updatedAt", "date", "publishedAt", "modifiedAt"];

	for (const prop of dateProps) {
		const value = obj[prop];
		if (value) {
			const date = parseDateValue(value);
			if (date) return date;
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

	const obj = item as UnknownObject;
	const parts = propertyPath.split(".");

	let current: unknown = obj;
	for (const part of parts) {
		if (typeof current !== "object" || current === null) return null;
		const currentObj = current as UnknownObject;
		if (currentObj[part] === undefined) return null;
		current = currentObj[part];
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

	const obj = item as UnknownObject;
	const parts = propertyPath.split(".");

	let current: unknown = obj;
	for (const part of parts) {
		if (typeof current !== "object" || current === null) return null;
		const currentObj = current as UnknownObject;
		if (currentObj[part] === undefined) return null;
		current = currentObj[part];
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

	const obj = item as UnknownObject;
	const parts = propertyPath.split(".");

	let current: unknown = obj;
	for (const part of parts) {
		if (current === null || current === undefined) return undefined;
		if (typeof current !== "object") return undefined;
		const currentObj = current as UnknownObject;
		current = currentObj[part];
	}

	return current;
}
