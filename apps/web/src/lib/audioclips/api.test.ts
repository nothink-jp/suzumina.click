import { Timestamp } from "firebase/firestore";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  checkFavoriteStatus,
  convertAudioClipData,
  createAudioClip,
  deleteAudioClip,
  getAudioClipById,
  getAudioClipsByUser,
  getAudioClipsByVideo,
  getFavoriteClips,
  incrementPlayCount,
  toggleFavorite,
  updateAudioClip,
} from "./api";
import type { AudioClip, AudioClipCreateData, AudioClipData } from "./types";

// Firestoreのモック作成
vi.mock("firebase/firestore", () => {
  return {
    getFirestore: vi.fn(() => ({})),
    collection: vi.fn(() => ({})),
    doc: vi.fn(() => ({})),
    getDoc: vi.fn(),
    getDocs: vi.fn(),
    addDoc: vi.fn(),
    updateDoc: vi.fn(),
    deleteDoc: vi.fn(),
    query: vi.fn(() => ({})),
    where: vi.fn(() => ({})),
    orderBy: vi.fn(() => ({})),
    limit: vi.fn(() => ({})),
    startAfter: vi.fn(() => ({})),
    serverTimestamp: vi.fn(() => mockTimestamp),
    increment: vi.fn((n) => ({ increment: n })),
    setDoc: vi.fn(),
    Timestamp: {
      fromDate: (date) => ({
        toDate: () => date,
        seconds: Math.floor(date.getTime() / 1000),
        nanoseconds: 0,
      }),
    },
  };
});

// Firebaseクライアントをモック
vi.mock("../firebase/client", () => ({
  app: {},
}));

// モック用のセットアップと共通テストデータ
const mockTimestamp = {
  toDate: () => new Date("2025-05-01T12:00:00Z"),
  seconds: Math.floor(new Date("2025-05-01T12:00:00Z").getTime() / 1000),
  nanoseconds: 0,
};

const mockAudioClipData: AudioClipData = {
  clipId: "test-clip-1",
  videoId: "test-video-1",
  title: "テストクリップ1",
  phrase: "これはテスト用のフレーズです",
  startTime: 10,
  endTime: 20,
  createdAt: mockTimestamp as any,
  updatedAt: mockTimestamp as any,
  userId: "test-user-1",
  userName: "テストユーザー1",
  userPhotoURL: "https://example.com/photo.jpg",
  isPublic: true,
  tags: ["テスト", "サンプル"],
  playCount: 5,
  favoriteCount: 2,
};

// 各テスト前にモックをリセット
beforeEach(() => {
  vi.resetAllMocks();
});

describe("音声クリップAPI関数のテスト", () => {
  describe("convertAudioClipData関数", () => {
    it("Firestoreデータを正しくアプリケーションデータに変換する", () => {
      const result = convertAudioClipData(mockAudioClipData);

      // 日付データがISO文字列形式に正しく変換されていることを確認
      expect(result).toEqual({
        id: "test-clip-1",
        videoId: "test-video-1",
        title: "テストクリップ1",
        phrase: "これはテスト用のフレーズです",
        startTime: 10,
        endTime: 20,
        createdAt: mockTimestamp.toDate().toISOString(), // Date型から文字列型に変更
        updatedAt: mockTimestamp.toDate().toISOString(), // Date型から文字列型に変更
        userId: "test-user-1",
        userName: "テストユーザー1",
        userPhotoURL: "https://example.com/photo.jpg",
        isPublic: true,
        tags: ["テスト", "サンプル"],
        playCount: 5,
        favoriteCount: 2,
        duration: 10, // endTime - startTime
        formattedDuration: "0:10", // フォーマット済み再生時間
        lastPlayedAt: undefined, // 未設定の場合はundefined
      });
    });

    it("タグが未指定の場合は空配列になる", () => {
      const dataWithoutTags = { ...mockAudioClipData, tags: undefined };
      const result = convertAudioClipData(dataWithoutTags);

      // タグが未設定の場合は空配列が設定されることを確認
      expect(result.tags).toEqual([]);
    });

    it("再生時間が1分を超える場合も正しくフォーマットされる", () => {
      const dataWithLongDuration = {
        ...mockAudioClipData,
        startTime: 10,
        endTime: 130, // 2分10秒
      };

      const result = convertAudioClipData(dataWithLongDuration);

      // 正しい再生時間が計算されることを確認
      expect(result.duration).toBe(120);
      expect(result.formattedDuration).toBe("2:00");
    });
  });

  describe("getAudioClipsByVideo関数", () => {
    it("正しいパラメータで動画に関連するクリップを取得できる", async () => {
      // モックのインポート
      const { getDocs } = await import("firebase/firestore");

      // getDocs モックの設定
      const mockQuerySnapshot = {
        docs: [
          {
            id: "test-clip-1",
            data: () => ({
              videoId: "test-video-1",
              title: "テストクリップ1",
              phrase: "これはテスト用のフレーズです",
              startTime: 10,
              endTime: 20,
              createdAt: mockTimestamp,
              updatedAt: mockTimestamp,
              userId: "test-user-1",
              userName: "テストユーザー1",
              userPhotoURL: "https://example.com/photo.jpg",
              isPublic: true,
              tags: ["テスト", "サンプル"],
              playCount: 5,
              favoriteCount: 2,
            }),
          },
          {
            id: "test-clip-2",
            data: () => ({
              videoId: "test-video-1",
              title: "テストクリップ2",
              phrase: "2つ目のテスト用フレーズ",
              startTime: 30,
              endTime: 45,
              createdAt: mockTimestamp,
              updatedAt: mockTimestamp,
              userId: "test-user-1",
              userName: "テストユーザー1",
              userPhotoURL: "https://example.com/photo.jpg",
              isPublic: true,
              tags: ["テスト"],
              playCount: 10,
              favoriteCount: 3,
            }),
          },
        ],
      };

      // モックレスポンスの設定
      vi.mocked(getDocs).mockResolvedValue(mockQuerySnapshot as any);

      const result = await getAudioClipsByVideo({
        videoId: "test-video-1",
        limit: 10,
      });

      expect(getDocs).toHaveBeenCalled();
      expect(result.clips.length).toBe(2);
      expect(result.hasMore).toBe(false); // limit(10)で2件取得したので、hasMoreはfalse
      expect(result.clips[0].id).toBe("test-clip-1");
      expect(result.clips[1].id).toBe("test-clip-2");
    });

    it("検索結果が上限に達した場合、hasMoreがtrueになる", async () => {
      // モックのインポート
      const { getDocs } = await import("firebase/firestore");

      // getDocs モックの設定
      const mockQuerySnapshot = {
        docs: [
          {
            id: "test-clip-1",
            data: () => ({
              videoId: "test-video-1",
              title: "テストクリップ1",
              phrase: "これはテスト用のフレーズです",
              startTime: 10,
              endTime: 20,
              createdAt: mockTimestamp,
              updatedAt: mockTimestamp,
              userId: "test-user-1",
              userName: "テストユーザー1",
              userPhotoURL: "https://example.com/photo.jpg",
              isPublic: true,
              tags: ["テスト", "サンプル"],
              playCount: 5,
              favoriteCount: 2,
            }),
          },
          {
            id: "test-clip-2",
            data: () => ({
              videoId: "test-video-1",
              title: "テストクリップ2",
              phrase: "2つ目のテスト用フレーズ",
              startTime: 30,
              endTime: 45,
              createdAt: mockTimestamp,
              updatedAt: mockTimestamp,
              userId: "test-user-1",
              userName: "テストユーザー1",
              userPhotoURL: "https://example.com/photo.jpg",
              isPublic: true,
              tags: ["テスト"],
              playCount: 10,
              favoriteCount: 3,
            }),
          },
        ],
      };

      // モックレスポンスの設定
      vi.mocked(getDocs).mockResolvedValue(mockQuerySnapshot as any);

      const result = await getAudioClipsByVideo({
        videoId: "test-video-1",
        limit: 2, // 上限を2件に設定
      });

      expect(getDocs).toHaveBeenCalled();
      expect(result.clips.length).toBe(2);
      expect(result.hasMore).toBe(true); // limit(2)で2件取得したので、hasMoreはtrue
    });
  });

  describe("getAudioClipsByUser関数", () => {
    it("ユーザーIDに関連するクリップを取得できる", async () => {
      // モックのインポート
      const { getDocs } = await import("firebase/firestore");

      // getDocs モックの設定
      const mockUserClipsSnapshot = {
        docs: [
          {
            id: "user-clip-1",
            data: () => ({
              videoId: "test-video-1",
              title: "ユーザークリップ1",
              phrase: "ユーザー作成のフレーズ1",
              startTime: 10,
              endTime: 20,
              createdAt: mockTimestamp,
              updatedAt: mockTimestamp,
              userId: "test-user-1",
              userName: "テストユーザー1",
              userPhotoURL: "https://example.com/photo.jpg",
              isPublic: true,
              tags: ["ユーザー", "サンプル"],
              playCount: 15,
              favoriteCount: 7,
            }),
          },
          {
            id: "user-clip-2",
            data: () => ({
              videoId: "test-video-2",
              title: "ユーザークリップ2",
              phrase: "ユーザー作成のフレーズ2",
              startTime: 5,
              endTime: 25,
              createdAt: mockTimestamp,
              updatedAt: mockTimestamp,
              userId: "test-user-1",
              userName: "テストユーザー1",
              userPhotoURL: "https://example.com/photo.jpg",
              isPublic: false, // 非公開
              tags: ["ユーザー", "プライベート"],
              playCount: 2,
              favoriteCount: 0,
            }),
          },
        ],
      };

      // モックレスポンスの設定
      vi.mocked(getDocs).mockResolvedValue(mockUserClipsSnapshot as any);

      const result = await getAudioClipsByUser({
        userId: "test-user-1",
        limit: 10,
        includePrivate: true, // 非公開クリップを含める
      });

      expect(getDocs).toHaveBeenCalled();
      expect(result.clips.length).toBe(2);
      expect(result.clips.some((clip) => !clip.isPublic)).toBe(true); // 非公開クリップが含まれる
    });

    it("includePrivateがfalseの場合、公開クリップのみ取得される", async () => {
      // モックのインポート
      const { getDocs } = await import("firebase/firestore");

      // 公開クリップのみをモック
      const mockUserClipsSnapshot = {
        docs: [
          {
            id: "user-clip-1",
            data: () => ({
              videoId: "test-video-1",
              title: "ユーザークリップ1",
              phrase: "ユーザー作成のフレーズ1",
              startTime: 10,
              endTime: 20,
              createdAt: mockTimestamp,
              updatedAt: mockTimestamp,
              userId: "test-user-1",
              userName: "テストユーザー1",
              userPhotoURL: "https://example.com/photo.jpg",
              isPublic: true,
              tags: ["ユーザー", "サンプル"],
              playCount: 15,
              favoriteCount: 7,
            }),
          },
        ],
      };

      vi.mocked(getDocs).mockResolvedValue(mockUserClipsSnapshot as any);

      const result = await getAudioClipsByUser({
        userId: "test-user-1",
        limit: 10,
        includePrivate: false, // 公開クリップのみ
      });

      expect(getDocs).toHaveBeenCalled();
      expect(result.clips.length).toBe(1);
      expect(result.clips[0].isPublic).toBe(true);
    });
  });

  describe("getAudioClipById関数", () => {
    it("存在するクリップIDを指定した場合、そのクリップデータを返す", async () => {
      // モックのインポート
      const { getDoc } = await import("firebase/firestore");

      // getDoc モックの設定
      const mockDocSnapshot = {
        exists: () => true,
        id: "test-clip-1",
        data: () => ({
          videoId: "test-video-1",
          title: "テストクリップ1",
          phrase: "これはテスト用のフレーズです",
          startTime: 10,
          endTime: 20,
          createdAt: mockTimestamp,
          updatedAt: mockTimestamp,
          userId: "test-user-1",
          userName: "テストユーザー1",
          userPhotoURL: "https://example.com/photo.jpg",
          isPublic: true,
          tags: ["テスト", "サンプル"],
          playCount: 5,
          favoriteCount: 2,
        }),
      };

      vi.mocked(getDoc).mockResolvedValue(mockDocSnapshot as any);

      const result = await getAudioClipById("test-clip-1");

      expect(getDoc).toHaveBeenCalled();
      expect(result).not.toBeNull();
      expect(result?.id).toBe("test-clip-1");
      expect(result?.title).toBe("テストクリップ1");
    });

    it("存在しないクリップIDを指定した場合、nullを返す", async () => {
      // モックのインポート
      const { getDoc } = await import("firebase/firestore");

      // 存在しないドキュメントのモックを設定
      const mockDocSnapshot = {
        exists: () => false,
      };

      vi.mocked(getDoc).mockResolvedValue(mockDocSnapshot as any);

      const result = await getAudioClipById("non-existent-clip");

      expect(getDoc).toHaveBeenCalled();
      expect(result).toBeNull();
    });
  });

  describe("createAudioClip関数", () => {
    it("クリップを新規作成できる", async () => {
      // モックのインポート
      const { addDoc, getDoc } = await import("firebase/firestore");

      // addDocモックを設定
      const mockDocRef = { id: "new-clip-id" };
      vi.mocked(addDoc).mockResolvedValue(mockDocRef as any);

      // getDocモックを設定（新規作成後のデータ取得用）
      const mockDocSnapshot = {
        exists: () => true,
        id: "new-clip-id",
        data: () => ({
          videoId: "test-video-2",
          title: "新規クリップ",
          phrase: "新しいテスト用フレーズ",
          startTime: 5,
          endTime: 15,
          createdAt: mockTimestamp,
          updatedAt: mockTimestamp,
          userId: "test-user-2",
          userName: "テストユーザー2",
          userPhotoURL: "https://example.com/photo2.jpg",
          isPublic: true,
          tags: ["新規"],
          playCount: 0,
          favoriteCount: 0,
        }),
      };

      vi.mocked(getDoc).mockResolvedValue(mockDocSnapshot as any);

      const createData: AudioClipCreateData = {
        videoId: "test-video-2",
        title: "新規クリップ",
        phrase: "新しいテスト用フレーズ",
        startTime: 5,
        endTime: 15,
        userId: "test-user-2",
        userName: "テストユーザー2",
        userPhotoURL: "https://example.com/photo2.jpg",
        isPublic: true,
        tags: ["新規"],
      };

      const result = await createAudioClip(createData);

      expect(addDoc).toHaveBeenCalled();
      expect(getDoc).toHaveBeenCalled();
      expect(result).toBeDefined();
      expect(result.id).toBe("new-clip-id");
      expect(result.title).toBe("新規クリップ");
      expect(result.playCount).toBe(0);
      expect(result.favoriteCount).toBe(0);
    });
  });

  describe("updateAudioClip関数", () => {
    it("クリップを更新できる", async () => {
      // モックのインポート
      const { updateDoc } = await import("firebase/firestore");

      // モックの設定
      vi.mocked(updateDoc).mockResolvedValue(undefined);

      // 更新データ
      const updateData = {
        title: "更新されたタイトル",
        phrase: "更新されたフレーズ",
        isPublic: false,
        tags: ["更新", "テスト"],
      };

      // 更新を実行
      await updateAudioClip("test-clip-1", updateData);

      // updateDocが正しく呼ばれたことを確認
      expect(updateDoc).toHaveBeenCalledTimes(1);

      // 更新データに必要なフィールドが含まれていることを確認
      const updateCall = vi.mocked(updateDoc).mock.calls[0];
      expect(updateCall[1]).toMatchObject({
        title: "更新されたタイトル",
        phrase: "更新されたフレーズ",
        isPublic: false,
        tags: ["更新", "テスト"],
        updatedAt: expect.anything(),
      });
    });
  });

  describe("deleteAudioClip関数", () => {
    it("クリップを削除できる", async () => {
      // モックのインポート
      const { deleteDoc } = await import("firebase/firestore");

      // モックの設定
      vi.mocked(deleteDoc).mockResolvedValue(undefined);

      // 削除を実行
      await deleteAudioClip("test-clip-1");

      // deleteDocが正しく呼ばれたことを確認
      expect(deleteDoc).toHaveBeenCalledTimes(1);
    });
  });

  describe("incrementPlayCount関数", () => {
    it("クリップの再生回数をインクリメントできる", async () => {
      // モックのインポート
      const { updateDoc, increment } = await import("firebase/firestore");

      // モックの設定
      vi.mocked(updateDoc).mockResolvedValue(undefined);

      // 再生回数インクリメントを実行
      await incrementPlayCount("test-clip-1");

      // updateDocが正しく呼ばれたことを確認
      expect(updateDoc).toHaveBeenCalledTimes(1);

      // incrementが正しく呼ばれたことを確認
      expect(increment).toHaveBeenCalledWith(1);
    });
  });

  describe("checkFavoriteStatus関数", () => {
    it("お気に入り登録済みの場合はtrueを返す", async () => {
      // モックのインポート
      const { getDoc } = await import("firebase/firestore");

      // getDocモックの設定（ドキュメントが存在する場合）
      const mockDocSnapshot = {
        exists: () => true,
      };

      vi.mocked(getDoc).mockResolvedValue(mockDocSnapshot as any);

      const result = await checkFavoriteStatus("test-clip-1", "test-user-1");

      expect(getDoc).toHaveBeenCalled();
      expect(result).toBe(true);
    });

    it("お気に入り未登録の場合はfalseを返す", async () => {
      // モックのインポート
      const { getDoc } = await import("firebase/firestore");

      // getDocモックの設定（ドキュメントが存在しない場合）
      const mockDocSnapshot = {
        exists: () => false,
      };

      vi.mocked(getDoc).mockResolvedValue(mockDocSnapshot as any);

      const result = await checkFavoriteStatus("test-clip-1", "test-user-2");

      expect(getDoc).toHaveBeenCalled();
      expect(result).toBe(false);
    });
  });

  describe("toggleFavorite関数", () => {
    it("お気に入り登録を行うことができる", async () => {
      // モックのインポート
      const { updateDoc, setDoc, increment } = await import(
        "firebase/firestore"
      );

      // モックの設定
      vi.mocked(updateDoc).mockResolvedValue(undefined);
      vi.mocked(setDoc).mockResolvedValue(undefined);

      // お気に入り登録を実行
      await toggleFavorite("test-clip-1", "test-user-1", true);

      // 正しくメソッドが呼ばれたことを確認
      expect(updateDoc).toHaveBeenCalledTimes(1);
      expect(setDoc).toHaveBeenCalledTimes(1);

      // favoriteCountが+1されることを確認
      const updateCall = vi.mocked(updateDoc).mock.calls[0];
      expect(updateCall[1]).toHaveProperty("favoriteCount");
      expect(increment).toHaveBeenCalledWith(1);
    });

    it("お気に入り解除を行うことができる", async () => {
      // モックのインポート
      const { updateDoc, deleteDoc, increment } = await import(
        "firebase/firestore"
      );

      // モックの設定
      vi.mocked(updateDoc).mockResolvedValue(undefined);
      vi.mocked(deleteDoc).mockResolvedValue(undefined);

      // お気に入り解除を実行
      await toggleFavorite("test-clip-1", "test-user-1", false);

      // 正しくメソッドが呼ばれたことを確認
      expect(updateDoc).toHaveBeenCalledTimes(1);
      expect(deleteDoc).toHaveBeenCalledTimes(1);

      // favoriteCountが-1されることを確認
      const updateCall = vi.mocked(updateDoc).mock.calls[0];
      expect(updateCall[1]).toHaveProperty("favoriteCount");
      expect(increment).toHaveBeenCalledWith(-1);
    });
  });

  describe("getFavoriteClips関数", () => {
    it("ユーザーのお気に入りクリップを取得できる", async () => {
      // モックのインポート
      const { getDocs } = await import("firebase/firestore");

      // お気に入り一覧のモックを設定
      const mockFavoritesSnapshot = {
        docs: [
          {
            data: () => ({
              userId: "test-user-1",
              clipId: "fav-clip-1",
              createdAt: mockTimestamp,
            }),
          },
          {
            data: () => ({
              userId: "test-user-1",
              clipId: "fav-clip-2",
              createdAt: mockTimestamp,
            }),
          },
        ],
      };

      // クリップ詳細のモックを設定
      const mockClipsSnapshot = {
        docs: [
          {
            id: "fav-clip-1",
            data: () => ({
              videoId: "test-video-1",
              title: "お気に入りクリップ1",
              phrase: "お気に入りのフレーズ1",
              startTime: 15,
              endTime: 25,
              createdAt: mockTimestamp,
              updatedAt: mockTimestamp,
              userId: "creator-1",
              userName: "作成者1",
              userPhotoURL: "https://example.com/photo1.jpg",
              isPublic: true,
              tags: ["お気に入り"],
              playCount: 20,
              favoriteCount: 5,
            }),
          },
          {
            id: "fav-clip-2",
            data: () => ({
              videoId: "test-video-2",
              title: "お気に入りクリップ2",
              phrase: "お気に入りのフレーズ2",
              startTime: 30,
              endTime: 45,
              createdAt: mockTimestamp,
              updatedAt: mockTimestamp,
              userId: "creator-2",
              userName: "作成者2",
              userPhotoURL: "https://example.com/photo2.jpg",
              isPublic: true,
              tags: ["お気に入り", "テスト"],
              playCount: 15,
              favoriteCount: 3,
            }),
          },
        ],
      };

      // 2回の異なる呼び出しで異なるモックを返すように設定
      vi.mocked(getDocs).mockResolvedValueOnce(mockFavoritesSnapshot as any);
      vi.mocked(getDocs).mockResolvedValueOnce(mockClipsSnapshot as any);

      const result = await getFavoriteClips("test-user-1", {
        limit: 10,
      });

      expect(getDocs).toHaveBeenCalledTimes(2);
      expect(result.clips.length).toBe(2);
      expect(result.clips[0].id).toBe("fav-clip-1");
      expect(result.clips[1].id).toBe("fav-clip-2");
      expect(result.hasMore).toBe(false);
    });

    it("お気に入りクリップが存在しない場合、空の配列を返す", async () => {
      // モックのインポート
      const { getDocs } = await import("firebase/firestore");

      // 空のお気に入り一覧のモックを設定
      const mockEmptyFavoritesSnapshot = {
        docs: [],
      };

      vi.mocked(getDocs).mockResolvedValueOnce(
        mockEmptyFavoritesSnapshot as any,
      );

      const result = await getFavoriteClips("test-user-1", {
        limit: 10,
      });

      expect(getDocs).toHaveBeenCalledTimes(1);
      expect(result.clips).toEqual([]);
      expect(result.hasMore).toBe(false);
    });

    it("カーソル指定時にstartAfterが呼ばれることを確認", async () => {
      // モックのインポート
      const { getDocs, startAfter, query, orderBy, limit, collection, where } =
        await import("firebase/firestore");

      // お気に入り一覧のモックを設定
      const mockFavoritesSnapshot = {
        docs: [
          {
            data: () => ({
              userId: "test-user-1",
              clipId: "fav-clip-3",
              createdAt: mockTimestamp,
            }),
          },
        ],
      };

      // クリップ詳細のモックを設定
      const mockClipsSnapshot = {
        docs: [
          {
            id: "fav-clip-3",
            data: () => ({
              videoId: "test-video-3",
              title: "お気に入りクリップ3",
              phrase: "お気に入りのフレーズ3",
              startTime: 50,
              endTime: 60,
              createdAt: mockTimestamp,
              updatedAt: mockTimestamp,
              userId: "creator-3",
              userName: "作成者3",
              userPhotoURL: "https://example.com/photo3.jpg",
              isPublic: true,
              tags: ["お気に入り"],
              playCount: 5,
              favoriteCount: 1,
            }),
          },
        ],
      };

      // モックの設定
      vi.mocked(getDocs).mockResolvedValueOnce(mockFavoritesSnapshot as any);
      vi.mocked(getDocs).mockResolvedValueOnce(mockClipsSnapshot as any);

      // 最後のドキュメントのモック - リアルなドキュメントのようにする
      const lastDoc = {
        data: () => ({ createdAt: mockTimestamp }),
        // APIコードがこのドキュメントを直接startAfterに渡す
      };

      await getFavoriteClips("test-user-1", {
        limit: 10,
        cursor: lastDoc as any,
      });

      // queryが正しく呼ばれたことを確認（内部でstartAfterが使われる）
      expect(query).toHaveBeenCalled();
      expect(startAfter).toHaveBeenCalledWith(lastDoc);
    });
  });
});
