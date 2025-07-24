import { z } from "zod";

/**
 * DateRange Value Object
 *
 * 不変で日付範囲を表現する値オブジェクト
 * DLsiteの日付情報を扱う
 */
export const DateRange = z
	.object({
		/** 元の日付文字列 */
		original: z.string(),
		/** ISO 8601形式 */
		iso: z.string().datetime(),
		/** 表示用フォーマット（日本語） */
		display: z.string(),
	})
	.transform((data) => ({
		...data,
		/** Date オブジェクトとして取得 */
		toDate: () => new Date(data.iso),
		/** UNIXタイムスタンプ（ミリ秒）として取得 */
		toTimestamp: () => new Date(data.iso).getTime(),
		/** 現在からの経過日数 */
		daysFromNow: () => {
			const now = new Date();
			const date = new Date(data.iso);
			const diffMs = now.getTime() - date.getTime();
			return Math.floor(diffMs / (1000 * 60 * 60 * 24));
		},
		/** 相対的な時間表現 */
		relative: () => {
			const days = Math.floor((Date.now() - new Date(data.iso).getTime()) / (1000 * 60 * 60 * 24));

			if (days === 0) return "今日";
			if (days === 1) return "昨日";
			if (days < 7) return `${days}日前`;
			if (days < 30) return `${Math.floor(days / 7)}週間前`;
			if (days < 365) return `${Math.floor(days / 30)}ヶ月前`;
			return `${Math.floor(days / 365)}年前`;
		},
		/** 他のDateRangeと等価か判定 */
		equals: (other: { iso: string }) => data.iso === other.iso,
		/** 他のDateRangeより前か判定 */
		isBefore: (other: { iso: string }) => new Date(data.iso) < new Date(other.iso),
		/** 他のDateRangeより後か判定 */
		isAfter: (other: { iso: string }) => new Date(data.iso) > new Date(other.iso),
		/** 指定期間内か判定 */
		isWithin: (start: { iso: string }, end: { iso: string }) => {
			const date = new Date(data.iso);
			return date >= new Date(start.iso) && date <= new Date(end.iso);
		},
	}));

export type DateRange = z.infer<typeof DateRange>;

/**
 * 日付フォーマットユーティリティ
 */
export const DateFormatter = {
	/**
	 * DLsiteの日付形式から最適化された形式に変換
	 */
	optimizeDateFormats: (rawDate: string): DateRange | null => {
		try {
			// 日付パースを別関数に委譲
			const parsed = DateFormatter.parseDate(rawDate);
			if (!parsed) return null;

			// ISO形式に変換
			const isoDate = new Date(parsed.year, parsed.month - 1, parsed.day);
			const iso = isoDate.toISOString();

			// 表示用フォーマット
			const display = `${parsed.year}年${parsed.month}月${parsed.day}日`;

			return DateRange.parse({
				original: rawDate,
				iso,
				display,
			});
		} catch {
			return null;
		}
	},

	/**
	 * 日付文字列をパース
	 */
	parseDate: (rawDate: string): { year: number; month: number; day: number } | null => {
		// 日付パターンを定義
		const patterns = [
			{ regex: /^(\d{4})年(\d{1,2})月(\d{1,2})日$/, type: "japanese" },
			{ regex: /^(\d{4})-(\d{2})-(\d{2})$/, type: "iso" },
			{ regex: /^(\d{4})\/(\d{2})\/(\d{2})$/, type: "slash" },
		];

		// パターンマッチング
		for (const { regex } of patterns) {
			const match = rawDate.match(regex);
			if (match?.[1] && match[2] && match[3]) {
				return {
					year: Number.parseInt(match[1], 10),
					month: Number.parseInt(match[2], 10),
					day: Number.parseInt(match[3], 10),
				};
			}
		}

		// ISO形式として直接パース
		const date = new Date(rawDate);
		if (!Number.isNaN(date.getTime())) {
			return {
				year: date.getFullYear(),
				month: date.getMonth() + 1,
				day: date.getDate(),
			};
		}

		return null;
	},

	/**
	 * 期間を計算
	 */
	calculateDuration: (start: { iso: string }, end: { iso: string }): number => {
		return new Date(end.iso).getTime() - new Date(start.iso).getTime();
	},

	/**
	 * 期間を人間が読みやすい形式に変換
	 */
	formatDuration: (milliseconds: number): string => {
		const days = Math.floor(milliseconds / (1000 * 60 * 60 * 24));
		const hours = Math.floor((milliseconds % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
		const minutes = Math.floor((milliseconds % (1000 * 60 * 60)) / (1000 * 60));

		const parts = [];
		if (days > 0) parts.push(`${days}日`);
		if (hours > 0) parts.push(`${hours}時間`);
		if (minutes > 0) parts.push(`${minutes}分`);

		return parts.join(" ") || "0分";
	},
};
