/**
 * Work Utilities
 *
 * Utility functions for DLsite work data processing.
 * Extracted for better code organization.
 */

import {
	AGE_CATEGORY_LABELS,
	AGE_CATEGORY_STRING_LABELS,
	LANGUAGE_CODE_MAPPING,
	WORK_CATEGORY_DISPLAY_NAMES,
	WORK_LANGUAGE_DISPLAY_NAMES,
} from "./work-constants";
import type { WorkCategory, WorkLanguage } from "./work-types";

/**
 * 日付最適化ユーティリティ関数
 * 日本語日付文字列をISO形式と表示形式に変換
 */
export function optimizeDateFormats(dateString: string): {
	original: string;
	iso?: string;
	display: string;
} {
	// "2023年03月05日" → { iso: "2023-03-05", display: "2023年03月05日" }
	const match = dateString.match(/(\d{4})年(\d{2})月(\d{2})日/);
	if (match) {
		const [, year, month, day] = match;
		return {
			original: dateString,
			iso: `${year}-${month}-${day}`,
			display: dateString,
		};
	}

	// ISO形式の場合 "2023-03-05" → 日本語形式に変換
	const isoMatch = dateString.match(/(\d{4})-(\d{2})-(\d{2})/);
	if (isoMatch) {
		const [, year, month, day] = isoMatch;
		return {
			original: dateString,
			iso: dateString,
			display: `${year}年${month}月${day}日`,
		};
	}

	return {
		original: dateString,
		display: dateString,
	};
}

/**
 * ファイルサイズ文字列をバイト数に変換
 */
export function parseSizeToBytes(sizeText?: string): number | undefined {
	if (!sizeText) return undefined;
	const match = sizeText.match(/([\d.]+)\s*(MB|GB|KB)/i);
	if (!match) return undefined;

	const [, num, unit] = match;
	if (!unit || !num) return undefined;
	const size = Number.parseFloat(num);

	switch (unit.toUpperCase()) {
		case "KB":
			return Math.round(size * 1024);
		case "MB":
			return Math.round(size * 1024 * 1024);
		case "GB":
			return Math.round(size * 1024 * 1024 * 1024);
		default:
			return undefined;
	}
}

/**
 * 作品カテゴリコードから日本語表示名を取得
 * @param category 作品カテゴリコード
 * @returns 日本語表示名
 */
export function getWorkCategoryDisplayName(category: WorkCategory): string {
	return WORK_CATEGORY_DISPLAY_NAMES[category];
}

/**
 * 作品カテゴリコードから日本語表示名を安全に取得
 * 不明なカテゴリの場合はカテゴリコードをそのまま返す
 * @param category 作品カテゴリコード（不明な値の可能性あり）
 * @returns 日本語表示名またはカテゴリコード
 */
export function getWorkCategoryDisplayNameSafe(category: string): string {
	// WorkCategoryに含まれているかチェック
	if (category in WORK_CATEGORY_DISPLAY_NAMES) {
		return WORK_CATEGORY_DISPLAY_NAMES[category as WorkCategory];
	}
	// 不明なカテゴリの場合はそのまま返す
	return category;
}

/**
 * 作品データから表示用カテゴリ名を取得
 * 元のカテゴリテキストが利用可能な場合はそれを優先し、なければマッピングを使用
 * @param work 作品データ
 * @returns 表示用カテゴリ名
 */
export function getWorkCategoryDisplayText(work: {
	category: WorkCategory;
	originalCategoryText?: string;
}): string {
	// 元のカテゴリテキストが存在する場合はそれを使用（表示優先）
	if (work.originalCategoryText && work.originalCategoryText.trim() !== "") {
		return work.originalCategoryText;
	}

	// フォールバック: マッピングテーブルから取得
	return getWorkCategoryDisplayName(work.category);
}

/**
 * 作品言語コードから日本語表示名を取得
 * @param language 作品言語コード
 * @returns 日本語表示名
 */
export function getWorkLanguageDisplayName(language: WorkLanguage): string {
	return WORK_LANGUAGE_DISPLAY_NAMES[language];
}

/**
 * 作品言語コードから日本語表示名を安全に取得
 * 不明な言語の場合は言語コードをそのまま返す
 * @param language 作品言語コード（不明な値の可能性あり）
 * @returns 日本語表示名または言語コード
 */
export function getWorkLanguageDisplayNameSafe(language: string): string {
	// WorkLanguageに含まれているかチェック
	if (language in WORK_LANGUAGE_DISPLAY_NAMES) {
		return WORK_LANGUAGE_DISPLAY_NAMES[language as WorkLanguage];
	}
	// 不明な言語の場合はそのまま返す
	return language;
}

/**
 * Individual Info API年齢カテゴリから日本語表示名を取得
 * @param ageCategory Individual Info API `age_category` (1=全年齢, 2=R-15, 3=成人向け)
 * @returns 日本語表示名
 */
export function getAgeCategoryDisplayName(ageCategory: number): string {
	return AGE_CATEGORY_LABELS[ageCategory] || "不明";
}

/**
 * Individual Info API年齢カテゴリ文字列から日本語表示名を取得
 * @param ageCategoryString Individual Info API `age_category_string` ("general", "r15", "adult")
 * @returns 日本語表示名
 */
export function getAgeCategoryStringDisplayName(ageCategoryString: string): string {
	return AGE_CATEGORY_STRING_LABELS[ageCategoryString] || "不明";
}

/**
 * DLsiteの言語コードを正規化されたWorkLanguageに変換
 * @param langCode DLsite APIから取得した言語コード
 * @returns 正規化された言語コード
 */
export function normalizeLanguageCode(langCode: string): WorkLanguage {
	const normalized = LANGUAGE_CODE_MAPPING[langCode.toLowerCase()];
	return normalized || "other";
}
