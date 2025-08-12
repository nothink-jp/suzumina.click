import type { ValidationError } from "../../core/result";
import { err, ok, type Result, validationError } from "../../core/result";
import { BaseValueObject, type ValidatableValueObject } from "../base/value-object";

/**
 * DateRange data interface for internal use
 */
interface DateRangeData {
	original: string;
	iso: string;
	display: string;
}

/**
 * DateRange Value Object
 *
 * 不変で日付範囲を表現する値オブジェクト
 * DLsiteの日付情報を扱う
 * Enhanced with BaseValueObject and Result pattern for type safety
 */
export class DateRangeValueObject
	extends BaseValueObject<DateRangeValueObject>
	implements ValidatableValueObject<DateRangeValueObject>
{
	private constructor(private readonly data: DateRangeData) {
		super();
	}

	/**
	 * Creates a DateRange with validation
	 * @param data - The date range data
	 * @returns Result containing DateRange or ValidationError
	 */
	static create(data: {
		original: string;
		iso: string;
		display: string;
	}): Result<DateRangeValueObject, ValidationError> {
		const validation = DateRangeValueObject.validate(data);
		if (!validation.isValid) {
			return err(validationError("dateRange", validation.error ?? "日付範囲の検証に失敗しました"));
		}

		return ok(new DateRangeValueObject(data));
	}

	/**
	 * Creates a DateRange from plain object (for deserialization)
	 * @param obj - Plain object to convert
	 * @returns Result containing DateRange or ValidationError
	 */
	static fromPlainObject(obj: unknown): Result<DateRangeValueObject, ValidationError> {
		if (!obj || typeof obj !== "object") {
			return err(validationError("dateRange", "DateRange data must be an object"));
		}

		const data = obj as Record<string, unknown>;

		if (
			typeof data.original !== "string" ||
			typeof data.iso !== "string" ||
			typeof data.display !== "string"
		) {
			return err(
				validationError("dateRange", "DateRange must have original, iso, and display as strings"),
			);
		}

		return DateRangeValueObject.create({
			original: data.original,
			iso: data.iso,
			display: data.display,
		});
	}

	/**
	 * Validates date range data
	 */
	private static validate(data: DateRangeData): { isValid: boolean; error?: string } {
		if (!data.original || typeof data.original !== "string") {
			return { isValid: false, error: "Original date must be a non-empty string" };
		}

		if (!data.iso || typeof data.iso !== "string") {
			return { isValid: false, error: "ISO date must be a non-empty string" };
		}

		if (!data.display || typeof data.display !== "string") {
			return { isValid: false, error: "Display date must be a non-empty string" };
		}

		// Validate ISO format
		try {
			const date = new Date(data.iso);
			if (Number.isNaN(date.getTime())) {
				return { isValid: false, error: "ISO date must be a valid date string" };
			}
		} catch {
			return { isValid: false, error: "ISO date must be a valid date string" };
		}

		return { isValid: true };
	}

	// Accessors

	get original(): string {
		return this.data.original;
	}

	get iso(): string {
		return this.data.iso;
	}

	get display(): string {
		return this.data.display;
	}

	// Business logic methods

	/**
	 * Date オブジェクトとして取得
	 */
	toDate(): Date {
		return new Date(this.data.iso);
	}

	/**
	 * UNIXタイムスタンプ（ミリ秒）として取得
	 */
	toTimestamp(): number {
		return new Date(this.data.iso).getTime();
	}

	/**
	 * 現在からの経過日数
	 */
	daysFromNow(): number {
		const now = new Date();
		const date = new Date(this.data.iso);
		const diffMs = now.getTime() - date.getTime();
		return Math.floor(diffMs / (1000 * 60 * 60 * 24));
	}

	/**
	 * 相対的な時間表現
	 */
	relative(): string {
		const days = Math.floor(
			(Date.now() - new Date(this.data.iso).getTime()) / (1000 * 60 * 60 * 24),
		);

		if (days === 0) return "今日";
		if (days === 1) return "昨日";
		if (days < 7) return `${days}日前`;
		if (days < 30) return `${Math.floor(days / 7)}週間前`;
		if (days < 365) return `${Math.floor(days / 30)}ヶ月前`;
		return `${Math.floor(days / 365)}年前`;
	}

	/**
	 * 他のDateRangeより前か判定
	 */
	isBefore(other: { iso: string }): boolean {
		return new Date(this.data.iso) < new Date(other.iso);
	}

	/**
	 * 他のDateRangeより後か判定
	 */
	isAfter(other: { iso: string }): boolean {
		return new Date(this.data.iso) > new Date(other.iso);
	}

	/**
	 * 指定期間内か判定
	 */
	isWithin(start: { iso: string }, end: { iso: string }): boolean {
		const date = new Date(this.data.iso);
		return date >= new Date(start.iso) && date <= new Date(end.iso);
	}

	// ValidatableValueObject implementation

	isValid(): boolean {
		return DateRangeValueObject.validate(this.data).isValid;
	}

	getValidationErrors(): string[] {
		const validation = DateRangeValueObject.validate(this.data);
		return validation.isValid ? [] : [validation.error ?? "日付範囲の検証に失敗しました"];
	}

	// BaseValueObject implementation

	equals(other: DateRangeValueObject): boolean {
		if (!other || !(other instanceof DateRangeValueObject)) {
			return false;
		}

		return this.data.iso === other.data.iso;
	}

	clone(): DateRangeValueObject {
		return new DateRangeValueObject({
			original: this.data.original,
			iso: this.data.iso,
			display: this.data.display,
		});
	}

	toPlainObject(): DateRangeData {
		return {
			original: this.data.original,
			iso: this.data.iso,
			display: this.data.display,
		};
	}
}

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

			const result = DateRangeValueObject.create({
				original: rawDate,
				iso,
				display,
			});
			return result.isOk() ? result.value : null;
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

// Type alias for backward compatibility
export type DateRange = DateRangeValueObject;
