import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { NextRequest, NextResponse } from "next/server";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { GET } from "./route";

// Firebase Adminのモック
vi.mock("firebase-admin/app", () => ({
  getApps: vi.fn().mockReturnValue([]),
  initializeApp: vi.fn().mockReturnValue({}),
  cert: vi.fn().mockReturnValue({}),
}));

// Firestoreのモック
vi.mock("firebase-admin/firestore", () => {
  const mockDoc = {
    get: vi.fn(),
  };
  const mockCollection = {
    doc: vi.fn().mockReturnValue(mockDoc),
  };
  const mockFirestore = {
    collection: vi.fn().mockReturnValue(mockCollection),
  };

  return {
    getFirestore: vi.fn().mockReturnValue(mockFirestore),
  };
});

describe("動画詳細APIのテスト", () => {
  // モックオブジェクト
  const mockFirestore = getFirestore();
  const mockCollection = mockFirestore.collection("videos");
  const mockDoc = mockCollection.doc("test-id");

  beforeEach(() => {
    vi.clearAllMocks();
  });

  /**
   * 動画が存在する場合のテスト
   */
  test("動画が存在する場合、動画情報を返すこと", async () => {
    // 日付オブジェクト
    const publishedDate = new Date("2025-04-01T12:00:00Z");
    const lastFetchedDate = new Date("2025-05-01T12:00:00Z");

    // モックデータを設定
    mockDoc.get.mockResolvedValue({
      exists: true,
      id: "test-video-id",
      data: () => ({
        title: "テスト動画",
        description: "これはテスト用の動画説明です",
        publishedAt: {
          toDate: () => publishedDate,
        },
        thumbnailUrl: "https://example.com/thumbnail.jpg",
        channelId: "test-channel-id",
        channelTitle: "テストチャンネル",
        lastFetchedAt: {
          toDate: () => lastFetchedDate,
        },
      }),
    });

    // リクエストを作成
    const request = new NextRequest(
      "https://example.com/api/videos/test-video-id",
    );
    Object.defineProperty(request, "nextUrl", {
      value: new URL("https://example.com/api/videos/test-video-id"),
      writable: true,
    });

    const context = {
      params: { videoId: "test-video-id" },
    };

    // APIを呼び出し
    const response = await GET(request);
    expect(response).toBeInstanceOf(NextResponse);
    expect(response.status).toBe(200);

    // レスポンスデータを確認
    const responseData = await response.json();
    expect(responseData).toEqual({
      id: "test-video-id",
      title: "テスト動画",
      description: "これはテスト用の動画説明です",
      publishedAt: publishedDate.toISOString(),
      publishedAtISO: publishedDate.toISOString(),
      thumbnailUrl: "https://example.com/thumbnail.jpg",
      channelId: "test-channel-id",
      channelTitle: "テストチャンネル",
      lastFetchedAt: lastFetchedDate.toISOString(),
      lastFetchedAtISO: lastFetchedDate.toISOString(),
    });

    // Firestoreの呼び出しが正しいことを確認
    expect(mockFirestore.collection).toHaveBeenCalledWith("videos");
    expect(mockCollection.doc).toHaveBeenCalledWith("test-video-id");
    expect(mockDoc.get).toHaveBeenCalled();
  });

  /**
   * 動画IDが指定されていない場合のテスト
   */
  test("動画IDが指定されていない場合、400エラーを返すこと", async () => {
    // リクエストを作成（IDなし）
    const request = new NextRequest("https://example.com/api/videos/");
    Object.defineProperty(request, "nextUrl", {
      value: new URL("https://example.com/api/videos/"),
      writable: true,
    });

    // APIを呼び出し
    const response = await GET(request);
    expect(response.status).toBe(400);

    // レスポンスを確認
    const responseData = await response.json();
    expect(responseData).toEqual({ error: "動画IDが指定されていません" });
  });

  /**
   * 動画が見つからない場合のテスト
   */
  test("動画が存在しない場合、404エラーを返すこと", async () => {
    // 存在しない動画のモックを設定
    mockDoc.get.mockResolvedValue({
      exists: false,
    });

    // リクエストを作成
    const request = new NextRequest(
      "https://example.com/api/videos/non-existent-id",
    );
    Object.defineProperty(request, "nextUrl", {
      value: new URL("https://example.com/api/videos/non-existent-id"),
      writable: true,
    });

    // APIを呼び出し
    const response = await GET(request);
    expect(response.status).toBe(404);

    // レスポンスを確認
    const responseData = await response.json();
    expect(responseData).toEqual({ error: "動画が見つかりません" });
  });

  /**
   * エラーが発生した場合のテスト
   */
  test("データ取得でエラーが発生した場合、500エラーを返すこと", async () => {
    // エラーをスローするモックを設定
    mockDoc.get.mockRejectedValue(new Error("テスト用のエラー"));

    // リクエストを作成
    const request = new NextRequest(
      "https://example.com/api/videos/error-video",
    );
    Object.defineProperty(request, "nextUrl", {
      value: new URL("https://example.com/api/videos/error-video"),
      writable: true,
    });

    // APIを呼び出し
    const response = await GET(request);
    expect(response.status).toBe(500);

    // レスポンスを確認
    const responseData = await response.json();
    expect(responseData).toEqual({ error: "動画の取得に失敗しました" });
  });
});
