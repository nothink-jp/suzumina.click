import { type NextRequest, NextResponse } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { GET } from "./route";

// Firestore関連のモック
vi.mock("firebase-admin/app", () => {
  return {
    cert: vi.fn(() => ({})),
    getApps: vi.fn(() => ["default-app-mock"]), // アプリが既に存在することを示す
    getApp: vi.fn(() => ({ name: "default-app-mock" })), // アプリのモックを返す
    initializeApp: vi.fn(() => ({ name: "default-app-mock" })), // 初期化時にモックアプリを返す
  };
});

// Firestoreのモックを作成
vi.mock("firebase-admin/firestore", () => {
  // モックデータ
  const mockVideoData = [
    {
      id: "video1",
      data: () => ({
        title: "テスト動画1",
        description: "説明文1",
        publishedAt: {
          toDate: () => new Date("2025-05-01T10:00:00Z"),
        },
        thumbnailUrl: "https://example.com/thumb1.jpg",
        channelId: "channel1",
        channelTitle: "テストチャンネル1",
        lastFetchedAt: {
          toDate: () => new Date("2025-05-02T12:00:00Z"),
        },
        liveBroadcastContent: "none",
      }),
    },
    {
      id: "video2",
      data: () => ({
        title: "テスト動画2",
        description: "説明文2",
        publishedAt: {
          toDate: () => new Date("2025-04-28T15:00:00Z"),
        },
        thumbnailUrl: "https://example.com/thumb2.jpg",
        channelId: "channel1",
        channelTitle: "テストチャンネル1",
        lastFetchedAt: {
          toDate: () => new Date("2025-05-02T12:00:00Z"),
        },
        liveBroadcastContent: "none",
      }),
    },
    {
      id: "video3",
      data: () => ({
        title: "テスト配信予定",
        description: "説明文3",
        publishedAt: {
          toDate: () => new Date("2025-05-10T15:00:00Z"),
        },
        thumbnailUrl: "https://example.com/thumb3.jpg",
        channelId: "channel1",
        channelTitle: "テストチャンネル1",
        lastFetchedAt: {
          toDate: () => new Date("2025-05-02T12:00:00Z"),
        },
        liveBroadcastContent: "upcoming",
      }),
    },
  ];

  // クエリ関数のモック
  const mockWhere = vi.fn().mockReturnThis();
  const mockOrderBy = vi.fn().mockReturnThis();
  const mockStartAfter = vi.fn().mockReturnThis();
  const mockLimit = vi.fn().mockReturnThis();

  // モックデータをフィルタリングする関数
  const mockGet = vi.fn(() => {
    return Promise.resolve({
      docs: mockVideoData,
    });
  });

  const mockCollection = vi.fn(() => ({
    where: mockWhere,
    orderBy: mockOrderBy,
    startAfter: mockStartAfter,
    limit: mockLimit,
    get: mockGet,
  }));

  return {
    getFirestore: vi.fn(() => ({
      collection: mockCollection,
    })),
  };
});

// Next.jsのレスポンスモック
vi.mock("next/server", async () => {
  const actual = await vi.importActual("next/server");
  return {
    ...actual,
    NextResponse: {
      ...actual.NextResponse,
      json: vi.fn((data, options) => ({ data, options })),
    },
  };
});

describe("動画APIルートのテスト", () => {
  let originalEnv: NodeJS.ProcessEnv;
  let consoleErrorMock: any;

  beforeEach(() => {
    // 環境変数のバックアップ
    originalEnv = { ...process.env };
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID = "test-project";

    // コンソールエラーをモック化
    consoleErrorMock = vi.spyOn(console, "error").mockImplementation(() => {});

    // 各テストの前にモックをリセット
    vi.clearAllMocks();
  });

  afterEach(() => {
    // 環境変数を元に戻す
    process.env = originalEnv;

    // モックをリセット
    consoleErrorMock.mockRestore();
  });

  it("デフォルトの設定で動画リストを取得できる", async () => {
    // モックリクエストの作成
    const request = {
      nextUrl: {
        searchParams: new URLSearchParams(""),
      },
    } as unknown as NextRequest;

    // APIハンドラの呼び出し
    const response = await GET(request);

    // レスポンスの検証
    expect(NextResponse.json).toHaveBeenCalledWith(
      expect.objectContaining({
        videos: expect.arrayContaining([
          expect.objectContaining({
            id: "video1",
            title: "テスト動画1",
          }),
        ]),
        hasMore: false,
      }),
    );
  });

  it("limitパラメータを指定して動画リストを取得できる", async () => {
    // モックリクエストの作成（limit=5）
    const request = {
      nextUrl: {
        searchParams: new URLSearchParams("limit=5"),
      },
    } as unknown as NextRequest;

    // APIハンドラの呼び出し
    await GET(request);

    // Firestoreクエリが正しいlimitで構築されたことを確認
    const firestoreMock = await import("firebase-admin/firestore");
    const db = firestoreMock.getFirestore();
    // limitが6 (5 + 1)で呼ばれていること
    expect(db.collection("videos").limit).toHaveBeenCalledWith(6);
  });

  it("アーカイブ動画のフィルタリングを適用できる", async () => {
    // モックリクエストの作成（videoType=archived）
    const request = {
      nextUrl: {
        searchParams: new URLSearchParams("videoType=archived"),
      },
    } as unknown as NextRequest;

    // APIハンドラの呼び出し
    await GET(request);

    // Firestoreクエリが正しいフィルタで構築されたことを確認
    const firestoreMock = await import("firebase-admin/firestore");
    const db = firestoreMock.getFirestore();
    expect(db.collection("videos").where).toHaveBeenCalledWith(
      "liveBroadcastContent",
      "in",
      ["none"],
    );
    expect(db.collection("videos").orderBy).toHaveBeenCalledWith(
      "publishedAt",
      "desc",
    );
  });

  it("配信予定動画のフィルタリングを適用できる", async () => {
    // モックリクエスト（videoType=upcoming）
    const request = {
      nextUrl: {
        searchParams: new URLSearchParams("videoType=upcoming"),
      },
    } as unknown as NextRequest;

    // APIハンドラの呼び出し
    await GET(request);

    // Firestoreクエリが正しいフィルタで構築されたことを確認
    const firestoreMock = await import("firebase-admin/firestore");
    const db = firestoreMock.getFirestore();
    expect(db.collection("videos").where).toHaveBeenCalledWith(
      "liveBroadcastContent",
      "in",
      ["upcoming", "live"],
    );
    expect(db.collection("videos").orderBy).toHaveBeenCalledWith(
      "publishedAt",
      "asc",
    );
  });

  it("startAfterパラメータを指定してページネーションが機能する", async () => {
    // モックリクエスト（startAfter=2025-04-30T00:00:00Z）
    const request = {
      nextUrl: {
        searchParams: new URLSearchParams("startAfter=2025-04-30T00:00:00Z"),
      },
    } as unknown as NextRequest;

    // APIハンドラの呼び出し
    await GET(request);

    // Firestoreクエリが正しいstartAfterで構築されたことを確認
    const firestoreMock = await import("firebase-admin/firestore");
    const db = firestoreMock.getFirestore();
    expect(db.collection("videos").startAfter).toHaveBeenCalled();
  });

  it("無効なstartAfterパラメータの場合はエラーが記録され、デフォルトクエリになる", async () => {
    // モックリクエスト（無効なstartAfter）
    const request = {
      nextUrl: {
        searchParams: new URLSearchParams("startAfter=invalid-date"),
      },
    } as unknown as NextRequest;

    // APIハンドラの呼び出し
    await GET(request);

    // エラーが記録されたことを確認
    expect(consoleErrorMock).toHaveBeenCalled();

    // デフォルトのクエリが使用されたことを確認
    const firestoreMock = await import("firebase-admin/firestore");
    const db = firestoreMock.getFirestore();
    expect(db.collection("videos").orderBy).toHaveBeenCalledWith(
      "publishedAt",
      "desc",
    );
  });

  it("エラーが発生した場合は500エラーを返す", async () => {
    // モックリクエストの作成
    const request = {
      nextUrl: {
        searchParams: new URLSearchParams(""),
      },
    } as unknown as NextRequest;

    // Firebase初期化でエラーが発生するようにモックを設定
    const firebaseAppModule = await import("firebase-admin/app");
    const getAppsSpy = vi.spyOn(firebaseAppModule, "getApps");
    const initializeAppSpy = vi.spyOn(firebaseAppModule, "initializeApp");

    // getAppsが空の配列を返すようにモック
    getAppsSpy.mockImplementationOnce(() => []);

    // initializeAppがエラーをスローするようにモック
    initializeAppSpy.mockImplementationOnce(() => {
      throw new Error("Firebase初期化エラー");
    });

    // APIハンドラの呼び出し
    const response = await GET(request);

    // エラーレスポンスが返されたことを確認
    expect(NextResponse.json).toHaveBeenCalledWith(
      { error: "動画リストの取得に失敗しました" },
      { status: 500 },
    );

    // エラーが記録されたことを確認
    expect(consoleErrorMock).toHaveBeenCalled();

    // モックを元に戻す
    getAppsSpy.mockRestore();
    initializeAppSpy.mockRestore();
  });
});
