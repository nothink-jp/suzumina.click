import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getProfile } from "./getProfile";

// Firebase Admin/auth のモック
vi.mock("firebase-admin/auth", () => ({
  getAuth: vi.fn(() => ({
    verifyIdToken: vi.fn(),
    verifySessionCookie: vi.fn(),
    getUser: vi.fn(),
  })),
}));

// Firebase Admin/app のモック
vi.mock("firebase-admin/app", () => ({
  getApps: vi.fn(() => ["default-app-mock"]),
  getApp: vi.fn(() => ({ name: "default-app-mock" })),
  cert: vi.fn(() => ({})),
  initializeApp: vi.fn(() => ({ name: "default-app-mock" })),
}));

// モック関数を定義（getCurrentUserのモック）
const mockGetCurrentUser = vi.fn();
const mockFirestoreGet = vi.fn();
const mockDoc = vi.fn(() => ({ get: mockFirestoreGet }));
const mockCollection = vi.fn(() => ({ doc: mockDoc }));
const mockGetFirestore = vi.fn(() => ({
  collection: mockCollection,
}));

// Firestoreのモック
vi.mock("firebase-admin/firestore", () => ({
  getFirestore: () => mockGetFirestore(),
}));

// getCurrentUserのモック
vi.mock("../auth/getCurrentUser", () => ({
  getCurrentUser: () => mockGetCurrentUser(),
}));

// firebase-admin.tsのモック
vi.mock("../auth/firebase-admin", () => ({
  initializeFirebaseAdmin: vi.fn(() => ({
    name: "firebase-admin-mock",
    auth: vi.fn(() => ({
      verifyIdToken: vi.fn(),
      verifySessionCookie: vi.fn(),
      getUser: vi.fn(),
    })),
  })),
}));

describe("getProfile 関数のテスト", () => {
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

  it("ログイン中のユーザー自身のプロフィールが取得できる", async () => {
    // モックのセットアップ
    const testUser = {
      uid: "test-user-123",
      displayName: "テストユーザー",
      email: "test@example.com",
      photoURL: "https://example.com/photo.jpg",
    };

    const testProfileData = {
      siteDisplayName: "サイト表示名",
      bio: "自己紹介文",
      isPublic: true,
      createdAt: { toDate: () => new Date("2025-01-01") },
      updatedAt: { toDate: () => new Date("2025-05-01") },
    };

    // getCurrentUserモックの設定
    mockGetCurrentUser.mockResolvedValue(testUser);

    // Firestoreモックの設定
    mockFirestoreGet.mockResolvedValue({
      exists: true,
      data: () => testProfileData,
    });

    // 関数を呼び出し
    const result = await getProfile();

    // 結果を検証
    expect(result).toEqual({
      uid: testUser.uid,
      displayName: testUser.displayName,
      email: testUser.email,
      photoURL: testUser.photoURL,
      siteDisplayName: testProfileData.siteDisplayName,
      bio: testProfileData.bio,
      isPublic: testProfileData.isPublic,
      createdAt: expect.any(Date),
      updatedAt: expect.any(Date),
      preferredName: testProfileData.siteDisplayName,
    });

    // Firestoreが正しいパスで呼び出されたことを確認
    expect(mockCollection).toHaveBeenCalledWith("userProfiles");
    expect(mockDoc).toHaveBeenCalledWith(testUser.uid);
  });

  it("プロフィールデータが存在しない場合はデフォルト値を使用する", async () => {
    // モックのセットアップ
    const testUser = {
      uid: "test-user-123",
      displayName: "テストユーザー",
      email: "test@example.com",
      photoURL: null,
    };

    // getCurrentUserモックの設定
    mockGetCurrentUser.mockResolvedValue(testUser);

    // Firestoreモックの設定（存在しないプロフィール）
    mockFirestoreGet.mockResolvedValue({
      exists: false,
      data: () => null,
    });

    // 関数を呼び出し
    const result = await getProfile();

    // 結果を検証
    expect(result).toEqual({
      uid: testUser.uid,
      displayName: testUser.displayName,
      email: testUser.email,
      photoURL: null,
      isPublic: false,
      createdAt: expect.any(Date),
      updatedAt: expect.any(Date),
      preferredName: testUser.displayName,
    });
  });

  it("特定のユーザーIDを指定してプロフィールを取得できる", async () => {
    // モックのセットアップ
    const currentUser = {
      uid: "current-user-123",
      displayName: "現在のユーザー",
      email: "current@example.com",
    };

    const targetUserId = "target-user-456";
    const targetProfileData = {
      siteDisplayName: "ターゲットユーザー",
      bio: "ターゲットの自己紹介",
      isPublic: true,
      createdAt: { toDate: () => new Date("2025-02-01") },
      updatedAt: { toDate: () => new Date("2025-05-01") },
    };

    // getCurrentUserモックの設定
    mockGetCurrentUser.mockResolvedValue(currentUser);

    // Firestoreモックの設定
    mockFirestoreGet.mockResolvedValue({
      exists: true,
      data: () => targetProfileData,
    });

    // 関数を呼び出し
    const result = await getProfile(targetUserId);

    // 結果を検証
    expect(result).toEqual({
      uid: targetUserId,
      displayName: currentUser.displayName,
      email: currentUser.email,
      photoURL: null,
      siteDisplayName: targetProfileData.siteDisplayName,
      bio: targetProfileData.bio,
      isPublic: targetProfileData.isPublic,
      createdAt: expect.any(Date),
      updatedAt: expect.any(Date),
      preferredName: targetProfileData.siteDisplayName,
    });

    // 正しいユーザーIDでFirestoreが呼び出されたことを確認
    expect(mockDoc).toHaveBeenCalledWith(targetUserId);
  });

  it("非公開プロフィールは本人以外取得できない", async () => {
    // モックのセットアップ
    const currentUser = {
      uid: "current-user-123",
      displayName: "現在のユーザー",
      email: "current@example.com",
    };

    const targetUserId = "target-user-456"; // 現在のユーザーとは異なるID
    const targetProfileData = {
      siteDisplayName: "ターゲットユーザー",
      bio: "ターゲットの自己紹介",
      isPublic: false, // 非公開設定
      createdAt: { toDate: () => new Date("2025-02-01") },
      updatedAt: { toDate: () => new Date("2025-05-01") },
    };

    // getCurrentUserモックの設定
    mockGetCurrentUser.mockResolvedValue(currentUser);

    // Firestoreモックの設定
    mockFirestoreGet.mockResolvedValue({
      exists: true,
      data: () => targetProfileData,
    });

    // 関数を呼び出し
    const result = await getProfile(targetUserId);

    // 非公開プロフィールなのでnullが返されるはず
    expect(result).toBeNull();
  });

  it("未ログイン状態ではnullを返す", async () => {
    // 未ログイン状態をシミュレート
    mockGetCurrentUser.mockResolvedValue(null);

    // 関数を呼び出し
    const result = await getProfile();

    // 結果を検証
    expect(result).toBeNull();
  });

  it("エラー発生時はnullを返しエラーログを出力する", async () => {
    // モックのセットアップ
    const testUser = {
      uid: "test-user-123",
      displayName: "テストユーザー",
      email: "test@example.com",
    };

    // getCurrentUserモックの設定
    mockGetCurrentUser.mockResolvedValue(testUser);

    // Firestoreでエラーが発生する状況をシミュレート
    mockFirestoreGet.mockRejectedValue(new Error("Firestoreエラー"));

    // 関数を呼び出し
    const result = await getProfile();

    // 結果を検証
    expect(result).toBeNull();
    expect(consoleErrorSpy).toHaveBeenCalled();
  });
});
