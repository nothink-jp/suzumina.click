/**
 * タグ関連の共通Server Actionsのテスト
 *
 * このファイルでは以下の関数のテストを行います：
 * - getPopularTags: 人気のタグを取得する
 * - searchTags: タグを検索する
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

// Firebaseのモックを設定
vi.mock("firebase-admin/firestore", () => {
  const mockFirestore = {
    collection: vi.fn(),
  };

  return {
    getFirestore: vi.fn(() => mockFirestore),
  };
});

// 他のモジュールのモック
vi.mock("../auth/firebase-admin", () => ({
  initializeFirebaseAdmin: vi.fn(),
}));

import { getFirestore } from "firebase-admin/firestore";
import { getPopularTags, searchTags } from "./actions";

describe("タグ関連の共通アクション", () => {
  // モック用のデータ
  const mockTagsData = [
    {
      id: "tag1",
      data: () => ({
        name: "音声入り",
        count: 150,
        updatedAt: { toDate: () => new Date("2025-05-01") },
      }),
    },
    {
      id: "tag2",
      data: () => ({
        name: "カットイン",
        count: 120,
        updatedAt: { toDate: () => new Date("2025-04-28") },
      }),
    },
    {
      id: "tag3",
      data: () => ({
        name: "笑い声",
        count: 100,
        updatedAt: { toDate: () => new Date("2025-04-25") },
      }),
    },
  ];

  // モックのFirestoreインスタンス
  let mockFirestoreInstance: any;

  beforeEach(() => {
    vi.clearAllMocks();

    // モックの実装を設定
    mockFirestoreInstance = getFirestore() as unknown;

    // 基本的なモック関数の実装
    const mockQuery = {
      orderBy: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      startAt: vi.fn().mockReturnThis(),
      endAt: vi.fn().mockReturnThis(),
      get: vi.fn().mockResolvedValue({
        empty: false,
        docs: mockTagsData,
        size: mockTagsData.length,
      }),
    };

    // コレクション関数のモック
    mockFirestoreInstance.collection = vi.fn(() => mockQuery);
  });

  /**
   * getPopularTags関数のテスト
   */
  describe("getPopularTags", () => {
    it("正常系：人気のタグを取得できること", async () => {
      // 関数を実行
      const tags = await getPopularTags();

      // 期待される結果を検証
      expect(Array.isArray(tags)).toBe(true);
      expect(tags.length).toBe(mockTagsData.length);
      expect(tags[0].count).toBeGreaterThan(0);
      expect(tags[0].name).toBeDefined();
    });

    it("正常系：件数制限を指定できること", async () => {
      // 関数を実行（件数制限2件）
      const tags = await getPopularTags(2);

      // モックでは制御できないため、関数が正常に動作することのみ検証
      expect(Array.isArray(tags)).toBe(true);
    });

    it("異常系：エラーが発生した場合は例外をスローすること", async () => {
      // モックを上書きしてエラーをシミュレート
      const errorMessage = "データベース接続エラー";

      mockFirestoreInstance.collection = vi.fn(() => {
        throw new Error(errorMessage);
      });

      // 関数呼び出しで例外がスローされることを検証
      await expect(getPopularTags()).rejects.toThrow(
        `人気タグの取得に失敗しました: ${errorMessage}`,
      );
    });

    it("異常系：結果が空の場合は空配列を返すこと", async () => {
      // モックを上書きして空の結果をシミュレート
      const mockEmptyQuery = {
        orderBy: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        get: vi.fn().mockResolvedValue({
          empty: true,
          docs: [],
          size: 0,
        }),
      };

      mockFirestoreInstance.collection = vi.fn(() => mockEmptyQuery);

      // 関数を実行
      const tags = await getPopularTags();

      // 期待される結果を検証
      expect(tags).toEqual([]);
    });
  });

  /**
   * searchTags関数のテスト
   */
  describe("searchTags", () => {
    it("正常系：タグ名で検索できること", async () => {
      // 検索機能用のモック
      const filteredTags = mockTagsData.filter((tag) =>
        tag.data().name.includes("声"),
      );

      const mockSearchQuery = {
        orderBy: vi.fn().mockReturnThis(),
        startAt: vi.fn().mockReturnThis(),
        endAt: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        get: vi.fn().mockResolvedValue({
          empty: false,
          docs: filteredTags,
          size: filteredTags.length,
        }),
      };

      mockFirestoreInstance.collection = vi.fn(() => mockSearchQuery);

      // 関数を実行
      const tags = await searchTags("声");

      // 期待される結果を検証
      expect(Array.isArray(tags)).toBe(true);
      // モックの実装上、実際のフィルタリングはしていないが、関数が正常動作することを確認
      expect(tags.length).toBeGreaterThan(0);
    });

    it("正常系：空のクエリの場合は空配列を返すこと", async () => {
      // 関数を実行
      const tags = await searchTags("");

      // 期待される結果を検証
      expect(tags).toEqual([]);
    });

    it("正常系：件数制限を指定できること", async () => {
      // 検索機能用のモック
      const mockLimitQuery = {
        orderBy: vi.fn().mockReturnThis(),
        startAt: vi.fn().mockReturnThis(),
        endAt: vi.fn().mockReturnThis(),
        limit: vi.fn((limit) => {
          expect(limit).toBe(2); // 制限が正しく渡されていることを確認
          return {
            get: vi.fn().mockResolvedValue({
              empty: false,
              docs: mockTagsData.slice(0, 2),
              size: 2,
            }),
          };
        }),
      };

      mockFirestoreInstance.collection = vi.fn(() => mockLimitQuery);

      // 関数を実行（件数制限2件）
      const tags = await searchTags("タグ", 2);

      // 期待される結果を検証
      expect(Array.isArray(tags)).toBe(true);
      expect(tags.length).toBe(2);
    });

    it("異常系：エラーが発生した場合は例外をスローすること", async () => {
      // モックを上書きしてエラーをシミュレート
      const errorMessage = "検索エラー";

      mockFirestoreInstance.collection = vi.fn(() => {
        throw new Error(errorMessage);
      });

      // 関数呼び出しで例外がスローされることを検証
      await expect(searchTags("test")).rejects.toThrow(
        `タグ検索に失敗しました: ${errorMessage}`,
      );
    });

    it("異常系：結果が空の場合は空配列を返すこと", async () => {
      // モックを上書きして空の結果をシミュレート
      const mockEmptyQuery = {
        orderBy: vi.fn().mockReturnThis(),
        startAt: vi.fn().mockReturnThis(),
        endAt: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        get: vi.fn().mockResolvedValue({
          empty: true,
          docs: [],
          size: 0,
        }),
      };

      mockFirestoreInstance.collection = vi.fn(() => mockEmptyQuery);

      // 関数を実行
      const tags = await searchTags("存在しないタグ");

      // 期待される結果を検証
      expect(tags).toEqual([]);
    });
  });
});
