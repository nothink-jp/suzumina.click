import { getAdminFirestore } from "@/lib/videos/server";
// テスト環境のセットアップ
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getVideoById, getVideos } from "./videos";

// getAdminFirestore関数をモック
vi.mock("@/lib/videos/server", () => ({
  getAdminFirestore: vi.fn(),
}));

describe("動画関連のServer Actionsテスト", () => {
  // モックオブジェクトの作成
  const mockWhere = vi.fn().mockReturnThis();
  const mockGet = vi.fn();
  const mockOrderBy = vi.fn().mockReturnThis();
  const mockLimit = vi.fn().mockReturnThis();
  const mockStartAfter = vi.fn().mockReturnThis();

  // コレクションモックの改良版（Symbol.iteratorを実装）
  const mockCollection = {
    doc: vi.fn().mockReturnValue({ get: mockGet }),
    where: mockWhere,
    orderBy: mockOrderBy,
    limit: mockLimit,
    startAfter: mockStartAfter,
    get: mockGet,
  };

  const mockFirestore = {
    collection: vi.fn().mockReturnValue(mockCollection),
  };

  // コンソールエラーを抑制するためのモック
  const originalConsoleError = console.error;
  const originalConsoleWarn = console.warn;

  beforeEach(() => {
    // テスト前にモックをリセット
    vi.resetAllMocks();

    // モックの戻り値を再設定
    mockCollection.doc.mockReturnValue({ get: mockGet });
    mockCollection.where.mockReturnThis();
    mockCollection.orderBy.mockReturnThis();
    mockCollection.limit.mockReturnThis();
    mockCollection.startAfter.mockReturnThis();
    mockFirestore.collection.mockReturnValue(mockCollection);

    // モックFirestoreをセット
    vi.mocked(getAdminFirestore).mockReturnValue(mockFirestore as any);

    // コンソールエラーとワーニングを抑制
    console.error = vi.fn();
    console.warn = vi.fn();
  });

  afterEach(() => {
    // テスト後にコンソールの挙動を元に戻す
    console.error = originalConsoleError;
    console.warn = originalConsoleWarn;
  });

  /**
   * テスト用のモックドキュメントを作成するヘルパー関数
   */
  function createMockVideoDoc(id: string, data: any = {}) {
    return {
      id,
      data: () => ({
        title: data.title || `動画${id}`,
        description: data.description || `動画${id}の説明`,
        publishedAt: {
          toDate: () => data.publishedAt || new Date("2025-05-01T12:00:00Z"),
        },
        thumbnailUrl: data.thumbnailUrl || `https://example.com/thumb${id}.jpg`,
        channelId: data.channelId || "channel-1",
        channelTitle: data.channelTitle || "チャンネル1",
        lastFetchedAt: {
          toDate: () => data.lastFetchedAt || new Date("2025-05-02T12:00:00Z"),
        },
        liveBroadcastContent: data.liveBroadcastContent || "none",
      }),
    };
  }

  /**
   * テスト用のFirestoreスナップショットを作成するヘルパー関数
   * イテレーション処理をサポートするよう改良
   */
  function createMockSnapshot(docs: any[]) {
    return {
      size: docs.length,
      docs,
      forEach: (callback: (doc: any) => void) => docs.forEach(callback),
      empty: docs.length === 0,
      // forEachをサポートするためのイテレータを追加
      [Symbol.iterator]: function* () {
        for (const doc of docs) {
          yield doc;
        }
      },
    };
  }

  describe("getVideos関数", () => {
    it("正常に動画リストを取得できる", async () => {
      // モックの動画データ
      const mockDocs = [
        createMockVideoDoc("video-1", {
          title: "最新動画1",
          description: "最新の動画1です",
          publishedAt: new Date("2025-05-01T12:00:00Z"),
        }),
        createMockVideoDoc("video-2", {
          title: "最新動画2",
          description: "最新の動画2です",
          publishedAt: new Date("2025-04-28T12:00:00Z"),
        }),
      ];

      // クエリ結果のモックを設定
      mockGet.mockResolvedValue(createMockSnapshot(mockDocs));

      // 関数を実行
      const result = await getVideos({ limit: 10 });

      // クエリが正しく構築されていることを確認
      expect(mockFirestore.collection).toHaveBeenCalledWith("videos");
      expect(mockOrderBy).toHaveBeenCalledWith("publishedAt", "desc");
      expect(mockLimit).toHaveBeenCalledWith(11); // limit + 1
      expect(mockGet).toHaveBeenCalled();

      // 結果の検証
      expect(result.videos).toHaveLength(2);
      expect(result.videos[0].id).toBe("video-1");
      expect(result.videos[0].title).toBe("最新動画1");
      expect(result.videos[0].publishedAtISO).toBeDefined();
      expect(result.videos[1].id).toBe("video-2");
      expect(result.hasMore).toBe(false);
    });

    it("動画タイプ（archived）でフィルタリングできる", async () => {
      // アーカイブ済み動画のモックデータ
      const mockDocs = [
        createMockVideoDoc("archived-video", {
          title: "アーカイブ動画",
          description: "アーカイブ済みの動画です",
          publishedAt: new Date("2025-04-01T12:00:00Z"),
          liveBroadcastContent: "none",
        }),
      ];

      // モックレスポンスの設定
      mockGet.mockResolvedValue(createMockSnapshot(mockDocs));

      // archivedタイプを指定して関数を実行
      const result = await getVideos({
        limit: 10,
        videoType: "archived",
      });

      // フィルタリングクエリが正しく構築されていることを確認
      expect(mockWhere).toHaveBeenCalledWith("liveBroadcastContent", "in", [
        "none",
      ]);
      expect(mockOrderBy).toHaveBeenCalledWith("publishedAt", "desc");

      // 結果の検証
      expect(result.videos).toHaveLength(1);
      expect(result.videos[0].id).toBe("archived-video");
      expect(result.videos[0].title).toBe("アーカイブ動画");
    });

    it("動画タイプ（upcoming）でフィルタリングできる", async () => {
      // 配信予定動画のモックデータ
      const mockDocs = [
        createMockVideoDoc("upcoming-video", {
          title: "予定配信",
          description: "これから配信予定の動画です",
          publishedAt: new Date("2025-05-10T12:00:00Z"),
          liveBroadcastContent: "upcoming",
        }),
      ];

      // モックレスポンスの設定
      mockGet.mockResolvedValue(createMockSnapshot(mockDocs));

      // upcomingタイプを指定して関数を実行
      const result = await getVideos({
        limit: 10,
        videoType: "upcoming",
      });

      // フィルタリングクエリが正しく構築されていることを確認
      expect(mockWhere).toHaveBeenCalledWith("liveBroadcastContent", "in", [
        "upcoming",
        "live",
      ]);
      // 予定配信は昇順（日付が近い順）であることを確認
      expect(mockOrderBy).toHaveBeenCalledWith("publishedAt", "asc");

      // 結果の検証
      expect(result.videos).toHaveLength(1);
      expect(result.videos[0].id).toBe("upcoming-video");
      expect(result.videos[0].title).toBe("予定配信");
    });

    it("startAfterパラメータを使ってページネーションができる", async () => {
      // 古い動画のモックデータ
      const mockDocs = [
        createMockVideoDoc("old-video", {
          title: "古い動画",
          description: "過去の動画です",
          publishedAt: new Date("2025-03-01T12:00:00Z"),
        }),
      ];

      // モックレスポンスの設定
      mockGet.mockResolvedValue(createMockSnapshot(mockDocs));

      // startAfterを指定して関数を実行
      const result = await getVideos({
        limit: 10,
        startAfter: "2025-04-01T00:00:00Z",
      });

      // ページネーションクエリが正しく構築されていることを確認
      expect(mockStartAfter).toHaveBeenCalled();
      expect(mockGet).toHaveBeenCalled();

      // 結果の検証
      expect(result.videos).toHaveLength(1);
      expect(result.videos[0].id).toBe("old-video");
    });

    it("無効なstartAfterパラメータでもエラーにならずに処理できる", async () => {
      // 通常の動画データ
      const mockDocs = [createMockVideoDoc("video-1")];

      // モックレスポンスの設定
      mockGet.mockResolvedValue(createMockSnapshot(mockDocs));

      // 無効な日付文字列でも処理できることを確認
      const result = await getVideos({
        limit: 10,
        startAfter: "無効な日付",
      });

      // 無効な日付についてwarningが出ることを確認
      expect(console.warn).toHaveBeenCalled();
      expect(mockGet).toHaveBeenCalled();

      // 結果の検証
      expect(result.videos).toHaveLength(1);
      expect(result.hasMore).toBe(false);
    });

    it("エラーが発生した場合は空の結果を返す", async () => {
      // エラーをスローするモック
      mockGet.mockRejectedValue(new Error("テスト用のエラー"));

      // 関数を実行
      const result = await getVideos({ limit: 10 });

      // エラーハンドリングが行われたことを確認
      expect(console.error).toHaveBeenCalled();

      // エラー時には空の結果が返ることを確認
      expect(result.videos).toEqual([]);
      expect(result.hasMore).toBe(false);
    });

    it("取得結果が制限を超える場合はhasMoreがtrueになる", async () => {
      // 制限+1件のモックドキュメントを作成（11件）
      const mockDocs = Array.from({ length: 11 }, (_, i) =>
        createMockVideoDoc(`video-${i}`, {
          title: `動画${i}`,
          publishedAt: new Date(
            `2025-05-${(i + 1).toString().padStart(2, "0")}T12:00:00Z`,
          ),
        }),
      );

      // スナップショットにデータを設定（11件のドキュメント）
      const mockSnapshot = createMockSnapshot(mockDocs);
      mockGet.mockResolvedValue(mockSnapshot);

      // 10件の制限で関数を実行
      const result = await getVideos({ limit: 10 });

      // クエリが正しく構築されていることを確認
      expect(mockFirestore.collection).toHaveBeenCalledWith("videos");
      expect(mockOrderBy).toHaveBeenCalledWith("publishedAt", "desc");
      expect(mockLimit).toHaveBeenCalledWith(11); // limit + 1
      expect(mockGet).toHaveBeenCalled();

      // 結果の検証
      // 最大10件のみ返されることを確認
      expect(result.videos).toHaveLength(10);
      // 11件中10件しか返されないので次ページがあると判断される
      expect(result.hasMore).toBe(true);
      // 最初の動画が正しく取得できていることを確認
      expect(result.videos[0].id).toBe("video-0");
    });
  });

  describe("getVideoById関数", () => {
    it("正常に動画詳細を取得できる", async () => {
      // 動画データのモック
      const videoId = "test-video-id";
      const publishedAt = new Date("2025-05-01T12:00:00Z");
      const lastFetchedAt = new Date("2025-05-02T12:00:00Z");

      // ドキュメント取得のモック
      mockGet.mockResolvedValue({
        exists: true,
        id: videoId,
        data: () => ({
          title: "テスト動画",
          description: "これはテスト用の動画です",
          publishedAt: { toDate: () => publishedAt },
          thumbnailUrl: "https://example.com/thumbnail.jpg",
          channelId: "channel-123",
          channelTitle: "テストチャンネル",
          lastFetchedAt: { toDate: () => lastFetchedAt },
          liveBroadcastContent: "none",
        }),
      });

      // 関数を実行
      const result = await getVideoById(videoId);

      // 正しくクエリが構築されていることを確認
      expect(mockFirestore.collection).toHaveBeenCalledWith("videos");
      expect(mockCollection.doc).toHaveBeenCalledWith(videoId);
      expect(mockGet).toHaveBeenCalled();

      // 結果の検証
      expect(result).not.toBeNull();
      expect(result?.id).toBe(videoId);
      expect(result?.title).toBe("テスト動画");
      expect(result?.description).toBe("これはテスト用の動画です");
      expect(result?.publishedAtISO).toBe(publishedAt.toISOString());
      expect(result?.thumbnailUrl).toBe("https://example.com/thumbnail.jpg");
      expect(result?.channelId).toBe("channel-123");
      expect(result?.channelTitle).toBe("テストチャンネル");
      expect(result?.lastFetchedAtISO).toBe(lastFetchedAt.toISOString());
      expect(result?.liveBroadcastContent).toBe("none");
    });

    it("動画が存在しない場合はnullを返す", async () => {
      // 存在しない動画のモック
      mockGet.mockResolvedValue({
        exists: false,
      });

      // 関数を実行
      const result = await getVideoById("non-existent");

      // 正しくクエリが構築されていることを確認
      expect(mockFirestore.collection).toHaveBeenCalledWith("videos");
      expect(mockCollection.doc).toHaveBeenCalledWith("non-existent");
      expect(mockGet).toHaveBeenCalled();

      // 存在しない場合はnullが返ることを確認
      expect(result).toBeNull();
    });

    it("データがnullの場合はnullを返す", async () => {
      // データがnullのモック
      mockGet.mockResolvedValue({
        exists: true,
        id: "test-video-id",
        data: () => null,
      });

      // 関数を実行
      const result = await getVideoById("test-video-id");

      // データがnullの場合もnullが返ることを確認
      expect(result).toBeNull();
    });

    it("エラーが発生した場合はnullを返す", async () => {
      // エラーをスローするモック
      mockGet.mockRejectedValue(new Error("テスト用のエラー"));

      // 関数を実行
      const result = await getVideoById("error-video");

      // エラーハンドリングが行われたことを確認
      expect(console.error).toHaveBeenCalled();

      // エラー時にはnullが返ることを確認
      expect(result).toBeNull();
    });
  });
});
