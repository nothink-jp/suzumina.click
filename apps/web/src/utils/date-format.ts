/**
 * 日付を検証して Date オブジェクトを返す
 * @param dateString - ISO形式の日付文字列またはDateオブジェクト
 * @returns 有効な Date オブジェクト、または無効な場合は null
 */
function validateAndParseDate(dateString: string | Date): Date | null {
	const date = typeof dateString === "string" ? new Date(dateString) : dateString;

	// 無効な日付の場合
	if (Number.isNaN(date.getTime())) {
		return null;
	}

	return date;
}

/**
 * 日本標準時でフォーマットした日付のパーツを取得
 * @param date - Dateオブジェクト
 * @param options - Intl.DateTimeFormatOptions
 * @returns フォーマットされた日付のパーツ
 */
function getJSTFormattedParts(date: Date, options: Intl.DateTimeFormatOptions) {
	const formatter = new Intl.DateTimeFormat("ja-JP", options);
	return formatter.formatToParts(date);
}

/**
 * 日付を日本標準時でフォーマット
 * @param dateString - ISO形式の日付文字列
 * @returns "YYYY年 M月 D日 h時mm分" 形式の文字列
 */
export function formatJSTDateTime(dateString: string | Date): string {
	const date = validateAndParseDate(dateString);

	// 無効な日付の場合は元の文字列を返す
	if (!date) {
		return typeof dateString === "string" ? dateString : "";
	}

	// 日本標準時のオプション
	const options: Intl.DateTimeFormatOptions = {
		year: "numeric",
		month: "numeric",
		day: "numeric",
		hour: "numeric",
		minute: "2-digit",
		timeZone: "Asia/Tokyo",
	};

	// 日本語ロケールでフォーマット
	const parts = getJSTFormattedParts(date, options);

	// パーツから各要素を取得
	const year = parts.find((p) => p.type === "year")?.value || "";
	const month = parts.find((p) => p.type === "month")?.value || "";
	const day = parts.find((p) => p.type === "day")?.value || "";
	const hour = parts.find((p) => p.type === "hour")?.value || "";
	const minute = parts.find((p) => p.type === "minute")?.value || "";

	return `${year}年 ${month}月 ${day}日 ${hour}時${minute}分`;
}

/**
 * 日付を日本標準時の日付のみでフォーマット
 * @param dateString - ISO形式の日付文字列
 * @returns "YYYY年 M月 D日" 形式の文字列
 */
export function formatJSTDate(dateString: string | Date): string {
	const date = validateAndParseDate(dateString);

	// 無効な日付の場合は元の文字列を返す
	if (!date) {
		return typeof dateString === "string" ? dateString : "";
	}

	// 日本標準時のオプション
	const options: Intl.DateTimeFormatOptions = {
		year: "numeric",
		month: "numeric",
		day: "numeric",
		timeZone: "Asia/Tokyo",
	};

	// 日本語ロケールでフォーマット
	const parts = getJSTFormattedParts(date, options);

	// パーツから各要素を取得
	const year = parts.find((p) => p.type === "year")?.value || "";
	const month = parts.find((p) => p.type === "month")?.value || "";
	const day = parts.find((p) => p.type === "day")?.value || "";

	return `${year}年 ${month}月 ${day}日`;
}
