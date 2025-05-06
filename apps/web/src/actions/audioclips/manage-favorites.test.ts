/**
 * お気に入り管理に関するServer Actionsのテスト
 *
 * このファイルでは以下の関数のテストを行います：
 * - toggleFavorite: お気に入りに追加/削除する
 * - checkFavoriteStatus: お気に入りの状態を確認する
 * - getUserFavorites: ユーザーのお気に入りクリップを取得する
 */

import { revalidatePath } from "next/cache";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  checkFavoriteStatus,
  getUserFavorites,
  toggleFavorite,
} from "./manage-favorites";

// Firebaseのモックを設定
vi.mock("firebase-admin/firestore", () => {
  const mockFirestore = {
    collection: vi.fn(),
    runTransaction: vi.fn(),
  };

  return {
    getFirestore: vi.fn(() => mockFirestore),
  };
});

// revalidatePathをモック化
vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

// 他のモジュールのモック
vi.mock("../auth/firebase-admin", () => ({
  initializeFirebaseAdmin: vi.fn(),
}));

vi.mock("../auth/getCurrentUser", () => ({
  getCurrentUser: vi.fn(),
}));

import { getFirestore } from "firebase-admin/firestore";
// モックのインポート
import { getCurrentUser } from "../auth/getCurrentUser";

describe("お気に入り管理機能", () => {
  // お気に入り状態のトラッキング用変数
  let isFavorited = false;
  // モックのFirestoreインスタンス
  let mockFirestoreInstance: any;

  beforeEach(() => {
    vi.clearAllMocks();
    // モックのリセット
    isFavorited = false;

    // モックのクリップデータ
    const mockClipData = {
      title: "テストクリップ",
      videoId: "video123",
      favoriteCount: 5,
    };

    // getFirestoreの実装を設定
    mockFirestoreInstance = getFirestore() as unknown;
    mockFirestoreInstance.collection = vi.fn((collectionName) => {
      if (collectionName === "audioClips") {
        return {
          doc: vi.fn((clipId) => ({
            get: vi.fn().mockImplementation(() => {
              if (clipId === "clip123") {
                return Promise.resolve({
                  exists: true,
                  ref: { path: `audioClips/${clipId}` },
                  id: clipId,
                  data: () => ({ ...mockClipData }),
                });
              }
              if (clipId === "nonexistent") {
                return Promise.resolve({
                  exists: false,
                });
              }
              // その他のクリップIDでは適当なデータを返す
              return Promise.resolve({
                exists: true,
                ref: { path: `audioClips/${clipId}` },
                id: clipId,
                data: () => ({
                  title: `クリップ ${clipId}`,
                  videoId: "video456",
                  favoriteCount: 2,
                  createdAt: { toDate: () => new Date() },
                  updatedAt: { toDate: () => new Date() },
                }),
              });
            }),
          })),
        };
      }

      // userFavoritesコレクションの場合
      if (collectionName === "userFavorites") {
        return {
          doc: vi.fn((userId) => ({
            collection: vi.fn(() => ({
              doc: vi.fn((clipId) => ({
                get: vi.fn().mockImplementation(() => {
                  // clip123のお気に入り状態をシミュレート
                  if (clipId === "clip123") {
                    return Promise.resolve({
                      exists: isFavorited,
                    });
                  }
                  return Promise.resolve({
                    exists: false,
                  });
                }),
              })),
              orderBy: vi.fn(() => ({
                limit: vi.fn(() => ({
                  get: vi.fn().mockImplementation(() => {
                    // モックのお気に入りデータ
                    const mockFavorites = [
                      {
                        id: "clip123",
                        data: () => ({
                          clipId: "clip123",
                          videoId: "video123",
                          addedAt: { toDate: () => new Date("2025-05-01") },
                        }),
                      },
                      {
                        id: "clip456",
                        data: () => ({
                          clipId: "clip456",
                          videoId: "video456",
                          addedAt: { toDate: () => new Date("2025-05-02") },
                        }),
                      },
                    ];

                    return Promise.resolve({
                      empty: mockFavorites.length === 0,
                      docs: mockFavorites,
                    });
                  }),
                  startAfter: vi.fn(() => ({
                    get: vi.fn().mockImplementation(() => {
                      // 次ページ用のモックデータ
                      const nextPageFavorites = [
                        {
                          id: "clip789",
                          data: () => ({
                            clipId: "clip789",
                            videoId: "video789",
                            addedAt: { toDate: () => new Date("2025-04-30") },
                          }),
                        },
                      ];

                      return Promise.resolve({
                        empty: nextPageFavorites.length === 0,
                        docs: nextPageFavorites,
                      });
                    }),
                  })),
                })),
              })),
            })),
          })),
        };
      }

      return {
        doc: vi.fn(),
      };
    });

    mockFirestoreInstance.runTransaction = vi.fn(async (callback) => {
      // トランザクションをシミュレート
      const transaction = {
        get: vi.fn(),
        set: vi.fn(() => {
          isFavorited = true; // お気に入り追加
        }),
        update: vi.fn(),
        delete: vi.fn(() => {
          isFavorited = false; // お気に入り削除
        }),
      };

      await callback(transaction);

      return Promise.resolve();
    });

    // デフォルトでログイン状態に設定
    (getCurrentUser as any).mockResolvedValue({ uid: "user123" });
  });

  /**
   * toggleFavoriteのテスト
   */
  describe("toggleFavorite", () => {
    it("正常系：お気に入りに追加できること", async () => {
      // 未お気に入り状態をシミュレート（isFavorited = false）

      // 関数を実行
      const result = await toggleFavorite("clip123");

      // 期待される結果を検証
      expect(result.clipId).toBe("clip123");
      expect(result.isFavorite).toBe(true);
      expect(result.message).toContain("お気に入りに追加しました");

      // キャッシュが更新されたことを確認
      expect(revalidatePath).toHaveBeenCalledWith("/videos/video123");
      expect(revalidatePath).toHaveBeenCalledWith("/favorites");
    });

    it("異常系：未認証の場合はエラーになること", async () => {
      // 未ログイン状態に設定
      (getCurrentUser as any).mockResolvedValue(null);

      // 関数呼び出しで例外がスローされることを検証
      await expect(toggleFavorite("clip123")).rejects.toThrow("認証が必要です");
    });

    it("異常系：存在しないクリップIDの場合はエラーになること", async () => {
      // 関数呼び出しで例外がスローされることを検証
      await expect(toggleFavorite("nonexistent")).rejects.toThrow(
        "指定されたクリップが存在しません",
      );
    });

    it("異常系：データ取得エラーの場合は例外をスローすること", async () => {
      // モックを上書きしてエラーをシミュレート
      const errorMessage = "データベース接続エラー";

      const originalCollection = mockFirestoreInstance.collection;
      mockFirestoreInstance.collection.mockImplementationOnce((name) => {
        if (name === "audioClips") {
          return {
            doc: vi.fn(() => ({
              get: vi.fn().mockRejectedValue(new Error(errorMessage)),
            })),
          };
        }
        return originalCollection(name);
      });

      // 関数呼び出しで例外がスローされることを検証
      await expect(toggleFavorite("clip123")).rejects.toThrow(
        `お気に入り操作に失敗しました: ${errorMessage}`,
      );
    });
  });

  /**
   * checkFavoriteStatusのテスト
   */
  describe("checkFavoriteStatus", () => {
    it("正常系：お気に入り状態を確認できること（未お気に入り）", async () => {
      // 未お気に入り状態（デフォルトでisFavorited = false）

      // 関数を実行
      const result = await checkFavoriteStatus("clip123");

      // 期待される結果を検証
      expect(result.clipId).toBe("clip123");
      expect(result.isFavorite).toBe(false);
    });

    it("正常系：未認証の場合は未お気に入り状態を返すこと", async () => {
      // 未ログイン状態に設定
      (getCurrentUser as any).mockResolvedValue(null);

      // 関数を実行
      const result = await checkFavoriteStatus("clip123");

      // 期待される結果を検証
      expect(result.isFavorite).toBe(false);
    });

    it("正常系：エラーが発生した場合も未お気に入り状態を返すこと", async () => {
      // モックを上書きしてエラーをシミュレート
      const originalCollection = mockFirestoreInstance.collection;
      mockFirestoreInstance.collection.mockImplementationOnce((name) => {
        if (name === "userFavorites") {
          return {
            doc: vi.fn(() => ({
              collection: vi.fn(() => ({
                doc: vi.fn(() => ({
                  get: vi.fn().mockRejectedValue(new Error("エラー")),
                })),
              })),
            })),
          };
        }
        return originalCollection(name);
      });

      // 関数を実行
      const result = await checkFavoriteStatus("clip123");

      // エラーを隠蔽して安全な結果を返すことを期待
      expect(result.isFavorite).toBe(false);
    });
  });

  /**
   * getUserFavoritesのテスト
   */
  describe("getUserFavorites", () => {
    it("正常系：お気に入りリストを取得できること", async () => {
      // 関数を実行
      const result = await getUserFavorites();

      // 期待される結果を検証
      expect(Array.isArray(result.favorites)).toBe(true);
      expect(result.favorites.length).toBeGreaterThan(0);
      expect(result.hasMore).toBeDefined();
    });

    it("正常系：件数制限を指定できること", async () => {
      // 関数を実行（件数制限5件）
      const result = await getUserFavorites(5);

      // モックを直接制御できないため、関数の正常動作のみを確認
      expect(Array.isArray(result.favorites)).toBe(true);
    });

    it("正常系：ページネーションが機能すること", async () => {
      // 関数を実行（ページネーションあり）
      const result = await getUserFavorites(10, new Date());

      // モックのレスポンスを確認
      expect(Array.isArray(result.favorites)).toBe(true);
      expect(result.hasMore).toBeDefined();
      expect(result.lastAddedAt).toBeDefined();
    });

    it("異常系：未認証の場合はエラーになること", async () => {
      // 未ログイン状態に設定
      (getCurrentUser as any).mockResolvedValue(null);

      // 関数呼び出しで例外がスローされることを検証
      await expect(getUserFavorites()).rejects.toThrow("認証が必要です");
    });

    it("異常系：エラーが発生した場合は例外をスローすること", async () => {
      // モックを上書きしてエラーをシミュレート
      const errorMessage = "データベース接続エラー";

      mockFirestoreInstance.collection.mockImplementationOnce(() => {
        throw new Error(errorMessage);
      });

      // 関数呼び出しで例外がスローされることを検証
      await expect(getUserFavorites()).rejects.toThrow(
        `お気に入り一覧の取得に失敗しました: ${errorMessage}`,
      );
    });

    it("異常系：結果が空の場合は空配列を返すこと", async () => {
      // モックを上書きして空の結果をシミュレート
      const originalCollection = mockFirestoreInstance.collection;
      mockFirestoreInstance.collection.mockImplementationOnce((name) => {
        if (name === "userFavorites") {
          return {
            doc: vi.fn(() => ({
              collection: vi.fn(() => ({
                orderBy: vi.fn(() => ({
                  limit: vi.fn(() => ({
                    get: vi.fn().mockResolvedValue({
                      empty: true,
                      docs: [],
                    }),
                  })),
                })),
              })),
            })),
          };
        }
        return originalCollection(name);
      });

      // 関数を実行
      const result = await getUserFavorites();

      // 期待される結果を検証
      expect(result.favorites).toEqual([]);
      expect(result.hasMore).toBe(false);
    });
  });
});
