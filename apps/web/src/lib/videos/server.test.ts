import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  __resetMockFirestoreForTesting,
  __setMockFirestoreForTesting,
  convertToVideo,
  getAdminFirestore,
  getRecentVideosServer,
  getVideoByIdServer,
} from "./server";

// Firebase Admin SDKのモック
vi.mock("firebase-admin/app", () => {
  return {
    cert: vi.fn(),
    getApps: vi.fn(),
    initializeApp: vi.fn(),
  };
});

// Firestoreモジュールのモック
vi.mock("firebase-admin/firestore", () => {
  return {
    getFirestore: vi.fn(),
  };
});

describe("動画サーバーAPI関数のテスト", () => {
  // モックオブジェクト
  const mockGetDoc = vi.fn();
  const mockQuery = {
    limit: vi.fn().mockReturnThis(),
    startAfter: vi.fn().mockReturnThis(),
    orderBy: vi.fn().mockReturnThis(),
    get: vi.fn(),
  };
  const mockCollection = {
    doc: vi.fn().mockReturnValue({ get: mockGetDoc }),
    orderBy: vi.fn().mockReturnValue(mockQuery),
  };
  const mockFirestore = {
    collection: vi.fn().mockReturnValue(mockCollection),
  };

  // 元の環境変数を保存
  const originalEnv = { ...process.env };
  // コンソールエラーを抑制するためのモック
  const originalConsoleError = console.error;

  beforeEach(() => {
    // テスト前にモックをリセット
    vi.resetAllMocks();

    // モックの戻り値を再設定
    mockCollection.doc.mockReturnValue({ get: mockGetDoc });
    mockCollection.orderBy.mockReturnValue(mockQuery);
    mockQuery.limit.mockReturnThis();
    mockQuery.startAfter.mockReturnThis();
    mockFirestore.collection.mockReturnValue(mockCollection);

    // モックFirestoreをセット
    __setMockFirestoreForTesting(mockFirestore);

    // コンソールエラーを抑制
    console.error = vi.fn();

    // 環境変数の設定
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID = "test-project";
  });

  afterEach(() => {
    // テスト後にモックをリセット
    __resetMockFirestoreForTesting();

    // テスト後にコンソールの挙動を元に戻す
    console.error = originalConsoleError;

    // 環境変数を元に戻す
    process.env = originalEnv;
  });

  describe("convertToVideo関数", () => {
    it("Firestoreのデータを正しくVideo型に変換できる", () => {
      // モックデータ
      const id = "video-123";
      const mockDate = new Date("2025-05-01T12:00:00Z");
      const lastFetchedDate = new Date("2025-05-02T12:00:00Z");

      // Firestoreデータのモック
      const firestoreData = {
        title: "テスト動画",
        description: "これはテスト用の動画です",
        publishedAt: { toDate: () => mockDate },
        thumbnailUrl: "https://example.com/thumbnail.jpg",
        channelId: "channel-123",
        channelTitle: "テストチャンネル",
        lastFetchedAt: { toDate: () => lastFetchedDate },
        liveBroadcastContent: "none",
      };

      // 関数を実行
      const result = convertToVideo(id, firestoreData);

      // 結果の検証
      expect(result).toEqual({
        id,
        title: "テスト動画",
        description: "これはテスト用の動画です",
        publishedAt: mockDate,
        publishedAtISO: mockDate.toISOString(),
        thumbnailUrl: "https://example.com/thumbnail.jpg",
        channelId: "channel-123",
        channelTitle: "テストチャンネル",
        lastFetchedAt: lastFetchedDate,
        lastFetchedAtISO: lastFetchedDate.toISOString(),
        liveBroadcastContent: "none",
      });
    });

    it("liveBroadcastContentが未定義の場合も正しく変換できる", () => {
      // モックデータ（liveBroadcastContentなし）
      const id = "video-456";
      const mockDate = new Date("2025-05-01T12:00:00Z");
      const lastFetchedDate = new Date("2025-05-02T12:00:00Z");

      // Firestoreデータのモック（liveBroadcastContentなし）
      const firestoreData = {
        title: "テスト動画",
        description: "これはテスト用の動画です",
        publishedAt: { toDate: () => mockDate },
        thumbnailUrl: "https://example.com/thumbnail.jpg",
        channelId: "channel-123",
        channelTitle: "テストチャンネル",
        lastFetchedAt: { toDate: () => lastFetchedDate },
      };

      // 関数を実行
      const result = convertToVideo(id, firestoreData);

      // 結果の検証
      expect(result.liveBroadcastContent).toBeUndefined();
      expect(result).toHaveProperty("id", id);
      expect(result).toHaveProperty("title", "テスト動画");
    });
  });

  describe("getAdminFirestore関数", () => {
    it("Cloud Run環境で正常にFirestoreインスタンスを初期化できる", () => {
      // テスト前にモックリセット
      __resetMockFirestoreForTesting();

      // Cloud Run環境をシミュレート
      process.env.K_SERVICE = "my-service";
      vi.mocked(getApps).mockReturnValue([]);
      vi.mocked(getFirestore).mockReturnValue(mockFirestore as any);

      // 関数を実行
      const result = getAdminFirestore();

      // 初期化が行われたことを確認
      expect(initializeApp).toHaveBeenCalledWith({
        projectId: "test-project",
      });
      expect(getFirestore).toHaveBeenCalled();
      expect(result).toBe(mockFirestore);
    });

    it("開発環境で正常にFirestoreインスタンスを初期化できる", () => {
      // テスト前にモックリセット
      __resetMockFirestoreForTesting();

      // 開発環境をシミュレート（K_SERVICEがない）
      // biome-ignore lint/performance/noDelete: <explanation>
      delete process.env.K_SERVICE;
      // サービスアカウントの設定
      process.env.FIREBASE_SERVICE_ACCOUNT_KEY = JSON.stringify({
        type: "service_account",
        project_id: "test-project",
      });

      vi.mocked(getApps).mockReturnValue([]);
      vi.mocked(cert).mockReturnValue("mocked-cert" as any);
      vi.mocked(getFirestore).mockReturnValue(mockFirestore as any);

      // 関数を実行
      const result = getAdminFirestore();

      // 初期化が行われたことを確認
      expect(cert).toHaveBeenCalled();
      expect(initializeApp).toHaveBeenCalledWith({
        credential: "mocked-cert",
        projectId: "test-project",
      });
      expect(getFirestore).toHaveBeenCalled();
      expect(result).toBe(mockFirestore);
    });

    it("既にアプリが初期化されている場合は初期化処理をスキップする", () => {
      // テスト前にモックリセット
      __resetMockFirestoreForTesting();

      vi.mocked(getApps).mockReturnValue([{} as any]); // すでに初期化済みと判定される
      vi.mocked(getFirestore).mockReturnValue(mockFirestore as any);

      // 関数を実行
      const result = getAdminFirestore();

      // 初期化が呼ばれないことを確認
      expect(initializeApp).not.toHaveBeenCalled();
      expect(getFirestore).toHaveBeenCalled();
      expect(result).toBe(mockFirestore);
    });
  });

  describe("getVideoByIdServer関数", () => {
    it("正常に動画詳細を取得できる", async () => {
      // 動画データのモック
      const videoId = "video-123";
      const mockDate = new Date("2025-05-01T12:00:00Z");
      const lastFetchedDate = new Date("2025-05-02T12:00:00Z");

      // ドキュメントのモック
      mockGetDoc.mockResolvedValue({
        exists: true,
        id: videoId,
        data: () => ({
          title: "テスト動画",
          description: "これはテスト用の動画です",
          publishedAt: { toDate: () => mockDate },
          thumbnailUrl: "https://example.com/thumbnail.jpg",
          channelId: "channel-123",
          channelTitle: "テストチャンネル",
          lastFetchedAt: { toDate: () => lastFetchedDate },
          liveBroadcastContent: "live", // 配信中ステータスを追加
        }),
      });

      // 関数を実行
      const result = await getVideoByIdServer(videoId);

      // 検証
      expect(mockFirestore.collection).toHaveBeenCalledWith("videos");
      expect(mockCollection.doc).toHaveBeenCalledWith(videoId);
      expect(mockGetDoc).toHaveBeenCalled();

      // 結果の検証
      expect(result).not.toBeNull();
      expect(result?.id).toBe(videoId);
      expect(result?.title).toBe("テスト動画");
      expect(result?.description).toBe("これはテスト用の動画です");
      expect(result?.publishedAt).toEqual(mockDate);
      expect(result?.publishedAtISO).toBe(mockDate.toISOString());
      expect(result?.thumbnailUrl).toBe("https://example.com/thumbnail.jpg");
      expect(result?.channelId).toBe("channel-123");
      expect(result?.channelTitle).toBe("テストチャンネル");
      expect(result?.lastFetchedAt).toEqual(lastFetchedDate);
      expect(result?.lastFetchedAtISO).toBe(lastFetchedDate.toISOString());
      expect(result?.liveBroadcastContent).toBe("live"); // 配信ステータスが正しく取得されることを確認
    });

    it("動画が存在しない場合はnullを返す", async () => {
      // 存在しない動画のモック
      mockGetDoc.mockResolvedValue({
        exists: false,
      });

      // 関数を実行
      const result = await getVideoByIdServer("non-existent");

      // 検証
      expect(mockFirestore.collection).toHaveBeenCalledWith("videos");
      expect(mockCollection.doc).toHaveBeenCalledWith("non-existent");
      expect(mockGetDoc).toHaveBeenCalled();
      expect(result).toBeNull();
    });
  });

  describe("getRecentVideosServer関数", () => {
    it("正常に動画リストを取得できる", async () => {
      // 動画データのモック
      const mockDate1 = new Date("2025-05-01T10:00:00Z");
      const mockDate2 = new Date("2025-04-28T10:00:00Z");
      const lastFetchedDate = new Date("2025-05-02T12:00:00Z");

      // クエリ結果のモック
      mockQuery.get.mockResolvedValue({
        docs: [
          {
            id: "video-1",
            data: () => ({
              title: "最新動画1",
              description: "最新の動画1です",
              publishedAt: { toDate: () => mockDate1 },
              thumbnailUrl: "https://example.com/thumb1.jpg",
              channelId: "channel-1",
              channelTitle: "チャンネル1",
              lastFetchedAt: { toDate: () => lastFetchedDate },
              liveBroadcastContent: "none", // 通常動画
            }),
          },
          {
            id: "video-2",
            data: () => ({
              title: "最新動画2",
              description: "最新の動画2です",
              publishedAt: { toDate: () => mockDate2 },
              thumbnailUrl: "https://example.com/thumb2.jpg",
              channelId: "channel-1",
              channelTitle: "チャンネル1",
              lastFetchedAt: { toDate: () => lastFetchedDate },
              liveBroadcastContent: "upcoming", // 予定配信
            }),
          },
        ],
      });

      // 関数を実行
      const result = await getRecentVideosServer(2);

      // 検証
      expect(mockFirestore.collection).toHaveBeenCalledWith("videos");
      expect(mockCollection.orderBy).toHaveBeenCalledWith(
        "publishedAt",
        "desc",
      );
      expect(mockQuery.limit).toHaveBeenCalledWith(3); // limit + 1
      expect(mockQuery.get).toHaveBeenCalled();

      // 結果の検証
      expect(result.videos).toHaveLength(2);
      expect(result.videos[0].id).toBe("video-1");
      expect(result.videos[0].title).toBe("最新動画1");
      expect(result.videos[0].liveBroadcastContent).toBe("none"); // 通常動画であることを確認
      expect(result.videos[1].id).toBe("video-2");
      expect(result.videos[1].title).toBe("最新動画2");
      expect(result.videos[1].liveBroadcastContent).toBe("upcoming"); // 予定配信であることを確認
      expect(result.hasMore).toBe(false);
    });

    it("ページネーションパラメータを指定して動画リストを取得できる", async () => {
      // startAfterの日付
      const startAfterDate = new Date("2025-04-28T00:00:00Z");
      const mockDate = new Date("2025-04-25T10:00:00Z");
      const lastFetchedDate = new Date("2025-05-02T12:00:00Z");

      // 動画データのモック
      mockQuery.get.mockResolvedValue({
        docs: [
          {
            id: "video-3",
            data: () => ({
              title: "古い動画",
              description: "古い動画です",
              publishedAt: { toDate: () => mockDate },
              thumbnailUrl: "https://example.com/thumb3.jpg",
              channelId: "channel-1",
              channelTitle: "チャンネル1",
              lastFetchedAt: { toDate: () => lastFetchedDate },
            }),
          },
        ],
      });

      // 関数を実行
      const result = await getRecentVideosServer(10, startAfterDate);

      // 検証
      expect(mockCollection.orderBy).toHaveBeenCalledWith(
        "publishedAt",
        "desc",
      );
      expect(mockQuery.startAfter).toHaveBeenCalledWith(startAfterDate);
      expect(mockQuery.limit).toHaveBeenCalledWith(11); // limit + 1
      expect(mockQuery.get).toHaveBeenCalled();

      // 結果の検証
      expect(result.videos).toHaveLength(1);
      expect(result.videos[0].id).toBe("video-3");
      expect(result.videos[0].title).toBe("古い動画");
      expect(result.hasMore).toBe(false);
    });

    it("次ページがある場合はhasMoreがtrueになる", async () => {
      // 6件のデータを持つモックを作成
      const lastFetchedDate = new Date("2025-05-10T12:00:00Z");
      const mockDocs = Array.from({ length: 6 }, (_, i) => ({
        id: `video-${i}`,
        data: () => ({
          title: `動画${i}`,
          description: `動画${i}の説明`,
          publishedAt: {
            toDate: () => new Date(`2025-05-0${i + 1}T10:00:00Z`),
          },
          thumbnailUrl: `https://example.com/thumb${i}.jpg`,
          channelId: "channel-1",
          channelTitle: "チャンネル1",
          lastFetchedAt: { toDate: () => lastFetchedDate },
        }),
      }));

      // 6件のデータを返すモックを設定
      mockQuery.get.mockResolvedValue({ docs: mockDocs });

      // 関数を実行
      const result = await getRecentVideosServer(5); // limit=5

      // 検証
      expect(result.videos).toHaveLength(5); // 6件取得したが5件だけ返される
      expect(result.hasMore).toBe(true); // 次ページがあるのでtrue
    });
  });
});
