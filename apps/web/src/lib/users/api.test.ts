import type { UserRecord } from "firebase-admin/auth";
import type { User } from "firebase/auth";
import { doc, getDoc, serverTimestamp, setDoc } from "firebase/firestore";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getUserProfile, mergeUserData, updateUserProfile } from "./api";
import type { UserProfileData, UserProfileFormData } from "./types";

// Firestoreのモック
vi.mock("firebase/firestore", () => ({
  doc: vi.fn(),
  getDoc: vi.fn(),
  serverTimestamp: vi.fn(),
  setDoc: vi.fn(),
  collection: vi.fn(),
  Timestamp: {
    fromDate: vi.fn((date) => ({ toDate: () => date })),
  },
}));

// Firebase Clientのモック
vi.mock("../firebase/client", () => ({
  db: {}, // テスト用のダミーオブジェクト
}));

describe("ユーザーAPI関数のテスト", () => {
  const mockTimestamp = {
    toDate: () => new Date("2025-05-01"),
  };

  // コンソールエラーを抑制するためのモック
  const originalConsoleError = console.error;

  beforeEach(() => {
    // テスト前にモックをリセット
    vi.resetAllMocks();
    // コンソールエラーを抑制
    console.error = vi.fn();

    // serverTimestampのモック実装
    vi.mocked(serverTimestamp).mockImplementation(() => mockTimestamp);
  });

  afterEach(() => {
    // テスト後にコンソールの挙動を元に戻す
    console.error = originalConsoleError;
  });

  describe("getUserProfile関数", () => {
    it("正常にユーザープロフィールを取得できる", async () => {
      // モックの設定
      const mockUserData = {
        siteDisplayName: "テストユーザー",
        bio: "自己紹介文です",
        isPublic: true,
        updatedAt: mockTimestamp,
        createdAt: mockTimestamp,
      };

      const mockSnapshot = {
        exists: () => true,
        id: "user123",
        data: () => mockUserData,
      };

      const mockDocRef = {};
      vi.mocked(doc).mockReturnValue(mockDocRef);
      vi.mocked(getDoc).mockResolvedValue(mockSnapshot as any);

      // 関数の実行
      const result = await getUserProfile("user123");

      // 検証
      expect(doc).toHaveBeenCalledWith({}, "userProfiles", "user123");
      expect(getDoc).toHaveBeenCalledWith(mockDocRef);
      expect(result).toEqual({
        uid: "user123",
        siteDisplayName: "テストユーザー",
        bio: "自己紹介文です",
        isPublic: true,
        updatedAt: new Date("2025-05-01"),
        createdAt: new Date("2025-05-01"),
      });
    });

    it("ユーザープロフィールが存在しない場合はnullを返す", async () => {
      // モックの設定
      const mockSnapshot = {
        exists: () => false,
      };

      vi.mocked(getDoc).mockResolvedValue(mockSnapshot as any);

      // 関数の実行
      const result = await getUserProfile("nonexistent");

      // 検証
      expect(result).toBeNull();
    });
  });

  describe("updateUserProfile関数", () => {
    it("新規プロフィールを正常に作成できる", async () => {
      // モックの設定
      const mockSnapshot = {
        exists: () => false,
      };

      const mockDocRef = {};
      vi.mocked(doc).mockReturnValue(mockDocRef);
      vi.mocked(getDoc).mockResolvedValue(mockSnapshot as any);
      vi.mocked(setDoc).mockResolvedValue(undefined);

      const profileData: UserProfileFormData = {
        siteDisplayName: "新規ユーザー",
        bio: "新しい自己紹介",
        isPublic: true,
      };

      // 関数の実行
      const result = await updateUserProfile("newuser", profileData);

      // 検証
      expect(doc).toHaveBeenCalledWith({}, "userProfiles", "newuser");
      expect(setDoc).toHaveBeenCalledWith(mockDocRef, {
        ...profileData,
        uid: "newuser",
        createdAt: mockTimestamp,
        updatedAt: mockTimestamp,
      });
      expect(result).toBe(true);
    });

    it("既存プロフィールを正常に更新できる", async () => {
      // モックの設定
      const mockSnapshot = {
        exists: () => true,
      };

      const mockDocRef = {};
      vi.mocked(doc).mockReturnValue(mockDocRef);
      vi.mocked(getDoc).mockResolvedValue(mockSnapshot as any);
      vi.mocked(setDoc).mockResolvedValue(undefined);

      const profileData: UserProfileFormData = {
        siteDisplayName: "更新ユーザー",
        bio: "更新された自己紹介",
        isPublic: false,
      };

      // 関数の実行
      const result = await updateUserProfile("existinguser", profileData);

      // 検証
      expect(doc).toHaveBeenCalledWith({}, "userProfiles", "existinguser");
      expect(setDoc).toHaveBeenCalledWith(
        mockDocRef,
        {
          ...profileData,
          updatedAt: mockTimestamp,
        },
        { merge: true },
      );
      expect(result).toBe(true);
    });
  });

  describe("mergeUserData関数", () => {
    it("AuthとFirestoreのユーザー情報を正しく統合できる", () => {
      // モックデータ
      const authUser = {
        uid: "user123",
        displayName: "Auth表示名",
        photoURL: "https://example.com/photo.jpg",
      } as User;

      const profileData: UserProfileData = {
        uid: "user123",
        siteDisplayName: "サイト表示名",
        bio: "自己紹介文",
        isPublic: true,
        createdAt: new Date("2025-04-01"),
        updatedAt: new Date("2025-05-01"),
      };

      // 関数の実行
      const result = mergeUserData(authUser, profileData);

      // 検証
      expect(result).toEqual({
        uid: "user123",
        displayName: "Auth表示名",
        photoURL: "https://example.com/photo.jpg",
        siteDisplayName: "サイト表示名",
        bio: "自己紹介文",
        isPublic: true,
        createdAt: new Date("2025-04-01"),
        updatedAt: new Date("2025-05-01"),
        preferredName: "サイト表示名", // サイト表示名が優先される
      });
    });

    it("プロフィールデータがない場合はAuth情報のみで統合できる", () => {
      // モックデータ
      const authUser = {
        uid: "user123",
        displayName: "Auth表示名",
        photoURL: "https://example.com/photo.jpg",
      } as User;

      // 関数の実行
      const result = mergeUserData(authUser, null);

      // 検証
      expect(result).toEqual({
        uid: "user123",
        displayName: "Auth表示名",
        photoURL: "https://example.com/photo.jpg",
        isPublic: false,
        createdAt: expect.any(Date),
        updatedAt: expect.any(Date),
        preferredName: "Auth表示名", // Auth表示名が使用される
      });
    });

    it("表示名がない場合はUIDの先頭8文字が使用される", () => {
      // モックデータ
      const authUser = {
        uid: "user123456789",
        displayName: null,
        photoURL: null,
      } as User;

      const profileData: UserProfileData = {
        uid: "user123456789",
        siteDisplayName: "",
        bio: "",
        isPublic: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // 関数の実行
      const result = mergeUserData(authUser, profileData);

      // 検証
      expect(result?.preferredName).toBe("user1234");
    });

    it("authUserがnullの場合はnullを返す", () => {
      const profileData: UserProfileData = {
        uid: "user123",
        siteDisplayName: "サイト表示名",
        bio: "自己紹介文",
        isPublic: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // 関数の実行
      const result = mergeUserData(null, profileData);

      // 検証
      expect(result).toBeNull();
    });
  });
});
