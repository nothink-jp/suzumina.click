// @ts-nocheck テストファイルなので ts-nocheck を使用
import "@/../tests/setup"; // ルートからの実行を考慮したパスに変更
import { afterEach, beforeEach, describe, expect, it, mock } from "bun:test";
import type { Session } from "next-auth"; // Session 型をインポート
import {
  mockDb,
  resetMockDrizzle,
  setMockError,
  setMockUser,
} from "../../tests/mocks/drizzle";
import {
  mockDiscordAccount,
  mockDiscordGuilds,
  mockDiscordProfile,
  mockSession,
  mockToken,
} from "../../tests/mocks/next-auth";
import { authConfig } from "../auth"; // authConfig から直接コールバックをテスト

// db モジュールをモック
mock.module("../db", () => ({
  db: mockDb,
}));

describe("認証コールバック", () => {
  const originalEnv = { ...process.env };

  function createMockResponse(data: unknown, ok = true) {
    return {
      ok,
      json: () => Promise.resolve(data),
      text: () => Promise.resolve("Error message"),
      arrayBuffer: () => Promise.resolve(new ArrayBuffer(0)),
      blob: () => Promise.resolve(new Blob()),
      formData: () => Promise.resolve(new FormData()),
      clone: () => createMockResponse(data, ok),
      headers: new Headers(),
      redirect: () => new Response(),
      status: ok ? 200 : 403,
      statusText: ok ? "OK" : "Forbidden",
      type: "basic" as ResponseType,
      url: "https://example.com",
      body: null,
      bodyUsed: false,
    };
  }

  beforeEach(() => {
    process.env = {
      ...originalEnv,
      NODE_ENV: "test", // テスト環境として設定
      DISCORD_GUILD_ID: mockDiscordGuilds[0].id,
    };

    resetMockDrizzle();
    setMockError(null); // 各テストの前にエラー状態をリセット

    // テスト用のユーザーデータを設定
    setMockUser({
      id: mockDiscordProfile.id,
      displayName: mockDiscordProfile.username || "",
      avatarUrl: mockDiscordProfile.image_url || "",
      role: "member",
      email: mockDiscordProfile.email || null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    global.fetch = mock(() => {
      return Promise.resolve(createMockResponse(mockDiscordGuilds));
    }) as unknown as typeof fetch;
  });

  afterEach(() => {
    process.env = { ...originalEnv };
    setMockError(null); // テスト後にもエラー状態をリセット
    mock.restore(); // fetch のモックもリセット
  });

  describe("signIn", () => {
    it("アカウント情報が不正な場合は認証失敗", async () => {
      // プロダクション環境に設定
      process.env.NODE_ENV = "production";
      const result = await authConfig.callbacks?.signIn({
        account: null,
        profile: mockDiscordProfile,
      });
      expect(result).toBe(false);
    });

    it("プロファイルが不正な場合は認証失敗", async () => {
      // プロダクション環境に設定
      process.env.NODE_ENV = "production";
      const result = await authConfig.callbacks?.signIn({
        account: mockDiscordAccount,
        profile: undefined,
      });
      expect(result).toBe(false);
    });

    it("Guild APIが失敗した場合は認証失敗", async () => {
      // プロダクション環境に設定
      process.env.NODE_ENV = "production";
      global.fetch = mock(() => {
        return Promise.resolve(
          createMockResponse({ error: "Forbidden" }, false),
        );
      }) as unknown as typeof fetch;
      const result = await authConfig.callbacks?.signIn({
        account: mockDiscordAccount,
        profile: mockDiscordProfile,
      });
      expect(result).toBe(false);
    });

    it("Guild IDが未設定の場合は認証失敗", async () => {
      process.env = {
        ...originalEnv,
        NODE_ENV: "production",
        DISCORD_GUILD_ID: undefined,
      };
      const result = await authConfig.callbacks?.signIn({
        account: mockDiscordAccount,
        profile: mockDiscordProfile,
      });
      expect(result).toBe(false);
    });

    it("ギルドメンバーでない場合はリダイレクト", async () => {
      // プロダクション環境に設定
      process.env.NODE_ENV = "production";
      process.env.DISCORD_GUILD_ID = "non-member-guild-id";
      const result = await authConfig.callbacks?.signIn({
        account: mockDiscordAccount,
        profile: mockDiscordProfile,
      });
      expect(result).toBe("/auth/not-member");
    });

    it("ギルドメンバーの場合は認証成功", async () => {
      // プロダクション環境に設定
      process.env.NODE_ENV = "production";
      const result = await authConfig.callbacks?.signIn({
        account: mockDiscordAccount,
        profile: mockDiscordProfile,
      });
      expect(result).toBe(true);
    });
  });

  describe("session", () => {
    it("トークンがない場合は元のセッションを返す", async () => {
      const result = await authConfig.callbacks?.session({
        session: mockSession,
        token: {},
      });
      expect(result).toEqual(mockSession);
    });

    it("トークンがある場合はユーザーIDを含むセッションを返す", async () => {
      const result = await authConfig.callbacks?.session({
        session: mockSession,
        token: mockToken,
      });
      expect(result.user).toBeDefined();
      if (result.user) {
        expect(result.user.id).toBe(mockToken.sub);
      }
    });

    it("渡された session に user がない場合、元のセッションを返す", async () => {
      const sessionWithoutUser = {
        ...mockSession,
        user: undefined,
      } as unknown as Session;
      const result = await authConfig.callbacks?.session({
        session: sessionWithoutUser,
        token: mockToken,
      });
      expect(result).toEqual(sessionWithoutUser);
    });
  });

  describe("jwt", () => {
    it("Discord ログイン時は accessToken をトークンに追加する", async () => {
      const initialToken = { sub: "user123" };
      const result = await authConfig.callbacks?.jwt({
        token: initialToken,
        account: mockDiscordAccount,
      });
      expect(result?.accessToken).toBe(mockDiscordAccount.access_token);
      expect(result?.sub).toBe("user123");
    });

    it("ログイン時以外はトークンを変更しない", async () => {
      const initialToken = { sub: "user123", accessToken: "oldToken" };
      const result = await authConfig.callbacks?.jwt({
        token: { ...initialToken },
        account: null,
      });
      expect(result).toEqual(initialToken);
    });

    it("Discord 以外のプロバイダーの場合は accessToken を追加しない", async () => {
      const initialToken = { sub: "user123" };
      const otherAccount = { ...mockDiscordAccount, provider: "google" };
      const result = await authConfig.callbacks?.jwt({
        token: initialToken,
        account: otherAccount,
      });
      expect(result?.accessToken).toBeUndefined();
      expect(result?.sub).toBe("user123");
    });
  });
});
