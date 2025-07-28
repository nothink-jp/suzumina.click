/**
 * Circle page server actions のテストスイート
 */

import { CircleEntity, convertToWorkPlainObject } from "@suzumina.click/shared-types";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// convertToWorkPlainObjectのモック
vi.mock("@suzumina.click/shared-types", () => ({
	CircleEntity: {
		fromFirestoreData: vi.fn(),
	},
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

import { getCircleInfo, getCircleWorks, getCircleWorksWithPagination } from "../actions";

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
				workCount: 10,
				lastUpdated: { toDate: () => new Date("2025-01-01") },
				createdAt: { toDate: () => new Date("2024-01-01") },
			};

			mockDoc.mockReturnValue({
				get: vi.fn().mockResolvedValue({
					exists: true,
					data: () => mockCircleData,
				}),
			});

			// CircleEntity.fromFirestoreDataのモック設定
			vi.mocked(CircleEntity.fromFirestoreData).mockReturnValue({
				circleIdString: "RG12345",
				circleNameString: "テストサークル",
				nameEn: "Test Circle",
				workCount: 10,
				createdAt: new Date("2024-01-01"),
				lastUpdated: new Date("2025-01-01"),
			} as any);

			const result = await getCircleInfo("RG12345");

			expect(result).toEqual({
				circleIdString: "RG12345",
				circleNameString: "テストサークル",
				nameEn: "Test Circle",
				workCount: 10,
				lastUpdated: expect.any(Date),
				createdAt: expect.any(Date),
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

	describe("getCircleWorks", () => {
		it("サークルの作品一覧を正しく取得する", async () => {
			// サークル情報のモック
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
					registDate: "2025-01-15",
					releaseDateISO: "2025-01-15",
					releaseDateDisplay: "2025年01月15日",
					thumbnailUrl: "image1.jpg",
					workUrl: "https://example.com/work1.html",
					category: "SOU",
					workType: "SOU",
					genres: ["ボイス・ASMR"],
					customGenres: [],
					tags: ["tag1", "tag2"],
					rating: { stars: 4.5, count: 5 },
					creators: { voiceActors: [], scenario: [], illustration: [], music: [], others: [] },
					salesStatus: {},
					sampleImages: [],
					description: "",
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
					registDate: "2025-01-10",
					releaseDateISO: "2025-01-10",
					releaseDateDisplay: "2025年01月10日",
					thumbnailUrl: "image2.jpg",
					workUrl: "https://example.com/work2.html",
					category: "SOU",
					workType: "SOU",
					genres: ["音声作品"],
					customGenres: [],
					tags: ["tag3"],
					rating: { stars: 4.0, count: 3 },
					creators: { voiceActors: [], scenario: [], illustration: [], music: [], others: [] },
					salesStatus: {},
					sampleImages: [],
					description: "",
					ageRating: "general",
					updateDate: "2025-01-10",
					createdAt: "2025-01-10T00:00:00.000Z",
					updatedAt: "2025-01-10T00:00:00.000Z",
					lastFetchedAt: "2025-01-10T00:00:00.000Z",
				},
				{
					id: "RJ333333",
					productId: "RJ333333",
					title: "他のサークル作品",
					circle: "他のサークル",
					circleId: "RG99999",
					price: { current: 3300, currency: "JPY" },
					registDate: "2025-01-12",
					releaseDateISO: "2025-01-12",
					releaseDateDisplay: "2025年01月12日",
					thumbnailUrl: "image3.jpg",
					workUrl: "https://example.com/work3.html",
					category: "SOU",
					workType: "SOU",
					genres: [],
					customGenres: [],
					tags: [],
					rating: undefined,
					creators: { voiceActors: [], scenario: [], illustration: [], music: [], others: [] },
					salesStatus: {},
					sampleImages: [],
					description: "",
					ageRating: "general",
					updateDate: "2025-01-12",
					createdAt: "2025-01-12T00:00:00.000Z",
					updatedAt: "2025-01-12T00:00:00.000Z",
					lastFetchedAt: "2025-01-12T00:00:00.000Z",
				},
			];

			// Mock collection method to return appropriate mock based on collection name
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
				if (collectionName === "dlsiteWorks") {
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

			const result = await getCircleWorks("RG12345");

			expect(result).toHaveLength(2); // フィルタリングにより該当する作品のみ
			expect(result[0]).toMatchObject({
				id: "RJ111111",
				title: "作品1",
			});
			expect(result[1]).toMatchObject({
				id: "RJ222222",
				title: "作品2",
			});
		});

		it("作品が存在しない場合は空配列を返す", async () => {
			// Mock for circle that exists but has no works
			const mockCircleData = {
				circleId: "RG99999",
				name: "作品なしサークル",
				workCount: 0,
			};

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
				if (collectionName === "dlsiteWorks") {
					return {
						get: vi.fn().mockResolvedValue({
							empty: true,
							docs: [],
						}),
					};
				}
				return {};
			});

			const result = await getCircleWorks("RG99999");

			expect(result).toEqual([]);
		});

		it("無効なサークルIDの場合は空配列を返す", async () => {
			const result = await getCircleWorks("INVALID_ID");

			expect(result).toEqual([]);
			expect(mockWhere).not.toHaveBeenCalled();
		});

		it("エラー発生時は空配列を返す", async () => {
			mockCollection.mockImplementation((collectionName) => {
				if (collectionName === "circles") {
					return {
						doc: vi.fn().mockReturnValue({
							get: vi.fn().mockRejectedValue(new Error("Firestore error")),
						}),
					};
				}
				return {};
			});

			const result = await getCircleWorks("RG12345");

			expect(result).toEqual([]);
		});

		it("データ変換時のエラーをハンドリングする", async () => {
			// Mock circle data but error on works collection
			const mockCircleData = {
				circleId: "RG12345",
				name: "テストサークル",
				workCount: 2,
			};

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
				if (collectionName === "dlsiteWorks") {
					return {
						get: vi.fn().mockRejectedValue(new Error("Firestore error")),
					};
				}
				return {};
			});

			const result = await getCircleWorks("RG12345");

			// エラーが発生してもクラッシュせず、空配列を返す
			expect(result).toEqual([]);
		});
	});

	describe("getCircleWorksWithPagination", () => {
		it("ページネーション付きでサークルの作品一覧を正しく取得する", async () => {
			// サークル情報のモック
			const mockCircleData = {
				id: "RG12345",
				circleId: "RG12345",
				name: "テストサークル",
				workCount: 3,
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
					genres: [],
					customGenres: [],
					creators: { voiceActors: [], scenario: [], illustration: [], music: [], others: [] },
					salesStatus: {},
					sampleImages: [],
					description: "",
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
					genres: [],
					customGenres: [],
					creators: { voiceActors: [], scenario: [], illustration: [], music: [], others: [] },
					salesStatus: {},
					sampleImages: [],
					description: "",
					ageRating: "general",
					updateDate: "2025-01-10",
					createdAt: "2025-01-10T00:00:00.000Z",
					updatedAt: "2025-01-10T00:00:00.000Z",
					lastFetchedAt: "2025-01-10T00:00:00.000Z",
				},
				{
					id: "RJ333333",
					productId: "RJ333333",
					title: "作品3",
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
					genres: [],
					customGenres: [],
					creators: { voiceActors: [], scenario: [], illustration: [], music: [], others: [] },
					salesStatus: {},
					sampleImages: [],
					description: "",
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
				if (collectionName === "dlsiteWorks") {
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

			const result = await getCircleWorksWithPagination("RG12345", 1, 2, "newest");

			// Debug log
			if (result.totalCount === 0) {
				console.log("Circle doc get calls:", mockDoc.mock.calls);
				console.log("Collection get calls:", mockGet.mock.calls);
			}

			expect(result.totalCount).toBe(3);
			expect(result.works).toHaveLength(2); // ページサイズ2でページ1なので2件
			expect(result.works[0].title).toBe("作品1"); // 新しい順で1番目
			expect(result.works[1].title).toBe("作品2"); // 新しい順で2番目
		});

		it("ソート機能が正しく動作する", async () => {
			const mockCircleData = {
				id: "RG12345",
				circleId: "RG12345",
				name: "テストサークル",
				workCount: 2,
			};

			const mockWorks = [
				{
					id: "RJ111111",
					productId: "RJ111111",
					title: "高価格作品",
					circle: "テストサークル",
					circleId: "RG12345",
					price: { current: 2000, currency: "JPY" },
					category: "SOU",
					workType: "SOU",
					thumbnailUrl: "https://example.com/thumb.jpg",
					workUrl: "https://example.com/work.html",
					registDate: "2025-01-15",
					releaseDateISO: "2025-01-15",
					releaseDateDisplay: "2025年01月15日",
					genres: [],
					customGenres: [],
					creators: { voiceActors: [], scenario: [], illustration: [], music: [], others: [] },
					salesStatus: {},
					sampleImages: [],
					description: "",
					ageRating: "general",
					updateDate: "2025-01-15",
					createdAt: "2025-01-15T00:00:00.000Z",
					updatedAt: "2025-01-15T00:00:00.000Z",
					lastFetchedAt: "2025-01-15T00:00:00.000Z",
				},
				{
					id: "RJ222222",
					productId: "RJ222222",
					title: "低価格作品",
					circle: "テストサークル",
					circleId: "RG12345",
					price: { current: 1000, currency: "JPY" },
					category: "SOU",
					workType: "SOU",
					thumbnailUrl: "https://example.com/thumb.jpg",
					workUrl: "https://example.com/work.html",
					registDate: "2025-01-10",
					releaseDateISO: "2025-01-10",
					releaseDateDisplay: "2025年01月10日",
					genres: [],
					customGenres: [],
					creators: { voiceActors: [], scenario: [], illustration: [], music: [], others: [] },
					salesStatus: {},
					sampleImages: [],
					description: "",
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
				if (collectionName === "dlsiteWorks") {
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

			// 価格の低い順でソート
			const result = await getCircleWorksWithPagination("RG12345", 1, 10, "price_low");

			expect(result.works[0].title).toBe("低価格作品");
			expect(result.works[1].title).toBe("高価格作品");
		});
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});
});
