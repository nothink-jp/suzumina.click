/**
 * Creator page server actions のテストスイート
 */

import { convertToWorkPlainObject } from "@suzumina.click/shared-types";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// convertToWorkPlainObjectのモック実装を別関数として定義
const mockConvertToWorkPlainObject = (data: any) => {
	if (!data || !data.id || !data.productId) return null;
	const creators = data.creators || {};
	const mapCreators = (arr: any[] = []) =>
		arr.map((item: any) => ({ id: item.id, name: item.name }));
	const mapNames = (arr: any[] = []) => arr.map((item: any) => item.name);

	return {
		...data,
		price: data.price || {
			current: 0,
			currency: "JPY",
			formattedPrice: "¥0",
			isFree: false,
			isDiscounted: false,
		},
		rating: data.rating,
		creators: {
			voiceActors: mapCreators(creators.voice_by),
			scenario: mapCreators(creators.scenario_by),
			illustration: mapCreators(creators.illust_by),
			music: mapCreators(creators.music_by),
			others: mapCreators(creators.others),
			voiceActorNames: mapNames(creators.voice_by),
			scenarioNames: mapNames(creators.scenario_by),
			illustrationNames: mapNames(creators.illust_by),
			musicNames: mapNames(creators.music_by),
			otherNames: mapNames(creators.others),
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
		genres: data.genres?.map((g: any) => g.name || g) || [],
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
};

// convertToWorkPlainObject, workTransformersのモック
vi.mock("@suzumina.click/shared-types", () => ({
	convertToWorkPlainObject: vi.fn(),
	workTransformers: {
		fromFirestore: vi.fn((data) => {
			// Use the mock helper function to transform data
			const mockConvertToWorkPlainObject = (data: any) => {
				if (!data || !data.id || !data.productId) return null;
				return {
					...data,
					price: data.price || { current: 0, currency: "JPY" },
					rating: data.rating || { stars: 0, reviewCount: 0 },
					creators: data.creators || {
						voiceActors: [],
						scenario: [],
						illustration: [],
						music: [],
						others: [],
					},
					salesStatus: data.salesStatus || {},
					sampleImages: data.sampleImages || [],
					genres: data.genres || [],
					customGenres: data.customGenres || [],
					_computed: {
						displayTitle: data.title,
						isAdult: data.category === "adult",
						thumbnailUrl: data.thumbnailUrl || "",
						priceInYen: data.price?.current || 0,
						discountRate: 0,
						hasDiscount: false,
						creatorNames: "",
						voiceActorNames: "",
						genreNames: "",
						releaseYear: 2024,
						formattedReleaseDate: "2024年1月1日",
						detailPageUrl: `/works/${data.productId}`,
						purchasePageUrl: `https://www.dlsite.com/maniax/work/=/product_id/${data.productId}.html`,
						relativeUrl: `/works/${data.productId}`,
						isAdultContent: false,
						isVoiceWork: data.category === "SOU",
						isGameWork: false,
						isMangaWork: false,
						isNewRelease: false,
						isPopular: false,
						primaryLanguage: "ja",
						availableLanguages: ["ja"],
						searchableText: `${data.title} ${data.circle}`,
						tags: data.tags || [],
					},
				};
			};
			return mockConvertToWorkPlainObject(data);
		}),
	},
	isValidCreatorId: vi.fn((id) => /^[A-Z]{2}\d{5,7}$/.test(id)),
}));

// Firestore モック
const mockDoc = vi.fn();
const mockGet = vi.fn();
const mockGetAll = vi.fn();

const mockCollection = vi.fn((collectionName) => ({
	doc: collectionName === "works" ? vi.fn((id) => ({ id })) : mockDoc,
}));

// doc method setup - will be configured per test

vi.mock("@/lib/firestore", () => ({
	getFirestore: () => ({
		collection: mockCollection,
		getAll: mockGetAll,
	}),
}));

// テスト対象のインポート（モック設定後）
import { getCreatorInfo, getCreatorWorksList } from "../actions";

describe("Creator page server actions", () => {
	// テスト用のヘルパー関数
	const setupCreatorMocks = (creatorData: any, worksSnapshot: any) => {
		// mockDocの設定
		mockDoc.mockReturnValue({
			get: vi.fn().mockResolvedValue({
				exists: true,
				data: () => creatorData,
				ref: {
					collection: vi.fn().mockReturnValue({
						get: vi.fn().mockResolvedValue(worksSnapshot),
					}),
				},
			}),
		});
	};

	beforeEach(() => {
		vi.clearAllMocks();

		// mockGetAll のデフォルト実装を設定
		mockGetAll.mockImplementation((...workRefs) => {
			return Promise.resolve(
				workRefs.map((ref: any) => ({
					exists: false,
					id: ref.id || "unknown",
					data: () => null,
				})),
			);
		});
		// Reset convertToWorkPlainObject mock to default implementation
		vi.mocked(convertToWorkPlainObject).mockImplementation((data: any) => {
			const result = mockConvertToWorkPlainObject(data);
			if (result === null) {
				return {
					isOk: () => false,
					error: { message: "Invalid data" },
				};
			}
			return {
				isOk: () => true,
				value: result,
			};
		});
	});

	describe("getCreatorInfo", () => {
		it("存在するクリエイター情報を正しく取得する", async () => {
			const mockCreatorData = {
				name: "テストクリエイター",
				primaryRole: "voiceActor",
			};

			const mockWorksData = [
				{ id: "RJ111111", data: () => ({ roles: ["voiceActor", "scenario"] }) },
				{ id: "RJ222222", data: () => ({ roles: ["voiceActor"] }) },
				{ id: "RJ333333", data: () => ({ roles: ["illustration"] }) },
			];

			mockDoc.mockReturnValue({
				get: vi.fn().mockResolvedValueOnce({
					exists: true,
					data: () => mockCreatorData,
					ref: {
						collection: vi.fn().mockReturnValue({
							get: vi.fn().mockResolvedValueOnce({
								size: mockWorksData.length,
								docs: mockWorksData,
							}),
						}),
					},
				}),
			});

			const result = await getCreatorInfo("VA12345");

			expect(result).toEqual({
				id: "VA12345",
				name: "テストクリエイター",
				types: ["voiceActor", "scenario", "illustration"],
				workCount: 3,
			});
			expect(mockCollection).toHaveBeenCalledWith("creators");
			expect(mockDoc).toHaveBeenCalledWith("VA12345");
		});

		it("存在しないクリエイターの場合はnullを返す", async () => {
			mockGet.mockResolvedValueOnce({
				exists: false,
			});

			const result = await getCreatorInfo("VA99999");

			expect(result).toBeNull();
		});

		it("無効なクリエイターIDの場合はnullを返す", async () => {
			const result = await getCreatorInfo("INVALID_ID");

			expect(result).toBeNull();
			expect(mockCollection).not.toHaveBeenCalled();
		});

		it("エラー発生時はnullを返す", async () => {
			mockGet.mockRejectedValueOnce(new Error("Firestore error"));

			const result = await getCreatorInfo("VA12345");

			expect(result).toBeNull();
		});
	});

	describe("getCreatorWorksList", () => {
		it("検索機能が正しく動作する", async () => {
			const mockCreatorData = {
				name: "テストクリエイター",
			};

			const mockWorksSnapshot = {
				empty: false,
				docs: [
					{ id: "RJ111111", data: () => ({}) },
					{ id: "RJ222222", data: () => ({}) },
					{ id: "RJ333333", data: () => ({}) },
				],
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
					creators: {},
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
					creators: {},
					salesStatus: {},
					sampleImages: [],
					ageRating: "general",
					updateDate: "2025-01-05",
					createdAt: "2025-01-05T00:00:00.000Z",
					updatedAt: "2025-01-05T00:00:00.000Z",
					lastFetchedAt: "2025-01-05T00:00:00.000Z",
				},
			];

			setupCreatorMocks(mockCreatorData, mockWorksSnapshot);

			// mockGetAllを設定 - workRefsの順番に従って対応するworkを返す
			mockGetAll.mockImplementation((...workRefs) => {
				return Promise.resolve(
					workRefs.map((ref: any) => {
						// refはdocメソッドから返されるオブジェクトで、idプロパティを持つ
						const workId = ref.id;
						const work = mockWorks.find((w) => w.id === workId);
						if (work) {
							return {
								exists: true,
								id: workId,
								data: () => work,
							};
						}
						return {
							exists: false,
							id: workId,
							data: () => null,
						};
					}),
				);
			});

			// "魔法"で検索
			const result = await getCreatorWorksList({
				creatorId: "VA12345",
				search: "魔法",
			});

			expect(result.totalCount).toBe(3); // 全作品数
			expect(result.filteredCount).toBe(1); // フィルター後の作品数
			expect(result.works).toHaveLength(1);
			expect(result.works[0].title).toBe("魔法少女の冒険");
		});

		it("声優名で検索できる", async () => {
			const mockCreatorData = {
				name: "テストクリエイター",
			};

			const mockWorksSnapshot = {
				empty: false,
				docs: [
					{ id: "RJ111111", data: () => ({}) },
					{ id: "RJ222222", data: () => ({}) },
				],
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

			setupCreatorMocks(mockCreatorData, mockWorksSnapshot);

			// mockGetAllを設定 - workRefsの順番に従って対応するworkを返す
			mockGetAll.mockImplementation((...workRefs) => {
				return Promise.resolve(
					workRefs.map((ref: any) => {
						// refはdocメソッドから返されるオブジェクトで、idプロパティを持つ
						const workId = ref.id;
						const work = mockWorks.find((w) => w.id === workId);
						if (work) {
							return {
								exists: true,
								id: workId,
								data: () => work,
							};
						}
						return {
							exists: false,
							id: workId,
							data: () => null,
						};
					}),
				);
			});

			// 声優名で検索
			const result = await getCreatorWorksList({
				creatorId: "VA12345",
				search: "田中",
			});

			expect(result.filteredCount).toBe(1);
			expect(result.works).toHaveLength(1);
			expect(result.works[0].creators.voiceActors[0].name).toBe("田中太郎");
		});

		it("ページネーションと検索を組み合わせて正しく動作する", async () => {
			const mockCreatorData = {
				name: "テストクリエイター",
			};

			const mockWorksSnapshot = {
				empty: false,
				docs: Array.from({ length: 5 }, (_, i) => ({
					id: `RJ${i + 1}11111`,
					data: () => ({}),
				})),
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
				creators: {},
				salesStatus: {},
				sampleImages: [],
				ageRating: "general",
				updateDate: `2025-01-${15 - i}`,
				createdAt: `2025-01-${15 - i}T00:00:00.000Z`,
				updatedAt: `2025-01-${15 - i}T00:00:00.000Z`,
				lastFetchedAt: `2025-01-${15 - i}T00:00:00.000Z`,
			}));

			setupCreatorMocks(mockCreatorData, mockWorksSnapshot);

			// mockGetAllを設定 - workRefsの順番に従って対応するworkを返す
			mockGetAll.mockImplementation((...workRefs) => {
				return Promise.resolve(
					workRefs.map((ref: any) => {
						// refはdocメソッドから返されるオブジェクトで、idプロパティを持つ
						const workId = ref.id;
						const work = mockWorks.find((w) => w.id === workId);
						if (work) {
							return {
								exists: true,
								id: workId,
								data: () => work,
							};
						}
						return {
							exists: false,
							id: workId,
							data: () => null,
						};
					}),
				);
			});

			// "冒険"で検索、ページ2を取得（limit=2）
			const result = await getCreatorWorksList({
				creatorId: "VA12345",
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
			const mockCreatorData = {
				name: "テストクリエイター",
			};

			const mockWorksSnapshot = {
				empty: false,
				docs: [{ id: "RJ111111", data: () => ({}) }],
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

			setupCreatorMocks(mockCreatorData, mockWorksSnapshot);

			// mockGetAllを設定 - workRefsの順番に従って対応するworkを返す
			mockGetAll.mockImplementation((...workRefs) => {
				return Promise.resolve(
					workRefs.map((ref: any) => {
						// refはdocメソッドから返されるオブジェクトで、idプロパティを持つ
						const workId = ref.id;
						const work = mockWorks.find((w) => w.id === workId);
						if (work) {
							return {
								exists: true,
								id: workId,
								data: () => work,
							};
						}
						return {
							exists: false,
							id: workId,
							data: () => null,
						};
					}),
				);
			});

			const result = await getCreatorWorksList({
				creatorId: "VA12345",
				search: "存在しない検索語",
			});

			expect(result.totalCount).toBe(1);
			expect(result.filteredCount).toBe(0);
			expect(result.works).toHaveLength(0);
		});

		it("検索パラメータがない場合はfilteredCountを返さない", async () => {
			const mockCreatorData = {
				name: "テストクリエイター",
			};

			const mockWorksSnapshot = {
				empty: false,
				docs: [{ id: "RJ111111", data: () => ({}) }],
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

			setupCreatorMocks(mockCreatorData, mockWorksSnapshot);

			// mockGetAllを設定 - workRefsの順番に従って対応するworkを返す
			mockGetAll.mockImplementation((...workRefs) => {
				return Promise.resolve(
					workRefs.map((ref: any) => {
						// refはdocメソッドから返されるオブジェクトで、idプロパティを持つ
						const workId = ref.id;
						const work = mockWorks.find((w) => w.id === workId);
						if (work) {
							return {
								exists: true,
								id: workId,
								data: () => work,
							};
						}
						return {
							exists: false,
							id: workId,
							data: () => null,
						};
					}),
				);
			});

			const result = await getCreatorWorksList({
				creatorId: "VA12345",
			});

			expect(result.totalCount).toBe(1);
			expect(result.filteredCount).toBeUndefined();
			expect(result.works).toHaveLength(1);
		});

		it("無効なクリエイターIDの場合は空の結果を返す", async () => {
			const result = await getCreatorWorksList({
				creatorId: "INVALID_ID",
			});

			expect(result).toEqual({ works: [], totalCount: 0 });
		});

		it("クリエイターが存在しない場合は空の結果を返す", async () => {
			mockGet.mockResolvedValueOnce({
				exists: false,
			});

			const result = await getCreatorWorksList({
				creatorId: "VA99999",
			});

			expect(result).toEqual({ works: [], totalCount: 0 });
		});

		it("エラー発生時は空の結果を返す", async () => {
			mockGet.mockRejectedValueOnce(new Error("Firestore error"));

			const result = await getCreatorWorksList({
				creatorId: "VA12345",
			});

			expect(result).toEqual({ works: [], totalCount: 0 });
		});
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});
});
