/**
 * タグ管理に関するServer Actionsのテスト
 *
 * このファイルでは以下の関数のテストを行います：
 * - getAudioClipsByTag: タグに関連するオーディオクリップを取得する
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

// getCurrentUserのモックを作成
vi.mock("../auth/getCurrentUser", () => ({
  getCurrentUser: vi.fn(),
}));

// 他のモジュールのモック
vi.mock("../auth/firebase-admin", () => ({
  initializeFirebaseAdmin: vi.fn(),
}));

import { getFirestore } from "firebase-admin/firestore";
import { getCurrentUser } from "../auth/getCurrentUser";
import { getAudioClipsByTag } from "./manage-tags";

describe("タグ管理機能", () => {
  // モックのFirestoreインスタンス
  let mockFirestoreInstance: any;

  beforeEach(() => {
    vi.clearAllMocks();

    // モック用のデータ
    const mockAudioClips = [
      {
        id: "clip1",
        data: () => ({
          title: "テストクリップ1",
          videoId: "video123",
          startTime: 60,
          endTime: 70,
          createdBy: "user123",
          isPublic: true,
          tags: ["テスト", "音声入り"],
          favoriteCount: 5,
          createdAt: { toDate: () => new Date("2025-05-01") },
          updatedAt: { toDate: () => new Date("2025-05-01") },
        }),
      },
      {
        id: "clip2",
        data: () => ({
          title: "テストクリップ2",
          videoId: "video456",
          startTime: 120,
          endTime: 130,
          createdBy: "user456",
          isPublic: true,
          tags: ["テスト", "カットイン"],
          favoriteCount: 3,
          createdAt: { toDate: () => new Date("2025-04-28") },
          updatedAt: { toDate: () => new Date("2025-04-28") },
        }),
      },
      {
        id: "clip3",
        data: () => ({
          title: "非公開クリップ",
          videoId: "video789",
          startTime: 180,
          endTime: 190,
          createdBy: "user123",
          isPublic: false,
          tags: ["テスト", "音声入り"],
          favoriteCount: 0,
          createdAt: { toDate: () => new Date("2025-04-25") },
          updatedAt: { toDate: () => new Date("2025-04-25") },
        }),
      },
    ];

    // デフォルトでログイン状態に設定
    (getCurrentUser as any).mockResolvedValue({ uid: "user123" });

    // 基本のモック実装を設定
    mockFirestoreInstance = getFirestore() as unknown;

    // モックを改善して、whereの後にorderByが正しく機能するようにする
    const mockQuery = {
      where: vi.fn().mockReturnThis(),
      orderBy: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      startAfter: vi.fn().mockReturnThis(),
      get: vi.fn().mockResolvedValue({
        empty: false,
        docs: mockAudioClips,
        size: mockAudioClips.length,
      }),
    };

    mockFirestoreInstance.collection = vi.fn(() => mockQuery);

    // doc関数のモック
    mockQuery.doc = vi.fn((id) => ({
      get: vi.fn().mockResolvedValue({
        exists: id !== "nonexistent",
        id,
        data: () =>
          mockAudioClips.find((clip) => clip.id === id)?.data() || null,
      }),
    }));

    // 空の結果をシミュレートするためのモック
    const emptyMockQuery = {
      ...mockQuery,
      get: vi.fn().mockResolvedValue({
        empty: true,
        docs: [],
        size: 0,
      }),
    };

    // ページネーションのテスト用
    mockQuery.startAfter.mockImplementation(() => ({
      ...mockQuery,
      get: vi.fn().mockResolvedValue({
        empty: false,
        docs: [mockAudioClips[2]],
        size: 1,
      }),
    }));
  });

  /**
   * getAudioClipsByTag関数のテスト
   */
  describe("getAudioClipsByTag", () => {
    it("正常系：未ログインユーザーには公開クリップのみ表示されること", async () => {
      // 未ログイン状態に設定
      (getCurrentUser as any).mockResolvedValue(null);

      // モックの再設定 - 公開クリップのみを返すように
      const mockAudioClipsPublicOnly = [
        {
          id: "clip1",
          data: () => ({
            title: "テストクリップ1",
            videoId: "video123",
            startTime: 60,
            endTime: 70,
            createdBy: "user123",
            isPublic: true,
            tags: ["テスト", "音声入り"],
            favoriteCount: 5,
            createdAt: { toDate: () => new Date("2025-05-01") },
            updatedAt: { toDate: () => new Date("2025-05-01") },
          }),
        },
        {
          id: "clip2",
          data: () => ({
            title: "テストクリップ2",
            videoId: "video456",
            startTime: 120,
            endTime: 130,
            createdBy: "user456",
            isPublic: true,
            tags: ["テスト", "カットイン"],
            favoriteCount: 3,
            createdAt: { toDate: () => new Date("2025-04-28") },
            updatedAt: { toDate: () => new Date("2025-04-28") },
          }),
        },
      ];

      const mockPublicQuery = {
        where: vi.fn().mockReturnThis(),
        orderBy: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        get: vi.fn().mockResolvedValue({
          empty: false,
          docs: mockAudioClipsPublicOnly,
          size: mockAudioClipsPublicOnly.length,
        }),
      };

      mockFirestoreInstance.collection = vi.fn(() => mockPublicQuery);

      // 関数を実行
      const result = await getAudioClipsByTag("テスト");

      // 期待される結果を検証
      expect(result.clips).toHaveLength(2); // 公開クリップのみ
      expect(result.clips.map((clip) => clip.id)).toEqual(["clip1", "clip2"]);
      expect(result.hasMore).toBe(false); // すべてのデータが取得できているため
    });

    it("正常系：ログインユーザーには全てのクリップが表示されること", async () => {
      // ログイン状態に設定（デフォルト）

      // 関数を実行
      const result = await getAudioClipsByTag("テスト");

      // 期待される結果を検証
      expect(result.clips).toHaveLength(3); // 全てのクリップ
      expect(result.clips.map((clip) => clip.id)).toEqual([
        "clip1",
        "clip2",
        "clip3",
      ]);
      expect(result.hasMore).toBe(false); // モックの設定上
    });

    it("正常系：件数制限を指定できること", async () => {
      // モックの再設定 - 制限されたビデオを返すように
      const mockAudioClipsLimited = [
        {
          id: "clip1",
          data: () => ({
            title: "テストクリップ1",
            videoId: "video123",
            startTime: 60,
            endTime: 70,
            createdBy: "user123",
            isPublic: true,
            tags: ["テスト", "音声入り"],
            favoriteCount: 5,
            createdAt: { toDate: () => new Date("2025-05-01") },
            updatedAt: { toDate: () => new Date("2025-05-01") },
          }),
        },
        {
          id: "clip2",
          data: () => ({
            title: "テストクリップ2",
            videoId: "video456",
            startTime: 120,
            endTime: 130,
            createdBy: "user456",
            isPublic: true,
            tags: ["テスト", "カットイン"],
            favoriteCount: 3,
            createdAt: { toDate: () => new Date("2025-04-28") },
            updatedAt: { toDate: () => new Date("2025-04-28") },
          }),
        },
      ];

      const mockLimitQuery = {
        where: vi.fn().mockReturnThis(),
        orderBy: vi.fn().mockReturnThis(),
        limit: vi.fn((limit) => {
          expect(limit).toBe(2); // 制限が正しく渡されていることを確認
          return {
            get: vi.fn().mockResolvedValue({
              empty: false,
              docs: mockAudioClipsLimited,
              size: mockAudioClipsLimited.length,
            }),
          };
        }),
      };

      mockFirestoreInstance.collection = vi.fn(() => mockLimitQuery);

      // 関数を実行（件数制限2件）
      const result = await getAudioClipsByTag("テスト", 2);

      // 期待される結果を検証
      expect(result.clips).toHaveLength(2);
      expect(result.hasMore).toBe(true); // まだデータが残っている
    });

    it("正常系：ページネーションが機能すること", async () => {
      // モックの再設定 - 2ページ目のデータを返すように
      const mockAudioClipsPage2 = [
        {
          id: "clip3",
          data: () => ({
            title: "非公開クリップ",
            videoId: "video789",
            startTime: 180,
            endTime: 190,
            createdBy: "user123",
            isPublic: false,
            tags: ["テスト", "音声入り"],
            favoriteCount: 0,
            createdAt: { toDate: () => new Date("2025-04-25") },
            updatedAt: { toDate: () => new Date("2025-04-25") },
          }),
        },
      ];

      const mockPageQuery = {
        where: vi.fn().mockReturnThis(),
        orderBy: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        startAfter: vi.fn(() => ({
          get: vi.fn().mockResolvedValue({
            empty: false,
            docs: mockAudioClipsPage2,
            size: mockAudioClipsPage2.length,
          }),
        })),
        get: vi.fn().mockResolvedValue({
          empty: false,
          docs: mockAudioClipsPage2,
          size: mockAudioClipsPage2.length,
        }),
      };

      mockFirestoreInstance.collection = vi.fn(() => mockPageQuery);

      // 関数を実行（ページネーションあり）
      const result = await getAudioClipsByTag("テスト", {
        lastCreatedAt: new Date(),
      });

      // 期待される結果を検証
      expect(result.clips.length).toBe(1);
      expect(result.hasMore).toBe(false); // これ以上データがない
    });

    it("異常系：タグが未指定の場合はエラーになること", async () => {
      // 関数呼び出しで例外がスローされることを検証
      await expect(getAudioClipsByTag("")).rejects.toThrow(
        "検索するタグが指定されていません",
      );
    });

    it("異常系：エラーが発生した場合は例外をスローすること", async () => {
      // モックを上書きしてエラーをシミュレート
      const errorMessage = "データベースエラー";

      mockFirestoreInstance.collection = vi.fn(() => {
        throw new Error(errorMessage);
      });

      // 関数呼び出しで例外がスローされることを検証
      await expect(getAudioClipsByTag("テスト")).rejects.toThrow(
        `タグによるオーディオクリップ検索に失敗しました: ${errorMessage}`,
      );
    });

    it("異常系：結果が空の場合は空配列を返すこと", async () => {
      // モックを上書きして空の結果をシミュレート
      const mockEmptyQuery = {
        where: vi.fn().mockReturnThis(),
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
      const result = await getAudioClipsByTag("存在しないタグ");

      // 期待される結果を検証
      expect(result.clips).toEqual([]);
      expect(result.hasMore).toBe(false);
    });
  });
});
