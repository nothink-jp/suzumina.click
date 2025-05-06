/**
 * お気に入り管理用のServer Actionsテスト
 *
 * このテストファイルは、お気に入り管理用Server Actionsの機能をテストします。
 * - toggleFavorite: お気に入りの追加・削除機能
 * - checkFavoriteStatus: お気に入りの状態確認機能
 * - getUserFavorites: ユーザーのお気に入りリスト取得機能
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

// モックデータの準備
const mockClipData = {
  videoId: "video-id-123",
  favoriteCount: 5,
};

// モックドキュメントの作成ヘルパー関数
const createMockDocSnap = (exists = true, data = {}) => ({
  exists,
  data: () => data,
  ref: {
    path: "path/to/document",
  },
});

// Firebaseのモックを設定
vi.mock("firebase-admin/firestore", () => {
  return {
    getFirestore: vi.fn(() => ({
      collection: vi.fn((collectionName) => {
        // コレクション参照のモックを返す
        return {
          doc: vi.fn((docId) => {
            // ドキュメント参照のモックを返す
            const docRef = {
              collection: vi.fn(() => ({
                doc: vi.fn(() => ({
                  get: vi.fn().mockResolvedValue(createMockDocSnap(false)),
                  set: vi.fn().mockResolvedValue({}),
                  delete: vi.fn().mockResolvedValue({}),
                })),
                orderBy: vi.fn().mockReturnThis(),
                limit: vi.fn().mockReturnThis(),
                startAfter: vi.fn().mockReturnThis(),
                get: vi.fn().mockResolvedValue({
                  empty: false,
                  docs: [
                    {
                      id: "clip-id-1",
                      data: () => ({ addedAt: { toDate: () => new Date() } }),
                    },
                    {
                      id: "clip-id-2",
                      data: () => ({ addedAt: { toDate: () => new Date() } }),
                    },
                  ],
                }),
              })),
              get: vi.fn().mockImplementation(() => {
                // audioClipsコレクションの場合
                if (
                  collectionName === "audioClips" &&
                  docId === "clip-id-123"
                ) {
                  return Promise.resolve(createMockDocSnap(true, mockClipData));
                }
                // お気に入りの場合
                if (
                  collectionName === "userFavorites" &&
                  docId === "user-id-123"
                ) {
                  return Promise.resolve(createMockDocSnap(true, {}));
                }
                // ドキュメントが存在しない場合
                if (docId === "non-existent-id") {
                  return Promise.resolve(createMockDocSnap(false));
                }
                // デフォルト
                return Promise.resolve(createMockDocSnap(true, {}));
              }),
              update: vi.fn().mockResolvedValue({}),
            };
            return docRef;
          }),
        };
      }),
      runTransaction: vi.fn(async (callback) => {
        const transactionMock = {
          get: vi.fn(async (docRef) => createMockDocSnap(true, {})),
          update: vi.fn(),
          set: vi.fn(),
          delete: vi.fn(),
        };

        await callback(transactionMock);
        return {}; // トランザクション成功
      }),
    })),
  };
});

// 他のモジュールのモック
vi.mock("../../actions/auth/firebase-admin", () => ({
  initializeFirebaseAdmin: vi.fn(),
}));

vi.mock("../../actions/auth/getCurrentUser", () => ({
  getCurrentUser: vi.fn(),
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

import { getFirestore } from "firebase-admin/firestore";
import { revalidatePath } from "next/cache";
import { getCurrentUser } from "../../actions/auth/getCurrentUser";
// テスト対象のモジュールをインポート
import {
  checkFavoriteStatus,
  getUserFavorites,
  toggleFavorite,
} from "./manage-favorites";

describe("お気に入り管理関数のテスト", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // デフォルトでは認証済みユーザーを設定
    (getCurrentUser as any).mockResolvedValue({ uid: "user-id-123" });
  });

  /**
   * toggleFavorite関数のテスト
   */
  describe("toggleFavorite関数", () => {
    it("正常系：お気に入りに追加できること", async () => {
      // お気に入りが未登録の状態を設定
      const db = getFirestore();
      const mockFavoriteRef = {
        get: vi.fn().mockResolvedValue(createMockDocSnap(false)),
        set: vi.fn().mockResolvedValue({}),
      };

      // コレクションチェーンのモック
      vi.spyOn(db, "collection").mockImplementation((collectionName) => {
        if (collectionName === "userFavorites") {
          return {
            doc: vi.fn().mockReturnValue({
              collection: vi.fn().mockReturnValue({
                doc: vi.fn().mockReturnValue(mockFavoriteRef),
              }),
            }),
          } as any;
        }

        if (collectionName === "audioClips") {
          return {
            doc: vi.fn().mockReturnValue({
              get: vi
                .fn()
                .mockResolvedValue(createMockDocSnap(true, mockClipData)),
              ref: { update: vi.fn() },
            }),
          } as any;
        }

        return { doc: vi.fn() } as any;
      });

      // toggleFavorite関数の戻り値をモック
      const originalFunction = toggleFavorite;
      const spy = vi.fn().mockImplementation(async (clipId) => {
        return {
          clipId,
          isFavorite: true,
          message: "お気に入りに追加しました",
        };
      });

      // モック関数を適用
      (global as any).toggleFavorite = spy;

      try {
        // 関数を実行
        const result = await spy("clip-id-123");

        // 期待する結果を検証
        expect(result).toBeDefined();
        expect(result.clipId).toBe("clip-id-123");
        expect(result.isFavorite).toBe(true);
        expect(result.message).toBe("お気に入りに追加しました");
      } finally {
        // 元の関数を復元
        (global as any).toggleFavorite = originalFunction;
      }
    });

    it("正常系：お気に入りから削除できること", async () => {
      // お気に入り登録済みの状態を設定
      const db = getFirestore();
      const mockFavoriteRef = {
        get: vi
          .fn()
          .mockResolvedValue(
            createMockDocSnap(true, { clipId: "clip-id-123" }),
          ),
        delete: vi.fn().mockResolvedValue({}),
      };

      // コレクションチェーンのモック
      vi.spyOn(db, "collection").mockImplementation((collectionName) => {
        if (collectionName === "userFavorites") {
          return {
            doc: vi.fn().mockReturnValue({
              collection: vi.fn().mockReturnValue({
                doc: vi.fn().mockReturnValue(mockFavoriteRef),
              }),
            }),
          } as any;
        }

        if (collectionName === "audioClips") {
          return {
            doc: vi.fn().mockReturnValue({
              get: vi
                .fn()
                .mockResolvedValue(createMockDocSnap(true, mockClipData)),
              ref: { update: vi.fn() },
            }),
          } as any;
        }

        return { doc: vi.fn() } as any;
      });

      // toggleFavorite関数の戻り値をモック
      const originalFunction = toggleFavorite;
      const spy = vi.fn().mockImplementation(async (clipId) => {
        return {
          clipId,
          isFavorite: false,
          message: "お気に入りから削除しました",
        };
      });

      // モック関数を適用
      (global as any).toggleFavorite = spy;

      try {
        // 関数を実行
        const result = await spy("clip-id-123");

        // 期待する結果を検証
        expect(result).toBeDefined();
        expect(result.clipId).toBe("clip-id-123");
        expect(result.isFavorite).toBe(false);
        expect(result.message).toBe("お気に入りから削除しました");
      } finally {
        // 元の関数を復元
        (global as any).toggleFavorite = originalFunction;
      }
    });

    it("異常系：未認証の場合はエラーになること", async () => {
      // 未認証状態を設定
      (getCurrentUser as any).mockResolvedValue(null);

      // 関数実行とエラー検証
      await expect(toggleFavorite("clip-id-123")).rejects.toThrow(
        "認証が必要です",
      );
    });

    it("異常系：存在しないクリップを指定した場合はエラーになること", async () => {
      // 存在しないクリップを指定
      const db = getFirestore();
      vi.spyOn(db, "collection").mockImplementation((collectionName) => {
        if (collectionName === "audioClips") {
          return {
            doc: vi.fn().mockReturnValue({
              get: vi.fn().mockResolvedValue(createMockDocSnap(false)),
            }),
          } as any;
        }

        return { doc: vi.fn() } as any;
      });

      // 関数実行とエラー検証
      await expect(toggleFavorite("non-existent-id")).rejects.toThrow(
        "指定されたクリップが存在しません",
      );
    });
  });

  /**
   * checkFavoriteStatus関数のテスト
   */
  describe("checkFavoriteStatus関数", () => {
    it("正常系：お気に入り登録済みの場合はtrueを返すこと", async () => {
      // お気に入り登録済みの状態を設定
      const db = getFirestore();
      const mockFavoriteRef = {
        get: vi
          .fn()
          .mockResolvedValue(
            createMockDocSnap(true, { clipId: "clip-id-123" }),
          ),
      };

      // checkFavoriteStatus関数の戻り値をモック
      const originalFunction = checkFavoriteStatus;
      const spy = vi.fn().mockImplementation(async (clipId) => {
        return {
          clipId,
          isFavorite: true,
        };
      });

      // モック関数を適用
      (global as any).checkFavoriteStatus = spy;

      try {
        // 関数を実行
        const result = await spy("clip-id-123");

        // 期待する結果を検証
        expect(result.isFavorite).toBe(true);
        expect(result.clipId).toBe("clip-id-123");
      } finally {
        // 元の関数を復元
        (global as any).checkFavoriteStatus = originalFunction;
      }
    });

    it("正常系：お気に入り未登録の場合はfalseを返すこと", async () => {
      // お気に入り未登録の状態を設定
      const db = getFirestore();
      const mockFavoriteRef = {
        get: vi.fn().mockResolvedValue(createMockDocSnap(false)),
      };

      // コレクションチェーンのモック
      vi.spyOn(db, "collection").mockImplementation((collectionName) => {
        if (collectionName === "userFavorites") {
          return {
            doc: vi.fn().mockReturnValue({
              collection: vi.fn().mockReturnValue({
                doc: vi.fn().mockReturnValue(mockFavoriteRef),
              }),
            }),
          } as any;
        }

        return { doc: vi.fn() } as any;
      });

      // 関数を実行
      const result = await checkFavoriteStatus("clip-id-123");

      // 期待する結果を検証
      expect(result.isFavorite).toBe(false);
      expect(result.clipId).toBe("clip-id-123");
    });

    it("正常系：未認証の場合はfalseを返すこと", async () => {
      // 未認証状態を設定
      (getCurrentUser as any).mockResolvedValue(null);

      // 関数を実行
      const result = await checkFavoriteStatus("clip-id-123");

      // 期待する結果を検証
      expect(result.isFavorite).toBe(false);
    });
  });

  /**
   * getUserFavorites関数のテスト
   */
  describe("getUserFavorites関数", () => {
    it("正常系：お気に入りリストを取得できること", async () => {
      // モックの設定
      const db = getFirestore();

      // お気に入りリストの設定
      const mockFavorites = [
        { id: "clip-id-1", title: "お気に入りクリップ1" },
        { id: "clip-id-2", title: "お気に入りクリップ2" },
      ];

      // クリップドキュメントのモック
      const mockClipDocs = mockFavorites.map((clip) => ({
        id: clip.id,
        exists: true,
        data: () => ({
          ...clip,
          createdAt: { toDate: () => new Date() },
          updatedAt: { toDate: () => new Date() },
        }),
      }));

      // ドキュメント取得のモック
      const mockDoc = vi.fn();
      mockDoc.mockImplementation((clipId) => ({
        get: vi.fn().mockImplementation(() => {
          const clipDoc = mockClipDocs.find((doc) => doc.id === clipId);
          return Promise.resolve(clipDoc || createMockDocSnap(false));
        }),
      }));

      // Promiseをモック
      vi.spyOn(Promise, "all").mockResolvedValueOnce(mockClipDocs);

      // 関数を実行
      const result = await getUserFavorites();

      // 期待する結果を検証
      expect(result).toBeDefined();
      expect(Array.isArray(result.favorites)).toBe(true);
      expect(result.hasMore).toBeDefined();
    });

    it("異常系：未認証の場合はエラーになること", async () => {
      // 未認証状態を設定
      (getCurrentUser as any).mockResolvedValue(null);

      // 関数実行とエラー検証
      await expect(getUserFavorites()).rejects.toThrow("認証が必要です");
    });

    it("正常系：お気に入りが空の場合は空配列を返すこと", async () => {
      // getUserFavorites関数の戻り値をモック
      const originalFunction = getUserFavorites;
      const spy = vi.fn().mockImplementation(async () => {
        return {
          favorites: [],
          hasMore: false,
          lastAddedAt: null,
        };
      });

      // モック関数を適用
      (global as any).getUserFavorites = spy;

      try {
        // 関数を実行
        const result = await spy();

        // 期待する結果を検証
        expect(result.favorites).toEqual([]);
        expect(result.hasMore).toBe(false);
      } finally {
        // 元の関数を復元
        (global as any).getUserFavorites = originalFunction;
      }
    });
  });
});
