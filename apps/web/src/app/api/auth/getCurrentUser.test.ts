import type { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getBearerToken, getCurrentUser } from "./getCurrentUser";

// Firebase Admin SDK モック
const mockUserRecord = {
  uid: "test-user-123",
  displayName: "テストユーザー",
  email: "test@example.com",
  photoURL: "https://example.com/photo.jpg",
};

// テスト内で使用するモック関数
const mockVerifyIdToken = vi.fn().mockResolvedValue({ uid: "test-user-123" });
const mockVerifySessionCookie = vi
  .fn()
  .mockResolvedValue({ uid: "test-user-123" });
const mockGetUser = vi.fn().mockResolvedValue(mockUserRecord);

// Firebase Admin SDKのモックを上書き
vi.mock("./firebase-admin", () => ({
  initializeFirebaseAdmin: vi.fn(() => ({
    verifyIdToken: mockVerifyIdToken,
    verifySessionCookie: mockVerifySessionCookie,
    getUser: mockGetUser,
  })),
}));

// Next.js モック
const mockCookies = {
  get: vi.fn(),
  delete: vi.fn(),
};

// headersモック
const mockHeaders = {
  get: vi.fn(),
};

vi.mock("next/headers", () => ({
  cookies: vi.fn(() => mockCookies),
  headers: vi.fn(() => mockHeaders),
}));

describe("認証APIのテスト", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // デフォルトではAuthorizationヘッダーを返さないように設定
    mockHeaders.get.mockImplementation((name) => {
      if (name === "Authorization") return null;
      return null;
    });

    // デフォルトのモック応答を設定
    mockVerifyIdToken.mockResolvedValue({ uid: "test-user-123" });
    mockVerifySessionCookie.mockResolvedValue({ uid: "test-user-123" });
    mockGetUser.mockResolvedValue(mockUserRecord);
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe("getBearerToken関数", () => {
    it("NextRequestオブジェクトからBearerトークンを取得できる", async () => {
      // モックリクエストオブジェクト
      const mockReq = {
        headers: {
          get: vi.fn().mockReturnValue("Bearer test-token"),
        },
      } as unknown as NextRequest;

      const token = await getBearerToken(mockReq);
      expect(token).toBe("test-token");
      expect(mockReq.headers.get).toHaveBeenCalledWith("Authorization");
    });

    it("NextRequestオブジェクトがない場合はheadersからトークンを取得する", async () => {
      // headersから"Bearer mock-token"を返すよう設定
      mockHeaders.get.mockImplementation((name) => {
        if (name === "Authorization") return "Bearer mock-token";
        return null;
      });

      const token = await getBearerToken();
      expect(token).toBe("mock-token");
    });

    it("Bearerトークンがない場合はnullを返す", async () => {
      // モックリクエストオブジェクト（トークンなし）
      const mockReq = {
        headers: {
          get: vi.fn().mockReturnValue(null),
        },
      } as unknown as NextRequest;

      // headersからもnullを返すように設定
      mockHeaders.get.mockImplementation(() => null);

      const token = await getBearerToken(mockReq);
      expect(token).toBeNull();
    });
  });

  describe("getCurrentUser関数", () => {
    it("Bearerトークンからユーザー情報を取得できる", async () => {
      // モックリクエストオブジェクト
      const mockReq = {
        headers: {
          get: vi.fn().mockReturnValue("Bearer test-token"),
        },
      } as unknown as NextRequest;

      // セッションクッキーなし（Bearerトークン認証のみ成功するシナリオ）
      mockCookies.get.mockReturnValue(null);

      // getCurrentUserを呼び出す前にモック関数をリセット
      mockVerifyIdToken.mockClear();
      mockGetUser.mockClear();

      // getCurrentUser関数を実行
      const user = await getCurrentUser(mockReq);

      // 各モック関数が期待通りに呼ばれていることを確認
      expect(mockVerifyIdToken).toHaveBeenCalledWith("test-token");
      expect(mockGetUser).toHaveBeenCalledWith("test-user-123");

      // 返されたユーザー情報が期待通りであることを確認
      expect(user).toEqual(mockUserRecord);
    });

    it("セッションクッキーからユーザー情報を取得できる", async () => {
      // Bearerトークンなし
      const mockReq = {
        headers: {
          get: vi.fn().mockReturnValue(null),
        },
      } as unknown as NextRequest;

      // headersからもnullを返す
      mockHeaders.get.mockImplementation(() => null);

      // セッションクッキーあり
      mockCookies.get.mockReturnValue({ value: "session-cookie-value" });

      // getCurrentUserを呼び出す前にモック関数をリセット
      mockVerifySessionCookie.mockClear();
      mockGetUser.mockClear();

      // getCurrentUser関数を実行
      const user = await getCurrentUser(mockReq);

      // 各モック関数が期待通りに呼ばれていることを確認
      expect(mockVerifySessionCookie).toHaveBeenCalledWith(
        "session-cookie-value",
        true,
      );
      expect(mockGetUser).toHaveBeenCalledWith("test-user-123");

      // 返されたユーザー情報が期待通りであることを確認
      expect(user).toEqual(mockUserRecord);
    });

    it("認証情報がない場合はnullを返す", async () => {
      // Bearerトークンなし
      const mockReq = {
        headers: {
          get: vi.fn().mockReturnValue(null),
        },
      } as unknown as NextRequest;

      // headersからもnullを返す
      mockHeaders.get.mockImplementation(() => null);

      // セッションクッキーなし
      mockCookies.get.mockReturnValue(null);

      const user = await getCurrentUser(mockReq);
      expect(user).toBeNull();
    });

    it("トークン検証に失敗した場合はnullを返す", async () => {
      // Bearerトークンあり
      const mockReq = {
        headers: {
          get: vi.fn().mockReturnValue("Bearer invalid-token"),
        },
      } as unknown as NextRequest;

      // トークン検証失敗
      mockVerifyIdToken.mockRejectedValueOnce(new Error("無効なトークン"));

      // セッションクッキーなし
      mockCookies.get.mockReturnValue(null);

      const user = await getCurrentUser(mockReq);
      expect(user).toBeNull();
    });

    it("セッションクッキーが無効な場合はnullを返しクッキーを削除する", async () => {
      // Bearerトークンなし
      const mockReq = {
        headers: {
          get: vi.fn().mockReturnValue(null),
        },
      } as unknown as NextRequest;

      // headersからもnullを返す
      mockHeaders.get.mockImplementation(() => null);

      // セッションクッキーあり
      mockCookies.get.mockReturnValue({ value: "invalid-session-cookie" });

      // セッション検証失敗
      mockVerifySessionCookie.mockRejectedValueOnce(
        new Error("無効なセッション"),
      );

      const user = await getCurrentUser(mockReq);
      expect(user).toBeNull();
      expect(mockCookies.delete).toHaveBeenCalledWith("firebase-session");
    });
  });
});
