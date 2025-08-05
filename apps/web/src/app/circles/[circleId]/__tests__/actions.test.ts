/**
 * Circle page server actions のテストスイート
 */

import { convertToWorkPlainObject } from "@suzumina.click/shared-types";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// convertToWorkPlainObjectとconvertToCirclePlainObjectのモック
vi.mock("@suzumina.click/shared-types", () => ({
	convertToCirclePlainObject: vi.fn((data) => {
		if (!data) return null;
		return {
			circleId: data.circleId,
			name: data.name,
			nameEn: data.nameEn,
			workCount: data.workIds ? data.workIds.length : data.workCount || 0,
			createdAt: data.createdAt?.toDate ? data.createdAt.toDate().toISOString() : null,
			updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate().toISOString() : null,
		};
	}),
	convertToWorkPlainObject: vi.fn((data) => {
		if (!data || !data.id || !data.productId) return null;
		return {
			...data,
			price: data.price || {
				current: 0,
				currency: "JPY",
				formattedPrice: "¥0",
			},
			rating: data.rating,
			creators: data.creators || {
				voiceActors: [],
				scenario: [],
				illustration: [],
				music: [],
				others: [],
			},
			salesStatus: data.salesStatus || {
				isOnSale: true,
				isDiscounted: false,
				isFree: false,
				isSoldOut: false,
				isReserveWork: false,
				dlsiteplaySupported: false,
			},
			sampleImages: data.sampleImages || [],
			genres: data.genres || [],
			customGenres: data.customGenres || [],
			_computed: {
				displayTitle: data.title,
				displayCircle: data.circle,
				displayCategory: data.category,
				displayAgeRating: "全年齢",
				displayReleaseDate: data.releaseDateDisplay || "",
				relativeUrl: `/works/${data.productId}`,
				isAdultContent: false,
				isVoiceWork: data.category === "SOU",
				isGameWork: false,
				isMangaWork: false,
				hasDiscount: false,
				isNewRelease: false,
				isPopular: false,
				primaryLanguage: "ja",
				availableLanguages: ["ja"],
				searchableText: `${data.title} ${data.circle}`,
				tags: data.tags || [],
			},
		};
	}),
	isValidCircleId: vi.fn((id) => id?.startsWith("RG")),
}));

// Firestore モック
const mockDoc = vi.fn();
const mockWhere = vi.fn();
const mockOrderBy = vi.fn();
const mockLimit = vi.fn();
const mockGet = vi.fn();

const mockCollection = vi.fn((_collectionName) => ({
	doc: mockDoc,
	where: mockWhere,
	orderBy: mockOrderBy,
	limit: mockLimit,
	get: mockGet,
}));

// doc method setup
mockDoc.mockReturnValue({
	get: mockGet,
});

// チェーン可能なクエリモック
const mockQuery = {
	orderBy: mockOrderBy,
	limit: mockLimit,
	get: mockGet,
};

mockWhere.mockReturnValue(mockQuery);
mockOrderBy.mockReturnValue(mockQuery);
mockLimit.mockReturnValue(mockQuery);

vi.mock("@/lib/firestore", () => ({
	getFirestore: () => ({
		collection: mockCollection,
	}),
}));

// テスト対象のインポート（モック設定後）

import { fetchCircleWorksForConfigurableList, getCircleInfo } from "../actions";

describe("Circle page server actions", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		// Reset mock implementations to ensure proper chaining
		const mockQuery = {
			orderBy: mockOrderBy,
			limit: mockLimit,
			get: mockGet,
		};

		mockWhere.mockReturnValue(mockQuery);
		mockOrderBy.mockReturnValue(mockQuery);
		mockLimit.mockReturnValue(mockQuery);

		// Reset convertToWorkPlainObject mock to default implementation
		vi.mocked(convertToWorkPlainObject).mockImplementation((data) => {
			if (!data || !data.id || !data.productId) return null;
			return {
				...data,
				price: data.price || {
					current: 0,
					currency: "JPY",
					formattedPrice: "¥0",
				},
				rating: data.rating,
				creators: data.creators || {
					voiceActors: [],
					scenario: [],
					illustration: [],
					music: [],
					others: [],
				},
				salesStatus: data.salesStatus || {
					isOnSale: true,
					isDiscounted: false,
					isFree: false,
					isSoldOut: false,
					isReserveWork: false,
					dlsiteplaySupported: false,
				},
				sampleImages: data.sampleImages || [],
				genres: data.genres || [],
				customGenres: data.customGenres || [],
				_computed: {
					displayTitle: data.title,
					displayCircle: data.circle,
					displayCategory: data.category,
					displayAgeRating: "全年齢",
					displayReleaseDate: data.releaseDateDisplay || "",
					relativeUrl: `/works/${data.productId}`,
					isAdultContent: false,
					isVoiceWork: data.category === "SOU",
					isGameWork: false,
					isMangaWork: false,
					hasDiscount: false,
					isNewRelease: false,
					isPopular: false,
					primaryLanguage: "ja",
					availableLanguages: ["ja"],
					searchableText: `${data.title} ${data.circle}`,
					tags: data.tags || [],
				},
			};
		});
	});

	describe("getCircleInfo", () => {
		it("存在するサークル情報を正しく取得する", async () => {
			const mockCircleData = {
				circleId: "RG12345",
				name: "テストサークル",
				nameEn: "Test Circle",
				workIds: [
					"RJ111111",
					"RJ222222",
					"RJ333333",
					"RJ444444",
					"RJ555555",
					"RJ666666",
					"RJ777777",
					"RJ888888",
					"RJ999999",
					"RJ000000",
				],
				updatedAt: { toDate: () => new Date("2025-01-01") },
				createdAt: { toDate: () => new Date("2024-01-01") },
			};

			mockDoc.mockReturnValue({
				get: vi.fn().mockResolvedValue({
					exists: true,
					data: () => mockCircleData,
				}),
			});

			const result = await getCircleInfo("RG12345");

			expect(result).toEqual({
				circleId: "RG12345",
				name: "テストサークル",
				nameEn: "Test Circle",
				workCount: 10,
				createdAt: "2024-01-01T00:00:00.000Z",
				updatedAt: "2025-01-01T00:00:00.000Z",
			});
			expect(mockCollection).toHaveBeenCalledWith("circles");
			expect(mockDoc).toHaveBeenCalledWith("RG12345");
		});

		it("存在しないサークルの場合はnullを返す", async () => {
			mockDoc.mockReturnValue({
				get: vi.fn().mockResolvedValue({
					exists: false,
				}),
			});

			const result = await getCircleInfo("RG99999");

			expect(result).toBeNull();
		});

		it("無効なサークルIDの場合はnullを返す", async () => {
			const result = await getCircleInfo("INVALID_ID");

			expect(result).toBeNull();
			expect(mockCollection).not.toHaveBeenCalled();
		});

		it("エラー発生時はnullを返す", async () => {
			mockDoc.mockReturnValue({
				get: vi.fn().mockRejectedValue(new Error("Firestore error")),
			});

			const result = await getCircleInfo("RG12345");

			expect(result).toBeNull();
		});
	});

	describe("fetchCircleWorksForConfigurableList", () => {
		it("検索機能が正しく動作する", async () => {
			const mockCircleData = {
				circleId: "RG12345",
				name: "テストサークル",
				workCount: 3,
			};

			const mockWorks = [
				{
					id: "RJ111111",
					productId: "RJ111111",
					title: "魔法少女の冒険",
					circle: "テストサークル",
					circleId: "RG12345",
					price: { current: 1100, currency: "JPY" },
					category: "SOU",
					workType: "SOU",
					thumbnailUrl: "https://example.com/thumb.jpg",
					workUrl: "https://example.com/work.html",
					registDate: "2025-01-15",
					releaseDateISO: "2025-01-15",
					releaseDateDisplay: "2025年01月15日",
					description: "魔法の世界",
					genres: ["ファンタジー"],
					customGenres: ["魔法"],
					creators: {
						voiceActors: [{ name: "声優A", id: "VA001" }],
						scenario: [],
						illustration: [],
						music: [],
						others: [],
					},
					salesStatus: {},
					sampleImages: [],
					ageRating: "general",
					updateDate: "2025-01-15",
					createdAt: "2025-01-15T00:00:00.000Z",
					updatedAt: "2025-01-15T00:00:00.000Z",
					lastFetchedAt: "2025-01-15T00:00:00.000Z",
				},
				{
					id: "RJ222222",
					productId: "RJ222222",
					title: "勇者の物語",
					circle: "テストサークル",
					circleId: "RG12345",
					price: { current: 2200, currency: "JPY" },
					category: "SOU",
					workType: "SOU",
					thumbnailUrl: "https://example.com/thumb.jpg",
					workUrl: "https://example.com/work.html",
					registDate: "2025-01-10",
					releaseDateISO: "2025-01-10",
					releaseDateDisplay: "2025年01月10日",
					description: "勇者の冒険",
					genres: ["RPG"],
					customGenres: ["冒険"],
					creators: {
						voiceActors: [],
						scenario: [],
						illustration: [],
						music: [],
						others: [],
					},
					salesStatus: {},
					sampleImages: [],
					ageRating: "general",
					updateDate: "2025-01-10",
					createdAt: "2025-01-10T00:00:00.000Z",
					updatedAt: "2025-01-10T00:00:00.000Z",
					lastFetchedAt: "2025-01-10T00:00:00.000Z",
				},
				{
					id: "RJ333333",
					productId: "RJ333333",
					title: "日常系作品",
					circle: "テストサークル",
					circleId: "RG12345",
					price: { current: 3300, currency: "JPY" },
					category: "SOU",
					workType: "SOU",
					thumbnailUrl: "https://example.com/thumb.jpg",
					workUrl: "https://example.com/work.html",
					registDate: "2025-01-05",
					releaseDateISO: "2025-01-05",
					releaseDateDisplay: "2025年01月05日",
					description: "日常の風景",
					genres: ["日常系"],
					customGenres: [],
					creators: {
						voiceActors: [],
						scenario: [],
						illustration: [],
						music: [],
						others: [],
					},
					salesStatus: {},
					sampleImages: [],
					ageRating: "general",
					updateDate: "2025-01-05",
					createdAt: "2025-01-05T00:00:00.000Z",
					updatedAt: "2025-01-05T00:00:00.000Z",
					lastFetchedAt: "2025-01-05T00:00:00.000Z",
				},
			];

			mockCollection.mockImplementation((collectionName) => {
				if (collectionName === "circles") {
					return {
						doc: vi.fn().mockReturnValue({
							get: vi.fn().mockResolvedValue({
								exists: true,
								data: () => mockCircleData,
							}),
						}),
					};
				}
				if (collectionName === "works") {
					return {
						get: vi.fn().mockResolvedValue({
							empty: false,
							docs: mockWorks.map((work) => ({
								id: work.id,
								data: () => work,
							})),
						}),
					};
				}
				return {};
			});

			// "魔法"で検索
			const result = await fetchCircleWorksForConfigurableList({
				circleId: "RG12345",
				search: "魔法",
			});

			expect(result.totalCount).toBe(3); // 全作品数
			expect(result.filteredCount).toBe(1); // フィルター後の作品数
			expect(result.works).toHaveLength(1);
			expect(result.works[0].title).toBe("魔法少女の冒険");
		});

		it("声優名で検索できる", async () => {
			const mockCircleData = {
				circleId: "RG12345",
				name: "テストサークル",
				workCount: 2,
			};

			const mockWorks = [
				{
					id: "RJ111111",
					productId: "RJ111111",
					title: "作品1",
					circle: "テストサークル",
					circleId: "RG12345",
					price: { current: 1100, currency: "JPY" },
					category: "SOU",
					workType: "SOU",
					thumbnailUrl: "https://example.com/thumb.jpg",
					workUrl: "https://example.com/work.html",
					registDate: "2025-01-15",
					releaseDateISO: "2025-01-15",
					releaseDateDisplay: "2025年01月15日",
					description: "",
					genres: [],
					customGenres: [],
					creators: {
						voiceActors: [{ name: "田中太郎", id: "VA001" }],
						scenario: [],
						illustration: [],
						music: [],
						others: [],
					},
					salesStatus: {},
					sampleImages: [],
					ageRating: "general",
					updateDate: "2025-01-15",
					createdAt: "2025-01-15T00:00:00.000Z",
					updatedAt: "2025-01-15T00:00:00.000Z",
					lastFetchedAt: "2025-01-15T00:00:00.000Z",
				},
				{
					id: "RJ222222",
					productId: "RJ222222",
					title: "作品2",
					circle: "テストサークル",
					circleId: "RG12345",
					price: { current: 2200, currency: "JPY" },
					category: "SOU",
					workType: "SOU",
					thumbnailUrl: "https://example.com/thumb.jpg",
					workUrl: "https://example.com/work.html",
					registDate: "2025-01-10",
					releaseDateISO: "2025-01-10",
					releaseDateDisplay: "2025年01月10日",
					description: "",
					genres: [],
					customGenres: [],
					creators: {
						voiceActors: [{ name: "鈴木花子", id: "VA002" }],
						scenario: [],
						illustration: [],
						music: [],
						others: [],
					},
					salesStatus: {},
					sampleImages: [],
					ageRating: "general",
					updateDate: "2025-01-10",
					createdAt: "2025-01-10T00:00:00.000Z",
					updatedAt: "2025-01-10T00:00:00.000Z",
					lastFetchedAt: "2025-01-10T00:00:00.000Z",
				},
			];

			mockCollection.mockImplementation((collectionName) => {
				if (collectionName === "circles") {
					return {
						doc: vi.fn().mockReturnValue({
							get: vi.fn().mockResolvedValue({
								exists: true,
								data: () => mockCircleData,
							}),
						}),
					};
				}
				if (collectionName === "works") {
					return {
						get: vi.fn().mockResolvedValue({
							empty: false,
							docs: mockWorks.map((work) => ({
								id: work.id,
								data: () => work,
							})),
						}),
					};
				}
				return {};
			});

			// 声優名で検索
			const result = await fetchCircleWorksForConfigurableList({
				circleId: "RG12345",
				search: "田中",
			});

			expect(result.filteredCount).toBe(1);
			expect(result.works).toHaveLength(1);
			expect(result.works[0].creators.voiceActors[0].name).toBe("田中太郎");
		});

		it("ページネーションと検索を組み合わせて正しく動作する", async () => {
			const mockCircleData = {
				circleId: "RG12345",
				name: "テストサークル",
				workCount: 5,
			};

			// 5つの作品（3つが"冒険"を含む）
			const mockWorks = Array.from({ length: 5 }, (_, i) => ({
				id: `RJ${i + 1}11111`,
				productId: `RJ${i + 1}11111`,
				title: i < 3 ? `冒険作品${i + 1}` : `日常作品${i - 2}`,
				circle: "テストサークル",
				circleId: "RG12345",
				price: { current: (i + 1) * 1000, currency: "JPY" },
				category: "SOU",
				workType: "SOU",
				thumbnailUrl: "https://example.com/thumb.jpg",
				workUrl: "https://example.com/work.html",
				registDate: `2025-01-${15 - i}`,
				releaseDateISO: `2025-01-${15 - i}`,
				releaseDateDisplay: `2025年01月${15 - i}日`,
				description: i < 3 ? "冒険の物語" : "日常の物語",
				genres: [],
				customGenres: [],
				creators: {
					voiceActors: [],
					scenario: [],
					illustration: [],
					music: [],
					others: [],
				},
				salesStatus: {},
				sampleImages: [],
				ageRating: "general",
				updateDate: `2025-01-${15 - i}`,
				createdAt: `2025-01-${15 - i}T00:00:00.000Z`,
				updatedAt: `2025-01-${15 - i}T00:00:00.000Z`,
				lastFetchedAt: `2025-01-${15 - i}T00:00:00.000Z`,
			}));

			mockCollection.mockImplementation((collectionName) => {
				if (collectionName === "circles") {
					return {
						doc: vi.fn().mockReturnValue({
							get: vi.fn().mockResolvedValue({
								exists: true,
								data: () => mockCircleData,
							}),
						}),
					};
				}
				if (collectionName === "works") {
					return {
						get: vi.fn().mockResolvedValue({
							empty: false,
							docs: mockWorks.map((work) => ({
								id: work.id,
								data: () => work,
							})),
						}),
					};
				}
				return {};
			});

			// "冒険"で検索、ページ2を取得（limit=2）
			const result = await fetchCircleWorksForConfigurableList({
				circleId: "RG12345",
				search: "冒険",
				page: 2,
				limit: 2,
			});

			expect(result.totalCount).toBe(5); // 全作品数
			expect(result.filteredCount).toBe(3); // "冒険"を含む作品数
			expect(result.works).toHaveLength(1); // ページ2には1件のみ（3件中の3件目）
			expect(result.works[0].title).toBe("冒険作品3");
		});

		it("検索語が見つからない場合は空の結果を返す", async () => {
			const mockCircleData = {
				circleId: "RG12345",
				name: "テストサークル",
				workCount: 2,
			};

			const mockWorks = [
				{
					id: "RJ111111",
					productId: "RJ111111",
					title: "作品1",
					circle: "テストサークル",
					circleId: "RG12345",
					price: { current: 1100, currency: "JPY" },
					category: "SOU",
					workType: "SOU",
					thumbnailUrl: "https://example.com/thumb.jpg",
					workUrl: "https://example.com/work.html",
					registDate: "2025-01-15",
					releaseDateISO: "2025-01-15",
					releaseDateDisplay: "2025年01月15日",
					description: "",
					genres: [],
					customGenres: [],
					creators: {
						voiceActors: [],
						scenario: [],
						illustration: [],
						music: [],
						others: [],
					},
					salesStatus: {},
					sampleImages: [],
					ageRating: "general",
					updateDate: "2025-01-15",
					createdAt: "2025-01-15T00:00:00.000Z",
					updatedAt: "2025-01-15T00:00:00.000Z",
					lastFetchedAt: "2025-01-15T00:00:00.000Z",
				},
			];

			mockCollection.mockImplementation((collectionName) => {
				if (collectionName === "circles") {
					return {
						doc: vi.fn().mockReturnValue({
							get: vi.fn().mockResolvedValue({
								exists: true,
								data: () => mockCircleData,
							}),
						}),
					};
				}
				if (collectionName === "works") {
					return {
						get: vi.fn().mockResolvedValue({
							empty: false,
							docs: mockWorks.map((work) => ({
								id: work.id,
								data: () => work,
							})),
						}),
					};
				}
				return {};
			});

			const result = await fetchCircleWorksForConfigurableList({
				circleId: "RG12345",
				search: "存在しない検索語",
			});

			expect(result.totalCount).toBe(1);
			expect(result.filteredCount).toBe(0);
			expect(result.works).toHaveLength(0);
		});

		it("検索パラメータがない場合はfilteredCountを返さない", async () => {
			const mockCircleData = {
				circleId: "RG12345",
				name: "テストサークル",
				workCount: 1,
			};

			const mockWorks = [
				{
					id: "RJ111111",
					productId: "RJ111111",
					title: "作品1",
					circle: "テストサークル",
					circleId: "RG12345",
					price: { current: 1100, currency: "JPY" },
					category: "SOU",
					workType: "SOU",
					thumbnailUrl: "https://example.com/thumb.jpg",
					workUrl: "https://example.com/work.html",
					registDate: "2025-01-15",
					releaseDateISO: "2025-01-15",
					releaseDateDisplay: "2025年01月15日",
					description: "",
					genres: [],
					customGenres: [],
					creators: {
						voiceActors: [],
						scenario: [],
						illustration: [],
						music: [],
						others: [],
					},
					salesStatus: {},
					sampleImages: [],
					ageRating: "general",
					updateDate: "2025-01-15",
					createdAt: "2025-01-15T00:00:00.000Z",
					updatedAt: "2025-01-15T00:00:00.000Z",
					lastFetchedAt: "2025-01-15T00:00:00.000Z",
				},
			];

			mockCollection.mockImplementation((collectionName) => {
				if (collectionName === "circles") {
					return {
						doc: vi.fn().mockReturnValue({
							get: vi.fn().mockResolvedValue({
								exists: true,
								data: () => mockCircleData,
							}),
						}),
					};
				}
				if (collectionName === "works") {
					return {
						get: vi.fn().mockResolvedValue({
							empty: false,
							docs: mockWorks.map((work) => ({
								id: work.id,
								data: () => work,
							})),
						}),
					};
				}
				return {};
			});

			const result = await fetchCircleWorksForConfigurableList({
				circleId: "RG12345",
			});

			expect(result.totalCount).toBe(1);
			expect(result.filteredCount).toBeUndefined();
			expect(result.works).toHaveLength(1);
		});

		it("無効なサークルIDの場合は空の結果を返す", async () => {
			const result = await fetchCircleWorksForConfigurableList({
				circleId: "INVALID_ID",
			});

			expect(result).toEqual({ works: [], totalCount: 0 });
		});

		it("サークルが存在しない場合は空の結果を返す", async () => {
			mockCollection.mockImplementation((collectionName) => {
				if (collectionName === "circles") {
					return {
						doc: vi.fn().mockReturnValue({
							get: vi.fn().mockResolvedValue({
								exists: false,
							}),
						}),
					};
				}
				return {};
			});

			const result = await fetchCircleWorksForConfigurableList({
				circleId: "RG99999",
			});

			expect(result).toEqual({ works: [], totalCount: 0 });
		});

		it("エラー発生時は空の結果を返す", async () => {
			mockCollection.mockImplementation(() => {
				throw new Error("Firestore error");
			});

			const result = await fetchCircleWorksForConfigurableList({
				circleId: "RG12345",
			});

			expect(result).toEqual({ works: [], totalCount: 0 });
		});
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});
});
