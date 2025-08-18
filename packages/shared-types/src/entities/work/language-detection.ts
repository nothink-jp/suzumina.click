/**
 * Language Detection Utilities
 *
 * Utilities for detecting work language from various sources.
 * Extracted from work.ts for maintainability.
 */

import type { WorkDocument } from "./work-document-schema";
import type { WorkLanguage } from "./work-types";
import { normalizeLanguageCode } from "./work-utils";

/**
 * Language pattern mappings for title detection
 */
const LANGUAGE_PATTERNS: Array<{ patterns: string[]; language: WorkLanguage }> = [
	{ patterns: ["繁体中文版", "繁體中文版"], language: "zh-tw" },
	{ patterns: ["簡体中文版", "简体中文版"], language: "zh-cn" },
	{ patterns: ["English", "英語版", "English Version"], language: "en" },
	{ patterns: ["한국어", "韓国語版", "Korean"], language: "ko" },
	{ patterns: ["Español", "Spanish", "スペイン語版"], language: "es" },
	{ patterns: ["ไทย", "Thai", "タイ語版"], language: "th" },
	{ patterns: ["Deutsch", "German", "ドイツ語版"], language: "de" },
	{ patterns: ["Français", "French", "フランス語版"], language: "fr" },
	{ patterns: ["Italiano", "Italian", "イタリア語版"], language: "it" },
	{ patterns: ["Português", "Portuguese", "ポルトガル語版"], language: "pt" },
	{ patterns: ["Русский", "Russian", "ロシア語版"], language: "ru" },
	{ patterns: ["Tiếng Việt", "Vietnamese", "ベトナム語版"], language: "vi" },
	{ patterns: ["Bahasa Indonesia", "Indonesian", "インドネシア語版"], language: "id" },
];

/**
 * タイトルから言語を判定
 */
function detectLanguageFromTitle(title: string): WorkLanguage | null {
	for (const { patterns, language } of LANGUAGE_PATTERNS) {
		if (patterns.some((pattern) => title.includes(pattern))) {
			return language;
		}
	}
	return null;
}

/**
 * languageDownloadsから言語を判定
 */
function detectLanguageFromDownloads(work: WorkDocument): WorkLanguage | null {
	if (!work.languageDownloads || work.languageDownloads.length === 0) {
		return null;
	}

	// 現在の作品のworknoまたはproductIdに対応する言語情報を探す
	const currentWorkId = work.productId || work.id;
	const matchingLanguage = work.languageDownloads.find(
		(langDownload) => langDownload.workno === currentWorkId,
	);

	// matchingLanguageが見つかった場合
	if (matchingLanguage) {
		// langプロパティをチェック
		const langCode = matchingLanguage.lang;
		if (langCode) {
			const normalized = normalizeLanguageCode(langCode);
			if (normalized !== "other") {
				return normalized;
			}
		}
	}

	// マッチしない場合、最初の要素を使用
	const firstLanguage = work.languageDownloads[0];
	const langCode = firstLanguage?.lang;
	if (langCode) {
		const normalized = normalizeLanguageCode(langCode);
		// 未知の言語コードでも"other"として返す
		return normalized;
	}

	return null;
}

/**
 * supportedLanguagesから言語を判定（現在のスキーマには存在しない）
 */
function detectLanguageFromSupported(_work: WorkDocument): WorkLanguage | null {
	// WorkDocumentにはsupportedLanguagesフィールドが存在しないため、
	// この関数は常にnullを返す
	return null;
}

/**
 * categoriesから言語を判定（現在のスキーマではcategoryフィールドのみ）
 */
function detectLanguageFromCategories(_work: WorkDocument): WorkLanguage | null {
	// WorkDocumentにはcategoriesフィールドが存在しないため、
	// この関数は常にnullを返す
	return null;
}

/**
 * genresから言語を判定
 */
function detectLanguageFromGenres(work: WorkDocument): WorkLanguage | null {
	if (!work.genres || work.genres.length === 0) {
		return null;
	}

	// ジャンルから言語を検出
	const genreText = work.genres.join(" ").toLowerCase();

	// 日本語
	if (genreText.includes("日本語") || genreText.includes("japanese")) {
		return "ja";
	}

	// 英語
	if (genreText.includes("english") || genreText.includes("英語")) {
		return "en";
	}

	// 中国語
	if (genreText.includes("中文") || genreText.includes("chinese")) {
		return "zh-cn";
	}

	// 韓国語
	if (
		genreText.includes("한국어") ||
		genreText.includes("korean") ||
		genreText.includes("韓国語")
	) {
		return "ko";
	}

	// その他の言語
	for (const { patterns, language } of LANGUAGE_PATTERNS) {
		if (patterns.some((pattern) => genreText.includes(pattern.toLowerCase()))) {
			return language;
		}
	}

	return null;
}

/**
 * 明示的な言語設定から判定（現在のスキーマには存在しない）
 */
function detectFromExplicitLanguage(_work: WorkDocument): WorkLanguage | null {
	// WorkDocumentにはlanguageフィールドが存在しない
	return null;
}

/**
 * translationTypeから言語を判定（現在のスキーマには存在しない）
 */
function detectFromTranslationType(_work: WorkDocument): WorkLanguage | null {
	// WorkDocumentにはtranslationTypeフィールドが存在しない
	return null;
}

/**
 * 作品の言語を様々な情報源から判定
 * @param work - 作品データ
 * @returns 判定された言語コード、判定できない場合はnull
 */
export function detectWorkLanguage(work: WorkDocument): WorkLanguage | null {
	// 優先順位に従って言語を検出
	const detectors = [
		detectFromExplicitLanguage,
		detectLanguageFromGenres,
		detectLanguageFromDownloads,
		detectLanguageFromSupported,
		(w: WorkDocument) => detectLanguageFromTitle(w.title || ""),
		detectLanguageFromCategories,
		detectFromTranslationType,
	];

	for (const detector of detectors) {
		const result = detector(work);
		if (result) return result;
	}

	// WorkDocumentに存在しないフィールドのチェックをスキップ
	// （将来的にisTranslatedフィールドが追加される可能性を考慮）

	return null;
}

/**
 * 言語を検出して作品データに設定
 * @param work - 作品データ
 * @returns 言語が設定された作品データ（変更なし）
 */
export function enrichWorkWithLanguage(work: WorkDocument): WorkDocument {
	// WorkDocumentにはlanguageフィールドが存在しないため、
	// 現在は元のデータをそのまま返す
	return work;
}

/**
 * 言語別にグループ化
 * @param works - 作品データの配列
 * @returns 言語別にグループ化された作品データ
 */
export function groupWorksByLanguage(works: WorkDocument[]): Record<WorkLanguage, WorkDocument[]> {
	const grouped: Partial<Record<WorkLanguage, WorkDocument[]>> = {};

	for (const work of works) {
		const language = detectWorkLanguage(work) ?? "ja";

		if (!grouped[language]) {
			grouped[language] = [];
		}
		grouped[language].push(work);
	}

	return grouped as Record<WorkLanguage, WorkDocument[]>;
}

/**
 * 作品が多言語対応かどうかを判定
 * @param work - 作品データ
 * @returns 多言語対応の場合true
 */
export function isMultiLanguageWork(work: WorkDocument): boolean {
	// languageDownloadsが複数ある
	if (work.languageDownloads && work.languageDownloads.length > 1) {
		return true;
	}

	// タイトルに複数言語の表記がある
	const title = work.title || "";
	let languageCount = 0;
	for (const { patterns } of LANGUAGE_PATTERNS) {
		if (patterns.some((pattern) => title.includes(pattern))) {
			languageCount++;
			if (languageCount > 1) return true;
		}
	}

	return false;
}

/**
 * supportedLanguagesフィールドから言語を収集（現在のスキーマには存在しない）
 */
function collectFromSupportedLanguages(_work: WorkDocument, _languages: Set<WorkLanguage>): void {
	// WorkDocumentにはsupportedLanguagesフィールドが存在しない
	return;
}

/**
 * languageDownloadsから言語を収集
 */
function collectFromLanguageDownloads(work: WorkDocument, languages: Set<WorkLanguage>): void {
	if (!work.languageDownloads) return;

	for (const download of work.languageDownloads) {
		const langCode = download.lang;
		if (langCode) {
			const normalized = normalizeLanguageCode(langCode);
			if (normalized !== "other") {
				languages.add(normalized);
			}
		}
	}
}

/**
 * 対応言語のリストを取得
 * @param work - 作品データ
 * @returns 対応言語のリスト
 */
export function getSupportedLanguages(work: WorkDocument): WorkLanguage[] {
	const languages = new Set<WorkLanguage>();

	// メイン言語を追加
	const mainLanguage = detectWorkLanguage(work);
	if (mainLanguage) {
		languages.add(mainLanguage);
	}

	// 各ソースから言語を収集
	collectFromSupportedLanguages(work, languages);
	collectFromLanguageDownloads(work, languages);

	// 言語が1つも見つからない場合は日本語をデフォルトとする
	if (languages.size === 0) {
		languages.add("ja");
	}

	return Array.from(languages);
}

/**
 * 作品が特定の言語に対応しているかを判定
 * @param work - 作品データ
 * @param language - 確認する言語
 * @returns 対応している場合true
 */
export function supportsLanguage(work: WorkDocument, language: WorkLanguage): boolean {
	const supportedLanguages = getSupportedLanguages(work);
	return supportedLanguages.includes(language);
}

/**
 * 言語でフィルタリング (後方互換性のため)
 * @deprecated Use custom filtering logic with detectWorkLanguage
 */
export function filterWorksByLanguage(
	works: WorkDocument[],
	language?: WorkLanguage | string | null,
): WorkDocument[] {
	// 空文字列、null、undefined、"all"の場合は全て返す
	if (!language || language === "" || language === "all") {
		return works;
	}

	// 大文字小文字を区別しない
	const normalizedFilter = language.toLowerCase() as WorkLanguage;

	return works.filter((work) => {
		const workLanguage = detectWorkLanguage(work) ?? "ja";
		return workLanguage === normalizedFilter;
	});
}
