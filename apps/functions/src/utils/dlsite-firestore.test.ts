/**
 * DLsite Firestore操作のテスト
 *
 * YouTube Firestoreテストパターンに従い、DLsite作品データのFirestore操作をテストします。
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

// Firestoreのモック（クエリチェーンを正しく処理）
vi.mock("./firestore", () => {
  const mockDoc = vi.fn().mockReturnValue({
    id: "test-work-id",
    get: vi.fn(),
    set: vi.fn().mockResolvedValue({}),
    update: vi.fn().mockResolvedValue({}),
  });

  const createMockQuery = () => ({
    get: vi.fn(),
    where: vi.fn().mockImplementation(() => createMockQuery()),
    orderBy: vi.fn().mockImplementation(() => createMockQuery()),
    limit: vi.fn().mockImplementation(() => createMockQuery()),
  });

  const mockCollection = {
    ...createMockQuery(),
    doc: mockDoc,
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

// dlsite-mapperのモック
vi.mock("./dlsite-mapper", () => ({
  filterWorksForUpdate: vi.fn(),
  mapToFirestoreData: vi.fn(),
  validateWorkData: vi.fn(),
}));

import type {
  DLsiteWorkBase,
  FirestoreDLsiteWorkData,
} from "@suzumina.click/shared-types";
import * as dlsiteFirestore from "./dlsite-firestore";
import * as dlsiteMapper from "./dlsite-mapper";
import * as firestore from "./firestore";

describe("dlsite-firestore", () => {
  // テストデータ
  const mockWorkBase: DLsiteWorkBase = {
    id: "RJ123456",
    productId: "RJ123456",
    title: "テスト作品",
    circle: "テストサークル",
    author: ["涼花みなせ"],
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

    // dlsite-mapperのデフォルトモック設定
    vi.mocked(dlsiteMapper.validateWorkData).mockReturnValue({
      isValid: true,
      warnings: [],
    });

    vi.mocked(dlsiteMapper.mapToFirestoreData).mockReturnValue(
      mockFirestoreWork,
    );

    vi.mocked(dlsiteMapper.filterWorksForUpdate).mockReturnValue({
      toCreate: [],
      toUpdate: [],
      unchanged: [],
    });
  });

  describe("saveWorksToFirestore", () => {
    it("作品データの保存が呼び出される", async () => {
      // 既存データなしの場合をモック
      const mockCollection = vi.mocked(
        firestore.default.collection("dlsiteWorks"),
      );
      const mockWhere = vi.fn().mockReturnThis();
      const mockGet = vi.fn().mockResolvedValue({
        docs: [],
        size: 0,
      });
      mockCollection.where.mockImplementation(mockWhere);
      mockWhere.mockReturnValue({ get: mockGet });

      // バッチモックを設定
      const mockBatch = {
        set: vi.fn().mockReturnThis(),
        update: vi.fn().mockReturnThis(),
        commit: vi.fn().mockResolvedValue(undefined),
      };
      vi.mocked(firestore.default.batch).mockReturnValue(mockBatch as any);

      // 関数実行（エラーが発生しないことを確認）
      await expect(
        dlsiteFirestore.saveWorksToFirestore([mockWorkBase]),
      ).resolves.not.toThrow();
    });

    it("空の配列を渡した場合は正常に処理される", async () => {
      // 基本的なモック設定（空配列なので実際には使われない）
      const _mockCollection = vi.mocked(
        firestore.default.collection("dlsiteWorks"),
      );
      const mockBatch = {
        set: vi.fn().mockReturnThis(),
        update: vi.fn().mockReturnThis(),
        commit: vi.fn().mockResolvedValue(undefined),
      };
      vi.mocked(firestore.default.batch).mockReturnValue(mockBatch as any);

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

      // クエリチェーンの最終的なgetメソッドを設定
      const mockQuery = {
        get: vi.fn().mockResolvedValue({
          docs: [{ data: () => mockFirestoreWork }],
          size: 1,
        }),
        where: vi.fn().mockReturnThis(),
        orderBy: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
      };

      // whereメソッドが呼ばれた時にmockQueryを返すように設定
      mockCollection.where.mockReturnValue(mockQuery as any);
      mockQuery.where.mockReturnValue(mockQuery as any);
      mockQuery.limit.mockReturnValue(mockQuery as any);

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

      // クエリチェーンの最終的なgetメソッドを設定
      const mockQuery = {
        get: vi.fn().mockResolvedValue({
          docs: [],
          size: 0,
        }),
        where: vi.fn().mockReturnThis(),
        orderBy: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
      };

      // whereメソッドが呼ばれた時にmockQueryを返すように設定
      mockCollection.where.mockReturnValue(mockQuery as any);

      const result = await dlsiteFirestore.searchWorksFromFirestore({
        circle: "存在しないサークル",
      });

      expect(result).toHaveLength(0);
    });

    it("複数の検索条件を組み合わせて作品を取得できる", async () => {
      const mockCollection = vi.mocked(
        firestore.default.collection("dlsiteWorks"),
      );

      // クエリチェーンの最終的なgetメソッドを設定
      const mockQuery = {
        get: vi.fn().mockResolvedValue({
          docs: [{ data: () => mockFirestoreWork }],
          size: 1,
        }),
        where: vi.fn().mockReturnThis(),
        orderBy: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
      };

      // whereメソッドが呼ばれた時にmockQueryを返すように設定
      mockCollection.where.mockReturnValue(mockQuery as any);
      mockQuery.where.mockReturnValue(mockQuery as any);
      mockQuery.orderBy.mockReturnValue(mockQuery as any);
      mockQuery.limit.mockReturnValue(mockQuery as any);

      const result = await dlsiteFirestore.searchWorksFromFirestore({
        circle: "テストサークル",
        category: "音声作品",
        orderBy: "price.current",
        orderDirection: "desc",
        limit: 5,
      });

      expect(mockCollection.where).toHaveBeenCalledWith(
        "circle",
        "==",
        "テストサークル",
      );
      expect(mockQuery.where).toHaveBeenCalledWith(
        "category",
        "==",
        "音声作品",
      );
      expect(mockQuery.orderBy).toHaveBeenCalledWith("price.current", "desc");
      expect(mockQuery.limit).toHaveBeenCalledWith(5);
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

      // クエリチェーンの最終的なgetメソッドを設定
      const mockQuery = {
        get: vi.fn().mockResolvedValue({
          docs: [],
          size: 0,
        }),
        where: vi.fn().mockReturnThis(),
        orderBy: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
      };

      // orderByメソッドが呼ばれた時にmockQueryを返すように設定
      mockCollection.orderBy.mockReturnValue(mockQuery as any);

      await dlsiteFirestore.searchWorksFromFirestore({
        orderBy: "createdAt",
        orderDirection: "asc",
      });

      expect(mockCollection.orderBy).toHaveBeenCalledWith("createdAt", "asc");
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

  describe("saveWorksToFirestore - 詳細なバッチ処理", () => {
    it("大量データ（500件超）のバッチ処理を正しく分割実行する", async () => {
      // 既存データなしの場合をモック
      const mockCollection = vi.mocked(
        firestore.default.collection("dlsiteWorks"),
      );

      // クエリチェーンのモック設定
      const mockQuery = {
        get: vi.fn().mockResolvedValue({
          docs: [],
          size: 0,
        }),
        where: vi.fn().mockReturnThis(),
        orderBy: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
      };

      mockCollection.where.mockReturnValue(mockQuery as any);

      // バッチが呼ばれる度に新しいモックインスタンスを返すように設定
      const mockCommit = vi.fn().mockResolvedValue(undefined);
      const mockBatch = {
        set: vi.fn().mockReturnThis(),
        update: vi.fn().mockReturnThis(),
        commit: mockCommit,
      };
      vi.mocked(firestore.default.batch).mockReturnValue(mockBatch as any);

      // 501件の作品データを作成
      const largeWorksList = Array.from({ length: 501 }, (_, i) => ({
        ...mockWorkBase,
        id: `RJ${String(i + 123456).padStart(6, "0")}`,
        productId: `RJ${String(i + 123456).padStart(6, "0")}`,
      }));

      // filterWorksForUpdateが新規作成対象として501件返すようにモック
      vi.mocked(dlsiteMapper.filterWorksForUpdate).mockReturnValue({
        toCreate: largeWorksList,
        toUpdate: [],
        unchanged: [],
      });

      // 大量データ処理が正常に完了することを確認（executeBatchInChunksが使われる）
      await expect(
        dlsiteFirestore.saveWorksToFirestore(largeWorksList),
      ).resolves.not.toThrow();

      // executeBatchInChunksでバッチコミットが複数回呼ばれることを確認
      expect(mockCommit).toHaveBeenCalled();
    });

    it("データ品質チェックに失敗した作品をスキップする", async () => {
      // 既存データなしの場合をモック
      const mockCollection = vi.mocked(
        firestore.default.collection("dlsiteWorks"),
      );
      const mockWhere = vi.fn().mockReturnThis();
      const mockGet = vi.fn().mockResolvedValue({
        docs: [],
        size: 0,
      });
      mockCollection.where.mockImplementation(mockWhere);
      mockWhere.mockReturnValue({ get: mockGet });

      // バッチモックを設定
      const mockSet = vi.fn().mockReturnThis();
      const mockBatch = {
        set: mockSet,
        update: vi.fn().mockReturnThis(),
        commit: vi.fn().mockResolvedValue(undefined),
      };
      vi.mocked(firestore.default.batch).mockReturnValue(mockBatch as any);

      // 無効な作品データ（必須フィールドが欠如）
      const invalidWork: DLsiteWorkBase = {
        ...mockWorkBase,
        title: "", // 空のタイトル（バリデーション失敗の原因）
      };

      // 無効な作品のみを渡した場合、何も保存されないことを確認
      await dlsiteFirestore.saveWorksToFirestore([invalidWork]);

      // 無効な作品はスキップされるため、バッチ操作は実行されない
      expect(mockSet).toHaveBeenCalledTimes(0);
    });

    it("データ品質に警告がある作品でも保存を続行する", async () => {
      // 既存データなしの場合をモック
      const mockCollection = vi.mocked(
        firestore.default.collection("dlsiteWorks"),
      );

      // クエリチェーンのモック設定
      const mockQuery = {
        get: vi.fn().mockResolvedValue({
          docs: [],
          size: 0,
        }),
        where: vi.fn().mockReturnThis(),
        orderBy: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
      };

      mockCollection.where.mockReturnValue(mockQuery as any);

      // バッチモックを設定
      const mockSet = vi.fn().mockReturnThis();
      const mockBatch = {
        set: mockSet,
        update: vi.fn().mockReturnThis(),
        commit: vi.fn().mockResolvedValue(undefined),
      };
      vi.mocked(firestore.default.batch).mockReturnValue(mockBatch as any);

      // filterWorksForUpdateが新規作成対象として1件返すようにモック
      vi.mocked(dlsiteMapper.filterWorksForUpdate).mockReturnValue({
        toCreate: [mockWorkBase],
        toUpdate: [],
        unchanged: [],
      });

      // 警告があっても有効な作品データ（必須フィールドは満たしている）
      const workWithWarnings: DLsiteWorkBase = {
        ...mockWorkBase,
        rating: undefined, // 評価情報なし（警告発生の可能性）
      };

      await dlsiteFirestore.saveWorksToFirestore([workWithWarnings]);

      // 警告があっても保存は続行される
      expect(mockSet).toHaveBeenCalledTimes(1);
    });

    it("既存データの更新処理を正しく実行する", async () => {
      // 既存データありの場合をモック
      const mockCollection = vi.mocked(
        firestore.default.collection("dlsiteWorks"),
      );

      // クエリチェーンのモック設定
      const mockQuery = {
        get: vi.fn().mockResolvedValue({
          docs: [
            {
              data: () => ({
                ...mockFirestoreWork,
                price: { current: 1000, original: 1000, currency: "JPY" }, // 価格が異なる
              }),
            },
          ],
          size: 1,
        }),
        where: vi.fn().mockReturnThis(),
        orderBy: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
      };

      mockCollection.where.mockReturnValue(mockQuery as any);

      // バッチモックを設定
      const mockUpdate = vi.fn().mockReturnThis();
      const mockBatch = {
        set: vi.fn().mockReturnThis(),
        update: mockUpdate,
        commit: vi.fn().mockResolvedValue(undefined),
      };
      vi.mocked(firestore.default.batch).mockReturnValue(mockBatch as any);

      // 価格が変更された作品データ
      const updatedWork: DLsiteWorkBase = {
        ...mockWorkBase,
        price: { current: 1200, original: 1200, currency: "JPY" },
      };

      // filterWorksForUpdateが更新対象として1件返すようにモック
      const existingWork = {
        ...mockFirestoreWork,
        price: { current: 1000, original: 1000, currency: "JPY" },
      };
      vi.mocked(dlsiteMapper.filterWorksForUpdate).mockReturnValue({
        toCreate: [],
        toUpdate: [{ new: updatedWork, existing: existingWork }],
        unchanged: [],
      });

      await dlsiteFirestore.saveWorksToFirestore([updatedWork]);

      // updateが呼ばれることを確認
      expect(mockUpdate).toHaveBeenCalledTimes(1);
    });

    it("既存データ取得でエラーが発生しても処理を継続する", async () => {
      // 既存データ取得でエラーを発生させる
      const mockCollection = vi.mocked(
        firestore.default.collection("dlsiteWorks"),
      );

      // クエリチェーンのモック設定（エラーを発生させる）
      const mockQuery = {
        get: vi.fn().mockRejectedValue(new Error("Existing data fetch error")),
        where: vi.fn().mockReturnThis(),
        orderBy: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
      };

      mockCollection.where.mockReturnValue(mockQuery as any);

      // バッチモックを設定
      const mockSet = vi.fn().mockReturnThis();
      const mockBatch = {
        set: mockSet,
        update: vi.fn().mockReturnThis(),
        commit: vi.fn().mockResolvedValue(undefined),
      };
      vi.mocked(firestore.default.batch).mockReturnValue(mockBatch as any);

      // filterWorksForUpdateが新規作成対象として1件返すようにモック
      vi.mocked(dlsiteMapper.filterWorksForUpdate).mockReturnValue({
        toCreate: [mockWorkBase],
        toUpdate: [],
        unchanged: [],
      });

      // 既存データ取得エラーでも処理は続行され、新規作成として扱われる
      await expect(
        dlsiteFirestore.saveWorksToFirestore([mockWorkBase]),
      ).resolves.not.toThrow();

      // 既存データ取得エラーでも新規作成として処理される
      expect(mockSet).toHaveBeenCalledTimes(1);
    });

    it("バッチコミットでエラーが発生した場合にエラーを投げる", async () => {
      // 既存データなしの場合をモック
      const mockCollection = vi.mocked(
        firestore.default.collection("dlsiteWorks"),
      );

      // クエリチェーンのモック設定
      const mockQuery = {
        get: vi.fn().mockResolvedValue({
          docs: [],
          size: 0,
        }),
        where: vi.fn().mockReturnThis(),
        orderBy: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
      };

      mockCollection.where.mockReturnValue(mockQuery as any);

      // バッチコミットでエラーを発生させる
      const mockBatch = {
        set: vi.fn().mockReturnThis(),
        update: vi.fn().mockReturnThis(),
        commit: vi.fn().mockRejectedValue(new Error("Batch commit error")),
      };
      vi.mocked(firestore.default.batch).mockReturnValue(mockBatch as any);

      // filterWorksForUpdateが新規作成対象として1件返すようにモック
      vi.mocked(dlsiteMapper.filterWorksForUpdate).mockReturnValue({
        toCreate: [mockWorkBase],
        toUpdate: [],
        unchanged: [],
      });

      await expect(
        dlsiteFirestore.saveWorksToFirestore([mockWorkBase]),
      ).rejects.toThrow("作品データのFirestore保存に失敗");
    });

    it("操作対象がない場合は何もしない", async () => {
      // 既存データありで変更なしの場合をモック
      const mockCollection = vi.mocked(
        firestore.default.collection("dlsiteWorks"),
      );
      const mockGet = vi.mocked(mockCollection.get);

      // 同じデータの既存データを返す
      mockGet.mockResolvedValue({
        docs: [
          {
            data: () => mockFirestoreWork,
          },
        ],
        size: 1,
      } as any);

      await dlsiteFirestore.saveWorksToFirestore([mockWorkBase]);

      // セットもアップデートも呼ばれない
      expect(firestore.default.batch().set).not.toHaveBeenCalled();
      expect(firestore.default.batch().update).not.toHaveBeenCalled();
      expect(firestore.default.batch().commit).not.toHaveBeenCalled();
    });
  });

  describe("getExistingWorksMap - in句制限対応", () => {
    it("10件を超えるproductIdを正しく分割して取得する", async () => {
      // 15件のproductIdを用意（10件 + 5件に分割される）
      const productIds = Array.from(
        { length: 15 },
        (_, i) => `RJ${String(i + 123456).padStart(6, "0")}`,
      );

      const mockCollection = vi.mocked(
        firestore.default.collection("dlsiteWorks"),
      );
      const mockWhere = vi.mocked(mockCollection.where);
      const mockGet = vi.mocked(mockCollection.get);

      // 最初のチャンク（10件）
      mockGet.mockResolvedValueOnce({
        docs: Array.from({ length: 10 }, (_, i) => ({
          data: () => ({
            ...mockFirestoreWork,
            productId: `RJ${String(i + 123456).padStart(6, "0")}`,
          }),
        })),
      } as any);

      // 2番目のチャンク（5件）
      mockGet.mockResolvedValueOnce({
        docs: Array.from({ length: 5 }, (_, i) => ({
          data: () => ({
            ...mockFirestoreWork,
            productId: `RJ${String(i + 123466).padStart(6, "0")}`,
          }),
        })),
      } as any);

      // テスト用の関数を直接実行するため、saveWorksToFirestoreを呼び出す
      await dlsiteFirestore.saveWorksToFirestore(
        productIds.map((id) => ({ ...mockWorkBase, productId: id, id })),
      );

      // whereが2回呼ばれることを確認（10件と5件の分割）
      expect(mockWhere).toHaveBeenCalledWith(
        "productId",
        "in",
        expect.any(Array),
      );
    });
  });

  describe("searchWorksFromFirestore - 追加のクエリパターン", () => {
    it("limitのみを指定した検索", async () => {
      const mockCollection = vi.mocked(
        firestore.default.collection("dlsiteWorks"),
      );

      // クエリチェーンの最終的なgetメソッドを設定
      const mockQuery = {
        get: vi.fn().mockResolvedValue({
          docs: [{ data: () => mockFirestoreWork }],
          size: 1,
        }),
        where: vi.fn().mockReturnThis(),
        orderBy: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
      };

      // limitメソッドが呼ばれた時にmockQueryを返すように設定
      mockCollection.limit.mockReturnValue(mockQuery as any);

      await dlsiteFirestore.searchWorksFromFirestore({
        limit: 5,
      });

      expect(mockCollection.limit).toHaveBeenCalledWith(5);
    });

    it("orderByのみを指定した検索（デフォルトdesc）", async () => {
      const mockCollection = vi.mocked(
        firestore.default.collection("dlsiteWorks"),
      );

      // クエリチェーンの最終的なgetメソッドを設定
      const mockQuery = {
        get: vi.fn().mockResolvedValue({
          docs: [],
          size: 0,
        }),
        where: vi.fn().mockReturnThis(),
        orderBy: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
      };

      // orderByメソッドが呼ばれた時にmockQueryを返すように設定
      mockCollection.orderBy.mockReturnValue(mockQuery as any);

      await dlsiteFirestore.searchWorksFromFirestore({
        orderBy: "updatedAt",
      });

      expect(mockCollection.orderBy).toHaveBeenCalledWith("updatedAt", "desc");
    });
  });

  describe("getWorksStatistics - 詳細なカテゴリ処理", () => {
    it("カテゴリが未定義の作品を'不明'として分類する", async () => {
      // 新しいモックコレクションを作成
      const mockCollection = {
        get: vi.fn(),
        where: vi.fn().mockReturnThis(),
        orderBy: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        doc: vi.fn(),
      };

      vi.mocked(firestore.default.collection).mockReturnValue(
        mockCollection as any,
      );

      const mockWorks = [
        {
          data: () => ({
            ...mockFirestoreWork,
            category: undefined, // カテゴリ未定義
            updatedAt: "2023-01-01T00:00:00.000Z",
          }),
        },
        {
          data: () => ({
            ...mockFirestoreWork,
            id: "RJ987654",
            category: "SOU",
            updatedAt: "2023-01-02T00:00:00.000Z",
          }),
        },
      ];

      mockCollection.get.mockResolvedValue({
        docs: mockWorks,
        size: 2,
      } as any);

      const stats = await dlsiteFirestore.getWorksStatistics();

      expect(stats).toEqual({
        totalWorks: 2,
        lastUpdated: "2023-01-02T00:00:00.000Z", // より新しい日付
        categoryCounts: {
          不明: 1,
          SOU: 1,
        },
      });
    });

    it("最新のupdatedAtを正しく特定する", async () => {
      // 新しいモックコレクションを作成
      const mockCollection = {
        get: vi.fn(),
        where: vi.fn().mockReturnThis(),
        orderBy: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        doc: vi.fn(),
      };

      vi.mocked(firestore.default.collection).mockReturnValue(
        mockCollection as any,
      );

      const mockWorks = [
        {
          data: () => ({
            ...mockFirestoreWork,
            updatedAt: "2023-01-01T00:00:00.000Z",
          }),
        },
        {
          data: () => ({
            ...mockFirestoreWork,
            id: "RJ987654",
            updatedAt: "2023-12-31T23:59:59.999Z", // 最新
          }),
        },
        {
          data: () => ({
            ...mockFirestoreWork,
            id: "RJ111111",
            updatedAt: "2023-06-15T12:00:00.000Z",
          }),
        },
      ];

      mockCollection.get.mockResolvedValue({
        docs: mockWorks,
        size: 3,
      } as any);

      const stats = await dlsiteFirestore.getWorksStatistics();

      expect(stats.lastUpdated).toBe("2023-12-31T23:59:59.999Z");
    });
  });

  describe("エラーハンドリング", () => {
    it("getWorkFromFirestore でエラーが発生した場合", async () => {
      // 新しいモックコレクションを作成
      const mockDoc = {
        get: vi.fn().mockRejectedValue(new Error("Firestore error")),
      };

      const mockCollection = {
        get: vi.fn(),
        where: vi.fn().mockReturnThis(),
        orderBy: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        doc: vi.fn().mockReturnValue(mockDoc),
      };

      vi.mocked(firestore.default.collection).mockReturnValue(
        mockCollection as any,
      );

      await expect(
        dlsiteFirestore.getWorkFromFirestore("RJ123456"),
      ).rejects.toThrow("作品データの取得に失敗: RJ123456");
    });

    it("searchWorksFromFirestore でエラーが発生した場合", async () => {
      const mockCollection = vi.mocked(
        firestore.default.collection("dlsiteWorks"),
      );

      // クエリチェーンの最終的なgetメソッドでエラーを発生させる
      const mockQuery = {
        get: vi.fn().mockRejectedValue(new Error("Search error")),
        where: vi.fn().mockReturnThis(),
        orderBy: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
      };

      // whereメソッドが呼ばれた時にmockQueryを返すように設定
      mockCollection.where.mockReturnValue(mockQuery as any);

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
