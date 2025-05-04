import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { revokeSession } from "./revokeSession";

// Next.js の cookies をモック
const mockCookies = {
  delete: vi.fn(),
};

vi.mock("next/headers", () => ({
  cookies: vi.fn(() => mockCookies),
}));

describe("revokeSession 関数のテスト", () => {
  beforeEach(() => {
    // テスト前にモックをリセット
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  it("セッションクッキーが正常に削除される", async () => {
    // 関数を実行
    const result = await revokeSession();

    // 結果が成功を示すことを検証
    expect(result).toBe(true);

    // セッションクッキーが削除されたことを検証
    expect(mockCookies.delete).toHaveBeenCalledTimes(1);
    expect(mockCookies.delete).toHaveBeenCalledWith("firebase-session");
  });

  it("エラー発生時は失敗を示す結果を返す", async () => {
    // モックを上書きしてエラーをスローするように設定
    mockCookies.delete.mockImplementationOnce(() => {
      throw new Error("クッキーの削除に失敗しました");
    });

    // 関数を実行
    const result = await revokeSession();

    // 結果が失敗を示すことを検証
    expect(result).toBe(false);
  });
});
