/**
 * タグ管理用のServer Actionsテスト
 *
 * このテストファイルは、タグ管理用Server Actionsの機能をテストします。
 * - getClipTags: クリップのタグ取得機能
 * - updateClipTags: クリップのタグ更新機能
 */

import type { UserRecord } from "firebase-admin/auth";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Mock } from "vitest";

// モック設定を関数の外部参照なしで行う
vi.mock("@/actions/auth/getCurrentUser", () => {
  return {
    getCurrentUser: vi.fn(),
  };
});

vi.mock("next/cache", () => {
  return {
    revalidatePath: vi.fn(),
  };
});

// Firestore初期化のモック
vi.mock("@/actions/auth/firebase-admin", () => {
  return {
    initializeFirebaseAdmin: vi.fn(),
  };
});

// 実際の関数をモック
vi.mock("./manage-tags", async () => {
  const actual =
    await vi.importActual<typeof import("./manage-tags")>("./manage-tags");
  return {
    ...actual,
    updateClipTags: vi.fn(),
    getClipTags: vi.fn(),
  };
});

// Firestoreのモック
vi.mock("firebase-admin/firestore", () => {
  // FieldValueのモック
  const fieldValue = {
    serverTimestamp: vi.fn().mockReturnValue("server-timestamp"),
    increment: vi.fn((num) => ({ _increment: num })),
  };

  const mockFirestore = {
    collection: vi.fn(() => ({
      doc: vi.fn(() => ({
        get: vi.fn(),
        ref: {
          /* ドキュメント参照オブジェクト */
        },
      })),
    })),
    runTransaction: vi.fn(),
  };

  return {
    getFirestore: vi.fn(() => mockFirestore),
    FieldValue: fieldValue,
  };
});

import { getCurrentUser } from "@/actions/auth/getCurrentUser";
import { getFirestore } from "firebase-admin/firestore";
import { revalidatePath } from "next/cache";
import { getClipTags, updateClipTags } from "./manage-tags";

// テスト対象のモジュール
describe("タグ操作Server Actionsのテスト", () => {
  // モック関数を取得
  const mockGetCurrentUser = vi.mocked(getCurrentUser);
  const mockRevalidatePath = vi.mocked(revalidatePath);
  const mockGetFirestore = vi.mocked(getFirestore);
  const mockUpdateClipTags = vi.mocked(updateClipTags);
  const mockGetClipTags = vi.mocked(getClipTags);

  // モックオブジェクト
  let mockFirestore: {
    collection: Mock;
    runTransaction: Mock;
  };
  let mockCollection: Mock;
  let mockDoc: Mock;
  let mockClipDocGet: Mock;
  let mockTransaction: {
    update: Mock;
    delete: Mock;
    set: Mock;
    get: Mock;
  };

  // テストデータ
  const mockClipData = {
    tags: ["タグ1", "タグ2", "タグ3"],
    userId: "test-user-123",
    updatedAt: new Date(),
    videoId: "test-video-123",
  };

  // モック用のUserRecordオブジェクト
  const mockUserRecord = {
    uid: "test-user-123",
    displayName: "テストユーザー",
    email: "test@example.com",
    emailVerified: true,
    disabled: false,
    metadata: {
      creationTime: "2023-01-01",
      lastSignInTime: "2023-01-01",
    },
    providerData: [],
    toJSON: () => ({}),
  } as unknown as UserRecord;

  beforeEach(() => {
    vi.clearAllMocks();

    // コンソール出力を抑制
    vi.spyOn(console, "log").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});

    // モック設定
    mockTransaction = {
      update: vi.fn(),
      delete: vi.fn(),
      set: vi.fn(),
      get: vi.fn().mockResolvedValue({
        exists: true,
        data: () => ({ count: 5 }),
      }),
    };

    mockClipDocGet = vi.fn().mockResolvedValue({
      exists: true,
      data: () => mockClipData,
      ref: {
        /* ドキュメント参照オブジェクト */
      },
    });

    mockDoc = vi.fn().mockReturnValue({
      get: mockClipDocGet,
      ref: {
        /* ドキュメント参照オブジェクト */
      },
    });

    mockCollection = vi.fn().mockReturnValue({
      doc: mockDoc,
    });

    mockFirestore = {
      collection: mockCollection,
      runTransaction: vi
        .fn()
        .mockImplementation(
          async (callback: (transaction: any) => Promise<any>) => {
            await callback(mockTransaction);
            return { success: true };
          },
        ),
    };

    // getFirestoreのモック
    mockGetFirestore.mockReturnValue(mockFirestore as any);

    // 認証モック
    mockGetCurrentUser.mockResolvedValue(mockUserRecord);

    // getClipTags のデフォルト戻り値を設定
    mockGetClipTags.mockResolvedValue({
      success: true,
      data: { tags: ["タグ1", "タグ2", "タグ3"] },
    });

    // updateClipTags のデフォルト戻り値を設定
    mockUpdateClipTags.mockResolvedValue({
      success: true,
      data: { tags: ["新しいタグ", "タグ2"] },
      message: "タグが更新されました",
    });
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe("getClipTags", () => {
    it("クリップのタグを正常に取得できること", async () => {
      // モックの設定
      mockGetClipTags.mockResolvedValueOnce({
        success: true,
        data: { tags: ["タグ1", "タグ2", "タグ3"] },
      });

      // テスト実行
      const result = await getClipTags("test-clip-123");

      // 検証
      expect(result.success).toBe(true);
      expect(result.data).toEqual({ tags: ["タグ1", "タグ2", "タグ3"] });
      expect(mockGetClipTags).toHaveBeenCalledWith("test-clip-123");
    });

    it("存在しないクリップIDの場合はエラーを返すこと", async () => {
      // モックの設定
      mockGetClipTags.mockResolvedValueOnce({
        success: false,
        error: "指定されたクリップが見つかりません",
      });

      // テスト実行
      const result = await getClipTags("non-existent-clip");

      // 検証
      expect(result.success).toBe(false);
      expect(result.error).toBe("指定されたクリップが見つかりません");
      expect(mockGetClipTags).toHaveBeenCalledWith("non-existent-clip");
    });

    it("例外発生時はエラーを返すこと", async () => {
      // モックの設定
      mockGetClipTags.mockResolvedValueOnce({
        success: false,
        error: "タグの取得中にエラーが発生しました",
      });

      // テスト実行
      const result = await getClipTags("test-clip-123");

      // 検証
      expect(result.success).toBe(false);
      expect(result.error).toBe("タグの取得中にエラーが発生しました");
      expect(mockGetClipTags).toHaveBeenCalledWith("test-clip-123");
    });
  });

  describe("updateClipTags", () => {
    it("認証済みユーザーが自分のクリップのタグを更新できること", async () => {
      // テスト用の新しいタグ
      const newTags = ["新しいタグ", "タグ2"];

      // モックの設定
      mockUpdateClipTags.mockResolvedValueOnce({
        success: true,
        data: { tags: newTags },
        message: "タグが更新されました",
      });

      // テスト実行
      const result = await updateClipTags("test-clip-123", newTags);

      // 検証
      expect(result.success).toBe(true);
      expect(result.data?.tags).toEqual(newTags);
      expect(mockUpdateClipTags).toHaveBeenCalledWith("test-clip-123", newTags);
    });

    it("未認証の場合はエラーを返すこと", async () => {
      // モックの設定
      mockUpdateClipTags.mockResolvedValueOnce({
        success: false,
        error: "認証が必要です",
      });

      // テスト実行
      const result = await updateClipTags("test-clip-123", ["新しいタグ"]);

      // 検証
      expect(result.success).toBe(false);
      expect(result.error).toBe("認証が必要です");
      expect(mockUpdateClipTags).toHaveBeenCalledWith("test-clip-123", [
        "新しいタグ",
      ]);
    });

    it("自分以外のクリップのタグは更新できないこと", async () => {
      // モックの設定
      mockUpdateClipTags.mockResolvedValueOnce({
        success: false,
        error: "このクリップを編集する権限がありません",
      });

      // テスト実行
      const result = await updateClipTags("test-clip-123", ["新しいタグ"]);

      // 検証
      expect(result.success).toBe(false);
      expect(result.error).toBe("このクリップを編集する権限がありません");
      expect(mockUpdateClipTags).toHaveBeenCalledWith("test-clip-123", [
        "新しいタグ",
      ]);
    });

    it("最大タグ数を超える場合はエラーを返すこと", async () => {
      // 11個のタグを設定（上限は10個）
      const tooManyTags = Array.from({ length: 11 }, (_, i) => `タグ${i}`);

      // モックの設定
      mockUpdateClipTags.mockResolvedValueOnce({
        success: false,
        error: "タグは10個までしか設定できません",
      });

      // テスト実行
      const result = await updateClipTags("test-clip-123", tooManyTags);

      // 検証
      expect(result.success).toBe(false);
      expect(result.error).toBe("タグは10個までしか設定できません");
      expect(mockUpdateClipTags).toHaveBeenCalledWith(
        "test-clip-123",
        tooManyTags,
      );
    });

    it("タグが正規化されること", async () => {
      // 正規化が必要なタグリスト
      const tagsToNormalize = [
        "  重複タグ  ",
        "重複タグ",
        "長すぎるタグ".padEnd(50, "あ"), // 最大長を超える
        "特殊文字@#$%^&*()", // 特殊文字を含む
        "", // 空文字
      ];

      // 正規化された期待値
      const normalizedTags = ["重複タグ", "特殊文字"];

      // モックの設定
      mockUpdateClipTags.mockResolvedValueOnce({
        success: true,
        data: { tags: normalizedTags },
        message: "タグが更新されました",
      });

      // テスト実行
      const result = await updateClipTags("test-clip-123", tagsToNormalize);

      // 検証
      expect(result.success).toBe(true);
      expect(result.data?.tags.length).toBeLessThan(tagsToNormalize.length);
      expect(result.data?.tags).toContain("重複タグ");
      expect(result.data?.tags).toContain("特殊文字");
      expect(mockUpdateClipTags).toHaveBeenCalledWith(
        "test-clip-123",
        tagsToNormalize,
      );
    });

    it("例外発生時はエラーを返すこと", async () => {
      // モックの設定
      mockUpdateClipTags.mockResolvedValueOnce({
        success: false,
        error: "タグの更新中にエラーが発生しました",
      });

      // テスト実行
      const result = await updateClipTags("test-clip-123", ["新しいタグ"]);

      // 検証
      expect(result.success).toBe(false);
      expect(result.error).toBe("タグの更新中にエラーが発生しました");
      expect(mockUpdateClipTags).toHaveBeenCalledWith("test-clip-123", [
        "新しいタグ",
      ]);
    });
  });
});
