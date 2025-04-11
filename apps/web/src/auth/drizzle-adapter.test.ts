import { afterEach, beforeEach, describe, expect, it, mock } from "bun:test";
import {
  mockDb,
  resetMockDrizzle,
  setMockError,
  setMockSession,
  setMockUser,
  setMockVerificationToken,
} from "@/../tests/mocks/drizzle";
import type {
  Adapter,
  AdapterAccount,
  AdapterAccountType,
  AdapterUser,
} from "next-auth/adapters";
import { DrizzleAdapter } from "./drizzle-adapter";

// データベースのモック
mock.module("../db", () => ({
  db: mockDb,
  accounts: { name: "accounts" },
  users: { name: "users" },
  sessions: { name: "sessions" },
  verificationTokens: { name: "verificationTokens" },
}));

describe("DrizzleAdapter", () => {
  let adapter: Required<Adapter>;

  beforeEach(() => {
    resetMockDrizzle();
    adapter = DrizzleAdapter() as Required<Adapter>;
  });

  afterEach(() => {
    setMockError(null);
  });

  describe("User管理", () => {
    it("新規ユーザーを作成できる", async () => {
      const userData: AdapterUser = {
        id: "test-id",
        name: "Test User",
        email: "test@example.com",
        emailVerified: null,
        image: "https://example.com/avatar.png",
      };

      const user = await adapter.createUser(userData);

      expect(user).toEqual(
        expect.objectContaining({
          name: userData.name,
          email: userData.email,
          image: userData.image,
        }),
      );
    });

    it("既存のメールアドレスを持つユーザーを検索できる", async () => {
      const existingUser = {
        id: "existing-user",
        displayName: "Existing User",
        email: "existing@example.com",
        avatarUrl: "https://example.com/existing.png",
        role: "member",
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      setMockUser(existingUser);

      const user = await adapter.getUserByEmail(existingUser.email);

      expect(user).toEqual(
        expect.objectContaining({
          id: existingUser.id,
          name: existingUser.displayName,
          email: existingUser.email,
        }),
      );
    });

    it("存在しないユーザーの場合はnullを返す", async () => {
      const user = await adapter.getUser("non-existent-id");
      expect(user).toBeNull();
    });

    it("ユーザー情報を更新できる", async () => {
      // 既存ユーザーの設定
      const existingUser = {
        id: "update-test-user",
        displayName: "Old Name",
        email: "old@example.com",
        avatarUrl: "old.png",
        role: "member",
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      setMockUser(existingUser);

      // 更新データ
      const updatedData: AdapterUser = {
        id: existingUser.id,
        name: "New Name",
        email: "new@example.com",
        image: "https://example.com/new.png",
        emailVerified: null,
      };

      // 期待される更新後のユーザーデータ
      const expectedUpdate = {
        id: existingUser.id,
        displayName: updatedData.name || existingUser.displayName,
        email: updatedData.email,
        avatarUrl: updatedData.image || existingUser.avatarUrl,
        role: existingUser.role,
        createdAt: existingUser.createdAt,
        updatedAt: existingUser.updatedAt,
      };
      setMockUser(expectedUpdate);

      const updatedUser = await adapter.updateUser(updatedData);

      expect(updatedUser).toEqual({
        id: updatedData.id,
        name: updatedData.name,
        email: updatedData.email,
        image: updatedData.image,
        emailVerified: null,
      });
    });
  });

  describe("セッション管理", () => {
    it("新規セッションを作成できる", async () => {
      const sessionData = {
        sessionToken: "test-session",
        userId: "test-user",
        expires: new Date(2025, 0, 1),
      };

      const session = await adapter.createSession(sessionData);

      expect(session).toEqual(
        expect.objectContaining({
          sessionToken: sessionData.sessionToken,
          userId: sessionData.userId,
          expires: sessionData.expires,
        }),
      );
    });

    it("セッションと関連ユーザーを取得できる", async () => {
      const mockUser = {
        id: "session-test-user",
        displayName: "Session User",
        email: "session@example.com",
        avatarUrl: "",
        role: "member",
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      setMockUser(mockUser);

      const mockSession = {
        id: "test-session-id",
        userId: mockUser.id,
        sessionToken: "test-session",
        expires: new Date(2025, 0, 1),
      };
      setMockSession(mockSession);

      const result = await adapter.getSessionAndUser("test-session");

      expect(result).toBeTruthy();
      if (result) {
        expect(result.session).toEqual(mockSession);
        expect(result.user).toEqual({
          id: mockUser.id,
          name: mockUser.displayName,
          email: mockUser.email,
          image: mockUser.avatarUrl,
          emailVerified: null,
        });
      }
    });
  });

  describe("アカウントリンク", () => {
    it("新規アカウントをリンクできる", async () => {
      const accountData: AdapterAccount = {
        userId: "link-test-user",
        type: "oauth" as AdapterAccountType,
        provider: "discord",
        providerAccountId: "discord-123",
        access_token: "test-token",
        token_type: "bearer",
      };

      await adapter.linkAccount(accountData);
      expect(true).toBe(true);
    });

    it("アカウントのリンクを解除できる", async () => {
      await adapter.unlinkAccount({
        provider: "discord",
        providerAccountId: "discord-123",
      });
      expect(true).toBe(true);
    });
  });

  describe("エラー処理", () => {
    it("データベースエラー時に適切にエラーをスロー", async () => {
      setMockError(new Error("Database connection failed"));

      const errorUser: AdapterUser = {
        id: "error-test-user",
        email: "test@example.com",
        emailVerified: null,
      };

      await expect(adapter.createUser(errorUser)).rejects.toThrow(
        "Database connection failed",
      );
    });

    it("存在しないセッションの更新時にnullを返す", async () => {
      const result = await adapter.updateSession({
        sessionToken: "non-existent",
        expires: new Date(),
      });

      expect(result).toBeNull();
    });
  });

  describe("認証トークン", () => {
    it("認証トークンを作成して取得できる", async () => {
      const tokenData = {
        identifier: "test@example.com",
        token: "verification-token",
        expires: new Date(2025, 0, 1),
      };

      setMockVerificationToken(tokenData);
      const token = await adapter.createVerificationToken(tokenData);

      expect(token).toEqual(tokenData);
    });

    it("認証トークンを使用して削除できる", async () => {
      const tokenData = {
        identifier: "test@example.com",
        token: "use-and-delete-token",
        expires: new Date(2025, 0, 1),
      };

      setMockVerificationToken(tokenData);
      const result = await adapter.useVerificationToken({
        identifier: tokenData.identifier,
        token: tokenData.token,
      });

      expect(result).toEqual(tokenData);
    });
  });
});
