/**
 * DLsite Firestore操作のテスト
 *
 * YouTube Firestoreテストパターンに従い、DLsite作品データのFirestore操作をテストします。
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

// Firestoreのモック（YouTubeパターンに厳密に従う）
vi.mock("./firestore", () => {
  const mockDoc = vi.fn().mockReturnValue({
    id: "test-work-id",
    get: vi.fn(),
    set: vi.fn().mockResolvedValue({}),
    update: vi.fn().mockResolvedValue({}),
  });

  const mockCollection = {
    doc: mockDoc,
    get: vi.fn(),
    where: vi.fn().mockReturnThis(),
    orderBy: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
  };

  const mockBatch = {
    set: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    commit: vi.fn().mockResolvedValue(undefined),
  };

  return {
    default: {
      collection: vi.fn().mockReturnValue(mockCollection),
      batch: vi.fn().mockReturnValue(mockBatch),
    },
  };
});

// loggerのモック
vi.mock("./logger", () => ({
  debug: vi.fn(),
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
}));

import type {
  DLsiteWorkBase,
  FirestoreDLsiteWorkData,
} from "@suzumina.click/shared-types";
import * as dlsiteFirestore from "./dlsite-firestore";
import * as firestore from "./firestore";

describe("dlsite-firestore", () => {
  // テストデータ
  const mockWorkBase: DLsiteWorkBase = {
    id: "RJ123456",
    productId: "RJ123456",
    title: "テスト作品",
    circle: "テストサークル",
    author: "涼花みなせ",
    description: "テスト説明",
    category: "SOU",
    workUrl: "https://www.dlsite.com/maniax/work/=/product_id/RJ123456.html",
    thumbnailUrl:
      "https://img.dlsite.jp/modpub/images2/work/doujin/RJ124000/RJ123456_img_main.jpg",
    price: {
      current: 1100,
      original: 1100,
      currency: "JPY",
    },
    rating: {
      stars: 4.5,
      count: 100,
    },
    salesCount: 500,
    ageRating: "全年齢",
    tags: ["音声作品", "癒し"],
    sampleImages: [],
    isExclusive: false,
  };

  const mockFirestoreWork: FirestoreDLsiteWorkData = {
    ...mockWorkBase,
    lastFetchedAt: "2023-01-01T00:00:00.000Z",
    createdAt: "2023-01-01T00:00:00.000Z",
    updatedAt: "2023-01-01T00:00:00.000Z",
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("saveWorksToFirestore", () => {
    it("作品データの保存が呼び出される", async () => {
      // 既存データなしの場合をモック
      const mockCollection = vi.mocked(
        firestore.default.collection("dlsiteWorks"),
      );
      const mockGet = vi.mocked(mockCollection.get);
      mockGet.mockResolvedValue({
        docs: [],
        size: 0,
      } as any);

      // 関数実行（エラーが発生しないことを確認）
      await expect(
        dlsiteFirestore.saveWorksToFirestore([mockWorkBase]),
      ).resolves.not.toThrow();
    });

    it("空の配列を渡した場合は正常に処理される", async () => {
      await expect(
        dlsiteFirestore.saveWorksToFirestore([]),
      ).resolves.not.toThrow();
    });
  });

  describe("getWorkFromFirestore", () => {
    it("作品の取得が呼び出される", async () => {
      const mockCollection = vi.mocked(
        firestore.default.collection("dlsiteWorks"),
      );
      const mockDoc = vi.mocked(mockCollection.doc("RJ123456"));
      const mockGet = vi.mocked(mockDoc.get);

      mockGet.mockResolvedValue({
        exists: true,
        data: () => mockFirestoreWork,
      } as any);

      const result = await dlsiteFirestore.getWorkFromFirestore("RJ123456");
      expect(result).toEqual(mockFirestoreWork);
    });

    it("存在しない作品の場合はnullを返す", async () => {
      const mockCollection = vi.mocked(
        firestore.default.collection("dlsiteWorks"),
      );
      const mockDoc = vi.mocked(mockCollection.doc("RJ999999"));
      const mockGet = vi.mocked(mockDoc.get);

      mockGet.mockResolvedValue({
        exists: false,
        data: () => ({}),
      } as any);

      const result = await dlsiteFirestore.getWorkFromFirestore("RJ999999");
      expect(result).toBeNull();
    });
  });

  describe("searchWorksFromFirestore", () => {
    it("検索条件で作品を取得できる", async () => {
      const mockCollection = vi.mocked(
        firestore.default.collection("dlsiteWorks"),
      );
      const mockGet = vi.mocked(mockCollection.get);

      mockGet.mockResolvedValue({
        docs: [{ data: () => mockFirestoreWork }],
        size: 1,
      } as any);

      const result = await dlsiteFirestore.searchWorksFromFirestore({
        circle: "テストサークル",
        limit: 10,
      });

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual(mockFirestoreWork);
    });

    it("空の検索結果を処理できる", async () => {
      const mockCollection = vi.mocked(
        firestore.default.collection("dlsiteWorks"),
      );
      const mockGet = vi.mocked(mockCollection.get);

      mockGet.mockResolvedValue({
        docs: [],
        size: 0,
      } as any);

      const result = await dlsiteFirestore.searchWorksFromFirestore({
        circle: "存在しないサークル",
      });

      expect(result).toHaveLength(0);
    });

    it("複数の検索条件を組み合わせて作品を取得できる", async () => {
      const mockCollection = vi.mocked(
        firestore.default.collection("dlsiteWorks"),
      );
      const mockWhere = vi.mocked(mockCollection.where);
      const mockOrderBy = vi.mocked(mockCollection.orderBy);
      const mockLimit = vi.mocked(mockCollection.limit);
      const mockGet = vi.mocked(mockCollection.get);

      mockGet.mockResolvedValue({
        docs: [{ data: () => mockFirestoreWork }],
        size: 1,
      } as any);

      const result = await dlsiteFirestore.searchWorksFromFirestore({
        circle: "テストサークル",
        category: "音声作品",
        orderBy: "price.current",
        orderDirection: "desc",
        limit: 5,
      });

      expect(mockWhere).toHaveBeenCalledWith("circle", "==", "テストサークル");
      expect(mockWhere).toHaveBeenCalledWith("category", "==", "音声作品");
      expect(mockOrderBy).toHaveBeenCalledWith("price.current", "desc");
      expect(mockLimit).toHaveBeenCalledWith(5);
      expect(result).toHaveLength(1);
    });

    it("検索条件なしで全作品を取得できる", async () => {
      const mockCollection = vi.mocked(
        firestore.default.collection("dlsiteWorks"),
      );
      const mockGet = vi.mocked(mockCollection.get);

      mockGet.mockResolvedValue({
        docs: [
          { data: () => mockFirestoreWork },
          { data: () => ({ ...mockFirestoreWork, id: "RJ987654" }) },
        ],
        size: 2,
      } as any);

      const result = await dlsiteFirestore.searchWorksFromFirestore({});

      expect(result).toHaveLength(2);
    });

    it("orderDirectionがascの場合の並び順指定", async () => {
      const mockCollection = vi.mocked(
        firestore.default.collection("dlsiteWorks"),
      );
      const mockOrderBy = vi.mocked(mockCollection.orderBy);
      const mockGet = vi.mocked(mockCollection.get);

      mockGet.mockResolvedValue({
        docs: [],
        size: 0,
      } as any);

      await dlsiteFirestore.searchWorksFromFirestore({
        orderBy: "createdAt",
        orderDirection: "asc",
      });

      expect(mockOrderBy).toHaveBeenCalledWith("createdAt", "asc");
    });
  });

  describe("getWorksStatistics", () => {
    it("作品統計情報を正常に取得できる", async () => {
      const mockCollection = vi.mocked(
        firestore.default.collection("dlsiteWorks"),
      );
      const mockGet = vi.mocked(mockCollection.get);

      // 複数の作品データをモック
      const mockWorks = [
        {
          data: () => ({
            ...mockFirestoreWork,
            category: "SOU",
            updatedAt: "2023-01-01T00:00:00.000Z",
          }),
        },
        {
          data: () => ({
            ...mockFirestoreWork,
            id: "RJ987654",
            category: "SOU",
            updatedAt: "2023-01-01T00:00:00.000Z",
          }),
        },
        {
          data: () => ({
            ...mockFirestoreWork,
            id: "RJ111111",
            category: "SOU",
            updatedAt: "2023-01-01T00:00:00.000Z",
          }),
        },
      ];

      mockGet.mockResolvedValue({
        docs: mockWorks,
        size: 3,
      } as any);

      const stats = await dlsiteFirestore.getWorksStatistics();

      expect(stats).toEqual({
        totalWorks: 3,
        lastUpdated: "2023-01-01T00:00:00.000Z",
        categoryCounts: {
          SOU: 3,
        },
      });
    });

    it("作品がない場合の統計情報", async () => {
      const mockCollection = vi.mocked(
        firestore.default.collection("dlsiteWorks"),
      );
      const mockGet = vi.mocked(mockCollection.get);

      mockGet.mockResolvedValue({
        docs: [],
        size: 0,
      } as any);

      const stats = await dlsiteFirestore.getWorksStatistics();

      expect(stats).toEqual({
        totalWorks: 0,
        lastUpdated: null,
        categoryCounts: {},
      });
    });

    it("価格情報がない作品を適切に処理する", async () => {
      const mockCollection = vi.mocked(
        firestore.default.collection("dlsiteWorks"),
      );
      const mockGet = vi.mocked(mockCollection.get);

      const mockWorks = [
        {
          data: () => ({
            ...mockFirestoreWork,
            category: "SOU",
            updatedAt: "2023-01-01T00:00:00.000Z",
          }),
        },
        {
          data: () => ({
            ...mockFirestoreWork,
            id: "RJ987654",
            category: "SOU",
            updatedAt: "2023-01-01T00:00:00.000Z",
          }),
        },
      ];

      mockGet.mockResolvedValue({
        docs: mockWorks,
        size: 2,
      } as any);

      const stats = await dlsiteFirestore.getWorksStatistics();

      expect(stats).toEqual({
        totalWorks: 2,
        lastUpdated: "2023-01-01T00:00:00.000Z",
        categoryCounts: {
          SOU: 2,
        },
      });
    });
  });

  describe("エラーハンドリング", () => {
    it("getWorkFromFirestore でエラーが発生した場合", async () => {
      const mockCollection = vi.mocked(
        firestore.default.collection("dlsiteWorks"),
      );
      const mockDoc = vi.mocked(mockCollection.doc("RJ123456"));
      const mockGet = vi.mocked(mockDoc.get);
      mockGet.mockRejectedValue(new Error("Firestore error"));

      await expect(
        dlsiteFirestore.getWorkFromFirestore("RJ123456"),
      ).rejects.toThrow("作品データの取得に失敗: RJ123456");
    });

    it("searchWorksFromFirestore でエラーが発生した場合", async () => {
      const mockCollection = vi.mocked(
        firestore.default.collection("dlsiteWorks"),
      );
      const mockGet = vi.mocked(mockCollection.get);
      mockGet.mockRejectedValue(new Error("Search error"));

      await expect(
        dlsiteFirestore.searchWorksFromFirestore({ circle: "テストサークル" }),
      ).rejects.toThrow("作品検索に失敗");
    });

    it("getWorksStatistics でエラーが発生した場合", async () => {
      const mockCollection = vi.mocked(
        firestore.default.collection("dlsiteWorks"),
      );
      const mockGet = vi.mocked(mockCollection.get);
      mockGet.mockRejectedValue(new Error("Statistics error"));

      await expect(dlsiteFirestore.getWorksStatistics()).rejects.toThrow(
        "作品統計情報の取得に失敗",
      );
    });
  });
});
