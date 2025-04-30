import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createSessionCookie } from "./createSessionCookie";

// Firebase Admin SDK をモック
const mockCreateSessionCookie = vi
  .fn()
  .mockResolvedValue("mock-session-cookie");
vi.mock("./firebase-admin", () => ({
  initializeFirebaseAdmin: vi.fn(() => ({
    createSessionCookie: mockCreateSessionCookie,
  })),
}));

// Next.js の cookies をモック
const mockCookies = {
  set: vi.fn(),
  delete: vi.fn(),
};

vi.mock("next/headers", () => ({
  cookies: vi.fn(() => mockCookies),
}));

describe("createSessionCookie 関数のテスト", () => {
  beforeEach(() => {
    // テスト前にモックをリセット
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  it("有効なIDトークンでセッションクッキーを正常に作成できる", async () => {
    // テスト用IDトークン
    const mockIdToken = "valid-id-token";

    // 関数を実行
    const result = await createSessionCookie(mockIdToken);

    // 結果が成功を示すことを検証
    expect(result).toBe(true);

    // セッションクッキーが正しいパラメータで設定されたことを検証
    expect(mockCookies.set).toHaveBeenCalledTimes(1);
    expect(mockCookies.set).toHaveBeenCalledWith(
      "firebase-session",
      "mock-session-cookie",
      expect.objectContaining({
        httpOnly: true,
        path: "/",
        sameSite: "lax",
      }),
    );
  });

  it("エラー発生時は失敗を示す結果を返す", async () => {
    // モックを上書きしてエラーをスローするように設定
    mockCreateSessionCookie.mockRejectedValueOnce(
      new Error("セッションの作成に失敗しました"),
    );

    // 関数を実行
    const result = await createSessionCookie("invalid-token");

    // 結果が失敗を示すことを検証
    expect(result).toBe(false);

    // クッキーが設定されなかったことを検証
    expect(mockCookies.set).not.toHaveBeenCalled();
  });
});
