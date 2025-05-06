import * as headerModule from "next/headers";
import type { NextRequest } from "next/server";
/**
 * getCurrentUser関数とgetBearerToken関数のテスト
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { initializeFirebaseAdmin } from "./firebase-admin";
import { getBearerToken, getCurrentUser } from "./getCurrentUser";

// 環境変数のモック
const originalEnv = process.env;

// Firebase Admin SDKのモック
vi.mock("./firebase-admin", () => ({
  initializeFirebaseAdmin: vi.fn(),
}));

// next/headersモジュールのモック
vi.mock("next/headers", () => ({
  headers: vi.fn(),
  cookies: vi.fn(),
}));

describe("getBearerToken関数のテスト", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    process.env = { ...originalEnv };

    // next/headersモジュールのヘッダーモックの初期化
    vi.mocked(headerModule.headers).mockReturnValue({
      get: vi.fn().mockReturnValue(null),
    } as any);
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("NextRequestオブジェクトのAuthorizationヘッダーからBearerトークンを取得できること", async () => {
    // NextRequestオブジェクトのモックを作成
    const mockReq = {
      headers: {
        get: vi.fn().mockReturnValue("Bearer test-token-123"),
      },
    } as unknown as NextRequest;

    const token = await getBearerToken(mockReq);

    // トークンが正しく取得できたことを確認
    expect(token).toBe("test-token-123");
    expect(mockReq.headers.get).toHaveBeenCalledWith("Authorization");
  });

  it("NextRequestオブジェクトにAuthorizationヘッダーがない場合はnullを返すこと", async () => {
    // Authorizationヘッダーがないリクエストオブジェクト
    const mockReq = {
      headers: {
        get: vi.fn().mockReturnValue(null),
      },
    } as unknown as NextRequest;

    const token = await getBearerToken(mockReq);

    // トークンが取得できないことを確認
    expect(token).toBeNull();
    expect(mockReq.headers.get).toHaveBeenCalledWith("Authorization");
  });

  it("Next.jsのheadersオブジェクトからBearerトークンを取得できること", async () => {
    // リクエストオブジェクトを指定せずに呼び出し
    vi.mocked(headerModule.headers).mockReturnValue({
      get: vi.fn().mockReturnValue("Bearer test-token-from-headers"),
    } as any);

    const token = await getBearerToken();

    // トークンが正しく取得できたことを確認
    expect(token).toBe("test-token-from-headers");
  });

  it("Next.jsのheadersオブジェクトから取得しようとしてエラーが発生した場合もnullを返すこと", async () => {
    // headersからの取得でエラー発生をシミュレート
    vi.mocked(headerModule.headers).mockImplementation(() => {
      throw new Error("ヘッダー取得エラー");
    });

    const token = await getBearerToken();

    // エラーが発生してもnullが返されることを確認
    expect(token).toBeNull();
  });

  it("BearerトークンではなくAuthorizationヘッダーがある場合はnullを返すこと", async () => {
    // Bearerプレフィックスのないヘッダー値
    const mockReq = {
      headers: {
        get: vi.fn().mockReturnValue("Basic dXNlcjpwYXNz"),
      },
    } as unknown as NextRequest;

    const token = await getBearerToken(mockReq);

    // トークンが取得できないことを確認
    expect(token).toBeNull();
  });
});

describe("getCurrentUser関数のテスト", () => {
  // Firebaseの認証モック
  const mockAuth = {
    verifyIdToken: vi.fn(),
    verifySessionCookie: vi.fn(),
    getUser: vi.fn(),
  };

  // ユーザー情報のモック
  const mockUserRecord = {
    uid: "test-user-id",
    email: "test@example.com",
    displayName: "Test User",
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    process.env = { ...originalEnv };

    // Firebase Adminモックの初期化
    vi.mocked(initializeFirebaseAdmin).mockReturnValue(mockAuth as any);

    // next/headersモジュールのモックの初期化
    vi.mocked(headerModule.headers).mockReturnValue({
      get: vi.fn().mockReturnValue(null),
    } as any);

    vi.mocked(headerModule.cookies).mockReturnValue({
      get: vi.fn().mockReturnValue(null),
      delete: vi.fn(),
    } as any);
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("IDトークン認証が成功した場合にユーザー情報を返すこと", async () => {
    // NextRequestオブジェクトのモック
    const mockReq = {
      headers: {
        get: vi.fn().mockReturnValue("Bearer valid-id-token"),
      },
    } as unknown as NextRequest;

    // IDトークン検証モックの設定
    mockAuth.verifyIdToken.mockResolvedValue({ uid: "test-user-id" });
    mockAuth.getUser.mockResolvedValue(mockUserRecord);

    const user = await getCurrentUser(mockReq);

    // 正しいユーザー情報が返されることを確認
    expect(user).toEqual(mockUserRecord);
    expect(mockAuth.verifyIdToken).toHaveBeenCalledWith("valid-id-token");
    expect(mockAuth.getUser).toHaveBeenCalledWith("test-user-id");
  });

  it("IDトークンが無効な場合、セッションクッキーでの認証を試みること", async () => {
    // NextRequestオブジェクトのモック（無効なトークン）
    const mockReq = {
      headers: {
        get: vi.fn().mockReturnValue("Bearer invalid-id-token"),
      },
    } as unknown as NextRequest;

    // IDトークン検証でエラーが発生するように設定
    mockAuth.verifyIdToken.mockRejectedValue(new Error("無効なトークン"));

    // セッションクッキーが存在するケース
    vi.mocked(headerModule.cookies).mockReturnValue({
      get: vi.fn().mockReturnValue({
        value: "valid-session-cookie",
      }),
      delete: vi.fn(),
    } as any);

    // セッションクッキー検証モックの設定
    mockAuth.verifySessionCookie.mockResolvedValue({ uid: "test-user-id" });
    mockAuth.getUser.mockResolvedValue(mockUserRecord);

    const user = await getCurrentUser(mockReq);

    // IDトークン検証が失敗してもセッションクッキーからユーザー情報が取得されることを確認
    expect(user).toEqual(mockUserRecord);
    expect(mockAuth.verifyIdToken).toHaveBeenCalledWith("invalid-id-token");
    expect(mockAuth.verifySessionCookie).toHaveBeenCalledWith(
      "valid-session-cookie",
      true,
    );
    expect(mockAuth.getUser).toHaveBeenCalledWith("test-user-id");
  });

  it("セッションクッキーでの認証が成功した場合にユーザー情報を返すこと", async () => {
    // IDトークンなし
    const mockReq = undefined;

    // セッションクッキーが存在するケース
    vi.mocked(headerModule.cookies).mockReturnValue({
      get: vi.fn().mockReturnValue({
        value: "valid-session-cookie",
      }),
      delete: vi.fn(),
    } as any);

    // セッションクッキー検証モックの設定
    mockAuth.verifySessionCookie.mockResolvedValue({ uid: "test-user-id" });
    mockAuth.getUser.mockResolvedValue(mockUserRecord);

    const user = await getCurrentUser(mockReq);

    // セッションクッキーからユーザー情報が取得されることを確認
    expect(user).toEqual(mockUserRecord);
    expect(mockAuth.verifySessionCookie).toHaveBeenCalledWith(
      "valid-session-cookie",
      true,
    );
    expect(mockAuth.getUser).toHaveBeenCalledWith("test-user-id");
  });

  it("セッションクッキーがない場合はnullを返すこと", async () => {
    // IDトークンもセッションクッキーもないケース
    const user = await getCurrentUser();

    // nullが返されることを確認
    expect(user).toBeNull();
    expect(mockAuth.verifyIdToken).not.toHaveBeenCalled();
    expect(mockAuth.verifySessionCookie).not.toHaveBeenCalled();
  });

  it("セッションクッキーが無効な場合はクッキーを削除してnullを返すこと", async () => {
    // セッションクッキーが存在するが無効なケース
    vi.mocked(headerModule.cookies).mockReturnValue({
      get: vi.fn().mockReturnValue({
        value: "invalid-session-cookie",
      }),
      delete: vi.fn(),
    } as any);

    // セッションクッキー検証でエラーが発生するように設定
    mockAuth.verifySessionCookie.mockRejectedValue(
      new Error("無効なセッション"),
    );

    const user = await getCurrentUser();

    // nullが返され、クッキーが削除されることを確認
    expect(user).toBeNull();
    expect(mockAuth.verifySessionCookie).toHaveBeenCalledWith(
      "invalid-session-cookie",
      true,
    );
    expect(vi.mocked(headerModule.cookies)().delete).toHaveBeenCalledWith(
      "firebase-session",
    );
  });

  it("セッションクッキーからuidが取得できない場合はnullを返すこと", async () => {
    // セッションクッキーが存在するケース
    vi.mocked(headerModule.cookies).mockReturnValue({
      get: vi.fn().mockReturnValue({
        value: "valid-session-cookie",
      }),
      delete: vi.fn(),
    } as any);

    // セッションクッキー検証は成功するがuidがないケース
    mockAuth.verifySessionCookie.mockResolvedValue({
      /* uidなし */
    });

    const user = await getCurrentUser();

    // nullが返されることを確認
    expect(user).toBeNull();
    expect(mockAuth.verifySessionCookie).toHaveBeenCalledWith(
      "valid-session-cookie",
      true,
    );
    expect(mockAuth.getUser).not.toHaveBeenCalled();
  });

  it("Firebase Admin SDKの初期化でエラーが発生した場合はnullを返すこと", async () => {
    // Firebase Admin SDKの初期化でエラーが発生するように設定
    vi.mocked(initializeFirebaseAdmin).mockImplementation(() => {
      throw new Error("初期化エラー");
    });

    const user = await getCurrentUser();

    // nullが返されることを確認
    expect(user).toBeNull();
  });
});
