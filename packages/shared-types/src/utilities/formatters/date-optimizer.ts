/**
 * 日付フォーマット最適化ユーティリティ
 *
 * DLsite の各種日付表記（日本語 / ISO / スラッシュ区切り）を
 * `{ original, iso, display }` の plain オブジェクトへ正規化する。
 * 旧 value-objects の DateFormatter から移設（クラス返しを廃し plain object 化）。
 *
 * 注意: iso は `new Date(year, month - 1, day)` のローカルタイム基準で生成する
 * （従来挙動の維持。TZ 非依存化＝Date.UTC 化は別 PR で扱う）。
 */

export interface OptimizedDate {
	original: string;
	iso: string;
	display: string;
}

/**
 * 日付文字列を year/month/day にパースする。
 *
 * 日本語(2023年3月5日) / ISO(2023-03-05) / スラッシュ(2023/03/05) を優先し、
 * いずれにも一致しなければ Date コンストラクタでのパースを試みる。
 *
 * barrel の `utils/date-parser` と名前衝突するため非 export（実装詳細）。
 *
 * @param rawDate 生の日付文字列
 * @returns パース結果。失敗時は null
 */
function parseDate(rawDate: string): { year: number; month: number; day: number } | null {
	const patterns = [
		/^(\d{4})年(\d{1,2})月(\d{1,2})日$/,
		/^(\d{4})-(\d{2})-(\d{2})$/,
		/^(\d{4})\/(\d{2})\/(\d{2})$/,
	];

	for (const regex of patterns) {
		const match = rawDate.match(regex);
		if (match?.[1] && match[2] && match[3]) {
			return {
				year: Number.parseInt(match[1], 10),
				month: Number.parseInt(match[2], 10),
				day: Number.parseInt(match[3], 10),
			};
		}
	}

	const date = new Date(rawDate);
	if (!Number.isNaN(date.getTime())) {
		return {
			year: date.getFullYear(),
			month: date.getMonth() + 1,
			day: date.getDate(),
		};
	}

	return null;
}

/**
 * DLsite の日付表記を `{ original, iso, display }` に正規化する。
 *
 * @param rawDate 生の日付文字列
 * @returns 正規化結果。パースできない場合は null
 */
export function optimizeDateFormats(rawDate: string): OptimizedDate | null {
	try {
		const parsed = parseDate(rawDate);
		if (!parsed) {
			return null;
		}

		const isoDate = new Date(parsed.year, parsed.month - 1, parsed.day);
		return {
			original: rawDate,
			iso: isoDate.toISOString(),
			display: `${parsed.year}年${parsed.month}月${parsed.day}日`,
		};
	} catch {
		return null;
	}
}
