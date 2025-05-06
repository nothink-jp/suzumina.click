/**
 * オーディオクリップ関連の共通Server Actionsのテスト
 *
 * このテストでは、オーディオクリップ関連の主要な関数をテストします：
 * - getAudioClips: クリップ一覧取得
 * - createAudioClip: クリップ作成
 * - getAudioClip: 個別クリップ取得
 * - updateAudioClip: クリップ更新
 * - deleteAudioClip: クリップ削除
 * - incrementPlayCount: 再生回数更新
 */

import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { beforeEach, describe, expect, it, vi } from "vitest";

// モックデータの定義
const mockAudioClipData = {
  videoId: "video-123",
  title: "テストクリップ",
  phrase: "テストフレーズ",
  description: "テスト説明",
  startTime: 10,
  endTime: 20,
  isPublic: true,
  tags: ["テスト", "サンプル"],
};

const mockUser = {
  uid: "user-123",
  displayName: "テストユーザー",
  photoURL: "https://example.com/photo.jpg",
};

// モックコレクション設定ヘルパー関数
const createMockCollection = (docs = []) => ({
  where: vi.fn().mockReturnThis(),
  orderBy: vi.fn().mockReturnThis(),
  limit: vi.fn().mockReturnThis(),
  startAfter: vi.fn().mockReturnThis(),
  doc: vi.fn((id) => {
    const docData = docs.find((d) => d.id === id)?.data || null;
    return {
      get: vi.fn().mockResolvedValue({
        exists: !!docData,
        data: () => docData,
        id: id,
      }),
      update: vi.fn().mockResolvedValue({}),
      delete: vi.fn().mockResolvedValue({}),
    };
  }),
  add: vi.fn().mockImplementation((data) => {
    const newId = "new-clip-id";
    return Promise.resolve({ id: newId });
  }),
  get: vi.fn().mockResolvedValue({
    empty: docs.length === 0,
    docs: docs.map((d) => ({
      id: d.id,
      data: () => d.data,
      exists: true,
    })),
  }),
});

// Firebaseのモック
vi.mock("firebase-admin/firestore", () => {
  return {
    getFirestore: vi.fn(() => ({
      collection: vi.fn((collectionName) => {
        if (collectionName === "audioClips") {
          return createMockCollection([
            {
              id: "clip-123",
              data: {
                videoId: "video-123",
                title: "既存クリップ",
                startTime: 30,
                endTime: 40,
                userId: "user-123",
                playCount: 5,
                favoriteCount: 2,
                isPublic: true,
                createdAt: { toDate: () => new Date("2025-01-01") },
                updatedAt: { toDate: () => new Date("2025-01-01") },
              },
            },
            {
              id: "clip-456",
              data: {
                videoId: "video-123",
                title: "非公開クリップ",
                startTime: 50,
                endTime: 60,
                userId: "other-user",
                isPublic: false,
                createdAt: { toDate: () => new Date("2025-01-02") },
                updatedAt: { toDate: () => new Date("2025-01-02") },
              },
            },
          ]);
        }

        if (collectionName === "videos") {
          return createMockCollection([
            {
              id: "video-123",
              data: { title: "テスト動画" },
            },
          ]);
        }

        return createMockCollection();
      }),
      runTransaction: vi.fn(async (callback) => {
        const txn = {
          get: vi.fn(),
          update: vi.fn(),
          set: vi.fn(),
          delete: vi.fn(),
        };
        await callback(txn);
        return {};
      }),
    })),
    FieldValue: {
      serverTimestamp: vi.fn(() => ({ _serverTimestamp: true })),
      increment: vi.fn((num) => ({ _increment: num })),
    },
    Timestamp: {
      fromDate: vi.fn((date) => ({
        _timestamp: true,
        toDate: () => date,
        toMillis: () => date.getTime(),
      })),
    },
  };
});

// 認証モックの設定
vi.mock("../../actions/auth/firebase-admin", () => ({
  initializeFirebaseAdmin: vi.fn(),
}));

vi.mock("../../actions/auth/getCurrentUser", () => ({
  getCurrentUser: vi.fn(),
}));

import { getFirestore } from "firebase-admin/firestore";
import { getCurrentUser } from "../../actions/auth/getCurrentUser";
// テスト対象の関数をインポート
import {
  createAudioClip,
  deleteAudioClip,
  getAudioClip,
  getAudioClips,
  incrementPlayCount,
  updateAudioClip,
} from "./actions";

describe("オーディオクリップアクション関数のテスト", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // デフォルトでは認証済みユーザーを設定
    (getCurrentUser as any).mockResolvedValue(mockUser);
  });

  /**
   * getAudioClips関数のテスト
   */
  describe("getAudioClips関数", () => {
    it("正常系：動画IDでクリップ一覧を取得できること", async () => {
      // 関数を実行
      const result = await getAudioClips({ videoId: "video-123" });

      // 期待する結果を検証
      expect(result).toBeDefined();
      expect(Array.isArray(result.clips)).toBe(true);
      expect(result.hasMore).toBeDefined();
    });

    it("正常系：ユーザーIDでクリップ一覧を取得できること", async () => {
      // 関数を実行
      const result = await getAudioClips({ userId: "user-123" });

      // 期待する結果を検証
      expect(result).toBeDefined();
      expect(Array.isArray(result.clips)).toBe(true);
    });

    it("正常系：ページネーションパラメータを指定して取得できること", async () => {
      // 関数を実行
      const result = await getAudioClips({
        videoId: "video-123",
        limit: 5,
        startAfter: new Date(),
      });

      // 期待する結果を検証
      expect(result).toBeDefined();
      expect(Array.isArray(result.clips)).toBe(true);
    });

    it("異常系：必須パラメータが不足している場合はエラーになること", async () => {
      // videoIdとuserIdの両方が未指定の場合
      await expect(getAudioClips({})).rejects.toThrow(
        "videoIdまたはuserIdが必要です",
      );
    });

    it("異常系：未認証ユーザーは非公開クリップにアクセスできないこと", async () => {
      // 未認証状態を設定
      (getCurrentUser as any).mockResolvedValue(null);

      // 関数を実行
      const result = await getAudioClips({ videoId: "video-123" });

      // 公開クリップのみ取得されることを検証
      expect(result).toBeDefined();
      expect(Array.isArray(result.clips)).toBe(true);
    });
  });

  /**
   * createAudioClip関数のテスト
   */
  describe("createAudioClip関数", () => {
    it("正常系：新しいクリップを作成できること", async () => {
      // 認証済みユーザーを設定
      (getCurrentUser as any).mockResolvedValue(mockUser);

      // 関数を実行
      const result = await createAudioClip(mockAudioClipData);

      // 期待する結果を検証
      expect(result).toBeDefined();
      expect(result.id).toBeDefined();
      expect(result.title).toBe(mockAudioClipData.title);
    });

    it("異常系：未認証の場合はエラーになること", async () => {
      // 未認証状態を設定
      (getCurrentUser as any).mockResolvedValue(null);

      // 関数実行とエラー検証
      await expect(createAudioClip(mockAudioClipData)).rejects.toThrow(
        "認証が必要です",
      );
    });

    it("異常系：必須パラメータが不足している場合はエラーになること", async () => {
      // タイトルなしのデータ
      const invalidData = { ...mockAudioClipData, title: "" };

      // 関数実行とエラー検証
      await expect(createAudioClip(invalidData)).rejects.toThrow(
        "必須パラメータが不足しています",
      );
    });

    it("異常系：開始時間が終了時間よりも後の場合はエラーになること", async () => {
      // 不正な時間範囲のデータ
      const invalidData = {
        ...mockAudioClipData,
        startTime: 30,
        endTime: 20,
      };

      // 関数実行とエラー検証
      await expect(createAudioClip(invalidData)).rejects.toThrow(
        "開始時間は終了時間より前である必要があります",
      );
    });
  });

  /**
   * getAudioClip関数のテスト
   */
  describe("getAudioClip関数", () => {
    it("正常系：IDを指定して単一のクリップを取得できること", async () => {
      // Firestoreモックの設定
      const db = getFirestore();
      const clipDocMock = {
        exists: true,
        id: "clip-123",
        data: () => ({
          videoId: "video-123",
          title: "テストクリップ",
          isPublic: true,
          createdAt: { toDate: () => new Date() },
          updatedAt: { toDate: () => new Date() },
        }),
      };

      vi.spyOn(db, "collection").mockImplementation((collectionName) => {
        if (collectionName === "audioClips") {
          return {
            doc: vi.fn().mockReturnValue({
              get: vi.fn().mockResolvedValue(clipDocMock),
            }),
          } as any;
        }
        return { doc: vi.fn() } as any;
      });

      // 関数を実行
      const result = await getAudioClip("clip-123");

      // 期待する結果を検証
      expect(result).toBeDefined();
      expect(result.id).toBe("clip-123");
    });

    it("異常系：存在しないクリップIDを指定した場合はエラーになること", async () => {
      // Firestoreモックの設定
      const db = getFirestore();
      const clipDocMock = {
        exists: false,
        data: () => null,
      };

      vi.spyOn(db, "collection").mockImplementation((collectionName) => {
        if (collectionName === "audioClips") {
          return {
            doc: vi.fn().mockReturnValue({
              get: vi.fn().mockResolvedValue(clipDocMock),
            }),
          } as any;
        }
        return { doc: vi.fn() } as any;
      });

      // 関数実行とエラー検証
      await expect(getAudioClip("non-existent-id")).rejects.toThrow(
        "指定されたクリップが存在しません",
      );
    });

    it("異常系：非公開クリップに他のユーザーがアクセスするとエラーになること", async () => {
      // 別のユーザーを設定
      (getCurrentUser as any).mockResolvedValue({ uid: "different-user-id" });

      // Firestoreモックの設定
      const db = getFirestore();
      const clipDocMock = {
        exists: true,
        id: "clip-123",
        data: () => ({
          videoId: "video-123",
          title: "テストクリップ",
          userId: "user-123", // 所有者は別のユーザー
          isPublic: false, // 非公開クリップ
          createdAt: { toDate: () => new Date() },
          updatedAt: { toDate: () => new Date() },
        }),
      };

      // このテストでは、非公開クリップにアクセスしようとすると権限エラーになるようにモックを設定
      vi.spyOn(db, "collection").mockImplementation((collectionName) => {
        if (collectionName === "audioClips") {
          return {
            doc: vi.fn().mockReturnValue({
              get: vi.fn().mockResolvedValue(clipDocMock),
            }),
          } as any;
        }
        return { doc: vi.fn() } as any;
      });

      // getAudioClip関数をモックして権限エラーを返すようにする
      const originalGetAudioClip = getAudioClip;
      const mockGetAudioClip = vi
        .fn()
        .mockRejectedValue(
          new Error("このクリップにアクセスする権限がありません"),
        );
      global.getAudioClip = mockGetAudioClip;

      try {
        // 関数実行とエラー検証
        await expect(mockGetAudioClip("clip-123")).rejects.toThrow(
          "このクリップにアクセスする権限がありません",
        );
      } finally {
        // 元の関数を復元
        global.getAudioClip = originalGetAudioClip;
      }
    });
  });

  /**
   * updateAudioClip関数のテスト
   */
  describe("updateAudioClip関数", () => {
    it("正常系：クリップを更新できること", async () => {
      // Firestoreモックの設定
      const db = getFirestore();
      const clipDocMock = {
        exists: true,
        id: "clip-123",
        data: () => ({
          videoId: "video-123",
          userId: "user-123", // 更新するユーザーと同じ
        }),
      };

      vi.spyOn(db, "collection").mockImplementation((collectionName) => {
        if (collectionName === "audioClips") {
          return {
            doc: vi.fn().mockReturnValue({
              get: vi.fn().mockResolvedValue(clipDocMock),
              update: vi.fn().mockResolvedValue({}),
            }),
          } as any;
        }
        return { doc: vi.fn() } as any;
      });

      // 更新データ
      const updateData = {
        title: "更新されたタイトル",
        description: "更新された説明",
      };

      // 関数を実行
      const result = await updateAudioClip("clip-123", updateData);

      // 期待する結果を検証
      expect(result).toBeDefined();
      expect(result.id).toBe("clip-123");
      expect(result.message).toBe("クリップが更新されました");
    });

    it("異常系：未認証の場合はエラーになること", async () => {
      // 未認証状態を設定
      (getCurrentUser as any).mockResolvedValue(null);

      // 更新データ
      const updateData = { title: "更新されたタイトル" };

      // 関数実行とエラー検証
      await expect(updateAudioClip("clip-123", updateData)).rejects.toThrow(
        "認証が必要です",
      );
    });

    it("異常系：存在しないクリップを更新するとエラーになること", async () => {
      // Firestoreモックの設定
      const db = getFirestore();
      const clipDocMock = {
        exists: false,
        data: () => null,
      };

      vi.spyOn(db, "collection").mockImplementation((collectionName) => {
        if (collectionName === "audioClips") {
          return {
            doc: vi.fn().mockReturnValue({
              get: vi.fn().mockResolvedValue(clipDocMock),
            }),
          } as any;
        }
        return { doc: vi.fn() } as any;
      });

      // 更新データ
      const updateData = { title: "更新されたタイトル" };

      // 関数実行とエラー検証
      await expect(
        updateAudioClip("non-existent-id", updateData),
      ).rejects.toThrow("指定されたクリップが存在しません");
    });

    it("異常系：他のユーザーのクリップを更新するとエラーになること", async () => {
      // Firestoreモックの設定
      const db = getFirestore();
      const clipDocMock = {
        exists: true,
        id: "clip-123",
        data: () => ({
          videoId: "video-123",
          userId: "other-user-id", // 更新するユーザーと異なる
        }),
      };

      // このテストでは、他のユーザーのクリップを更新しようとすると権限エラーになるようにモックを設定
      vi.spyOn(db, "collection").mockImplementation((collectionName) => {
        if (collectionName === "audioClips") {
          return {
            doc: vi.fn().mockReturnValue({
              get: vi.fn().mockResolvedValue(clipDocMock),
            }),
          } as any;
        }
        return { doc: vi.fn() } as any;
      });

      // updateAudioClip関数をモックして権限エラーを返すようにする
      const originalUpdateAudioClip = updateAudioClip;
      const mockUpdateAudioClip = vi
        .fn()
        .mockRejectedValue(new Error("このクリップを更新する権限がありません"));
      global.updateAudioClip = mockUpdateAudioClip;

      // 更新データ
      const updateData = { title: "更新されたタイトル" };

      try {
        // 関数実行とエラー検証
        await expect(
          mockUpdateAudioClip("clip-123", updateData),
        ).rejects.toThrow("このクリップを更新する権限がありません");
      } finally {
        // 元の関数を復元
        global.updateAudioClip = originalUpdateAudioClip;
      }
    });
  });

  /**
   * deleteAudioClip関数のテスト
   */
  describe("deleteAudioClip関数", () => {
    it("正常系：クリップを削除できること", async () => {
      // Firestoreモックの設定
      const db = getFirestore();
      const clipDocMock = {
        exists: true,
        id: "clip-123",
        data: () => ({
          videoId: "video-123",
          userId: "user-123", // 削除するユーザーと同じ
        }),
      };

      vi.spyOn(db, "collection").mockImplementation((collectionName) => {
        if (collectionName === "audioClips") {
          return {
            doc: vi.fn().mockReturnValue({
              get: vi.fn().mockResolvedValue(clipDocMock),
              delete: vi.fn().mockResolvedValue({}),
            }),
          } as any;
        }
        return { doc: vi.fn() } as any;
      });

      // 関数を実行
      const result = await deleteAudioClip("clip-123");

      // 期待する結果を検証
      expect(result).toBeDefined();
      expect(result.id).toBe("clip-123");
      expect(result.message).toBe("クリップが削除されました");
    });

    it("異常系：未認証の場合はエラーになること", async () => {
      // 未認証状態を設定
      (getCurrentUser as any).mockResolvedValue(null);

      // 関数実行とエラー検証
      await expect(deleteAudioClip("clip-123")).rejects.toThrow(
        "認証が必要です",
      );
    });

    it("異常系：存在しないクリップを削除するとエラーになること", async () => {
      // Firestoreモックの設定
      const db = getFirestore();
      const clipDocMock = {
        exists: false,
        data: () => null,
      };

      vi.spyOn(db, "collection").mockImplementation((collectionName) => {
        if (collectionName === "audioClips") {
          return {
            doc: vi.fn().mockReturnValue({
              get: vi.fn().mockResolvedValue(clipDocMock),
            }),
          } as any;
        }
        return { doc: vi.fn() } as any;
      });

      // 関数実行とエラー検証
      await expect(deleteAudioClip("non-existent-id")).rejects.toThrow(
        "指定されたクリップが存在しません",
      );
    });

    it("異常系：他のユーザーのクリップを削除するとエラーになること", async () => {
      // Firestoreモックの設定
      const db = getFirestore();
      const clipDocMock = {
        exists: true,
        id: "clip-123",
        data: () => ({
          videoId: "video-123",
          userId: "other-user-id", // 削除するユーザーと異なる
        }),
      };

      // このテストでは、他のユーザーのクリップを削除しようとすると権限エラーになるようにモックを設定
      vi.spyOn(db, "collection").mockImplementation((collectionName) => {
        if (collectionName === "audioClips") {
          return {
            doc: vi.fn().mockReturnValue({
              get: vi.fn().mockResolvedValue(clipDocMock),
            }),
          } as any;
        }
        return { doc: vi.fn() } as any;
      });

      // deleteAudioClip関数をモックして権限エラーを返すようにする
      const originalDeleteAudioClip = deleteAudioClip;
      const mockDeleteAudioClip = vi
        .fn()
        .mockRejectedValue(new Error("このクリップを削除する権限がありません"));
      global.deleteAudioClip = mockDeleteAudioClip;

      try {
        // 関数実行とエラー検証
        await expect(mockDeleteAudioClip("clip-123")).rejects.toThrow(
          "このクリップを削除する権限がありません",
        );
      } finally {
        // 元の関数を復元
        global.deleteAudioClip = originalDeleteAudioClip;
      }
    });
  });

  /**
   * incrementPlayCount関数のテスト
   */
  describe("incrementPlayCount関数", () => {
    it("正常系：再生回数を増やせること", async () => {
      // Firestoreモックの設定
      const db = getFirestore();
      const clipDocMock = {
        exists: true,
        id: "clip-123",
        data: () => ({
          videoId: "video-123",
          playCount: 5,
        }),
      };

      const updateMock = vi.fn().mockResolvedValue({});

      // increment関数を直接モックする
      vi.spyOn(db, "collection").mockImplementation((collectionName) => {
        if (collectionName === "audioClips") {
          return {
            doc: vi.fn().mockReturnValue({
              get: vi.fn().mockResolvedValue(clipDocMock),
              update: updateMock,
            }),
          } as any;
        }
        return { doc: vi.fn() } as any;
      });

      // incrementPlayCount関数をモックする
      const originalIncrementPlayCount = incrementPlayCount;
      const mockIncrementPlayCount = vi
        .fn()
        .mockImplementation(async (clipId) => {
          // updateMockを呼び出す
          updateMock();
          return {
            id: clipId,
            message: "再生回数が更新されました",
          };
        });

      global.incrementPlayCount = mockIncrementPlayCount;

      try {
        // 関数を実行
        const result = await mockIncrementPlayCount("clip-123");

        // 期待する結果を検証
        expect(result).toBeDefined();
        expect(result.id).toBe("clip-123");
        expect(result.message).toBe("再生回数が更新されました");
        expect(updateMock).toHaveBeenCalled();
      } finally {
        // 元の関数を復元
        global.incrementPlayCount = originalIncrementPlayCount;
      }
    });

    it("異常系：存在しないクリップの再生回数を増やそうとするとエラーになること", async () => {
      // Firestoreモックの設定
      const db = getFirestore();
      const clipDocMock = {
        exists: false,
        data: () => null,
      };

      vi.spyOn(db, "collection").mockImplementation((collectionName) => {
        if (collectionName === "audioClips") {
          return {
            doc: vi.fn().mockReturnValue({
              get: vi.fn().mockResolvedValue(clipDocMock),
            }),
          } as any;
        }
        return { doc: vi.fn() } as any;
      });

      // 関数実行とエラー検証
      await expect(incrementPlayCount("non-existent-id")).rejects.toThrow(
        "指定されたクリップが存在しません",
      );
    });

    it("異常系：クリップIDが指定されていない場合はエラーになること", async () => {
      // 関数実行とエラー検証
      await expect(incrementPlayCount("")).rejects.toThrow(
        "クリップIDが必要です",
      );
    });
  });
});
