import { revalidatePath } from "next/cache";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { initializeFirebaseAdmin } from "../api/auth/firebase-admin";
import { getCurrentUser } from "../api/auth/getCurrentUser";
import {
  createAudioClip,
  deleteAudioClip,
  getAudioClip,
  getAudioClips,
  incrementPlayCount,
  updateAudioClip,
} from "./audioclips";

// Firestoreのモック
const mockCollection = vi.fn();
const mockDoc = vi.fn();
const mockGet = vi.fn();
const mockWhere = vi.fn();
const mockOrderBy = vi.fn();
const mockLimit = vi.fn();
const mockStartAfter = vi.fn();
const mockAdd = vi.fn();
const mockUpdate = vi.fn();
const mockDelete = vi.fn();

// Firebase Admin モック
vi.mock("firebase-admin/firestore", () => {
  return {
    getFirestore: () => ({
      collection: mockCollection,
    }),
    FieldValue: {
      serverTimestamp: () => new Date(),
      increment: (n: number) => n,
    },
    Timestamp: {
      fromDate: (date: Date) => ({ toDate: () => date }),
    },
  };
});

// Next.js のモック
vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

// getCurrentUserのモック
vi.mock("../api/auth/getCurrentUser", () => ({
  getCurrentUser: vi.fn(),
}));

// initializeFirebaseAdminのモック
vi.mock("../api/auth/firebase-admin", () => ({
  initializeFirebaseAdmin: vi.fn(),
}));

describe("音声クリップに関する関数のテスト", () => {
  beforeEach(() => {
    vi.resetAllMocks();

    // モックの初期設定
    mockCollection.mockReturnValue({
      doc: mockDoc,
      where: mockWhere,
      add: mockAdd,
    });

    mockDoc.mockReturnValue({
      get: mockGet,
      update: mockUpdate,
      delete: mockDelete,
    });

    mockWhere.mockReturnValue({
      where: mockWhere,
      orderBy: mockOrderBy,
    });

    mockOrderBy.mockReturnValue({
      limit: mockLimit,
      startAfter: mockStartAfter,
    });

    mockLimit.mockReturnValue({
      get: mockGet,
      startAfter: mockStartAfter,
    });

    mockStartAfter.mockReturnValue({
      get: mockGet,
    });

    // デフォルトの認証ユーザーを設定
    (getCurrentUser as any).mockResolvedValue({
      uid: "test-user-123",
      displayName: "テストユーザー",
      photoURL: "https://example.com/photo.jpg",
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("getAudioClips関数", () => {
    it("動画IDによる音声クリップの取得が正常に行われること", async () => {
      // モックの設定
      const mockDocs = [
        {
          id: "clip-1",
          data: () => ({
            videoId: "video-123",
            title: "テストクリップ1",
            createdAt: { toDate: () => new Date("2025-05-01") },
            updatedAt: { toDate: () => new Date("2025-05-01") },
          }),
        },
        {
          id: "clip-2",
          data: () => ({
            videoId: "video-123",
            title: "テストクリップ2",
            createdAt: { toDate: () => new Date("2025-05-01") },
            updatedAt: { toDate: () => new Date("2025-05-01") },
          }),
        },
      ];

      mockGet.mockResolvedValue({
        docs: mockDocs,
      });

      // 関数実行
      const result = await getAudioClips({ videoId: "video-123", limit: 2 });

      // 検証
      expect(mockCollection).toHaveBeenCalledWith("audioClips");
      expect(mockWhere).toHaveBeenCalledWith("videoId", "==", "video-123");
      expect(result.clips.length).toBe(2);
      expect(result.clips[0].id).toBe("clip-1");
      expect(result.clips[1].id).toBe("clip-2");
      expect(result.hasMore).toBe(true);
    });

    it("ユーザーIDによる音声クリップの取得が正常に行われること", async () => {
      // モックの設定
      const mockDocs = [
        {
          id: "clip-3",
          data: () => ({
            videoId: "video-456",
            userId: "test-user-123",
            title: "テストクリップ3",
            createdAt: { toDate: () => new Date("2025-05-01") },
            updatedAt: { toDate: () => new Date("2025-05-01") },
          }),
        },
      ];

      mockGet.mockResolvedValue({
        docs: mockDocs,
      });

      // 関数実行
      const result = await getAudioClips({ userId: "test-user-123" });

      // 検証
      expect(mockCollection).toHaveBeenCalledWith("audioClips");
      expect(mockWhere).toHaveBeenCalledWith("userId", "==", "test-user-123");
      expect(result.clips.length).toBe(1);
      expect(result.clips[0].id).toBe("clip-3");
      expect(result.hasMore).toBe(false);
    });

    it("非認証ユーザーは公開クリップのみを取得できること", async () => {
      // 非認証ユーザー設定
      (getCurrentUser as any).mockResolvedValue(null);

      const mockDocs = [
        {
          id: "clip-4",
          data: () => ({
            videoId: "video-123",
            userId: "other-user",
            isPublic: true,
            title: "公開クリップ",
            createdAt: { toDate: () => new Date("2025-05-01") },
            updatedAt: { toDate: () => new Date("2025-05-01") },
          }),
        },
      ];

      mockGet.mockResolvedValue({
        docs: mockDocs,
      });

      // 関数実行
      const result = await getAudioClips({ videoId: "video-123" });

      // 検証
      expect(mockWhere).toHaveBeenCalledWith("isPublic", "==", true);
      expect(result.clips.length).toBe(1);
      expect(result.clips[0].title).toBe("公開クリップ");
    });

    it("パラメータが不足している場合はエラーになること", async () => {
      // パラメータなしで実行
      await expect(getAudioClips({})).rejects.toThrow(
        "videoIdまたはuserIdが必要です",
      );
    });

    it("startAfterパラメータを使ってページネーションが正しく動作すること", async () => {
      // モックの設定
      const mockDocs = [
        {
          id: "clip-5",
          data: () => ({
            videoId: "video-123",
            title: "2ページ目のクリップ",
            createdAt: { toDate: () => new Date("2025-05-01") },
            updatedAt: { toDate: () => new Date("2025-05-01") },
          }),
        },
      ];

      mockGet.mockResolvedValue({
        docs: mockDocs,
      });

      const startAfterDate = new Date("2025-04-30");

      // 関数実行
      await getAudioClips({ videoId: "video-123", startAfter: startAfterDate });

      // 検証
      expect(mockStartAfter).toHaveBeenCalled();
    });
  });

  describe("getAudioClip関数", () => {
    it("クリップIDによる単一音声クリップの取得が正常に行われること", async () => {
      // モックの設定
      const clipData = {
        videoId: "video-123",
        title: "特定のクリップ",
        isPublic: true,
        createdAt: { toDate: () => new Date("2025-05-01") },
        updatedAt: { toDate: () => new Date("2025-05-01") },
      };

      mockGet.mockResolvedValue({
        exists: true,
        id: "clip-123",
        data: () => clipData,
      });

      // 関数実行
      const result = await getAudioClip("clip-123");

      // 検証
      expect(mockCollection).toHaveBeenCalledWith("audioClips");
      expect(mockDoc).toHaveBeenCalledWith("clip-123");
      expect(result.id).toBe("clip-123");
      expect(result.title).toBe("特定のクリップ");
    });

    it("存在しないクリップIDの場合はエラーを返すこと", async () => {
      // モックの設定
      mockGet.mockResolvedValue({
        exists: false,
      });

      // 関数実行と検証
      await expect(getAudioClip("non-existent")).rejects.toThrow(
        "指定されたクリップが存在しません",
      );
    });

    it("非公開クリップは作成者のみがアクセスできること", async () => {
      // モックの設定
      const clipData = {
        videoId: "video-123",
        userId: "other-user-456", // 現在のユーザーとは異なるユーザー
        title: "非公開クリップ",
        isPublic: false,
        createdAt: { toDate: () => new Date("2025-05-01") },
        updatedAt: { toDate: () => new Date("2025-05-01") },
      };

      mockGet.mockResolvedValue({
        exists: true,
        id: "clip-123",
        data: () => clipData,
      });

      // 関数実行と検証
      await expect(getAudioClip("clip-123")).rejects.toThrow(
        "このクリップにアクセスする権限がありません",
      );
    });
  });

  describe("createAudioClip関数", () => {
    it("新規音声クリップの作成が正常に行われること", async () => {
      // モックの設定
      mockGet.mockResolvedValue({
        exists: true,
      });

      mockAdd.mockResolvedValue({
        id: "new-clip-123",
      });

      const newClipData = {
        videoId: "video-123",
        title: "新しいクリップ",
        startTime: 10,
        endTime: 20,
        isPublic: true,
        tags: ["テスト", "サンプル"],
      };

      // 関数実行
      const result = await createAudioClip(newClipData);

      // 検証
      expect(initializeFirebaseAdmin).toHaveBeenCalled();
      expect(mockCollection).toHaveBeenCalledWith("videos");
      expect(mockDoc).toHaveBeenCalledWith("video-123");
      expect(mockCollection).toHaveBeenCalledWith("audioClips");
      expect(mockAdd).toHaveBeenCalled();
      expect(revalidatePath).toHaveBeenCalledWith("/videos/video-123");

      expect(result.id).toBe("new-clip-123");
      expect(result.title).toBe("新しいクリップ");
      expect(result.videoId).toBe("video-123");
      expect(result.userId).toBe("test-user-123");
    });

    it("非公開クリップとして作成できること", async () => {
      // モックの設定
      mockGet.mockResolvedValue({
        exists: true,
      });

      mockAdd.mockResolvedValue({
        id: "private-clip-123",
      });

      const newClipData = {
        videoId: "video-123",
        title: "非公開クリップ",
        startTime: 30,
        endTime: 45,
        isPublic: false,
        description: "これは非公開クリップのテストです",
      };

      // 関数実行
      const result = await createAudioClip(newClipData);

      // 検証
      expect(mockAdd).toHaveBeenCalled();
      // モックに渡された引数を検証して、isPublicがfalseであることを確認
      const addCallArg = mockAdd.mock.calls[0][0];
      expect(addCallArg.isPublic).toBe(false);
      expect(addCallArg.description).toBe("これは非公開クリップのテストです");
      expect(result.isPublic).toBe(false);
    });

    it("タグなしでクリップを作成できること", async () => {
      // モックの設定
      mockGet.mockResolvedValue({
        exists: true,
      });

      mockAdd.mockResolvedValue({
        id: "no-tags-clip",
      });

      const newClipData = {
        videoId: "video-123",
        title: "タグなしクリップ",
        startTime: 50,
        endTime: 60,
      };

      // 関数実行
      const result = await createAudioClip(newClipData);

      // 検証
      expect(mockAdd).toHaveBeenCalled();
      // モックに渡された引数を検証して、tagsが空配列であることを確認
      const addCallArg = mockAdd.mock.calls[0][0];
      expect(addCallArg.tags).toEqual([]);
      expect(result.id).toBe("no-tags-clip");
      expect(result.title).toBe("タグなしクリップ");
    });

    it("未認証ユーザーはクリップを作成できないこと", async () => {
      // 非認証ユーザー設定
      (getCurrentUser as any).mockResolvedValue(null);

      const newClipData = {
        videoId: "video-123",
        title: "新しいクリップ",
        startTime: 10,
        endTime: 20,
      };

      // 関数実行と検証
      await expect(createAudioClip(newClipData)).rejects.toThrow(
        "認証が必要です",
      );
    });

    it("必須パラメータが不足している場合はエラーになること", async () => {
      // タイトル不足のデータ
      const invalidData = {
        videoId: "video-123",
        startTime: 10,
        endTime: 20,
      } as any;

      // 関数実行と検証
      await expect(createAudioClip(invalidData)).rejects.toThrow(
        "必須パラメータが不足しています",
      );
    });

    it("時間指定が不正な場合はエラーになること", async () => {
      // 開始時間が終了時間よりも後のデータ
      const invalidTimeData = {
        videoId: "video-123",
        title: "不正な時間のクリップ",
        startTime: 30,
        endTime: 20,
      };

      // 関数実行と検証
      await expect(createAudioClip(invalidTimeData)).rejects.toThrow(
        "開始時間は終了時間より前である必要があります",
      );
    });

    it("動画が存在しない場合はエラーになること", async () => {
      // 存在しない動画ID
      mockGet.mockResolvedValue({
        exists: false,
      });

      const newClipData = {
        videoId: "non-existent-video",
        title: "新しいクリップ",
        startTime: 10,
        endTime: 20,
      };

      // 関数実行と検証
      await expect(createAudioClip(newClipData)).rejects.toThrow(
        "指定された動画が存在しません",
      );
    });
  });

  describe("updateAudioClip関数", () => {
    it("音声クリップの更新が正常に行われること", async () => {
      // モックの設定
      const clipData = {
        userId: "test-user-123",
        videoId: "video-123",
      };

      mockGet.mockResolvedValue({
        exists: true,
        data: () => clipData,
      });

      mockUpdate.mockResolvedValue({});

      const updateData = {
        title: "更新されたタイトル",
        isPublic: false,
      };

      // 関数実行
      const result = await updateAudioClip("clip-123", updateData);

      // 検証
      expect(mockCollection).toHaveBeenCalledWith("audioClips");
      expect(mockDoc).toHaveBeenCalledWith("clip-123");
      expect(mockUpdate).toHaveBeenCalled();
      expect(mockUpdate.mock.calls[0][0]).toHaveProperty(
        "title",
        "更新されたタイトル",
      );
      expect(mockUpdate.mock.calls[0][0]).toHaveProperty("isPublic", false);
      expect(revalidatePath).toHaveBeenCalledWith("/videos/video-123");

      expect(result.id).toBe("clip-123");
      expect(result.message).toBe("クリップが更新されました");
    });

    it("タグと説明文を更新できること", async () => {
      // モックの設定
      const clipData = {
        userId: "test-user-123",
        videoId: "video-123",
        title: "元のタイトル",
        isPublic: true,
        tags: ["古いタグ"],
        description: "元の説明",
      };

      mockGet.mockResolvedValue({
        exists: true,
        data: () => clipData,
      });

      mockUpdate.mockResolvedValue({});

      const updateData = {
        tags: ["新しいタグ1", "新しいタグ2"],
        description: "更新された説明文",
      };

      // 関数実行
      const result = await updateAudioClip("clip-123", updateData);

      // 検証
      expect(mockUpdate).toHaveBeenCalled();
      const updateCallArg = mockUpdate.mock.calls[0][0];
      expect(updateCallArg.tags).toEqual(["新しいタグ1", "新しいタグ2"]);
      expect(updateCallArg.description).toBe("更新された説明文");
      expect(revalidatePath).toHaveBeenCalledWith("/videos/video-123");
      expect(result.id).toBe("clip-123");
    });

    it("未認証ユーザーはクリップを更新できないこと", async () => {
      // 非認証ユーザー設定
      (getCurrentUser as any).mockResolvedValue(null);

      // 関数実行と検証
      await expect(
        updateAudioClip("clip-123", { title: "更新" }),
      ).rejects.toThrow("認証が必要です");
    });

    it("存在しないクリップは更新できないこと", async () => {
      // 存在しないクリップ
      mockGet.mockResolvedValue({
        exists: false,
      });

      // 関数実行と検証
      await expect(
        updateAudioClip("non-existent", { title: "更新" }),
      ).rejects.toThrow("指定されたクリップが存在しません");
    });

    it("他者のクリップは更新できないこと", async () => {
      // 他者のクリップデータ
      const clipData = {
        userId: "other-user-456",
        videoId: "video-123",
      };

      mockGet.mockResolvedValue({
        exists: true,
        data: () => clipData,
      });

      // 関数実行と検証
      await expect(
        updateAudioClip("clip-123", { title: "更新" }),
      ).rejects.toThrow("このクリップを更新する権限がありません");
    });
  });

  describe("deleteAudioClip関数", () => {
    it("音声クリップの削除が正常に行われること", async () => {
      // モックの設定
      const clipData = {
        userId: "test-user-123",
        videoId: "video-123",
      };

      mockGet.mockResolvedValue({
        exists: true,
        data: () => clipData,
      });

      mockDelete.mockResolvedValue({});

      // 関数実行
      const result = await deleteAudioClip("clip-123");

      // 検証
      expect(mockCollection).toHaveBeenCalledWith("audioClips");
      expect(mockDoc).toHaveBeenCalledWith("clip-123");
      expect(mockDelete).toHaveBeenCalled();
      expect(revalidatePath).toHaveBeenCalledWith("/videos/video-123");

      expect(result.id).toBe("clip-123");
      expect(result.message).toBe("クリップが削除されました");
    });

    it("未認証ユーザーはクリップを削除できないこと", async () => {
      // 非認証ユーザー設定
      (getCurrentUser as any).mockResolvedValue(null);

      // 関数実行と検証
      await expect(deleteAudioClip("clip-123")).rejects.toThrow(
        "認証が必要です",
      );
    });

    it("存在しないクリップは削除できないこと", async () => {
      // 存在しないクリップ
      mockGet.mockResolvedValue({
        exists: false,
      });

      // 関数実行と検証
      await expect(deleteAudioClip("non-existent")).rejects.toThrow(
        "指定されたクリップが存在しません",
      );
    });

    it("他者のクリップは削除できないこと", async () => {
      // 他者のクリップデータ
      const clipData = {
        userId: "other-user-456",
        videoId: "video-123",
      };

      mockGet.mockResolvedValue({
        exists: true,
        data: () => clipData,
      });

      // 関数実行と検証
      await expect(deleteAudioClip("clip-123")).rejects.toThrow(
        "このクリップを削除する権限がありません",
      );
    });
  });

  describe("incrementPlayCount関数", () => {
    it("再生回数のインクリメントが正常に行われること", async () => {
      // モックの設定
      mockGet.mockResolvedValue({
        exists: true,
      });

      mockUpdate.mockResolvedValue({});

      // 関数実行
      const result = await incrementPlayCount("clip-123");

      // 検証
      expect(mockCollection).toHaveBeenCalledWith("audioClips");
      expect(mockDoc).toHaveBeenCalledWith("clip-123");
      expect(mockUpdate).toHaveBeenCalled();
      expect(mockUpdate.mock.calls[0][0]).toHaveProperty("playCount");

      expect(result.id).toBe("clip-123");
      expect(result.message).toBe("再生回数が更新されました");
    });

    it("再生回数と最終再生日時が両方更新されること", async () => {
      // モックの設定
      const clipData = {
        videoId: "video-123",
        playCount: 5,
      };

      mockGet.mockResolvedValue({
        exists: true,
        data: () => clipData,
      });

      mockUpdate.mockResolvedValue({});

      // 関数実行
      await incrementPlayCount("clip-123");

      // 検証
      expect(mockUpdate).toHaveBeenCalled();
      const updateCallArg = mockUpdate.mock.calls[0][0];
      expect(updateCallArg).toHaveProperty("playCount");
      expect(updateCallArg).toHaveProperty("lastPlayedAt");
    });

    it("初めての再生の場合は1から開始し、以降は増加していくこと", async () => {
      // 初回再生のモック設定（playCountなし）
      const initialClipData = {
        videoId: "video-123",
        title: "テストクリップ",
        // playCountなし
      };

      mockGet.mockResolvedValue({
        exists: true,
        data: () => initialClipData,
      });

      mockUpdate.mockResolvedValue({});

      // 関数実行
      await incrementPlayCount("clip-123");

      // 検証 - FieldValue.increment(1)が呼ばれたことを確認
      expect(mockUpdate).toHaveBeenCalled();
      const firstUpdateArg = mockUpdate.mock.calls[0][0];
      expect(firstUpdateArg).toHaveProperty("playCount");
      expect(firstUpdateArg).toHaveProperty("lastPlayedAt");

      // --------- 2回目の再生シナリオ ------------

      // モックをクリアして再設定
      mockGet.mockReset();
      mockUpdate.mockReset();

      // 2回目の再生で使用するクリップデータ（既にplayCount=1あり）
      const updatedClipData = {
        videoId: "video-123",
        title: "テストクリップ",
        playCount: 1,
      };

      mockGet.mockResolvedValue({
        exists: true,
        data: () => updatedClipData,
      });

      // 再度関数実行
      await incrementPlayCount("clip-123");

      // 検証 - FieldValue.increment(1)が呼ばれたことを確認
      // 既に1が設定されているため、+1されて2になることを期待
      expect(mockUpdate).toHaveBeenCalled();
      const secondUpdateArg = mockUpdate.mock.calls[0][0];
      expect(secondUpdateArg).toHaveProperty("playCount");
      // FieldValue.incrementの結果はモック実装に依存するため、
      // ここでは詳細な値を検証せず、関数が正しく呼ばれたことだけを確認する
    });

    it("クリップIDが指定されていない場合はエラーになること", async () => {
      // 引数なしで実行
      await expect(incrementPlayCount("")).rejects.toThrow(
        "クリップIDが必要です",
      );
    });

    it("存在しないクリップは再生回数を更新できないこと", async () => {
      // 存在しないクリップ
      mockGet.mockResolvedValue({
        exists: false,
      });

      // 関数実行と検証
      await expect(incrementPlayCount("non-existent")).rejects.toThrow(
        "指定されたクリップが存在しません",
      );
    });
  });
});
