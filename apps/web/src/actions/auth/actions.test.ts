/**
 * 認証関連のServer Actionsテスト
 *
 * このテストファイルは、認証機能用のServer Actionsをテストします。
 * - createSessionCookie: セッションクッキー作成機能
 * - revokeSession: セッション無効化機能
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Mock } from "vitest";

// クッキーのモック
const cookieDelete = vi.fn();
const cookieSet = vi.fn();

// モック設定
vi.mock("next/headers", () => {
  return {
    cookies: vi.fn(() => ({
      set: cookieSet,
      get: vi.fn(),
      delete: cookieDelete,
    })),
  };
});

// Firebase Admin SDKのモック
const mockCreateSessionCookie = vi.fn();
const mockAuth = { createSessionCookie: mockCreateSessionCookie };

vi.mock("./firebase-admin", () => {
  return {
    initializeFirebaseAdmin: vi.fn(() => mockAuth),
  };
});

// テスト対象の関数をインポート
import { createSessionCookie } from "./createSessionCookie";
import { revokeSession } from "./manage-session";

describe("認証関連のServer Actionsテスト", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // コンソール出力を抑制
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.spyOn(console, "log").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe("createSessionCookie", () => {
    it("有効なトークンでセッションクッキーを作成できること", async () => {
      // モックの設定
      mockCreateSessionCookie.mockResolvedValueOnce("valid-session-cookie");

      // テスト実行
      const result = await createSessionCookie("valid-id-token");

      // 検証
      expect(result).toBe(true);
      expect(mockCreateSessionCookie).toHaveBeenCalledWith(
        "valid-id-token",
        expect.any(Object),
      );
      expect(cookieSet).toHaveBeenCalledWith(
        "session",
        "valid-session-cookie",
        expect.any(Object),
      );
    });

    it("無効なトークンの場合はfalseを返すこと", async () => {
      // モックの設定 - エラーをスロー
      mockCreateSessionCookie.mockRejectedValueOnce(new Error("Invalid token"));

      // テスト実行
      const result = await createSessionCookie("invalid-token");

      // 検証
      expect(result).toBe(false);
      expect(cookieSet).not.toHaveBeenCalled();
    });
  });

  describe("revokeSession", () => {
    it("セッションクッキーを正常に削除できること", async () => {
      // テスト実行
      await revokeSession();

      // 検証
      expect(cookieDelete).toHaveBeenCalledWith("session");
    });
  });
});
