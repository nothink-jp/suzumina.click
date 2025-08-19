import { beforeEach, describe, expect, it, vi } from "vitest";
import { getWorks } from "../actions";

// Mock Firestore
const mockGet = vi.fn();
const mockDoc = vi.fn();
const mockCollection = vi.fn();
const mockWhere = vi.fn();
const mockOrderBy = vi.fn();
const mockLimit = vi.fn();
const mockStartAfter = vi.fn();
const mockCount = vi.fn();

vi.mock("@/lib/firestore", () => ({
	getFirestore: () => ({
		collection: mockCollection,
	}),
}));

// Mock logger
vi.mock("@/lib/logger", () => ({
	info: vi.fn(),
	error: vi.fn(),
	warn: vi.fn(),
	debug: vi.fn(),
}));

describe("Works Server Actions", () => {
	beforeEach(() => {
		vi.clearAllMocks();

		// Setup collection chain
		const mockQuery = {
			doc: mockDoc,
			where: mockWhere,
			orderBy: mockOrderBy,
			limit: mockLimit,
			startAfter: mockStartAfter,
			get: mockGet,
			count: mockCount,
		};

		mockCollection.mockReturnValue(mockQuery);
		mockWhere.mockReturnValue(mockQuery);
		mockOrderBy.mockReturnValue(mockQuery);
		mockLimit.mockReturnValue(mockQuery);
		mockStartAfter.mockReturnValue(mockQuery);
		mockCount.mockReturnValue({
			get: vi.fn().mockResolvedValue({
				data: vi.fn().mockReturnValue({ count: 100 }),
			}),
		});
	});

	describe("getWorks", () => {
		const mockWorkDocs = [
			{
				id: "RJ001",
				data: () => ({
					productId: "RJ001",
					title: "作品1",
					description: "説明1",
					circle: "サークル1",
					circleId: "circle001",
					category: "SOU",
					price: { current: 1000, currency: "JPY" },
					rating: { average: 4.5, count: 100 },
					releaseDate: "2024-01-01",
					releaseDateISO: "2024-01-01",
					imageUrl: "https://example.com/1.jpg",
					tags: [],
					isAdult: false,
					creators: {},
				}),
			},
			{
				id: "RJ002",
				data: () => ({
					productId: "RJ002",
					title: "作品2",
					description: "説明2",
					circle: "サークル2",
					circleId: "circle002",
					category: "SOU",
					price: { current: 2000, currency: "JPY" },
					rating: { average: 4.0, count: 50 },
					releaseDate: "2024-01-02",
					releaseDateISO: "2024-01-02",
					imageUrl: "https://example.com/2.jpg",
					tags: [],
					isAdult: true,
					creators: {},
				}),
			},
		];

		it("検索パラメータなしで作品リストが取得できる", async () => {
			mockGet.mockResolvedValue({
				docs: mockWorkDocs,
				size: 2,
			});

			const result = await getWorks();

			expect(result.works).toHaveLength(2);
			expect(result.works[0].title).toBe("作品1");
			expect(result.hasMore).toBe(false);
			expect(mockOrderBy).toHaveBeenCalledWith("releaseDateISO", "desc");
		});

		it("検索パラメータで複雑なフィルタリングが動作する", async () => {
			mockGet.mockResolvedValue({
				docs: mockWorkDocs,
				size: 2,
			});

			const result = await getWorks({
				search: "作品1",
				page: 1,
				limit: 12,
			});

			expect(mockLimit).not.toHaveBeenCalled();
			expect(result.works).toBeDefined();
		});

		it("言語フィルタリングが動作する", async () => {
			mockGet.mockResolvedValue({
				docs: mockWorkDocs,
				size: 2,
			});

			const result = await getWorks({
				language: "ja",
				page: 1,
				limit: 12,
			});

			expect(mockLimit).not.toHaveBeenCalled();
			expect(result.works).toBeDefined();
		});

		it("R18フィルタリングが動作する", async () => {
			mockGet.mockResolvedValue({
				docs: mockWorkDocs,
				size: 2,
			});

			const result = await getWorks({
				showR18: false,
				page: 1,
				limit: 12,
			});

			expect(mockLimit).not.toHaveBeenCalled();
			expect(result.works).toBeDefined();
		});

		it("showR18がundefinedの場合は全作品を表示する", async () => {
			mockGet.mockResolvedValue({
				docs: mockWorkDocs,
				size: 2,
			});

			const result = await getWorks({
				showR18: undefined,
				page: 1,
				limit: 12,
			});

			expect(mockLimit).toHaveBeenCalledWith(12);
			expect(result.works).toHaveLength(2);
		});

		it("カテゴリフィルタが動作する", async () => {
			mockGet.mockResolvedValue({
				docs: [mockWorkDocs[0]],
				size: 1,
			});

			const result = await getWorks({
				category: "SOU",
				page: 1,
				limit: 12,
			});

			expect(mockWhere).toHaveBeenCalledWith("category", "==", "SOU");
			expect(result.works).toHaveLength(1);
		});

		it("ソート順が正しく適用される", async () => {
			mockGet.mockResolvedValue({
				docs: mockWorkDocs,
				size: 2,
			});

			await getWorks({
				sort: "price_low",
				page: 1,
				limit: 12,
			});

			expect(mockOrderBy).toHaveBeenCalledWith("price.current", "asc");
		});

		it("ページネーションが正しく動作する", async () => {
			mockGet.mockResolvedValue({
				docs: [],
				size: 0,
			});

			await getWorks({
				page: 2,
				limit: 12,
			});

			expect(mockLimit).toHaveBeenCalledWith(12);
		});

		it("エラー時に空の結果を返す", async () => {
			mockGet.mockRejectedValue(new Error("Firestore error"));

			const result = await getWorks();

			expect(result.works).toEqual([]);
			expect(result.hasMore).toBe(false);
			expect(result.totalCount).toBe(0);
		});
	});
});
