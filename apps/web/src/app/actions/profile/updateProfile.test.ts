import type { UserProfileFormData } from "@/lib/users/types";
import { Timestamp } from "firebase-admin/firestore";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { updateProfile } from "./updateProfile";

// モック関数を定義
const mockGetCurrentUser = vi.fn();
const mockFirestoreUpdate = vi.fn();
const mockFirestoreSet = vi.fn();
const mockFirestoreGet = vi.fn();
const mockDoc = vi.fn(() => ({
  update: mockFirestoreUpdate,
  set: mockFirestoreSet,
  get: mockFirestoreGet,
}));
const mockCollection = vi.fn(() => ({ doc: mockDoc }));
const mockGetFirestore = vi.fn(() => ({
  collection: mockCollection,
}));

// Firestoreのモック
vi.mock("firebase-admin/firestore", () => ({
  getFirestore: () => mockGetFirestore(),
  Timestamp: {
    now: vi.fn(() => ({ _seconds: 1714936526, _nanoseconds: 123000000 })),
  },
}));

// getCurrentUserのモック
vi.mock("../auth/getCurrentUser", () => ({
  getCurrentUser: () => mockGetCurrentUser(),
}));

// firebase-admin.tsのモック
vi.mock("../auth/firebase-admin", () => ({
  initializeFirebaseAdmin: vi.fn(() => ({
    name: "firebase-admin-mock",
  })),
}));

describe("updateProfile 関数のテスト", () => {
  // コンソールのスパイを宣言
  let consoleLogSpy: any;
  let consoleErrorSpy: any;

  beforeEach(() => {
    // コンソール出力を抑制
    consoleLogSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    // モックをリセット
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("未ログイン時はエラーを返す", async () => {
    // 未ログイン状態をシミュレート
    mockGetCurrentUser.mockResolvedValue(null);

    const formData: UserProfileFormData = {
      siteDisplayName: "テスト表示名",
      bio: "自己紹介文",
      isPublic: true,
    };

    // 関数を呼び出し
    const result = await updateProfile(formData);

    // 結果を検証
    expect(result.success).toBe(false);
    expect(result.message).toBe("ログインが必要です");
  });

  it("バリデーションエラー時はエラー内容を返す", async () => {
    // ログイン状態をシミュレート
    mockGetCurrentUser.mockResolvedValue({
      uid: "test-user-123",
    });

    // バリデーションエラーを引き起こす不正なフォームデータ
    const formData: UserProfileFormData = {
      siteDisplayName: "", // 空文字（最小1文字のバリデーションエラー）
      bio: "自己紹介文",
      isPublic: true,
    };

    // 関数を呼び出し
    const result = await updateProfile(formData);

    // 結果を検証
    expect(result.success).toBe(false);
    expect(result.message).toBe("入力内容に誤りがあります");
    expect(result.errors).toBeDefined();
  });

  it("プロフィールが存在する場合は更新する", async () => {
    // ログイン状態をシミュレート
    const testUser = {
      uid: "test-user-123",
    };
    mockGetCurrentUser.mockResolvedValue(testUser);

    // Firestoreの既存データをシミュレート
    mockFirestoreGet.mockResolvedValue({
      exists: true,
    });

    const formData: UserProfileFormData = {
      siteDisplayName: "テスト表示名",
      bio: "自己紹介文",
      isPublic: true,
    };

    // 関数を呼び出し
    const result = await updateProfile(formData);

    // 結果を検証
    expect(result.success).toBe(true);
    expect(result.message).toBe("プロフィールを更新しました");

    // Firestoreの更新メソッドが正しく呼ばれたことを確認
    expect(mockCollection).toHaveBeenCalledWith("userProfiles");
    expect(mockDoc).toHaveBeenCalledWith(testUser.uid);
    expect(mockFirestoreUpdate).toHaveBeenCalledWith({
      siteDisplayName: formData.siteDisplayName,
      bio: formData.bio,
      isPublic: formData.isPublic,
      updatedAt: expect.anything(),
    });
  });

  it("プロフィールが存在しない場合は新規作成する", async () => {
    // ログイン状態をシミュレート
    const testUser = {
      uid: "test-user-123",
    };
    mockGetCurrentUser.mockResolvedValue(testUser);

    // Firestoreのデータ存在なしをシミュレート
    mockFirestoreGet.mockResolvedValue({
      exists: false,
    });

    const formData: UserProfileFormData = {
      siteDisplayName: "テスト表示名",
      bio: "自己紹介文",
      isPublic: true,
    };

    // 関数を呼び出し
    const result = await updateProfile(formData);

    // 結果を検証
    expect(result.success).toBe(true);
    expect(result.message).toBe("プロフィールを更新しました");

    // Firestoreの新規作成メソッドが正しく呼ばれたことを確認
    expect(mockCollection).toHaveBeenCalledWith("userProfiles");
    expect(mockDoc).toHaveBeenCalledWith(testUser.uid);
    expect(mockFirestoreSet).toHaveBeenCalledWith({
      uid: testUser.uid,
      siteDisplayName: formData.siteDisplayName,
      bio: formData.bio,
      isPublic: formData.isPublic,
      createdAt: expect.anything(),
      updatedAt: expect.anything(),
    });
  });

  it("Firestoreでエラーが発生した場合はエラーを返す", async () => {
    // ログイン状態をシミュレート
    const testUser = {
      uid: "test-user-123",
    };
    mockGetCurrentUser.mockResolvedValue(testUser);

    // Firestoreのエラーをシミュレート
    mockFirestoreGet.mockRejectedValue(new Error("Firestoreエラー"));

    const formData: UserProfileFormData = {
      siteDisplayName: "テスト表示名",
      bio: "自己紹介文",
      isPublic: true,
    };

    // 関数を呼び出し
    const result = await updateProfile(formData);

    // 結果を検証
    expect(result.success).toBe(false);
    expect(result.message).toBe("プロフィール更新に失敗しました");
    expect(consoleErrorSpy).toHaveBeenCalled();
  });
});
