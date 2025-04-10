// @ts-nocheck テストファイルなので ts-nocheck を使用
import "@/../tests/setup"; // ルートからの実行を考慮したパスに変更
import { afterEach, beforeEach, describe, expect, it, mock } from "bun:test";
import type { Session } from "next-auth"; // Session 型をインポート
import {
  resetMockDrizzle,
  setMockError,
  setMockUser,
} from "../../tests/mocks/drizzle";
import { mockDb } from "../../tests/mocks/drizzle";
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
      const result = await authConfig.callbacks?.signIn({
        account: null,
        profile: mockDiscordProfile,
      });
      expect(result).toBe(false);
    });

    it("プロファイルが不正な場合は認証失敗", async () => {
      const result = await authConfig.callbacks?.signIn({
        account: mockDiscordAccount,
        profile: undefined,
      });
      expect(result).toBe(false);
    });

    it("Guild APIが失敗した場合は認証失敗", async () => {
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

    it("Guild IDが未設定 (ConfigurationError) の場合は認証失敗", async () => {
      process.env = {
        ...originalEnv,
        NODE_ENV: "production", // 本番環境をシミュレートしてエラーを発生させる
        NEXT_PHASE: undefined,
        DISCORD_GUILD_ID: undefined, // 未設定にする
      };
      // getRequiredEnvVar が ConfigurationError をスローするはず
      const result = await authConfig.callbacks?.signIn({
        account: mockDiscordAccount,
        profile: mockDiscordProfile,
      });
      expect(result).toBe(false);
    });

    it("ギルドメンバーでない場合はリダイレクト", async () => {
      process.env.DISCORD_GUILD_ID = "non-member-guild-id"; // 存在しないギルドID
      const result = await authConfig.callbacks?.signIn({
        account: mockDiscordAccount,
        profile: mockDiscordProfile,
      });
      expect(result).toBe("/auth/not-member"); // リダイレクト先のURLを期待
    });

    it("ギルドメンバーの場合は認証成功", async () => {
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
      // user を削除し、意図的な型違反を as unknown as Session で明示
      const sessionWithoutUser = {
        ...mockSession,
        user: undefined,
      } as unknown as Session;
      const result = await authConfig.callbacks?.session({
        session: sessionWithoutUser,
        token: mockToken,
      });
      // 新しい実装では session.user が存在しない場合は初期化しないため、
      // 元のセッションがそのまま返される
      expect(result).toEqual(sessionWithoutUser);
    });
  });

  describe("jwt", () => {
    it("Discord ログイン時 (account あり) は accessToken をトークンに追加する", async () => {
      const initialToken = { sub: "user123" };
      const result = await authConfig.callbacks?.jwt({
        token: initialToken,
        account: mockDiscordAccount,
      });
      expect(result?.accessToken).toBe(mockDiscordAccount.access_token);
      expect(result?.sub).toBe("user123"); // 他のプロパティは維持される
    });

    it("ログイン時以外 (account なし) はトークンを変更しない", async () => {
      const initialToken = { sub: "user123", accessToken: "oldToken" };
      const result = await authConfig.callbacks?.jwt({
        token: { ...initialToken }, // コピーを渡す
        account: null,
      });
      expect(result).toEqual(initialToken); // トークンは変更されない
    });

    it("Discord 以外のプロバイダーの場合は accessToken を追加しない", async () => {
      const initialToken = { sub: "user123" };
      const otherAccount = { ...mockDiscordAccount, provider: "google" };
      const result = await authConfig.callbacks?.jwt({
        token: initialToken,
        account: otherAccount,
      });
      expect(result?.accessToken).toBeUndefined(); // accessToken は追加されない
      expect(result?.sub).toBe("user123");
    });
  });
});
