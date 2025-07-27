import { describe, expect, it } from "vitest";
import {
	filterWorksByLanguage,
	getWorkLanguageDisplayName,
	getWorkLanguageDisplayNameSafe,
	getWorkPrimaryLanguage,
	WORK_LANGUAGE_DISPLAY_NAMES,
	type WorkLanguage,
} from "../work";

describe("Work Language Mapping", () => {
	describe("WORK_LANGUAGE_DISPLAY_NAMES", () => {
		it("すべての言語に対して適切な日本語表示名が定義されている", () => {
			expect(WORK_LANGUAGE_DISPLAY_NAMES.ja).toBe("日本語");
			expect(WORK_LANGUAGE_DISPLAY_NAMES.en).toBe("英語");
			expect(WORK_LANGUAGE_DISPLAY_NAMES["zh-cn"]).toBe("简体中文");
			expect(WORK_LANGUAGE_DISPLAY_NAMES["zh-tw"]).toBe("繁體中文");
			expect(WORK_LANGUAGE_DISPLAY_NAMES.ko).toBe("한국어");
			expect(WORK_LANGUAGE_DISPLAY_NAMES.es).toBe("Español");
			expect(WORK_LANGUAGE_DISPLAY_NAMES["not-required"]).toBe("言語不要");
			expect(WORK_LANGUAGE_DISPLAY_NAMES["dlsite-official"]).toBe("DLsite公式");
		});

		it("すべての言語コードが定義されている", () => {
			const expectedLanguages: WorkLanguage[] = [
				"ja",
				"en",
				"zh-cn",
				"zh-tw",
				"ko",
				"es",
				"not-required",
				"dlsite-official",
			];

			for (const lang of expectedLanguages) {
				expect(WORK_LANGUAGE_DISPLAY_NAMES[lang]).toBeDefined();
				expect(typeof WORK_LANGUAGE_DISPLAY_NAMES[lang]).toBe("string");
			}
		});
	});

	describe("getWorkLanguageDisplayName", () => {
		it("有効な言語コードに対して正しい表示名を返す", () => {
			expect(getWorkLanguageDisplayName("ja")).toBe("日本語");
			expect(getWorkLanguageDisplayName("en")).toBe("英語");
			expect(getWorkLanguageDisplayName("zh-cn")).toBe("简体中文");
		});
	});

	describe("getWorkLanguageDisplayNameSafe", () => {
		it("有効な言語コードに対して正しい表示名を返す", () => {
			expect(getWorkLanguageDisplayNameSafe("ja")).toBe("日本語");
			expect(getWorkLanguageDisplayNameSafe("en")).toBe("英語");
		});

		it("無効な言語コードに対してコードをそのまま返す", () => {
			expect(getWorkLanguageDisplayNameSafe("unknown")).toBe("unknown");
			expect(getWorkLanguageDisplayNameSafe("")).toBe("");
		});
	});

	describe("getWorkPrimaryLanguage", () => {
		// テスト用の最小限のwork objectを作成するヘルパー
		const createMockWork = (id?: string, overrides: Partial<any> = {}) => ({
			id: id || "test-id",
			productId: "RJ123456",
			title: "Test Work",
			circle: "Test Circle",
			description: "Test description",
			category: "SOU" as const,
			workUrl: "https://example.com",
			thumbnailUrl: "https://example.com/thumb.jpg",
			price: { current: 100, currency: "JPY" },
			voiceActors: [],
			scenario: [],
			illustration: [],
			music: [],
			author: [],
			genres: [],
			customGenres: [], // Added missing property
			sampleImages: [],
			isExclusive: false,
			// Individual Info API準拠フィールド
			apiGenres: [],
			apiCustomGenres: [],
			apiWorkOptions: {},
			lastFetchedAt: "2023-01-01T00:00:00Z",
			createdAt: "2023-01-01T00:00:00Z",
			updatedAt: "2023-01-01T00:00:00Z",
			...overrides,
		});

		it("日本語作品を正しく判定する", () => {
			const work = createMockWork(undefined, { genres: ["日本語"] });
			expect(getWorkPrimaryLanguage(work)).toBe("ja");
		});

		it("英語作品を正しく判定する", () => {
			const work = createMockWork(undefined, { genres: ["english"] });
			expect(getWorkPrimaryLanguage(work)).toBe("en");
		});

		it("中国語作品を正しく判定する", () => {
			const work = createMockWork(undefined, { genres: ["中文"] });
			expect(getWorkPrimaryLanguage(work)).toBe("zh-cn");
		});

		it("韓国語作品を正しく判定する", () => {
			const work = createMockWork(undefined, { genres: ["한국어"] });
			expect(getWorkPrimaryLanguage(work)).toBe("ko");
		});

		it("languageDownloadsのJPNコードを正しく判定する", () => {
			const work = createMockWork(undefined, {
				languageDownloads: [{ lang: "JPN", label: "日本語" }],
			});
			expect(getWorkPrimaryLanguage(work)).toBe("ja");
		});

		it("languageDownloadsのENGコードを正しく判定する", () => {
			const work = createMockWork(undefined, {
				languageDownloads: [{ lang: "ENG", label: "English" }],
			});
			expect(getWorkPrimaryLanguage(work)).toBe("en");
		});

		it("languageDownloadsのCHI_HANSコードを正しく判定する", () => {
			const work = createMockWork(undefined, {
				languageDownloads: [{ lang: "CHI_HANS", label: "簡体中文" }],
			});
			expect(getWorkPrimaryLanguage(work)).toBe("zh-cn");
		});

		it("languageDownloadsのCHI_HANTコードを正しく判定する", () => {
			const work = createMockWork(undefined, {
				languageDownloads: [{ lang: "CHI_HANT", label: "繁体中文" }],
			});
			expect(getWorkPrimaryLanguage(work)).toBe("zh-tw");
		});

		it("languageDownloadsのKO_KRコードを正しく判定する", () => {
			const work = createMockWork(undefined, {
				languageDownloads: [{ lang: "KO_KR", label: "한국어" }],
			});
			expect(getWorkPrimaryLanguage(work)).toBe("ko");
		});

		it("複数のlanguageDownloadsから現在の作品に対応する言語を正しく判定する", () => {
			const work = createMockWork(undefined, {
				productId: "RJ01424302",
				languageDownloads: [
					{ workno: "RJ01424729", lang: "CHI_HANS", label: "簡体中文" },
					{ workno: "RJ01424764", lang: "CHI_HANT", label: "繁体中文" },
					{ workno: "RJ01424302", lang: "ENG", label: "英語" },
					{ workno: "RJ01209126", lang: "JPN", label: "日本語" },
				],
			});
			expect(getWorkPrimaryLanguage(work)).toBe("en");
		});

		it("対応するworknoが見つからない場合は最初の要素を使用する", () => {
			const work = createMockWork(undefined, {
				productId: "RJ99999999",
				languageDownloads: [
					{ workno: "RJ01424729", lang: "CHI_HANS", label: "簡体中文" },
					{ workno: "RJ01424302", lang: "ENG", label: "英語" },
				],
			});
			expect(getWorkPrimaryLanguage(work)).toBe("zh-cn");
		});

		it("languageDownloadsの未対応言語コードをotherとして判定する", () => {
			const work = createMockWork(undefined, {
				languageDownloads: [{ lang: "FR", label: "French" }],
			});
			expect(getWorkPrimaryLanguage(work)).toBe("other");
		});

		it("言語情報がない場合はデフォルトで日本語を返す", () => {
			const work = createMockWork(undefined, { genres: ["voice", "asmr"] });
			expect(getWorkPrimaryLanguage(work)).toBe("ja");
		});

		it("genresがundefinedでもエラーにならない", () => {
			const work = createMockWork(undefined, { genres: undefined });
			expect(getWorkPrimaryLanguage(work)).toBe("ja");
		});

		it("tagsがundefinedでもエラーにならない", () => {
			const work = createMockWork(undefined, { genres: ["voice"] });
			expect(getWorkPrimaryLanguage(work)).toBe("ja");
		});
	});

	describe("filterWorksByLanguage", () => {
		// テスト用の最小限のwork objectを作成するヘルパー
		const createMockWork = (id: string, overrides: Partial<any> = {}) => ({
			id,
			productId: `RJ12345${id}`,
			title: `Test Work ${id}`,
			circle: "Test Circle",
			description: "Test description",
			category: "SOU" as const,
			workUrl: "https://example.com",
			thumbnailUrl: "https://example.com/thumb.jpg",
			price: { current: 100, currency: "JPY" },
			voiceActors: [],
			scenario: [],
			illustration: [],
			music: [],
			author: [],
			genres: [],
			customGenres: [], // Added missing property
			tags: [],
			bonusContent: [],
			sampleImages: [],
			isExclusive: false,
			// Individual Info API準拠フィールド
			apiGenres: [],
			apiCustomGenres: [],
			apiWorkOptions: {},
			lastFetchedAt: "2023-01-01T00:00:00Z",
			createdAt: "2023-01-01T00:00:00Z",
			updatedAt: "2023-01-01T00:00:00Z",
			...overrides,
		});

		const mockWorks = [
			createMockWork("1", { genres: ["日本語"], tags: ["voice"] }),
			createMockWork("2", { genres: ["english"], tags: ["asmr"] }),
			createMockWork("3", { genres: ["中文"], tags: ["fantasy"] }),
			createMockWork("4", { genres: ["voice"], tags: ["romance"] }), // 日本語デフォルト
		];

		it("言語フィルターなしの場合は全ての作品を返す", () => {
			expect(filterWorksByLanguage(mockWorks, "")).toHaveLength(4);
			expect(filterWorksByLanguage(mockWorks, "all")).toHaveLength(4);
		});

		it("日本語フィルターで正しくフィルタリングする", () => {
			const filtered = filterWorksByLanguage(mockWorks, "ja");
			expect(filtered).toHaveLength(2); // 1つ目と4つ目（デフォルト）
			expect(filtered.map((w) => w.id)).toEqual(["1", "4"]);
		});

		it("英語フィルターで正しくフィルタリングする", () => {
			const filtered = filterWorksByLanguage(mockWorks, "en");
			expect(filtered).toHaveLength(1);
			expect(filtered[0]?.id).toBe("2");
		});

		it("中国語フィルターで正しくフィルタリングする", () => {
			const filtered = filterWorksByLanguage(mockWorks, "zh-cn");
			expect(filtered).toHaveLength(1);
			expect(filtered[0]?.id).toBe("3");
		});

		it("該当する作品がない場合は空配列を返す", () => {
			const filtered = filterWorksByLanguage(mockWorks, "ko");
			expect(filtered).toHaveLength(0);
		});

		it("大文字小文字を区別しない", () => {
			const filtered = filterWorksByLanguage(mockWorks, "JA");
			expect(filtered).toHaveLength(2);
		});

		it("翻訳シリーズでは個別作品の言語のみでフィルタリングする", () => {
			const seriesWorks = [
				createMockWork("original", {
					productId: "RJ01424302",
					languageDownloads: [
						{ workno: "RJ01424729", lang: "CHI_HANS", label: "簡体中文" },
						{ workno: "RJ01424764", lang: "CHI_HANT", label: "繁体中文" },
						{ workno: "RJ01424302", lang: "ENG", label: "英語" },
						{ workno: "RJ01209126", lang: "JPN", label: "日本語" },
					],
				}),
				createMockWork("chinese", {
					productId: "RJ01424729",
					languageDownloads: [
						{ workno: "RJ01424729", lang: "CHI_HANS", label: "簡体中文" },
						{ workno: "RJ01424764", lang: "CHI_HANT", label: "繁体中文" },
						{ workno: "RJ01424302", lang: "ENG", label: "英語" },
						{ workno: "RJ01209126", lang: "JPN", label: "日本語" },
					],
				}),
				createMockWork("japanese", {
					productId: "RJ01209126",
					languageDownloads: [
						{ workno: "RJ01424729", lang: "CHI_HANS", label: "簡体中文" },
						{ workno: "RJ01424764", lang: "CHI_HANT", label: "繁体中文" },
						{ workno: "RJ01424302", lang: "ENG", label: "英語" },
						{ workno: "RJ01209126", lang: "JPN", label: "日本語" },
					],
				}),
			];

			// 英語フィルタで英語版のみが表示される
			const englishFiltered = filterWorksByLanguage(seriesWorks, "en");
			expect(englishFiltered).toHaveLength(1);
			expect(englishFiltered[0]?.productId).toBe("RJ01424302");

			// 中国語フィルタで中国語版のみが表示される
			const chineseFiltered = filterWorksByLanguage(seriesWorks, "zh-cn");
			expect(chineseFiltered).toHaveLength(1);
			expect(chineseFiltered[0]?.productId).toBe("RJ01424729");

			// 日本語フィルタで日本語版のみが表示される
			const japaneseFiltered = filterWorksByLanguage(seriesWorks, "ja");
			expect(japaneseFiltered).toHaveLength(1);
			expect(japaneseFiltered[0]?.productId).toBe("RJ01209126");
		});
	});
});
