/**
 * クリップタグ操作用のServer Actionsテスト
 *
 * このテストファイルは、タグ操作用Server Actionsの機能をテストします。
 * - getClipTags: クリップのタグ取得機能
 * - updateClipTags: クリップのタグ更新機能
 */

import type { UserRecord } from "firebase-admin/auth";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Mock } from "vitest";

// モック設定を関数の外部参照なしで行う
vi.mock("@/app/actions/auth/getCurrentUser", () => {
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
vi.mock("@/app/actions/auth/firebase-admin", () => {
  return {
    initializeFirebaseAdmin: vi.fn(),
  };
});

// Firestoreのモック
vi.mock("firebase-admin/firestore", () => {
  const mockFirestore = {
    collection: vi.fn(() => ({
      doc: vi.fn(() => ({
        get: vi.fn(),
      })),
    })),
    runTransaction: vi.fn(),
  };

  return {
    getFirestore: vi.fn(() => mockFirestore),
  };
});

import { getCurrentUser } from "@/app/actions/auth/getCurrentUser";
import { getFirestore } from "firebase-admin/firestore";
import { revalidatePath } from "next/cache";
import { getClipTags, updateClipTags } from "./tags";

// テスト対象のモジュール
describe("タグ操作Server Actionsのテスト", () => {
  // モック関数を取得
  const mockGetCurrentUser = vi.mocked(getCurrentUser);
  const mockRevalidatePath = vi.mocked(revalidatePath);
  const mockGetFirestore = vi.mocked(getFirestore);

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
    });

    mockDoc = vi.fn().mockReturnValue({
      get: mockClipDocGet,
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
            return true;
          },
        ),
    };

    // getFirestoreのモック
    mockGetFirestore.mockReturnValue(mockFirestore as any);

    // 認証モック
    mockGetCurrentUser.mockResolvedValue(mockUserRecord);
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe("getClipTags", () => {
    it("クリップのタグを正常に取得できること", async () => {
      // テスト実行
      const result = await getClipTags("test-clip-123");

      // 検証
      expect(result.success).toBe(true);
      expect(result.data).toEqual({ tags: ["タグ1", "タグ2", "タグ3"] });
      expect(mockCollection).toHaveBeenCalledWith("audioClips");
      expect(mockDoc).toHaveBeenCalledWith("test-clip-123");
    });

    it("存在しないクリップIDの場合はエラーを返すこと", async () => {
      // 存在しないクリップのモック
      mockClipDocGet.mockResolvedValueOnce({
        exists: false,
      });

      // テスト実行
      const result = await getClipTags("non-existent-clip");

      // 検証
      expect(result.success).toBe(false);
      expect(result.error).toBe("指定されたクリップが見つかりません");
    });

    it("例外発生時はエラーを返すこと", async () => {
      // エラーをスローするモック
      mockClipDocGet.mockRejectedValueOnce(new Error("テスト用エラー"));

      // テスト実行
      const result = await getClipTags("test-clip-123");

      // 検証
      expect(result.success).toBe(false);
      expect(result.error).toBe("タグの取得中にエラーが発生しました");
      expect(console.error).toHaveBeenCalled();
    });
  });

  describe("updateClipTags", () => {
    it("認証済みユーザーが自分のクリップのタグを更新できること", async () => {
      // 認証済みセッションのモック
      mockGetCurrentUser.mockResolvedValueOnce(mockUserRecord);

      // テスト実行
      const result = await updateClipTags("test-clip-123", [
        "新しいタグ",
        "タグ2",
      ]);

      // 検証
      expect(result.success).toBe(true);
      expect(result.data?.tags).toEqual(["新しいタグ", "タグ2"]);
      expect(mockFirestore.runTransaction).toHaveBeenCalled();
      expect(mockTransaction.update).toHaveBeenCalled();
      expect(mockRevalidatePath).toHaveBeenCalledWith(
        "/audioclips/test-clip-123",
      );
    });

    it("未認証の場合はエラーを返すこと", async () => {
      // 未認証状態のモック
      mockGetCurrentUser.mockResolvedValueOnce(null);

      // テスト実行
      const result = await updateClipTags("test-clip-123", ["新しいタグ"]);

      // 検証
      expect(result.success).toBe(false);
      expect(result.error).toBe("認証が必要です");
      expect(mockFirestore.runTransaction).not.toHaveBeenCalled();
    });

    it("自分以外のクリップのタグは更新できないこと", async () => {
      // 異なるユーザーIDでの認証モック
      const differentUser = {
        ...mockUserRecord,
        uid: "different-user",
        displayName: "別のユーザー",
      } as unknown as UserRecord;

      mockGetCurrentUser.mockResolvedValueOnce(differentUser);

      // テスト実行
      const result = await updateClipTags("test-clip-123", ["新しいタグ"]);

      // 検証
      expect(result.success).toBe(false);
      expect(result.error).toBe("このクリップを編集する権限がありません");
      expect(mockFirestore.runTransaction).not.toHaveBeenCalled();
    });

    it("最大タグ数を超える場合はエラーを返すこと", async () => {
      // 認証済みセッションのモック
      mockGetCurrentUser.mockResolvedValueOnce(mockUserRecord);

      // 11個のタグを設定（上限は10個）
      const tooManyTags = Array.from({ length: 11 }, (_, i) => `タグ${i}`);

      // テスト実行
      const result = await updateClipTags("test-clip-123", tooManyTags);

      // 検証
      expect(result.success).toBe(false);
      expect(result.error).toBe("タグは10個までしか設定できません");
      expect(mockFirestore.runTransaction).not.toHaveBeenCalled();
    });

    it("タグが正規化されること", async () => {
      // 認証済みセッションのモック
      mockGetCurrentUser.mockResolvedValueOnce(mockUserRecord);

      // 正規化が必要なタグリスト
      const tagsToNormalize = [
        "  重複タグ  ",
        "重複タグ",
        "長すぎるタグ".padEnd(50, "あ"), // 最大長を超える
        "特殊文字@#$%^&*()", // 特殊文字を含む
        "", // 空文字
      ];

      // テスト実行
      const result = await updateClipTags("test-clip-123", tagsToNormalize);

      // 検証
      expect(result.success).toBe(true);

      // 重複が除去され、正規化されたタグのみが含まれていること
      expect(result.data?.tags.length).toBeLessThan(tagsToNormalize.length);
      expect(result.data?.tags).toContain("重複タグ");
    });

    it("例外発生時はエラーを返すこと", async () => {
      // 認証済みセッションのモック
      mockGetCurrentUser.mockResolvedValueOnce(mockUserRecord);

      // トランザクション実行でエラーを発生させる
      mockFirestore.runTransaction.mockRejectedValueOnce(
        new Error("テスト用エラー"),
      );

      // テスト実行
      const result = await updateClipTags("test-clip-123", ["新しいタグ"]);

      // 検証
      expect(result.success).toBe(false);
      expect(result.error).toBe("タグの更新中にエラーが発生しました");
      expect(console.error).toHaveBeenCalled();
    });
  });
});
