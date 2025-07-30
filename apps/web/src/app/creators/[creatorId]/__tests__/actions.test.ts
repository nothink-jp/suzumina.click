/**
 * Creator page server actions のテストスイート
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// convertToWorkPlainObjectのモック
vi.mock("@suzumina.click/shared-types", () => ({
	convertToWorkPlainObject: vi.fn((data) => ({
		...data,
		price: {
			current: data.currentPrice || data.price?.current || 0,
			currency: data.currency || "JPY",
			formattedPrice: `¥${(data.currentPrice || data.price?.current || 0).toLocaleString()}`,
		},
		rating: data.ratingStars
			? {
					stars: data.ratingStars,
					count: data.ratingCount || 0,
				}
			: data.rating,
		creators: {
			voiceActors: data.voiceActors || [],
			scenario: data.scenario || [],
			illustration: data.illustration || [],
			music: data.music || [],
			others: data.author || [],
		},
		salesStatus: {
			isOnSale: true,
			isDiscounted: false,
			isFree: false,
			isSoldOut: false,
			isReserveWork: false,
			dlsiteplaySupported: false,
		},
		sampleImages: [],
		genres: data.genres || [],
		customGenres: [],
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
	})),
	isValidCreatorId: vi.fn((id) => id && id.length > 0),
}));

// Firestore モック
const mockWhere = vi.fn();
const mockOrderBy = vi.fn();
const mockLimit = vi.fn();
const mockGet = vi.fn();
const mockGetAll = vi.fn();
const mockSubCollectionGet = vi.fn();

const mockDoc = vi.fn();
const mockSubCollection = vi.fn();

const mockCollection = vi.fn((_collectionName) => ({
	where: mockWhere,
	orderBy: mockOrderBy,
	limit: mockLimit,
	get: mockGet,
	getAll: mockGetAll,
	doc: mockDoc,
}));

// Configure mockDoc to return proper document references
mockDoc.mockImplementation((docId) => ({
	id: docId,
	ref: {
		collection: mockSubCollection,
	},
	get: mockGet,
	data: () => ({}),
	exists: false,
}));

// Configure subcollection mock
mockSubCollection.mockImplementation(() => ({
	get: mockSubCollectionGet,
}));

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
		getAll: mockGetAll,
		doc: mockDoc,
	}),
}));

// テスト対象のインポート（モック設定後）
const { getCreatorInfo, getCreatorWorks } = await import("../actions");

describe("Creator page server actions", () => {
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
	});

	describe("getCreatorInfo", () => {
		it("存在するクリエイター情報を正しく集約する", async () => {
			const mockCreatorData = {
				creatorId: "creator123",
				name: "テストクリエイター",
				primaryRole: "voice",
				createdAt: { seconds: 1234567890, nanoseconds: 0 },
				updatedAt: { seconds: 1234567890, nanoseconds: 0 },
			};

			const mockWorkRelations = [
				{
					workId: "RJ111111",
					roles: ["voice"],
					circleId: "RG11111",
				},
				{
					workId: "RJ222222",
					roles: ["illustration"],
					circleId: "RG22222",
				},
				{
					workId: "RJ333333",
					roles: ["voice", "scenario"],
					circleId: "RG33333",
				},
			];

			// クリエイタードキュメントの取得
			mockGet.mockResolvedValueOnce({
				exists: true,
				data: () => mockCreatorData,
				ref: {
					collection: mockSubCollection,
				},
			});

			// worksサブコレクションの取得
			mockSubCollectionGet.mockResolvedValueOnce({
				empty: false,
				size: 3,
				docs: mockWorkRelations.map((relation) => ({
					data: () => relation,
				})),
			});

			const result = await getCreatorInfo("creator123");

			expect(result).toEqual({
				id: "creator123",
				name: "テストクリエイター",
				types: ["voice", "illustration", "scenario"], // 重複なし、ユニークな値
				workCount: 3,
			});
			expect(mockDoc).toHaveBeenCalledWith("creator123");
		});

		it("クリエイターが存在しない場合はnullを返す", async () => {
			mockGet.mockResolvedValueOnce({
				exists: false,
			});

			const result = await getCreatorInfo("nonexistent");

			expect(result).toBeNull();
		});

		it("無効なクリエイターIDの場合はnullを返す", async () => {
			const result = await getCreatorInfo("");

			expect(result).toBeNull();
			expect(mockDoc).not.toHaveBeenCalled();
		});

		it("エラー発生時はnullを返す", async () => {
			mockGet.mockRejectedValue(new Error("Firestore error"));

			const result = await getCreatorInfo("creator123");

			expect(result).toBeNull();
		});
	});

	describe("getCreatorWorks", () => {
		it("クリエイターの作品一覧を正しく取得する", async () => {
			const mockCreatorData = {
				creatorId: "creator123",
				name: "テストクリエイター",
			};

			const mockWorkRelations = [
				{ workId: "RJ111111", roles: ["voice"], circleId: "RG11111" },
				{ workId: "RJ222222", roles: ["voice"], circleId: "RG22222" },
			];

			const mockWorks = [
				{
					id: "RJ111111",
					productId: "RJ111111",
					title: "作品1",
					circle: "サークルA",
					circleId: "RG11111",
					priceInJPY: 1100,
					registDate: { toDate: () => new Date("2025-01-15") },
					releaseDateISO: "2025-01-15",
					images: { main: "image1.jpg", list: "list1.jpg" },
					options: { genre: ["ボイス・ASMR"], aiUsed: false },
					tags: ["tag1"],
					rating: { stars: 45, count: 5 },
				},
				{
					id: "RJ222222",
					productId: "RJ222222",
					title: "作品2",
					circle: "サークルB",
					circleId: "RG22222",
					priceInJPY: 2200,
					registDate: { toDate: () => new Date("2025-01-10") },
					releaseDateISO: "2025-01-10",
					images: { main: "image2.jpg", list: "list2.jpg" },
					options: { genre: ["音声作品"], aiUsed: true },
					tags: ["tag2"],
					rating: { stars: 40, count: 3 },
				},
			];

			// クリエイタードキュメントの取得
			mockGet.mockResolvedValueOnce({
				exists: true,
				data: () => mockCreatorData,
				ref: {
					collection: mockSubCollection,
				},
			});

			// worksサブコレクションの取得
			mockSubCollectionGet.mockResolvedValueOnce({
				empty: false,
				docs: mockWorkRelations.map((relation) => ({
					id: relation.workId,
					data: () => relation,
				})),
			});

			// 作品取得のモック（getAll）
			mockGetAll.mockResolvedValue(
				mockWorks.map((work) => ({
					exists: true,
					id: work.id,
					data: () => work,
				})),
			);

			const result = await getCreatorWorks("creator123");

			expect(result).toHaveLength(2);
			expect(result[0]).toMatchObject({
				id: "RJ111111",
				title: "作品1",
			});
			expect(result[1]).toMatchObject({
				id: "RJ222222",
				title: "作品2",
			});
			expect(mockDoc).toHaveBeenCalledWith("creator123");
			expect(mockGetAll).toHaveBeenCalled();
		});

		it("作品が見つからない場合は空配列を返す", async () => {
			mockGet.mockResolvedValueOnce({
				exists: false,
			});

			const result = await getCreatorWorks("creator999");

			expect(result).toEqual([]);
		});

		it("無効なクリエイターIDの場合は空配列を返す", async () => {
			const result = await getCreatorWorks("");

			expect(result).toEqual([]);
			expect(mockDoc).not.toHaveBeenCalled();
		});

		it("作品ドキュメントが削除されている場合は除外する", async () => {
			const mockCreatorData = {
				creatorId: "creator123",
				name: "テストクリエイター",
			};

			const mockWorkRelations = [
				{ workId: "RJ111111", roles: ["voice"], circleId: "RG11111" },
				{ workId: "RJ222222", roles: ["voice"], circleId: "RG22222" }, // この作品は削除済み
			];

			const mockWork = {
				id: "RJ111111",
				productId: "RJ111111",
				title: "作品1",
				circle: "サークルA",
				circleId: "RG11111",
				priceInJPY: 1100,
				registDate: { toDate: () => new Date("2025-01-15") },
				releaseDateISO: "2025-01-15",
				images: { main: "image1.jpg", list: "list1.jpg" },
				options: { genre: ["ボイス・ASMR"], aiUsed: false },
				tags: ["tag1"],
				rating: { stars: 45, count: 5 },
				wishlistCount: 100,
			};

			// クリエイタードキュメントの取得
			mockGet.mockResolvedValueOnce({
				exists: true,
				data: () => mockCreatorData,
				ref: {
					collection: mockSubCollection,
				},
			});

			// worksサブコレクションの取得
			mockSubCollectionGet.mockResolvedValueOnce({
				empty: false,
				docs: mockWorkRelations.map((relation) => ({
					id: relation.workId,
					data: () => relation,
				})),
			});

			// RJ111111は存在、RJ222222は削除済み
			mockGetAll.mockResolvedValue([
				{
					exists: true,
					id: "RJ111111",
					data: () => mockWork,
				},
				{
					exists: false,
					id: "RJ222222",
				},
			]);

			const result = await getCreatorWorks("creator123");

			expect(result).toHaveLength(1);
			expect(result[0].id).toBe("RJ111111");
		});

		it("whereIn制限を超える場合は複数バッチで処理する", async () => {
			const mockCreatorData = {
				creatorId: "creator123",
				name: "テストクリエイター",
			};

			// 15個のマッピング（whereInは10個まで）
			const mockWorkRelations = Array.from({ length: 15 }, (_, i) => ({
				workId: `RJ${String(i).padStart(6, "0")}`,
				roles: ["voice"],
				circleId: `RG${String(i).padStart(5, "0")}`,
			}));

			const mockWorks = mockWorkRelations.map((relation, i) => ({
				id: relation.workId,
				productId: relation.workId,
				title: `作品${i}`,
				circle: `サークル${i}`,
				circleId: `RG${String(i).padStart(5, "0")}`,
				priceInJPY: 1000 + i * 100,
				registDate: { toDate: () => new Date(`2025-01-${String(i + 1).padStart(2, "0")}`) },
				releaseDateISO: `2025-01-${String(i + 1).padStart(2, "0")}`,
				images: { main: `image${i}.jpg`, list: `list${i}.jpg` },
				options: { genre: ["ボイス・ASMR"], aiUsed: false },
				tags: [`tag${i}`],
				rating: { stars: 45, count: 5 },
			}));

			// クリエイタードキュメントの取得
			mockGet.mockResolvedValueOnce({
				exists: true,
				data: () => mockCreatorData,
				ref: {
					collection: mockSubCollection,
				},
			});

			// worksサブコレクションの取得
			mockSubCollectionGet.mockResolvedValueOnce({
				empty: false,
				docs: mockWorkRelations.map((relation) => ({
					id: relation.workId,
					data: () => relation,
				})),
			});

			// 2回のgetAllが呼ばれることを想定
			mockGetAll
				.mockResolvedValueOnce(
					// 最初の10件
					mockWorks
						.slice(0, 10)
						.map((work) => ({
							exists: true,
							id: work.id,
							data: () => work,
						})),
				)
				.mockResolvedValueOnce(
					// 残りの5件
					mockWorks
						.slice(10)
						.map((work) => ({
							exists: true,
							id: work.id,
							data: () => work,
						})),
				);

			const result = await getCreatorWorks("creator123");

			expect(result).toHaveLength(15);
			expect(mockGetAll).toHaveBeenCalledTimes(2);
		});

		it("エラー発生時は空配列を返す", async () => {
			mockGet.mockRejectedValue(new Error("Firestore error"));

			const result = await getCreatorWorks("creator123");

			expect(result).toEqual([]);
		});
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});
});
