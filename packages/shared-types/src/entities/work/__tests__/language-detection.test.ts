import { describe, expect, it } from "vitest";
import {
	detectWorkLanguage,
	enrichWorkWithLanguage,
	filterWorksByLanguage,
	getSupportedLanguages,
	groupWorksByLanguage,
	isMultiLanguageWork,
	supportsLanguage,
} from "../language-detection";
import type { WorkDocument } from "../work-document-schema";

describe("Language Detection", () => {
	const createWorkDocument = (overrides: Partial<WorkDocument> = {}): WorkDocument => ({
		id: "RJ123456",
		productId: "RJ123456",
		title: "Test Work",
		circle: "Test Circle",
		description: "Test description",
		category: "SOU",
		workUrl: "https://example.com",
		thumbnailUrl: "https://example.com/thumb.jpg",
		price: { current: 1000, currency: "JPY" },
		genres: [],
		customGenres: [],
		sampleImages: [],
		lastFetchedAt: "2024-01-01T00:00:00Z",
		createdAt: "2024-01-01T00:00:00Z",
		updatedAt: "2024-01-01T00:00:00Z",
		...overrides,
	});

	describe("detectWorkLanguage", () => {
		it("should detect language from title patterns", () => {
			const works = [
				{ title: "作品名 繁体中文版", expected: "zh-tw" },
				{ title: "作品名 簡体中文版", expected: "zh-cn" },
				{ title: "English Version", expected: "en" },
				{ title: "한국어 버전", expected: "ko" },
				{ title: "Versión Español", expected: "es" },
				{ title: "タイ語版 作品", expected: "th" },
				{ title: "Deutsch Version", expected: "de" },
				{ title: "Version Français", expected: "fr" },
				{ title: "Versione Italiano", expected: "it" },
				{ title: "Versão Português", expected: "pt" },
				{ title: "Русский версия", expected: "ru" },
				{ title: "Tiếng Việt version", expected: "vi" },
				{ title: "Bahasa Indonesia", expected: "id" },
			];

			for (const { title, expected } of works) {
				const work = createWorkDocument({ title });
				const result = detectWorkLanguage(work);
				expect(result).toBe(expected);
			}
		});

		it("should detect language from languageDownloads", () => {
			const work = createWorkDocument({
				languageDownloads: [
					{
						workno: "RJ123456",
						label: "English",
						lang: "en-us",
						dlCount: "100",
						displayLabel: "English",
					},
					{
						workno: "RJ123457",
						label: "Japanese",
						lang: "ja-jp",
						dlCount: "200",
						displayLabel: "Japanese",
					},
				],
			});

			const result = detectWorkLanguage(work);
			expect(result).toBe("en");
		});

		it("should use first languageDownload if no match for current work", () => {
			const work = createWorkDocument({
				productId: "RJ999999",
				languageDownloads: [
					{
						workno: "RJ123456",
						label: "Chinese",
						lang: "zh-cn",
						dlCount: "100",
						displayLabel: "Chinese",
					},
				],
			});

			const result = detectWorkLanguage(work);
			expect(result).toBe("zh-cn");
		});

		it("should detect language from genres", () => {
			const testCases = [
				{ genres: ["日本語作品", "アクション"], expected: "ja" },
				{ genres: ["English", "Adventure"], expected: "en" },
				{ genres: ["中文", "RPG"], expected: "zh-cn" },
				{ genres: ["한국어", "시뮬레이션"], expected: "ko" },
			];

			for (const { genres, expected } of testCases) {
				const work = createWorkDocument({ genres });
				const result = detectWorkLanguage(work);
				expect(result).toBe(expected);
			}
		});

		it("should return null when no language can be detected", () => {
			const work = createWorkDocument();
			const result = detectWorkLanguage(work);
			expect(result).toBe(null);
		});

		it("should prioritize language detection sources", () => {
			// Should prioritize genres over title
			const work = createWorkDocument({
				title: "English Version",
				genres: ["日本語作品"],
			});

			const result = detectWorkLanguage(work);
			expect(result).toBe("ja"); // genres has higher priority
		});
	});

	describe("enrichWorkWithLanguage", () => {
		it("should return work unchanged (current implementation)", () => {
			const work = createWorkDocument({ title: "English Version" });
			const result = enrichWorkWithLanguage(work);
			expect(result).toBe(work);
		});
	});

	describe("groupWorksByLanguage", () => {
		it("should group works by detected language", () => {
			const works = [
				createWorkDocument({ title: "Japanese Work 1" }),
				createWorkDocument({ title: "English Version" }),
				createWorkDocument({ title: "Japanese Work 2" }),
				createWorkDocument({ title: "繁体中文版" }),
			];

			const grouped = groupWorksByLanguage(works);

			expect(grouped.ja).toHaveLength(2);
			expect(grouped.en).toHaveLength(1);
			expect(grouped["zh-tw"]).toHaveLength(1);
		});

		it("should default to ja when language cannot be detected", () => {
			const works = [createWorkDocument({ title: "Unknown Language" })];

			const grouped = groupWorksByLanguage(works);

			expect(grouped.ja).toHaveLength(1);
		});

		it("should handle empty array", () => {
			const grouped = groupWorksByLanguage([]);
			expect(Object.keys(grouped)).toHaveLength(0);
		});
	});

	describe("isMultiLanguageWork", () => {
		it("should return true for multiple languageDownloads", () => {
			const work = createWorkDocument({
				languageDownloads: [
					{
						workno: "RJ123456",
						label: "Japanese",
						lang: "ja",
						dlCount: "100",
						displayLabel: "Japanese",
					},
					{
						workno: "RJ123456",
						label: "English",
						lang: "en",
						dlCount: "50",
						displayLabel: "English",
					},
				],
			});

			expect(isMultiLanguageWork(work)).toBe(true);
		});

		it("should return true for multiple language patterns in title", () => {
			const work = createWorkDocument({
				title: "作品名 English Version 繁体中文版",
			});

			expect(isMultiLanguageWork(work)).toBe(true);
		});

		it("should return false for single language", () => {
			const work = createWorkDocument({
				title: "English Version",
				languageDownloads: [
					{
						workno: "RJ123456",
						label: "English",
						lang: "en",
						dlCount: "100",
						displayLabel: "English",
					},
				],
			});

			expect(isMultiLanguageWork(work)).toBe(false);
		});

		it("should return false for no language indicators", () => {
			const work = createWorkDocument();
			expect(isMultiLanguageWork(work)).toBe(false);
		});
	});

	describe("getSupportedLanguages", () => {
		it("should return main language when detected", () => {
			const work = createWorkDocument({ title: "English Version" });
			const languages = getSupportedLanguages(work);

			expect(languages).toContain("en");
		});

		it("should collect languages from languageDownloads", () => {
			const work = createWorkDocument({
				languageDownloads: [
					{
						workno: "RJ123456",
						label: "Japanese",
						lang: "ja",
						dlCount: "100",
						displayLabel: "Japanese",
					},
					{
						workno: "RJ123456",
						label: "English",
						lang: "en",
						dlCount: "50",
						displayLabel: "English",
					},
					{
						workno: "RJ123456",
						label: "Chinese",
						lang: "zh-cn",
						dlCount: "30",
						displayLabel: "Chinese",
					},
				],
			});

			const languages = getSupportedLanguages(work);

			expect(languages).toContain("ja");
			expect(languages).toContain("en");
			expect(languages).toContain("zh-cn");
		});

		it("should not include 'other' from languageDownloads", () => {
			const work = createWorkDocument({
				languageDownloads: [
					{
						workno: "RJ123456",
						label: "Unknown",
						lang: "xxx",
						dlCount: "100",
						displayLabel: "Unknown",
					},
				],
			});

			const languages = getSupportedLanguages(work);

			expect(languages).not.toContain("other");
			expect(languages).not.toContain("xxx");
		});

		it("should default to ja when no languages detected", () => {
			const work = createWorkDocument();
			const languages = getSupportedLanguages(work);

			expect(languages).toEqual(["ja"]);
		});

		it("should return unique languages", () => {
			const work = createWorkDocument({
				title: "English Version",
				genres: ["English"],
				languageDownloads: [
					{
						workno: "RJ123456",
						label: "English",
						lang: "en",
						dlCount: "100",
						displayLabel: "English",
					},
				],
			});

			const languages = getSupportedLanguages(work);

			// Should have only one "en" entry
			const englishCount = languages.filter((lang) => lang === "en").length;
			expect(englishCount).toBe(1);
		});
	});

	describe("supportsLanguage", () => {
		it("should return true for supported language", () => {
			const work = createWorkDocument({ title: "English Version" });
			expect(supportsLanguage(work, "en")).toBe(true);
		});

		it("should return false for unsupported language", () => {
			const work = createWorkDocument({ title: "English Version" });
			expect(supportsLanguage(work, "ko")).toBe(false);
		});

		it("should return true for ja as default", () => {
			const work = createWorkDocument();
			expect(supportsLanguage(work, "ja")).toBe(true);
		});
	});

	describe("filterWorksByLanguage (deprecated)", () => {
		const works = [
			createWorkDocument({ id: "RJ001", title: "Japanese Work" }),
			createWorkDocument({ id: "RJ002", title: "English Version" }),
			createWorkDocument({ id: "RJ003", title: "繁体中文版" }),
			createWorkDocument({ id: "RJ004", title: "Another Japanese" }),
		];

		it("should filter works by language", () => {
			const filtered = filterWorksByLanguage(works, "en");
			expect(filtered).toHaveLength(1);
			expect(filtered[0]?.id).toBe("RJ002");
		});

		it("should return all works for 'all' filter", () => {
			const filtered = filterWorksByLanguage(works, "all");
			expect(filtered).toHaveLength(4);
		});

		it("should return all works for empty string", () => {
			const filtered = filterWorksByLanguage(works, "");
			expect(filtered).toHaveLength(4);
		});

		it("should return all works for null", () => {
			const filtered = filterWorksByLanguage(works, null);
			expect(filtered).toHaveLength(4);
		});

		it("should return all works for undefined", () => {
			const filtered = filterWorksByLanguage(works, undefined);
			expect(filtered).toHaveLength(4);
		});

		it("should be case insensitive", () => {
			const filtered = filterWorksByLanguage(works, "EN");
			expect(filtered).toHaveLength(1);
			expect(filtered[0]?.id).toBe("RJ002");
		});

		it("should default undetected languages to ja", () => {
			const filtered = filterWorksByLanguage(works, "ja");
			expect(filtered).toHaveLength(2);
			expect(filtered[0]?.id).toBe("RJ001");
			expect(filtered[1]?.id).toBe("RJ004");
		});

		it("should handle zh-tw correctly", () => {
			const filtered = filterWorksByLanguage(works, "zh-tw");
			expect(filtered).toHaveLength(1);
			expect(filtered[0]?.id).toBe("RJ003");
		});
	});

	describe("Edge cases", () => {
		it("should handle undefined languageDownloads", () => {
			const work = createWorkDocument({ languageDownloads: undefined });
			const result = detectWorkLanguage(work);
			expect(result).toBe(null);
		});

		it("should handle empty languageDownloads", () => {
			const work = createWorkDocument({ languageDownloads: [] });
			const result = detectWorkLanguage(work);
			expect(result).toBe(null);
		});

		it("should handle languageDownload with missing lang", () => {
			const work = createWorkDocument({
				languageDownloads: [
					{
						workno: "RJ123456",
						label: "Unknown",
						lang: "",
						dlCount: "100",
						displayLabel: "Unknown",
					},
				],
			});
			const result = detectWorkLanguage(work);
			expect(result).toBe(null);
		});

		it("should handle undefined genres", () => {
			const work = createWorkDocument({ genres: undefined });
			const result = detectWorkLanguage(work);
			expect(result).toBe(null);
		});

		it("should handle empty genres", () => {
			const work = createWorkDocument({ genres: [] });
			const result = detectWorkLanguage(work);
			expect(result).toBe(null);
		});

		it("should handle empty title", () => {
			const work = createWorkDocument({ title: "" });
			const result = detectWorkLanguage(work);
			expect(result).toBe(null);
		});

		it("should normalize language codes correctly", () => {
			const testCases = [
				{ lang: "ja-jp", expected: "ja" },
				{ lang: "en-us", expected: "en" },
				{ lang: "zh-cn", expected: "zh-cn" },
				{ lang: "zh-tw", expected: "zh-tw" },
				{ lang: "ko-kr", expected: "ko" },
			];

			for (const { lang, expected } of testCases) {
				const work = createWorkDocument({
					languageDownloads: [
						{ workno: "RJ123456", label: "Test", lang, dlCount: "100", displayLabel: "Test" },
					],
				});
				const result = detectWorkLanguage(work);
				expect(result).toBe(expected);
			}
		});
	});
});
